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
  @Volatile private var currentForegroundBaseUsedMs = 0L

  @Volatile private var cachedRawSession: String? = null
  @Volatile private var cachedSession: JSONObject? = null
  @Volatile private var cachedStrategy: String = "block"
  @Volatile private var cachedPackages: Set<String> = emptySet()
  @Volatile private var cachedAllowedPackages: Set<String> = emptySet()
  @Volatile private var cachedRawLimits: String? = null
  @Volatile private var cachedLimits: Map<String, Int> = emptyMap()

  private val mainHandler = Handler(Looper.getMainLooper())
  private val limitCheckRunnable = Runnable {
    val pkg = currentForegroundPackage ?: return@Runnable
    evaluatePackage(pkg, isTimerTick = true, forceUsageRefresh = true)
  }

  private val prefsListener = SharedPreferences.OnSharedPreferenceChangeListener { prefs, key ->
    when (key) {
      FocusLockModule.SESSION_KEY -> reloadSessionCache(prefs.getString(FocusLockModule.SESSION_KEY, null))
      FocusLockUsageLimits.LIMITS_KEY -> reloadLimitsCache(prefs.getString(FocusLockUsageLimits.LIMITS_KEY, null))
    }
  }

  override fun onServiceConnected() {
    instance = this
    val prefs = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
    prefs.registerOnSharedPreferenceChangeListener(prefsListener)
    syncCachesFromPrefs()
    Log.i(TAG, "AccessibilityService connected; limitsCount=${cachedLimits.size}")
  }

  private fun syncCachesFromPrefs() {
    val prefs = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
    reloadSessionCache(prefs.getString(FocusLockModule.SESSION_KEY, null))
    reloadLimitsCache(prefs.getString(FocusLockUsageLimits.LIMITS_KEY, null))
  }

  private fun reloadLimitsCache(raw: String?) {
    if (raw == cachedRawLimits) return
    cachedRawLimits = raw
    cachedLimits = FocusLockUsageLimits.getAppLimits(this)
    Log.i(TAG, "Limits cache updated; configuredApps=${cachedLimits.size}")
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

  private fun isHomeLauncherPackage(packageId: String): Boolean {
    if (packageId.startsWith("com.android.launcher") || packageId.startsWith("com.google.android.apps.nexuslauncher")) {
      return true
    }
    val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    val resolvedHome = packageManager.resolveActivity(homeIntent, 0)?.activityInfo?.packageName
    return packageId == resolvedHome
  }

  private fun isSystemOrIgnoredPackage(packageId: String): Boolean {
    if (FocusLockModule.isCriticalPackageStatic(packageId)) return true
    if (packageId == "com.android.vending" || packageId == "com.google.android.packageinstaller" || packageId == "com.android.packageinstaller") {
      return false
    }
    return isHomeLauncherPackage(packageId)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    val packageId = event?.packageName?.toString() ?: return
    if (packageId == applicationContext.packageName) {
      if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
        lastBlockedPackage = null
        currentForegroundPackage = null
        currentForegroundBaseUsedMs = 0L
        mainHandler.removeCallbacks(limitCheckRunnable)
      }
      return
    }
    if (isInputMethodPackage(packageId)) return

    if (isSystemOrIgnoredPackage(packageId)) {
      if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && isHomeLauncherPackage(packageId)) {
        lastBlockedPackage = null
        currentForegroundPackage = null
        currentForegroundBaseUsedMs = 0L
        mainHandler.removeCallbacks(limitCheckRunnable)
      }
      return
    }

    val packageChanged = currentForegroundPackage != packageId
    if (packageChanged) {
      currentForegroundPackage = packageId
      currentForegroundSinceElapsed = SystemClock.elapsedRealtime()
      currentForegroundBaseUsedMs = FocusLockUsageLimits.getPackageUsedMsToday(
        this,
        packageId,
        System.currentTimeMillis(),
        forceRefresh = true,
      )
      lastBlockedPackage = null
      Log.d(TAG, "Foreground package detected: pkg=$packageId baseUsedMs=$currentForegroundBaseUsedMs")
    }

    evaluatePackage(packageId, isTimerTick = false, forceUsageRefresh = packageChanged)
  }

  fun refreshLimitsAndRecheck() {
    mainHandler.post {
      syncCachesFromPrefs()
      val pkg = currentForegroundPackage ?: return@post
      lastBlockedPackage = null
      evaluatePackage(pkg, isTimerTick = false, forceUsageRefresh = true)
    }
  }

  fun recheckForegroundOnEmergencyExpiry() {
    lastBlockedPackage = null
    val pkg = currentForegroundPackage ?: return
    mainHandler.post {
      syncCachesFromPrefs()
      evaluatePackage(pkg, isTimerTick = true, forceUsageRefresh = true)
    }
  }

  private fun evaluatePackage(packageId: String, isTimerTick: Boolean, forceUsageRefresh: Boolean = false) {
    mainHandler.removeCallbacks(limitCheckRunnable)
    syncCachesFromPrefs()
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
          val usedMs = FocusLockUsageLimits.getPackageUsedMsToday(this, packageId, nowMs, forceRefresh = true)
          Log.i(TAG, "Blocking decision: pkg=$packageId decision=BLOCK reason=session emergency=$underEmergencyPass")
          launchIntervention(
            packageId = packageId,
            reason = "session",
            limitMins = 0,
            usedMs = usedMs,
            isTimerTick = isTimerTick,
          )
          return
        }
      }
    }

    // Policy B: Independent Per-App Daily Usage Limit
    val limitMins = cachedLimits[packageId] ?: 0
    if (limitMins <= 0) return

    val suspended = FocusLockUsageLimits.isReminderSuspended(this, packageId, nowMs)
    if (suspended || underEmergencyPass) {
      if (isTimerTick || forceUsageRefresh) {
        Log.d(TAG, "Limit check skipped: pkg=$packageId limitMins=$limitMins suspended=$suspended emergency=$underEmergencyPass")
      }
      return
    }

    val queryUsedMs = FocusLockUsageLimits.getPackageUsedMsToday(
      this,
      packageId,
      nowMs,
      forceRefresh = forceUsageRefresh || isTimerTick,
    )
    val liveFloorMs = if (currentForegroundPackage == packageId && currentForegroundSinceElapsed > 0L) {
      val liveDelta = (SystemClock.elapsedRealtime() - currentForegroundSinceElapsed).coerceAtLeast(0L)
      currentForegroundBaseUsedMs + liveDelta
    } else {
      0L
    }
    val usedMs = maxOf(queryUsedMs, liveFloorMs)
    val limitMs = limitMins * 60_000L
    val limitExceeded = usedMs >= limitMs

    if (isTimerTick || forceUsageRefresh || limitExceeded) {
      Log.i(
        TAG,
        "Usage limit evaluation: pkg=$packageId usedMs=$usedMs limitMins=$limitMins limitMs=$limitMs exceeded=$limitExceeded suspended=$suspended emergency=$underEmergencyPass",
      )
    }

    if (limitExceeded) {
      Log.i(TAG, "Blocking decision: pkg=$packageId decision=BLOCK reason=usage_limit usedMs=$usedMs limitMs=$limitMs")
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

  private fun launchIntervention(
    packageId: String,
    reason: String,
    limitMins: Int,
    usedMs: Long,
    isTimerTick: Boolean,
  ) {
    val elapsedNow = SystemClock.elapsedRealtime()
    if (!isTimerTick && lastBlockedPackage == packageId && elapsedNow - lastBlockedElapsedMs < BURST_DEBOUNCE_MS) {
      Log.d(TAG, "Blocking launch debounced; scheduling retry in ${BURST_DEBOUNCE_MS}ms for pkg=$packageId")
      mainHandler.postDelayed(limitCheckRunnable, BURST_DEBOUNCE_MS)
      return
    }
    lastBlockedPackage = packageId
    lastBlockedElapsedMs = elapsedNow
    runCatching { FocusLockModule.recordBlockedAttemptGlobal(packageId) }
    val intent = Intent(this, FocusLockBlockingActivity::class.java)
      .addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_NO_ANIMATION
      )
      .putExtra("packageId", packageId)
      .putExtra("reason", reason)
      .putExtra("limitMins", limitMins)
      .putExtra("usedMs", usedMs)
    runCatching { startActivity(intent) }
      .onSuccess {
        Log.i(TAG, "BlockingActivity launch result: SUCCESS pkg=$packageId reason=$reason")
      }
      .onFailure { err ->
        Log.w(TAG, "BlockingActivity launch result: FAILED pkg=$packageId reason=$reason error=${err.javaClass.simpleName}: ${err.message}")
        mainHandler.postDelayed(limitCheckRunnable, 500L)
      }
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
