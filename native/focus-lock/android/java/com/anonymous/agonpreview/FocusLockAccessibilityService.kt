package com.anonymous.agonpreview

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.inputmethod.InputMethodManager
import org.json.JSONObject

class FocusLockAccessibilityService : AccessibilityService() {
  private var lastBlockedPackage: String? = null
  private var lastBlockedElapsedMs = 0L
  @Volatile private var currentForegroundPackage: String? = null
  @Volatile private var currentForegroundSinceElapsed = 0L

  @Volatile private var cachedRawSession: String? = null
  @Volatile private var cachedSession: JSONObject? = null
  @Volatile private var cachedStrategy: String = "block"
  @Volatile private var cachedPackages: Set<String> = emptySet()
  @Volatile private var cachedAllowedPackages: Set<String> = emptySet()
  @Volatile private var cachedLimits: Map<String, Int> = emptyMap()

  private val mainHandler = Handler(Looper.getMainLooper())
  private val limitCheckRunnable = Runnable {
    val pkg = currentForegroundPackage ?: return@Runnable
    evaluatePackage(pkg, isTimerTick = true)
  }

  private val prefsListener = SharedPreferences.OnSharedPreferenceChangeListener { prefs, key ->
    when (key) {
      FocusLockModule.SESSION_KEY -> reloadSessionCache(prefs.getString(FocusLockModule.SESSION_KEY, null))
      FocusLockUsageLimits.LIMITS_KEY -> cachedLimits = FocusLockUsageLimits.getAppLimits(this)
    }
  }

  override fun onServiceConnected() {
    instance = this
    val prefs = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
    prefs.registerOnSharedPreferenceChangeListener(prefsListener)
    reloadSessionCache(prefs.getString(FocusLockModule.SESSION_KEY, null))
    cachedLimits = FocusLockUsageLimits.getAppLimits(this)
    Log.i(TAG, "AccessibilityService connected")
  }

  private fun reloadSessionCache(raw: String?) {
    if (raw == cachedRawSession) return
    if (raw.isNullOrBlank()) {
      cachedRawSession = null
      cachedSession = null
      cachedStrategy = "block"
      cachedPackages = emptySet()
      cachedAllowedPackages = emptySet()
      return
    }
    try {
      val session = JSONObject(raw)
      if (session.optString("status") != "active") {
        cachedRawSession = raw
        cachedSession = null
        cachedStrategy = "block"
        cachedPackages = emptySet()
        cachedAllowedPackages = emptySet()
        return
      }
      val strategy = if (session.optString("strategy") == "allow") "allow" else "block"
      val packagesArray = session.optJSONArray("packageIds")
      val nextPackages = HashSet<String>(packagesArray?.length() ?: 0)
      if (packagesArray != null) {
        for (i in 0 until packagesArray.length()) {
          val id = packagesArray.optString(i)
          if (id.isNotEmpty()) nextPackages.add(id)
        }
      }
      val allowedArray = session.optJSONArray("allowedPackageIds")
      val nextAllowed = HashSet<String>(allowedArray?.length() ?: 0)
      if (allowedArray != null) {
        for (i in 0 until allowedArray.length()) {
          val id = allowedArray.optString(i)
          if (id.isNotEmpty()) nextAllowed.add(id)
        }
      }
      cachedRawSession = raw
      cachedSession = session
      cachedStrategy = strategy
      cachedPackages = nextPackages
      cachedAllowedPackages = nextAllowed
    } catch (error: Exception) {
      Log.w(TAG, "Corrupted session cache cleared: ${error.javaClass.simpleName}")
      cachedRawSession = null
      cachedSession = null
      cachedStrategy = "block"
      cachedPackages = emptySet()
      cachedAllowedPackages = emptySet()
    }
  }

  private fun isInputMethodPackage(packageId: String): Boolean {
    return runCatching {
      val imm = getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager ?: return false
      imm.enabledInputMethodList.any { it.packageName == packageId }
    }.getOrDefault(false)
  }

  private fun isLauncherOrSystemPackage(packageId: String): Boolean {
    if (FocusLockModule.isCriticalPackageStatic(packageId)) return true
    if (packageId == "com.android.vending" || packageId == "com.google.android.packageinstaller" || packageId == "com.android.packageinstaller") {
      return false
    }
    val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    val resolvedHome = packageManager.resolveActivity(homeIntent, 0)?.activityInfo?.packageName
    return packageId == resolvedHome
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    val packageId = event?.packageName?.toString() ?: return
    if (packageId == applicationContext.packageName) {
      if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
        lastBlockedPackage = null
        currentForegroundPackage = null
        mainHandler.removeCallbacks(limitCheckRunnable)
      }
      return
    }
    if (isInputMethodPackage(packageId)) return

