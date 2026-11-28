package com.anonymous.agonpreview

import android.app.AppOpsManager
import android.app.NotificationManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.SystemClock
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
      val nowMs = System.currentTimeMillis()
      val usageMap = FocusLockUsageLimits.queryTodayUsageMs(reactContext, nowMs)
      val limits = FocusLockUsageLimits.getAppLimits(reactContext)
      val suspensions = FocusLockUsageLimits.getSuspensions(reactContext, nowMs)
      val allPackages = (usageMap.keys + limits.keys).distinct()
      val result = Arguments.createArray()
      allPackages.forEach { pkg ->
        val usedMs = usageMap[pkg] ?: 0L
        val limitMins = limits[pkg] ?: 0
        val susp = suspensions.optJSONObject(pkg)
        val suspendedUntilMs = susp?.optLong("suspendedUntilMs", 0L) ?: 0L
        if (usedMs > 0L || limitMins > 0 || suspendedUntilMs > nowMs) {
          result.pushMap(Arguments.createMap().apply {
            putString("packageId", pkg)
            putDouble("dailyMins", usedMs / 60000.0)
            putDouble("usedMs", usedMs.toDouble())
            putInt("limitMins", limitMins)
            putDouble("suspendedUntilMs", suspendedUntilMs.toDouble())
            if (susp != null && suspendedUntilMs > nowMs) {
              putString("suspensionDuration", susp.optString("duration", ""))
            }
            putInt("launches", 0)
          })
        }
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
        val current = readSessionJson()
        val status = current?.optString("status")
        if (current != null && status == "active" && FocusLockSessionTiming.isExpired(reactContext, current)) {
          FocusLockSessionTiming.recordPendingCompletion(reactContext, current)
          clearSession()
          null
        } else if (current != null && status != "active" && status != "paused") {
          clearSession()
          null
        } else {
          current?.let { jsonToWritableMap(it) }
        }
      }
      promise.resolve(Arguments.createMap().apply {
        putBoolean("available", true)
        putBoolean("accessibilityEnabled", isAccessibilityEnabled())
        putBoolean("usageAccessEnabled", isUsageAccessEnabled())
        putBoolean("exactAlarmEnabled", FocusLockAlarm.canScheduleExactAlarms(reactContext))
        putBoolean("notificationsEnabled", areNotificationsEnabled())
        putBoolean("batteryOptimizationIgnored", isBatteryOptimizationIgnored())
        putBoolean("dndAccessEnabled", isDndAccessGranted())
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
  @ReactMethod fun openExactAlarmSettings(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      try {
        reactContext.startActivity(
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${reactContext.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("E_SETTINGS_FAILED", "Exact alarm settings could not be opened.", error)
      }
    } else {
      promise.resolve(null)
    }
  }
  @ReactMethod fun openNotificationSettings(promise: Promise) {
    try {
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${reactContext.packageName}"))
      }
      reactContext.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_SETTINGS_FAILED", "Notification settings could not be opened.", error)
    }
  }
  @ReactMethod fun openBatteryOptimizationSettings(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      openSettings(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS, promise)
    } else {
      promise.resolve(null)
    }
  }
  @ReactMethod fun openDndSettings(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      openSettings(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS, promise)
    } else {
      promise.resolve(null)
    }
  }
  @ReactMethod fun setDndEnabled(enabled: Boolean, promise: Promise) {
    try {
      promise.resolve(applyDndState(enabled))
    } catch (error: Exception) {
      promise.reject("E_DND_FAILED", "Do Not Disturb state could not be updated.", error)
    }
  }
  @ReactMethod fun setRestartRecoveryEnabled(enabled: Boolean, promise: Promise) {
    try {
      prefs.edit().putBoolean(RESTART_RECOVERY_KEY, enabled).apply()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_RECOVERY_PREF", "Restart recovery preference could not be saved.", error)
    }
  }
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
      val allowedPackages = config.getArray("allowedPackageIds")?.toArrayList()?.map { it as? String ?: "" }?.distinct()
        ?.filter { it.matches(Regex("[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)+")) && it != reactContext.packageName && !isCriticalPackage(it) }
        ?: emptyList()
      val strategy = if (config.hasKey("strategy") && config.getString("strategy") == "allow") "allow" else "block"
      require(packages.isNotEmpty() || (strategy == "allow" && allowedPackages.isNotEmpty())) { "Select at least one supported application" }
      require(endsAt > startedAt && endsAt - startedAt <= MAX_SESSION_MS) { "Invalid session duration" }
      require(isAccessibilityEnabled()) { "Accessibility service is disabled" }
      val session = synchronized(sessionLock) {
        val existing = readSessionJson()
        val existingStatus = existing?.optString("status")
        if (existingStatus == "paused") {
          throw IllegalArgumentException("A blocking session is currently paused")
        }
        if (existingStatus == "active") {
          if (!FocusLockSessionTiming.isExpired(reactContext, existing)) {
            throw IllegalArgumentException("A blocking session is already active")
          }
          FocusLockSessionTiming.recordPendingCompletion(reactContext, existing)
          clearSession()
        }
        val sessionJson = org.json.JSONObject().apply {
          put("id", sessionId)
          put("userId", userId)
          put("startedAt", startedAt)
          put("endsAt", endsAt)
          put("status", "active")
          put("strategy", strategy)
          put("packageIds", org.json.JSONArray().also { array -> packages.forEach(array::put) })
          if (allowedPackages.isNotEmpty()) {
            put("allowedPackageIds", org.json.JSONArray().also { array -> allowedPackages.forEach(array::put) })
          }
        }
        FocusLockSessionTiming.attachTimingMetadata(reactContext, sessionJson, startedAt, endsAt)
        prefs.edit().putString(SESSION_KEY, sessionJson.toString()).commit()
        FocusLockAlarm.schedule(reactContext, sessionId, sessionJson.optLong("endsElapsedMs"))
        jsonToWritableMap(sessionJson)
      }
      FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
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
          runCatching { applyDndState(false) }
          current
        }
      }
      if (session == null) { promise.resolve(null); return }
      FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
      emit("onBlockingStopped", copyMap(session))
      promise.resolve(session)
    } catch (error: Exception) { promise.reject("E_STOP_FAILED", "Blocking session could not stop.", error) }
  }

  @ReactMethod
  fun pauseBlockingSession(sessionId: String, promise: Promise) {
    try {
      val paused = synchronized(sessionLock) {
        val current = readSessionJson() ?: throw IllegalStateException("No active session")
        if (current.optString("id") != sessionId) throw IllegalArgumentException("Session ID mismatch")
        val status = current.optString("status")
        if (status == "paused") {
          return@synchronized jsonToWritableMap(current)
        }
        if (status != "active") throw IllegalStateException("Session is not active")
        val remaining = FocusLockSessionTiming.remainingMs(reactContext, current)
        if (remaining <= 0L) {
          FocusLockSessionTiming.recordPendingCompletion(reactContext, current)
          clearSession()
          throw IllegalStateException("Session has already expired")
        }
        current.put("status", "paused")
        current.put("pausedRemainingMs", remaining)
        current.put("pausedAt", System.currentTimeMillis())
        prefs.edit().putString(SESSION_KEY, current.toString()).commit()
        FocusLockAlarm.cancel(reactContext)
        runCatching { applyDndState(false) }
        jsonToWritableMap(current)
      }
      FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
      emit("onBlockingPaused", copyMap(paused))
      promise.resolve(paused)
    } catch (error: Exception) {
      promise.reject("E_PAUSE_FAILED", error.message ?: "Blocking session could not be paused.", error)
    }
  }

  @ReactMethod
  fun resumeBlockingSession(sessionId: String, promise: Promise) {
    try {
      val resumed = synchronized(sessionLock) {
        val current = readSessionJson() ?: throw IllegalStateException("No paused session")
        if (current.optString("id") != sessionId) throw IllegalArgumentException("Session ID mismatch")
        val status = current.optString("status")
        if (status == "active") {
          return@synchronized jsonToWritableMap(current)
        }
        if (status != "paused") throw IllegalStateException("Session is not paused")
        val remaining = current.optLong("pausedRemainingMs", 0L).coerceIn(1L, MAX_SESSION_MS)
        val elapsedNow = SystemClock.elapsedRealtime()
        val nowWall = System.currentTimeMillis()
        current.put("status", "active")
        current.put("startedElapsedMs", elapsedNow)
        current.put("endsElapsedMs", elapsedNow + remaining)
        current.put("endsAt", nowWall + remaining)
        current.put("bootCount", FocusLockSessionTiming.currentBootCount(reactContext))
        current.remove("pausedRemainingMs")
        current.remove("pausedAt")
        prefs.edit().putString(SESSION_KEY, current.toString()).commit()
        FocusLockAlarm.schedule(reactContext, sessionId, elapsedNow + remaining)
        jsonToWritableMap(current)
      }
      FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
      emit("onBlockingStarted", copyMap(resumed))
      promise.resolve(resumed)
    } catch (error: Exception) {
      promise.reject("E_RESUME_FAILED", error.message ?: "Blocking session could not be resumed.", error)
    }
  }

  @ReactMethod fun getActiveSession(promise: Promise) {
    try {
      val active = synchronized(sessionLock) {
        val current = readSessionJson()
        val status = current?.optString("status")
        if (current != null && status == "active" && FocusLockSessionTiming.isExpired(reactContext, current)) {
          FocusLockSessionTiming.recordPendingCompletion(reactContext, current)
          clearSession()
          null
        } else if (current != null && (status == "active" || status == "paused")) {
          jsonToWritableMap(current)
        } else {
          null
        }
      }
      promise.resolve(active)
    } catch (error: Exception) { promise.reject("E_SESSION_READ", "Active session could not be read.", error) }
  }

  @ReactMethod fun getRemainingTime(promise: Promise) {
    try {
      val remaining = synchronized(sessionLock) {
        val current = readSessionJson()?.takeIf { it.optString("status") == "active" || it.optString("status") == "paused" }
        if (current != null) FocusLockSessionTiming.remainingMs(reactContext, current) else 0L
      }
      promise.resolve(remaining.toDouble())
    } catch (error: Exception) { promise.reject("E_REMAINING_FAILED", "Remaining time could not be read.", error) }
  }

  @ReactMethod fun getBlockedPackages(promise: Promise) {
    try {
      val array = Arguments.createArray()
      synchronized(sessionLock) {
        val current = readSessionJson()?.takeIf { it.optString("status") == "active" && !FocusLockSessionTiming.isExpired(reactContext, it) }
        val pkgs = current?.optJSONArray("packageIds")
        if (pkgs != null) {
          for (i in 0 until pkgs.length()) {
            val item = pkgs.optString(i, "")
            if (item.isNotEmpty()) array.pushString(item)
          }
        }
      }
      promise.resolve(array)
    } catch (error: Exception) { promise.reject("E_PACKAGES_FAILED", "Blocked packages could not be read.", error) }
  }

  @ReactMethod
  fun peekPendingCompletions(promise: Promise) {
    try {
      val array = Arguments.createArray()
      synchronized(sessionLock) {
        val raw = prefs.getString(FocusLockSessionTiming.PENDING_COMPLETIONS_KEY, null)
        if (!raw.isNullOrBlank()) {
          runCatching {
            val parsed = org.json.JSONArray(raw)
            for (i in 0 until parsed.length()) {
              val item = parsed.optJSONObject(i) ?: continue
              array.pushMap(jsonToWritableMap(item))
            }
          }
        }
      }
      promise.resolve(array)
    } catch (error: Exception) {
      promise.reject("E_PENDING_COMPLETIONS", "Pending completions could not be read.", error)
    }
  }

  @ReactMethod
  fun acknowledgePendingCompletions(sessionIds: com.facebook.react.bridge.ReadableArray, promise: Promise) {
    try {
      val ackSet = HashSet<String>(sessionIds.size())
      for (i in 0 until sessionIds.size()) {
        sessionIds.getString(i)?.takeIf { it.isNotBlank() }?.let { ackSet.add(it) }
      }
      synchronized(sessionLock) {
        val raw = prefs.getString(FocusLockSessionTiming.PENDING_COMPLETIONS_KEY, null)
        if (!raw.isNullOrBlank() && ackSet.isNotEmpty()) {
          val remaining = org.json.JSONArray()
          runCatching {
            val parsed = org.json.JSONArray(raw)
            for (i in 0 until parsed.length()) {
              val item = parsed.optJSONObject(i) ?: continue
              if (!ackSet.contains(item.optString("id"))) {
                remaining.put(item)
              }
            }
          }
          if (remaining.length() == 0) {
            prefs.edit().remove(FocusLockSessionTiming.PENDING_COMPLETIONS_KEY).commit()
          } else {
            prefs.edit().putString(FocusLockSessionTiming.PENDING_COMPLETIONS_KEY, remaining.toString()).commit()
          }
        }
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_ACK_COMPLETIONS", "Pending completions could not be acknowledged.", error)
    }
  }

  @ReactMethod
  fun consumePendingCompletions(promise: Promise) {
    try {
      val array = Arguments.createArray()
      synchronized(sessionLock) {
        val raw = prefs.getString(FocusLockSessionTiming.PENDING_COMPLETIONS_KEY, null)
        if (!raw.isNullOrBlank()) {
          prefs.edit().remove(FocusLockSessionTiming.PENDING_COMPLETIONS_KEY).commit()
          runCatching {
            val parsed = org.json.JSONArray(raw)
            for (i in 0 until parsed.length()) {
              val item = parsed.optJSONObject(i) ?: continue
              array.pushMap(jsonToWritableMap(item))
            }
          }
        }
      }
      promise.resolve(array)
    } catch (error: Exception) {
      promise.reject("E_PENDING_COMPLETIONS", "Pending completions could not be read.", error)
    }
  }

  @ReactMethod fun getBlockedAttemptCount(promise: Promise) {
    try { promise.resolve(blockedAttemptsToday()) }
    catch (error: Exception) { promise.reject("E_ATTEMPTS_FAILED", "Blocked attempt count could not be read.", error) }
  }
  @ReactMethod fun addBlockedPackage(packageId: String, promise: Promise) = updatePackages(packageId, true, promise)
  @ReactMethod fun removeBlockedPackage(packageId: String, promise: Promise) = updatePackages(packageId, false, promise)

  @ReactMethod
  fun setAppUsageLimits(limits: ReadableMap, promise: Promise) {
    try {
      val map = mutableMapOf<String, Int>()
      val iterator = limits.keySetIterator()
      while (iterator.hasNextKey()) {
        val pkg = iterator.nextKey()
        if (pkg.matches(Regex("[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)+")) && !isCriticalPackage(pkg)) {
          val mins = limits.getInt(pkg)
          if (mins > 0) map[pkg] = mins
        }
      }
      FocusLockUsageLimits.setAppLimits(reactContext, map)
      FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_LIMITS_SAVE", error.message ?: "App limits could not be saved.", error)
    }
  }

  @ReactMethod
  fun getAppUsageLimits(promise: Promise) {
    try {
      val limits = FocusLockUsageLimits.getAppLimits(reactContext)
      val result = Arguments.createMap()
      limits.forEach { (pkg, mins) -> result.putInt(pkg, mins) }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("E_LIMITS_READ", "App limits could not be read.", error)
    }
  }

  @ReactMethod
  fun suspendAppReminder(packageId: String, duration: String, promise: Promise) {
    try {
      require(packageId.isNotBlank()) { "Invalid package ID" }
      val entry = FocusLockUsageLimits.suspendAppReminder(reactContext, packageId, duration)
      FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
      promise.resolve(jsonToWritableMap(entry))
    } catch (error: Exception) {
      promise.reject("E_SUSPEND_FAILED", error.message ?: "Reminder could not be suspended.", error)
    }
  }

  @ReactMethod
  fun clearAppReminderSuspension(packageId: String, promise: Promise) {
    try {
      FocusLockUsageLimits.clearSuspension(reactContext, packageId)
      FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_SUSPEND_CLEAR", "Suspension could not be cleared.", error)
    }
  }

  @ReactMethod
  fun getReminderSuspensions(promise: Promise) {
    try {
      val obj = FocusLockUsageLimits.getSuspensions(reactContext)
      val result = Arguments.createMap()
      obj.keys().forEach { pkg ->
        obj.optJSONObject(pkg)?.let { result.putMap(pkg, jsonToWritableMap(it)) }
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("E_SUSPEND_READ", "Suspensions could not be read.", error)
    }
  }

  @ReactMethod
  fun setStrictModePolicy(policy: ReadableMap, promise: Promise) {
    try {
      val strictLevel = if (policy.hasKey("strictLevel")) policy.getInt("strictLevel") else 1
      val pinProtection = policy.hasKey("pinProtection") && policy.getBoolean("pinProtection")
      val hasConfiguredPin = policy.hasKey("hasConfiguredPin") && policy.getBoolean("hasConfiguredPin")
      val limitEmergencyExits = policy.hasKey("limitEmergencyExits") && policy.getBoolean("limitEmergencyExits")
      FocusLockUsageLimits.setStrictPolicy(reactContext, strictLevel, pinProtection, hasConfiguredPin, limitEmergencyExits)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_STRICT_POLICY", "Strict policy could not be updated.", error)
    }
  }

  @ReactMethod
  fun requestEmergencyAccess(packageId: String, source: String?, promise: Promise) {
    try {
      val target = packageId.ifBlank { "*" }
      val appName = if (target == "*") {
        "All Blocked Apps"
      } else {
        runCatching {
          val info = packageManager.getApplicationInfo(target, 0)
          packageManager.getApplicationLabel(info).toString()
        }.getOrDefault(target)
      }
      val res = FocusLockUsageLimits.grantEmergencyPass(reactContext, target, appName, source ?: "app")
      FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
      promise.resolve(jsonToWritableMap(res))
    } catch (error: Exception) {
      promise.reject("E_EMERGENCY_FAILED", error.message ?: "Emergency access failed.", error)
    }
  }

  @ReactMethod
  fun getEmergencyAccessState(promise: Promise) {
    try {
      val state = FocusLockUsageLimits.getEmergencyState(reactContext)
      promise.resolve(jsonToWritableMap(state))
    } catch (error: Exception) {
      promise.reject("E_EMERGENCY_READ", "Emergency access state could not be read.", error)
    }
  }
  @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) { }
  @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) { }

  private fun updatePackages(packageId: String, add: Boolean, promise: Promise) {
    try {
      require(packageId.matches(Regex("[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)+")) && !isCriticalPackage(packageId))
      val updatedList = synchronized(sessionLock) {
        val sessionJson = readSessionJson()
          ?.takeIf { it.optString("status") == "active" && !FocusLockSessionTiming.isExpired(reactContext, it) }
          ?: throw IllegalStateException("No active session")
        val pkgsArray = sessionJson.optJSONArray("packageIds")
        val packages = mutableSetOf<String>()
        if (pkgsArray != null) {
          for (i in 0 until pkgsArray.length()) {
            val item = pkgsArray.optString(i, "")
            if (item.isNotEmpty()) packages.add(item)
          }
        }
        if (add) packages.add(packageId) else packages.remove(packageId)
        val sorted = packages.toList()
        sessionJson.put("packageIds", org.json.JSONArray().also { array -> sorted.forEach(array::put) })
        prefs.edit().putString(SESSION_KEY, sessionJson.toString()).commit()
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

  private fun areNotificationsEnabled(): Boolean =
    (reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)?.areNotificationsEnabled() == true

  private fun isBatteryOptimizationIgnored(): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
      (reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager)?.isIgnoringBatteryOptimizations(reactContext.packageName) == true

  private fun isDndAccessGranted(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false
    val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return false
    return nm.isNotificationPolicyAccessGranted
  }

  private fun applyDndState(enabled: Boolean): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false
    val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return false
    if (!nm.isNotificationPolicyAccessGranted) return false
    if (enabled) {
      if (!prefs.contains(PREV_DND_FILTER_KEY)) {
        prefs.edit().putInt(PREV_DND_FILTER_KEY, nm.currentInterruptionFilter).apply()
      }
      nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
      return true
    }
    if (prefs.contains(PREV_DND_FILTER_KEY)) {
      val prev = prefs.getInt(PREV_DND_FILTER_KEY, NotificationManager.INTERRUPTION_FILTER_ALL)
      prefs.edit().remove(PREV_DND_FILTER_KEY).apply()
      nm.setInterruptionFilter(prev)
    }
    return true
  }

  private fun isCriticalPackage(packageId: String) = isCriticalPackageStatic(packageId)

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

  private fun readSessionJson(): org.json.JSONObject? {
    val json = prefs.getString(SESSION_KEY, null) ?: return null
    return try {
      org.json.JSONObject(json)
    } catch (_: Exception) {
      clearSession()
      null
    }
  }

  private fun jsonArrayToWritableArray(arrayJson: org.json.JSONArray): com.facebook.react.bridge.WritableArray {
    val result = Arguments.createArray()
    for (i in 0 until arrayJson.length()) {
      when (val item = arrayJson.get(i)) {
        is String -> if (item.isNotEmpty()) result.pushString(item)
        is Number -> result.pushDouble(item.toDouble())
        is Boolean -> result.pushBoolean(item)
        is org.json.JSONObject -> result.pushMap(jsonToWritableMap(item))
        is org.json.JSONArray -> result.pushArray(jsonArrayToWritableArray(item))
      }
    }
    return result
  }

  private fun jsonToWritableMap(objectJson: org.json.JSONObject): WritableMap {
    val result = Arguments.createMap()
    objectJson.keys().forEach { key ->
      when (val value = objectJson.get(key)) {
        is String -> result.putString(key, value)
        is Number -> result.putDouble(key, value.toDouble())
        is Boolean -> result.putBoolean(key, value)
        is org.json.JSONObject -> result.putMap(key, jsonToWritableMap(value))
        is org.json.JSONArray -> result.putArray(key, jsonArrayToWritableArray(value))
      }
    }
    return result
  }

  private fun readSession(): WritableMap? = readSessionJson()?.let { jsonToWritableMap(it) }

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
    const val PREV_DND_FILTER_KEY = "previous_dnd_filter"
    const val RESTART_RECOVERY_KEY = "restart_recovery_enabled"
    const val MAX_SESSION_MS = 30L * 24 * 60 * 60 * 1000
    fun emitGlobal(name: String, payload: WritableMap) { instance?.emit(name, payload) }
    fun recordBlockedAttemptGlobal(packageId: String) { instance?.recordBlockedAttemptInternal(packageId) }
    fun isCriticalPackageStatic(packageId: String): Boolean =
      packageId == "com.android.systemui" ||
        packageId == "com.android.settings" ||
        packageId == "com.android.phone" ||
        packageId == "com.google.android.dialer" ||
        packageId.startsWith("com.android.launcher") ||
        packageId.startsWith("com.google.android.apps.nexuslauncher")
  }
}
