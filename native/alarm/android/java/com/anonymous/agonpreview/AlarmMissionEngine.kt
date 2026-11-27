package com.anonymous.agonpreview

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.google.zxing.BarcodeFormat
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import kotlin.math.abs
import kotlin.math.sqrt

class AlarmMissionEngine(private val reactContext: ReactApplicationContext) {
  private val sensorManager: SensorManager?
    get() = reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager

  private var activeSessionId: String? = null
  private var activeSensorType: String? = null
  private var sensorListener: SensorEventListener? = null
  private var shakeCount = 0
  private var shakeTarget = 40
  private var shakeThresholdG = 2.15f
  private var lastShakeTimestampMs = 0L

  private var stepTarget = 25
  private var stepBaseline: Float? = null
  private var stepCount = 0

  private var pendingCameraPromise: Promise? = null
  private var pendingCameraMode: String? = null
  private var pendingAlarmId: String? = null
  private var pendingThresholdPercent: Int = 80
  private var pendingCaptureFile: File? = null

  private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode != REQUEST_CAMERA_CAPTURE) return
      val promise = pendingCameraPromise ?: return
      val mode = pendingCameraMode
      val alarmId = pendingAlarmId
      val threshold = pendingThresholdPercent
      val captureFile = pendingCaptureFile
      pendingCameraPromise = null
      pendingCameraMode = null
      pendingAlarmId = null
      pendingCaptureFile = null

      if (resultCode != Activity.RESULT_OK) {
        captureFile?.delete()
        promise.resolve(Arguments.createMap().apply {
          putBoolean("ok", false)
          putString("reason", "cancelled")
        })
        return
      }

      val bitmap = decodeCapturedBitmap(captureFile, data)
      if (bitmap == null) {
        captureFile?.delete()
        promise.resolve(Arguments.createMap().apply {
          putBoolean("ok", false)
          putString("reason", "capture_decode_failed")
        })
        return
      }

      when (mode) {
        MODE_BARCODE -> handleBarcodeResult(bitmap, captureFile, promise)
        MODE_PHOTO_REF -> handleReferencePhotoResult(alarmId ?: "default", bitmap, captureFile, promise)
        MODE_PHOTO_VERIFY -> handleVerifyPhotoResult(alarmId ?: "default", threshold, bitmap, captureFile, promise)
        else -> {
          captureFile?.delete()
          promise.resolve(Arguments.createMap().apply {
            putBoolean("ok", false)
            putString("reason", "unknown_mode")
          })
        }
      }
    }
  }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  fun cleanup() {
    stopSensorsInternal()
    reactContext.removeActivityEventListener(activityEventListener)
    pendingCameraPromise?.resolve(Arguments.createMap().apply {
      putBoolean("ok", false)
      putString("reason", "module_invalidated")
    })
    pendingCameraPromise = null
    pendingCameraMode = null
    pendingAlarmId = null
    pendingCaptureFile?.delete()
    pendingCaptureFile = null
  }

  fun getCapabilities(promise: Promise) {
    val sm = sensorManager
    val hasAccelerometer = sm?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null
    val hasStepCounter = sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
    val hasStepDetector = sm?.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR) != null
    val activityGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
      ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED
    val cameraGranted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    promise.resolve(Arguments.createMap().apply {
      putBoolean("hasAccelerometer", hasAccelerometer)
      putBoolean("hasStepCounter", hasStepCounter)
      putBoolean("hasStepDetector", hasStepDetector)
      putBoolean("activityRecognitionGranted", activityGranted)
      putBoolean("cameraGranted", cameraGranted)
    })
  }

  fun startShakeMission(sessionId: String, target: Int, thresholdG: Double, promise: Promise) {
    stopSensorsInternal()
    val sm = sensorManager
    val accel = sm?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    if (sm == null || accel == null) {
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("reason", "sensor_unavailable")
      })
      return
    }
    activeSessionId = sessionId
    activeSensorType = "shake"
    shakeCount = 0
    shakeTarget = target.coerceIn(1, 200)
    shakeThresholdG = thresholdG.toFloat().coerceIn(1.3f, 4.0f)
    lastShakeTimestampMs = 0L

    val listener = object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        if (activeSessionId != sessionId || activeSensorType != "shake") return
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val gForce = sqrt((x * x + y * y + z * z).toDouble()).toFloat() / SensorManager.GRAVITY_EARTH
        if (gForce >= shakeThresholdG) {
          val now = System.currentTimeMillis()
          if (now - lastShakeTimestampMs >= 180L) {
            lastShakeTimestampMs = now
            shakeCount = (shakeCount + 1).coerceAtMost(shakeTarget)
            emitSensorEvent(sessionId, "shake", shakeCount, shakeTarget)
          }
        }
      }

      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }
    sensorListener = listener
    val registered = sm.registerListener(listener, accel, SensorManager.SENSOR_DELAY_GAME)
    promise.resolve(Arguments.createMap().apply {
      putBoolean("ok", registered)
      if (!registered) putString("reason", "sensor_register_failed")
    })
  }

  fun startStepMission(sessionId: String, target: Int, promise: Promise) {
    stopSensorsInternal()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val granted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED
      if (!granted) {
        requestRuntimePermission(Manifest.permission.ACTIVITY_RECOGNITION, REQUEST_ACTIVITY_PERMISSION) { ok ->
          if (!ok) {
            promise.resolve(Arguments.createMap().apply {
              putBoolean("ok", false)
              putString("reason", "permission_denied")
            })
          } else {
            registerStepListener(sessionId, target, promise)
          }
        }
        return
      }
    }
    registerStepListener(sessionId, target, promise)
  }

  private fun registerStepListener(sessionId: String, target: Int, promise: Promise) {
    val sm = sensorManager
    val stepCounter = sm?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    val stepDetector = sm?.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
    val chosenSensor = stepCounter ?: stepDetector
    if (sm == null || chosenSensor == null) {
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("reason", "sensor_unavailable")
      })
      return
    }
    activeSessionId = sessionId
    activeSensorType = "steps"
    stepTarget = target.coerceIn(1, 500)
    stepBaseline = null
    stepCount = 0

    val isCounter = chosenSensor.type == Sensor.TYPE_STEP_COUNTER
    val listener = object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        if (activeSessionId != sessionId || activeSensorType != "steps") return
        if (isCounter) {
          val totalSinceBoot = event.values[0]
          val base = stepBaseline
          if (base == null) {
            stepBaseline = totalSinceBoot
            return
          }
          val delta = (totalSinceBoot - base).toInt().coerceAtLeast(0)
          if (delta > stepCount) {
            stepCount = delta.coerceAtMost(stepTarget)
            emitSensorEvent(sessionId, "steps", stepCount, stepTarget)
          }
        } else {
          if (event.values[0] > 0f) {
            stepCount = (stepCount + 1).coerceAtMost(stepTarget)
            emitSensorEvent(sessionId, "steps", stepCount, stepTarget)
          }
        }
      }

      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }
    sensorListener = listener
    val registered = sm.registerListener(listener, chosenSensor, SensorManager.SENSOR_DELAY_NORMAL)
    promise.resolve(Arguments.createMap().apply {
      putBoolean("ok", registered)
      if (!registered) putString("reason", "sensor_register_failed")
    })
  }

  fun stopSensorMission(sessionId: String?, promise: Promise) {
    if (sessionId.isNullOrBlank() || sessionId == activeSessionId) {
      stopSensorsInternal()
    }
    promise.resolve(null)
  }

  private fun stopSensorsInternal() {
    val listener = sensorListener
    if (listener != null) {
      sensorManager?.unregisterListener(listener)
    }
    sensorListener = null
    activeSessionId = null
    activeSensorType = null
  }

  fun captureBarcode(promise: Promise) {
    launchCamera(MODE_BARCODE, null, 80, promise)
  }

  fun captureReferencePhoto(alarmId: String, promise: Promise) {
    launchCamera(MODE_PHOTO_REF, alarmId, 80, promise)
  }

  fun verifyPhotoAgainstReference(alarmId: String, thresholdPercent: Int, promise: Promise) {
    val refFile = referenceSignatureFile(alarmId)
    if (!refFile.exists()) {
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("reason", "no_reference_photo")
      })
      return
    }
    launchCamera(MODE_PHOTO_VERIFY, alarmId, thresholdPercent.coerceIn(50, 98), promise)
  }

  private fun launchCamera(mode: String, alarmId: String?, thresholdPercent: Int, promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("reason", "no_active_activity")
      })
      return
    }
    val granted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    if (!granted) {
      requestRuntimePermission(Manifest.permission.CAMERA, REQUEST_CAMERA_PERMISSION) { ok ->
        if (!ok) {
          promise.resolve(Arguments.createMap().apply {
            putBoolean("ok", false)
            putString("reason", "permission_denied")
          })
        } else {
          startCameraIntent(activity, mode, alarmId, thresholdPercent, promise)
        }
      }
      return
    }
    startCameraIntent(activity, mode, alarmId, thresholdPercent, promise)
  }

  private fun startCameraIntent(
    activity: Activity,
    mode: String,
    alarmId: String?,
    thresholdPercent: Int,
    promise: Promise,
  ) {
    if (pendingCameraPromise != null) {
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("reason", "camera_busy")
      })
      return
    }
    val cacheDir = File(reactContext.cacheDir, "alarm_mission_cache").apply { mkdirs() }
    val outFile = File(cacheDir, "capture_${System.currentTimeMillis()}.jpg")
    val authority = "${reactContext.packageName}.alarm.fileprovider"
    val outUri: Uri = FileProvider.getUriForFile(reactContext, authority, outFile)

    val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
      putExtra(MediaStore.EXTRA_OUTPUT, outUri)
      addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    if (intent.resolveActivity(reactContext.packageManager) == null) {
      outFile.delete()
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("reason", "camera_unavailable")
      })
      return
    }

    pendingCameraPromise = promise
    pendingCameraMode = mode
    pendingAlarmId = alarmId
    pendingThresholdPercent = thresholdPercent
    pendingCaptureFile = outFile
    runCatching {
      activity.startActivityForResult(intent, REQUEST_CAMERA_CAPTURE)
    }.onFailure {
      pendingCameraPromise = null
      pendingCameraMode = null
      pendingAlarmId = null
      pendingCaptureFile = null
      outFile.delete()
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("reason", "camera_launch_failed")
      })
    }
  }

  private fun decodeCapturedBitmap(file: File?, data: Intent?): Bitmap? {
    if (file != null && file.exists() && file.length() > 0L) {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.absolutePath, bounds)
      var sample = 1
      while (bounds.outWidth / sample > 1280 || bounds.outHeight / sample > 1280) {
        sample *= 2
      }
      val opts = BitmapFactory.Options().apply { inSampleSize = sample }
      BitmapFactory.decodeFile(file.absolutePath, opts)?.let { return it }
    }
    @Suppress("DEPRECATION")
    return data?.extras?.get("data") as? Bitmap
  }

  private fun handleBarcodeResult(bitmap: Bitmap, captureFile: File?, promise: Promise) {
    try {
      val decoded = decodeBarcodeFromBitmap(bitmap)
      if (decoded != null) {
        promise.resolve(Arguments.createMap().apply {
          putBoolean("ok", true)
          putString("code", decoded.first)
          putString("format", decoded.second)
        })
      } else {
        promise.resolve(Arguments.createMap().apply {
          putBoolean("ok", false)
          putString("reason", "no_barcode_found")
        })
      }
    } finally {
      captureFile?.delete()
      bitmap.recycle()
    }
  }

  private fun decodeBarcodeFromBitmap(source: Bitmap): Pair<String, String>? {
    val reader = MultiFormatReader().apply {
      setHints(mapOf(
        DecodeHintType.TRY_HARDER to true,
        DecodeHintType.POSSIBLE_FORMATS to listOf(
          BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.PDF_417,
        ),
      ))
    }
    val angles = floatArrayOf(0f, 90f, 180f, 270f)
    for (angle in angles) {
      val bmp = if (angle == 0f) source else rotateBitmap(source, angle)
      val w = bmp.width
      val h = bmp.height
      val pixels = IntArray(w * h)
      bmp.getPixels(pixels, 0, w, 0, 0, w, h)
      val rgbSource = RGBLuminanceSource(w, h, pixels)
      val binary = BinaryBitmap(HybridBinarizer(rgbSource))
      val result = runCatching { reader.decodeWithState(binary) }.getOrNull()
      if (angle != 0f) bmp.recycle()
      reader.reset()
      if (result != null && result.text.isNotBlank()) {
        return result.text.trim() to result.barcodeFormat.name
      }
    }
    return null
  }

  private fun rotateBitmap(source: Bitmap, angle: Float): Bitmap {
    val matrix = Matrix().apply { postRotate(angle) }
    return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
  }

  private fun handleReferencePhotoResult(alarmId: String, bitmap: Bitmap, captureFile: File?, promise: Promise) {
    try {
      val refsDir = File(reactContext.filesDir, "alarm_mission_refs").apply { mkdirs() }
      val refImageFile = File(refsDir, "${sanitizeId(alarmId)}_ref.jpg")
      val scaled = Bitmap.createScaledBitmap(bitmap, 256, 256, true)
      FileOutputStream(refImageFile).use { out ->
        scaled.compress(Bitmap.CompressFormat.JPEG, 85, out)
      }
      val signature = computeImageSignature(scaled)
      scaled.recycle()
      referenceSignatureFile(alarmId).writeText(signature.toString())

      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", true)
        putString("referenceUri", Uri.fromFile(refImageFile).toString())
      })
    } catch (_: Exception) {
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("reason", "reference_save_failed")
      })
    } finally {
      captureFile?.delete()
      bitmap.recycle()
    }
  }

  private fun handleVerifyPhotoResult(
    alarmId: String,
    thresholdPercent: Int,
    bitmap: Bitmap,
    captureFile: File?,
    promise: Promise,
  ) {
    try {
      val refJson = runCatching { JSONObject(referenceSignatureFile(alarmId).readText()) }.getOrNull()
      if (refJson == null) {
        promise.resolve(Arguments.createMap().apply {
          putBoolean("ok", false)
          putString("reason", "no_reference_photo")
        })
        return
      }
      val scaled = Bitmap.createScaledBitmap(bitmap, 256, 256, true)
      val currentSig = computeImageSignature(scaled)
      scaled.recycle()
      val similarity = computeSignatureSimilarity(refJson, currentSig)
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", true)
        putBoolean("matched", similarity >= thresholdPercent)
        putInt("similarity", similarity)
        putInt("threshold", thresholdPercent)
      })
    } catch (_: Exception) {
      promise.resolve(Arguments.createMap().apply {
        putBoolean("ok", false)
        putString("reason", "photo_compare_failed")
      })
    } finally {
      captureFile?.delete()
      bitmap.recycle()
    }
  }

  private fun computeImageSignature(bitmap: Bitmap): JSONObject {
    // 16x16 normalized luminance grid + 8x8 RGB grid + 8x8 dHash
    val lumaBmp = Bitmap.createScaledBitmap(bitmap, 16, 16, true)
    val lumaArr = JSONArray()
    var lumaSum = 0.0
    val rawLuma = DoubleArray(256)
    for (y in 0 until 16) {
      for (x in 0 until 16) {
        val c = lumaBmp.getPixel(x, y)
        val r = (c shr 16) and 0xFF
        val g = (c shr 8) and 0xFF
        val b = c and 0xFF
        val l = 0.299 * r + 0.587 * g + 0.114 * b
        rawLuma[y * 16 + x] = l
        lumaSum += l
      }
    }
    lumaBmp.recycle()
    val meanLuma = lumaSum / 256.0
    var lumaStd = 0.0
    for (v in rawLuma) lumaStd += (v - meanLuma) * (v - meanLuma)
    lumaStd = sqrt(lumaStd / 256.0).coerceAtLeast(1.0)
    for (v in rawLuma) {
      lumaArr.put(((v - meanLuma) / lumaStd).coerceIn(-3.0, 3.0))
    }

    val colorBmp = Bitmap.createScaledBitmap(bitmap, 8, 8, true)
    val rgbArr = JSONArray()
    for (y in 0 until 8) {
      for (x in 0 until 8) {
        val c = colorBmp.getPixel(x, y)
        rgbArr.put(((c shr 16) and 0xFF) / 255.0)
        rgbArr.put(((c shr 8) and 0xFF) / 255.0)
        rgbArr.put((c and 0xFF) / 255.0)
      }
    }
    colorBmp.recycle()

    val hashBmp = Bitmap.createScaledBitmap(bitmap, 9, 8, true)
    val dHashArr = JSONArray()
    for (y in 0 until 8) {
      for (x in 0 until 8) {
        val c1 = hashBmp.getPixel(x, y)
        val c2 = hashBmp.getPixel(x + 1, y)
        val l1 = 0.299 * ((c1 shr 16) and 0xFF) + 0.587 * ((c1 shr 8) and 0xFF) + 0.114 * (c1 and 0xFF)
        val l2 = 0.299 * ((c2 shr 16) and 0xFF) + 0.587 * ((c2 shr 8) and 0xFF) + 0.114 * (c2 and 0xFF)
        dHashArr.put(if (l1 > l2) 1 else 0)
      }
    }
    hashBmp.recycle()

    return JSONObject().apply {
      put("luma", lumaArr)
      put("rgb", rgbArr)
      put("dhash", dHashArr)
    }
  }

  private fun computeSignatureSimilarity(a: JSONObject, b: JSONObject): Int {
    val lumaA = a.optJSONArray("luma") ?: return 0
    val lumaB = b.optJSONArray("luma") ?: return 0
    val rgbA = a.optJSONArray("rgb") ?: return 0
    val rgbB = b.optJSONArray("rgb") ?: return 0
    val hashA = a.optJSONArray("dhash") ?: return 0
    val hashB = b.optJSONArray("dhash") ?: return 0

    var dot = 0.0
    var normA = 0.0
    var normB = 0.0
    val lLen = minOf(lumaA.length(), lumaB.length())
    for (i in 0 until lLen) {
      val va = lumaA.optDouble(i)
      val vb = lumaB.optDouble(i)
      dot += va * vb
      normA += va * va
      normB += vb * vb
    }
    val cosineLuma = if (normA > 0 && normB > 0) (dot / (sqrt(normA) * sqrt(normB))).coerceIn(0.0, 1.0) else 0.0
    val lumaScore = cosineLuma

    var rgbDiff = 0.0
    val rLen = minOf(rgbA.length(), rgbB.length())
    for (i in 0 until rLen) {
      rgbDiff += abs(rgbA.optDouble(i) - rgbB.optDouble(i))
    }
    val rgbScore = if (rLen > 0) (1.0 - (rgbDiff / rLen)).coerceIn(0.0, 1.0) else 0.0

    var hashMatches = 0
    val hLen = minOf(hashA.length(), hashB.length())
    for (i in 0 until hLen) {
      if (hashA.optInt(i) == hashB.optInt(i)) hashMatches++
    }
    val rawHashRatio = if (hLen > 0) hashMatches.toDouble() / hLen else 0.0
    val dHashScore = ((rawHashRatio - 0.5) * 2.0).coerceIn(0.0, 1.0)

    val combined = 0.45 * lumaScore + 0.35 * rgbScore + 0.20 * dHashScore
    return (combined * 100.0).toInt().coerceIn(0, 100)
  }

  private fun referenceSignatureFile(alarmId: String): File {
    val refsDir = File(reactContext.filesDir, "alarm_mission_refs").apply { mkdirs() }
    return File(refsDir, "${sanitizeId(alarmId)}_sig.json")
  }

  private fun sanitizeId(raw: String): String =
    raw.replace(Regex("[^a-zA-Z0-9_-]"), "_").ifBlank { "default" }

  private fun requestRuntimePermission(permission: String, requestCode: Int, callback: (Boolean) -> Unit) {
    val activity = reactContext.currentActivity as? PermissionAwareActivity
    if (activity == null) {
      callback(false)
      return
    }
    activity.requestPermissions(
      arrayOf(permission),
      requestCode,
      PermissionListener { code, _, grantResults ->
        if (code != requestCode) return@PermissionListener false
        val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
        callback(granted)
        true
      },
    )
  }

  private fun emitSensorEvent(sessionId: String, type: String, count: Int, target: Int) {
    if (!reactContext.hasActiveCatalystInstance()) return
    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onStudySakhaMissionSensor", Arguments.createMap().apply {
        putString("sessionId", sessionId)
        putString("type", type)
        putInt("count", count)
        putInt("target", target)
      })
  }

  companion object {
    private const val REQUEST_CAMERA_CAPTURE = 49101
    private const val REQUEST_CAMERA_PERMISSION = 49102
    private const val REQUEST_ACTIVITY_PERMISSION = 49103
    private const val MODE_BARCODE = "barcode"
    private const val MODE_PHOTO_REF = "photo_ref"
    private const val MODE_PHOTO_VERIFY = "photo_verify"
  }
}