    if (isLauncherOrSystemPackage(packageId)) {
      if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
        lastBlockedPackage = null
        currentForegroundPackage = null
        mainHandler.removeCallbacks(limitCheckRunnable)
      }
      return
    }

    if (currentForegroundPackage != packageId) {
      currentForegroundPackage = packageId
      currentForegroundSinceElapsed = SystemClock.elapsedRealtime()
      lastBlockedPackage = null
    }

    evaluatePackage(packageId, isTimerTick = false)
  }

  fun recheckForegroundOnEmergencyExpiry() {
    lastBlockedPackage = null
    val pkg = currentForegroundPackage ?: return
    mainHandler.post { evaluatePackage(pkg, isTimerTick = false) }
  }

  private fun evaluatePackage(packageId: String, isTimerTick: Boolean) {
    mainHandler.removeCallbacks(limitCheckRunnable)
    val nowMs = System.currentTimeMillis()
    val underEmergencyPass = FocusLockUsageLimits.isPackageUnderEmergencyPass(this, packageId, nowMs)

    // Policy A: Active Focus Lock Study Session
    val activeSession = cachedSession
    if (activeSession != null) {
      if (FocusLockSessionTiming.isExpired(this, activeSession)) {
        val rawSnapshot = cachedRawSession
        val prefs = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
        synchronized(FocusLockModule.sessionLock) {
          if (prefs.getString(FocusLockModule.SESSION_KEY, null) == rawSnapshot) {
            FocusLockSessionTiming.recordPendingCompletion(this, activeSession)
            prefs.edit().remove(FocusLockModule.SESSION_KEY).commit()
          }
        }
        reloadSessionCache(null)
      } else {
        val blockedBySession = if (cachedStrategy == "allow") {
          if (cachedAllowedPackages.isNotEmpty()) {
            !cachedAllowedPackages.contains(packageId)
          } else {
            cachedPackages.contains(packageId)
          }
        } else {
          cachedPackages.contains(packageId)
        }
        if (blockedBySession && !underEmergencyPass) {
          launchIntervention(
            packageId = packageId,
            reason = "session",
            limitMins = 0,
            usedMs = FocusLockUsageLimits.getPackageUsedMsToday(this, packageId, nowMs),
            isTimerTick = isTimerTick,
          )
          return
        }
      }
    }

    // Policy B: Independent Per-App Daily Usage Limit
    val limitMins = cachedLimits[packageId] ?: 0
    if (limitMins > 0 && !FocusLockUsageLimits.isReminderSuspended(this, packageId, nowMs) && !underEmergencyPass) {
      var usedMs = FocusLockUsageLimits.getPackageUsedMsToday(this, packageId, nowMs)
      if (currentForegroundPackage == packageId && currentForegroundSinceElapsed > 0L) {
        val liveDelta = (SystemClock.elapsedRealtime() - currentForegroundSinceElapsed).coerceAtLeast(0L)
        if (usedMs == 0L && liveDelta > 0L) {
          usedMs = liveDelta
        }
      }
      val limitMs = limitMins * 60_000L
      if (usedMs >= limitMs) {
        launchIntervention(
          packageId = packageId,
          reason = "usage_limit",
          limitMins = limitMins,
          usedMs = usedMs,
          isTimerTick = isTimerTick,
        )
        return
      }
      // Schedule an in-app timer recheck so crossing the limit triggers immediately without app switch.
      val remainingMs = (limitMs - usedMs).coerceIn(1000L, 15_000L)
      mainHandler.postDelayed(limitCheckRunnable, remainingMs)
    }
  }

  private fun launchIntervention(
    packageId: String,
    reason: String,
    limitMins: Int,
    usedMs: Long,
    isTimerTick: Boolean,
  ) {
    val elapsedNow = SystemClock.elapsedRealtime()
    if (!isTimerTick && lastBlockedPackage == packageId && elapsedNow - lastBlockedElapsedMs < BURST_DEBOUNCE_MS) {
      return
    }
    lastBlockedPackage = packageId
    lastBlockedElapsedMs = elapsedNow
    runCatching { FocusLockModule.recordBlockedAttemptGlobal(packageId) }
    val intent = Intent(this, FocusLockBlockingActivity::class.java)
      .addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
          Intent.FLAG_ACTIVITY_NO_ANIMATION
      )
      .putExtra("packageId", packageId)
      .putExtra("reason", reason)
      .putExtra("limitMins", limitMins)
      .putExtra("usedMs", usedMs)
    runCatching { startActivity(intent) }
      .onFailure { err -> Log.w(TAG, "Blocking overlay launch failed: ${err.javaClass.simpleName}") }
  }

  override fun onInterrupt() {
    Log.w(TAG, "AccessibilityService interrupted")
  }

  override fun onDestroy() {
    mainHandler.removeCallbacks(limitCheckRunnable)
    runCatching {
      getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
        .unregisterOnSharedPreferenceChangeListener(prefsListener)
    }
    reloadSessionCache(null)
    if (instance === this) instance = null
    super.onDestroy()
  }

  companion object {
    private const val TAG = "StudySakhaFocusLock"
    const val BURST_DEBOUNCE_MS = 150L
    @Volatile var instance: FocusLockAccessibilityService? = null
  }
}
