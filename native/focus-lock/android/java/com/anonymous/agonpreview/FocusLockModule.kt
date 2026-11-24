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
      val active = readSession()?.takeUnless { it.getString("status") != "active" || it.getDouble("endsAt") <= System.currentTimeMillis() }
      if (active == null && readSession() != null) clearSession()
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
  @ReactMethod fun isAccessibilityEnabled(promise: Promise) { promise.resolve(isAccessibilityEnabled()) }

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
      require(readSession()?.getString("status") != "active") { "A blocking session is already active" }
      val session = Arguments.createMap().apply {
        putString("id", sessionId); putString("userId", userId)
        putDouble("startedAt", startedAt.toDouble()); putDouble("endsAt", endsAt.toDouble())
        putString("status", "active")
        putArray("packageIds", Arguments.createArray().also { array -> packages.forEach(array::pushString) })
      }
      saveSession(session)
      FocusLockAlarm.schedule(reactContext, endsAt)
      emit("onBlockingStarted", session)
      promise.resolve(session)
    } catch (error: Exception) {
      promise.reject("E_START_FAILED", error.message ?: "Blocking session could not start.", error)
    }
  }

  @ReactMethod
  fun stopBlockingSession(sessionId: String, emergencyExit: Boolean, promise: Promise) {
    try {
      val session = readSession()
      if (session == null || session.getString("id") != sessionId) { promise.resolve(null); return }
      session.putString("status", "stopped")
      session.putDouble("stoppedAt", System.currentTimeMillis().toDouble())
      session.putBoolean("emergencyExit", emergencyExit)
      saveSession(session); FocusLockAlarm.cancel(reactContext); emit("onBlockingStopped", session)
      promise.resolve(session)
    } catch (error: Exception) { promise.reject("E_STOP_FAILED", "Blocking session could not stop.", error) }
  }

  @ReactMethod fun getActiveSession(promise: Promise) { promise.resolve(readSession()?.takeIf { it.getString("status") == "active" }) }
  @ReactMethod fun getRemainingTime(promise: Promise) { promise.resolve((readSession()?.getDouble("endsAt")?.toLong()?.minus(System.currentTimeMillis()) ?: 0L).coerceAtLeast(0L)) }
  @ReactMethod fun getBlockedPackages(promise: Promise) {
    val array = Arguments.createArray(); readSession()?.getArray("packageIds")?.toArrayList()?.forEach { array.pushString(it.toString()) }; promise.resolve(array)
  }
  @ReactMethod fun getBlockedAttemptCount(promise: Promise) { promise.resolve(blockedAttemptsToday()) }
  @ReactMethod fun addBlockedPackage(packageId: String, promise: Promise) = updatePackages(packageId, true, promise)
  @ReactMethod fun removeBlockedPackage(packageId: String, promise: Promise) = updatePackages(packageId, false, promise)
  @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) { }
  @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) { }

  private fun updatePackages(packageId: String, add: Boolean, promise: Promise) {
    try {
      require(packageId.matches(Regex("[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)+")) && !isCriticalPackage(packageId))
      val session = readSession() ?: throw IllegalStateException("No active session")
      val packages = session.getArray("packageIds")?.toArrayList()?.map { it.toString() }?.toMutableSet() ?: mutableSetOf()
      if (add) packages.add(packageId) else packages.remove(packageId)
      session.putArray("packageIds", Arguments.createArray().also { array -> packages.forEach(array::pushString) })
      saveSession(session); promise.resolve(session.getArray("packageIds"))
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

  private fun iconAsBase64(info: ApplicationInfo): String? = try {
    val drawable = packageManager.getApplicationIcon(info)
    val bitmap = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap); drawable.setBounds(0, 0, 96, 96); drawable.draw(canvas)
    val output = ByteArrayOutputStream(); bitmap.compress(Bitmap.CompressFormat.PNG, 90, output)
    Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
  } catch (_: Exception) { null }

  private fun readSession(): WritableMap? = prefs.getString(SESSION_KEY, null)?.let { json ->
    val objectJson = org.json.JSONObject(json)
    val result = Arguments.createMap()
    objectJson.keys().forEach { key ->
      when (val value = objectJson.get(key)) {
        is String -> result.putString(key, value)
        is Number -> result.putDouble(key, value.toDouble())
        is Boolean -> result.putBoolean(key, value)
        is org.json.JSONArray -> result.putArray(key, Arguments.createArray().also { array -> for (i in 0 until value.length()) array.pushString(value.getString(i)) })
      }
    }
    result
  }

  private fun saveSession(session: ReadableMap) { prefs.edit().putString(SESSION_KEY, org.json.JSONObject(session.toHashMap()).toString()).apply() }
  private fun clearSession() { prefs.edit().remove(SESSION_KEY).apply() }
  private fun blockedAttemptsToday(): Int {
    val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
    if (prefs.getString(BLOCKED_DATE_KEY, null) != today) return 0
    return prefs.getInt(BLOCKED_COUNT_KEY, 0)
  }

  private fun recordBlockedAttemptInternal(packageId: String) {
    val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
    val editor = prefs.edit()
    if (prefs.getString(BLOCKED_DATE_KEY, null) != today) editor.putString(BLOCKED_DATE_KEY, today).putInt(BLOCKED_COUNT_KEY, 0)
    editor.putInt(BLOCKED_COUNT_KEY, blockedAttemptsToday() + 1).apply()
    emit("onBlockedAppDetected", Arguments.createMap().apply {
      putString("packageId", packageId); putDouble("detectedAt", System.currentTimeMillis().toDouble()); putInt("blockedAttemptsToday", blockedAttemptsToday())
    })
  }

  private fun emit(name: String, payload: WritableMap) { reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, payload) }

  companion object {
    @Volatile private var instance: FocusLockModule? = null
    const val PREFS = "study_sakha_focus_lock"
    const val SESSION_KEY = "active_session"
    const val BLOCKED_DATE_KEY = "blocked_attempts_date"
    const val BLOCKED_COUNT_KEY = "blocked_attempts_count"
    const val MAX_SESSION_MS = 30L * 24 * 60 * 60 * 1000
    fun emitGlobal(name: String, payload: WritableMap) { instance?.emit(name, payload) }
    fun recordBlockedAttemptGlobal(packageId: String) { instance?.recordBlockedAttemptInternal(packageId) }
  }
}
