package com.anonymous.agonpreview

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream
import java.util.Calendar
import java.util.UUID

class FocusLockModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  init { instance = this }
  override fun getName() = "StudySakhaFocusLock"

  private val prefs = reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private val packageManager get() = reactContext.packageManager

  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    try {
      val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val apps = packageManager.queryIntentActivities(launcher, PackageManager.MATCH_ALL)
        .asSequence()
        .map { it.activityInfo.applicationInfo }
        .distinctBy { it.packageName }
        .filter { it.packageName != reactContext.packageName && !isCriticalPackage(it.packageName) }
        .map { info ->
          val map = Arguments.createMap()
          map.putString("packageId", info.packageName)
          map.putString("name", packageManager.getApplicationLabel(info).toString())
          iconAsBase64(info)?.let { map.putString("iconBase64", it) }
          map
        }
        .sortedBy { it.getString("name")?.lowercase() ?: "" }
        .toList()
      val result = Arguments.createArray()
      apps.forEach { result.pushMap(it) }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("E_DISCOVERY_FAILED", "Installed apps could not be discovered.", error)
    }
  }

  @ReactMethod
  fun getUsageStats(promise: Promise) {
    try {
      require(isUsageAccessEnabled()) { "Usage Access is disabled" }
      val calendar = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
      }
      val manager = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val stats = manager.queryAndAggregateUsageStats(calendar.timeInMillis, System.currentTimeMillis())
      val result = Arguments.createArray()
      stats.values.filter { it.totalTimeInForeground > 0L }.forEach { usage ->
        result.pushMap(Arguments.createMap().apply {
          putString("packageId", usage.packageName)
          putDouble("dailyMins", usage.totalTimeInForeground / 60000.0)
          // UsageStats does not expose a reliable foreground-launch count for this aggregation.
          putInt("launches", 0)
        })
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("E_USAGE_STATS", error.message ?: "Usage data unavailable.", error)
    }
  }

  @ReactMethod
  fun getBlockingStatus(promise: Promise) {
    try {
      val active = synchronized(sessionLock) {
        val current = readSession()
        val valid = current?.takeUnless { it.getString("status") != "active" || it.getDouble("endsAt") <= System.currentTimeMillis() }
        if (valid == null && current != null) clearSession()
        valid
      }
      promise.resolve(Arguments.createMap().apply {
        putBoolean("available", true)
        putBoolean("accessibilityEnabled", isAccessibilityEnabled())
        putBoolean("usageAccessEnabled", isUsageAccessEnabled())
        putBoolean("serviceRunning", FocusLockAccessibilityService.instance != null)
        putInt("blockedAttemptsToday", blockedAttemptsToday())
        putMap("activeSession", active)
      })
    } catch (error: Exception) {
      promise.reject("E_STATUS_FAILED", "Blocking status could not be read.", error)
    }
  }

  @ReactMethod fun openAccessibilitySettings(promise: Promise) = openSettings(Settings.ACTION_ACCESSIBILITY_SETTINGS, promise)
  @ReactMethod fun requestAccessibilityPermission(promise: Promise) = openSettings(Settings.ACTION_ACCESSIBILITY_SETTINGS, promise)
  @ReactMethod fun openUsageAccessSettings(promise: Promise) = openSettings(Settings.ACTION_USAGE_ACCESS_SETTINGS, promise)
  @ReactMethod fun isAccessibilityEnabled(promise: Promise) {
    try { promise.resolve(isAccessibilityEnabled()) }
    catch (error: Exception) { promise.reject("E_PERMISSION_CHECK", "Accessibility state could not be read.", error) }
  }

  @ReactMethod
  fun startBlockingSession(config: ReadableMap, promise: Promise) {
    try {
      val sessionId = config.getString("sessionId")?.takeIf { it.matches(Regex("[A-Za-z0-9._:-]{8,120}")) }
        ?: throw IllegalArgumentException("Invalid session ID")
      val userId = config.getString("userId")?.takeIf { it.isNotBlank() } ?: throw IllegalArgumentException("Invalid user ID")
      val startedAt = config.getDouble("startedAt").toLong()
      val endsAt = config.getDouble("endsAt").toLong()
      val packages = config.getArray("packageIds")?.toArrayList()?.map { it as? String ?: "" }?.distinct()
        ?.filter { it.matches(Regex("[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)+")) && it != reactContext.packageName && !isCriticalPackage(it) }
        ?: emptyList()
      require(packages.isNotEmpty()) { "Select at least one supported application" }
      require(endsAt > startedAt && endsAt - startedAt <= MAX_SESSION_MS) { "Invalid session duration" }
      require(isAccessibilityEnabled()) { "Accessibility service is disabled" }
      val session = synchronized(sessionLock) {
        val existing = readSession()
        if (existing?.getString("status") == "active") {
          if (existing.getDouble("endsAt") > System.currentTimeMillis()) {
            throw IllegalArgumentException("A blocking session is already active")
          }
          clearSession()
        }
        Arguments.createMap().apply {
          putString("id", sessionId); putString("userId", userId)
          putDouble("startedAt", startedAt.toDouble()); putDouble("endsAt", endsAt.toDouble())
          putString("status", "active")
          putArray("packageIds", Arguments.createArray().also { array -> packages.forEach(array::pushString) })
        }.also { created ->
          saveSession(created)
          FocusLockAlarm.schedule(reactContext, sessionId, endsAt)
        }
      }
      emit("onBlockingStarted", copyMap(session))
      promise.resolve(session)
    } catch (error: Exception) {
      promise.reject("E_START_FAILED", error.message ?: "Blocking session could not start.", error)
    }
  }

  @ReactMethod
  fun stopBlockingSession(sessionId: String, emergencyExit: Boolean, promise: Promise) {
    try {
      val session = synchronized(sessionLock) {
        val current = readSession()
        if (current == null || current.getString("id") != sessionId) null
        else {
          current.putString("status", "stopped")
          current.putDouble("stoppedAt", System.currentTimeMillis().toDouble())
          current.putBoolean("emergencyExit", emergencyExit)
          saveSession(current)
          FocusLockAlarm.cancel(reactContext)
          current
        }
      }
      if (session == null) { promise.resolve(null); return }
      emit("onBlockingStopped", copyMap(session))
      promise.resolve(session)
    } catch (error: Exception) { promise.reject("E_STOP_FAILED", "Blocking session could not stop.", error) }
  }

  @ReactMethod fun getActiveSession(promise: Promise) {
    try {
      val active = synchronized(sessionLock) {
        val current = readSession()
        val valid = current?.takeIf { it.getString("status") == "active" && it.getDouble("endsAt") > System.currentTimeMillis() }
        if (valid == null && current != null && current.getString("status") == "active") clearSession()
        valid
      }
      promise.resolve(active)
    } catch (error: Exception) { promise.reject("E_SESSION_READ", "Active session could not be read.", error) }
  }

  @ReactMethod fun getRemainingTime(promise: Promise) {
    try {
      val remaining = synchronized(sessionLock) {
        val current = readSession()?.takeIf { it.getString("status") == "active" }
        (current?.getDouble("endsAt")?.toLong()?.minus(System.currentTimeMillis()) ?: 0L).coerceAtLeast(0L)
      }
      promise.resolve(remaining.toDouble())
    } catch (error: Exception) { promise.reject("E_REMAINING_FAILED", "Remaining time could not be read.", error) }
  }

  @ReactMethod fun getBlockedPackages(promise: Promise) {
    try {
      val array = Arguments.createArray()
      synchronized(sessionLock) {
        readSession()
          ?.takeIf { it.getString("status") == "active" && it.getDouble("endsAt") > System.currentTimeMillis() }
          ?.getArray("packageIds")?.toArrayList()?.forEach { array.pushString(it.toString()) }
      }
      promise.resolve(array)
    } catch (error: Exception) { promise.reject("E_PACKAGES_FAILED", "Blocked packages could not be read.", error) }
  }

  @ReactMethod fun getBlockedAttemptCount(promise: Promise) {
    try { promise.resolve(blockedAttemptsToday()) }
    catch (error: Exception) { promise.reject("E_ATTEMPTS_FAILED", "Blocked attempt count could not be read.", error) }
  }
  @ReactMethod fun addBlockedPackage(packageId: String, promise: Promise) = updatePackages(packageId, true, promise)
  @ReactMethod fun removeBlockedPackage(packageId: String, promise: Promise) = updatePackages(packageId, false, promise)
  @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) { }
  @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) { }

  private fun updatePackages(packageId: String, add: Boolean, promise: Promise) {
    try {
      require(packageId.matches(Regex("[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)+")) && !isCriticalPackage(packageId))
      val updatedList = synchronized(sessionLock) {
        val session = readSession()
          ?.takeIf { it.getString("status") == "active" && it.getDouble("endsAt") > System.currentTimeMillis() }
          ?: throw IllegalStateException("No active session")
        val packages = session.getArray("packageIds")?.toArrayList()?.map { it.toString() }?.toMutableSet() ?: mutableSetOf()
        if (add) packages.add(packageId) else packages.remove(packageId)
        val sorted = packages.toList()
        session.putArray("packageIds", Arguments.createArray().also { array -> sorted.forEach(array::pushString) })
        saveSession(session)
        sorted
      }
      promise.resolve(Arguments.createArray().also { array -> updatedList.forEach(array::pushString) })
    } catch (error: Exception) { promise.reject("E_PACKAGE_FAILED", error.message ?: "Package update failed.", error) }
  }

  private fun openSettings(action: String, promise: Promise) {
    try { reactContext.startActivity(Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); promise.resolve(null) }
    catch (error: Exception) { promise.reject("E_SETTINGS_FAILED", "Settings could not be opened.", error) }
  }

  private fun isAccessibilityEnabled(): Boolean {
    val expected = ComponentName(reactContext, FocusLockAccessibilityService::class.java).flattenToString()
    val enabled = Settings.Secure.getString(reactContext.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
    return enabled.split(':').any { it.equals(expected, true) }
  }

  private fun isUsageAccessEnabled(): Boolean = (reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager)
    .checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactContext.packageName) == AppOpsManager.MODE_ALLOWED

  private fun isCriticalPackage(packageId: String) = packageId == "com.android.systemui" || packageId == "com.android.settings" || packageId == "com.android.phone" || packageId == "com.google.android.dialer" || packageId.startsWith("com.android.launcher") || packageId.startsWith("com.google.android.apps.nexuslauncher")

  private fun iconAsBase64(info: ApplicationInfo): String? {
    var bitmap: Bitmap? = null
    return try {
      val drawable = packageManager.getApplicationIcon(info)
      val created = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
      bitmap = created
      val canvas = Canvas(created); drawable.setBounds(0, 0, 96, 96); drawable.draw(canvas)
      val output = ByteArrayOutputStream(); created.compress(Bitmap.CompressFormat.PNG, 90, output)
      Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
    } catch (_: Exception) {
      null
    } finally {
      bitmap?.recycle()
    }
  }

  private fun readSession(): WritableMap? {
    val json = prefs.getString(SESSION_KEY, null) ?: return null
    return try {
      val objectJson = org.json.JSONObject(json)
      val result = Arguments.createMap()
      objectJson.keys().forEach { key ->
        when (val value = objectJson.get(key)) {
          is String -> result.putString(key, value)
          is Number -> result.putDouble(key, value.toDouble())
          is Boolean -> result.putBoolean(key, value)
          is org.json.JSONArray -> result.putArray(key, Arguments.createArray().also { array ->
            for (i in 0 until value.length()) {
              val item = value.optString(i, "")
              if (item.isNotEmpty()) array.pushString(item)
            }
          })
        }
      }
      result
    } catch (_: Exception) {
      clearSession()
      null
    }
  }

  private fun saveSession(session: ReadableMap) { prefs.edit().putString(SESSION_KEY, org.json.JSONObject(session.toHashMap()).toString()).apply() }
  private fun clearSession() { prefs.edit().remove(SESSION_KEY).apply() }
  private fun blockedAttemptsToday(): Int = synchronized(sessionLock) {
    val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
    if (prefs.getString(BLOCKED_DATE_KEY, null) != today) return@synchronized 0
    prefs.getInt(BLOCKED_COUNT_KEY, 0)
  }

  private fun recordBlockedAttemptInternal(packageId: String) {
    val nextCount = synchronized(sessionLock) {
      val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
      val sameDay = prefs.getString(BLOCKED_DATE_KEY, null) == today
      val updated = (if (sameDay) prefs.getInt(BLOCKED_COUNT_KEY, 0) else 0) + 1
      prefs.edit()
        .putString(BLOCKED_DATE_KEY, today)
        .putInt(BLOCKED_COUNT_KEY, updated)
        .apply()
      updated
    }
    emit("onBlockedAppDetected", Arguments.createMap().apply {
      putString("packageId", packageId); putDouble("detectedAt", System.currentTimeMillis().toDouble()); putInt("blockedAttemptsToday", nextCount)
    })
  }

  override fun invalidate() {
    if (instance === this) instance = null
    super.invalidate()
  }

  private fun copyMap(source: WritableMap): WritableMap = Arguments.createMap().apply { merge(source) }

  private fun emit(name: String, payload: WritableMap) {
    if (!reactContext.hasActiveReactInstance()) return
    try {
      reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, payload)
    } catch (_: Exception) { }
  }

  companion object {
    @Volatile private var instance: FocusLockModule? = null
    val sessionLock = Any()
    const val PREFS = "study_sakha_focus_lock"
    const val SESSION_KEY = "active_session"
    const val BLOCKED_DATE_KEY = "blocked_attempts_date"
    const val BLOCKED_COUNT_KEY = "blocked_attempts_count"
    const val MAX_SESSION_MS = 30L * 24 * 60 * 60 * 1000
    fun emitGlobal(name: String, payload: WritableMap) { instance?.emit(name, payload) }
    fun recordBlockedAttemptGlobal(packageId: String) { instance?.recordBlockedAttemptInternal(packageId) }
  }
}
