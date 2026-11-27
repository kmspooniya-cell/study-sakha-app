package com.anonymous.agonpreview

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.content.SharedPreferences
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject

class FocusLockAccessibilityService : AccessibilityService() {
  private var lastBlockedPackage: String? = null
  private var lastBlockedElapsedMs = 0L
  @Volatile private var cachedRawSession: String? = null
  @Volatile private var cachedSession: JSONObject? = null
  @Volatile private var cachedPackages: Set<String> = emptySet()

  private val prefsListener = SharedPreferences.OnSharedPreferenceChangeListener { prefs, key ->
    if (key == FocusLockModule.SESSION_KEY) {
      reloadSessionCache(prefs.getString(FocusLockModule.SESSION_KEY, null))
    }
  }

  override fun onServiceConnected() {
    instance = this
    val prefs = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
    prefs.registerOnSharedPreferenceChangeListener(prefsListener)
    reloadSessionCache(prefs.getString(FocusLockModule.SESSION_KEY, null))
    Log.i(TAG, "AccessibilityService connected")
  }

  private fun reloadSessionCache(raw: String?) {
    if (raw == cachedRawSession) return
    if (raw.isNullOrBlank()) {
      cachedRawSession = null
      cachedSession = null
      cachedPackages = emptySet()
      return
    }
    try {
      val session = JSONObject(raw)
      if (session.optString("status") != "active") {
        cachedRawSession = raw
        cachedSession = null
        cachedPackages = emptySet()
        return
      }
      val packagesArray = session.optJSONArray("packageIds")
      val nextPackages = HashSet<String>(packagesArray?.length() ?: 0)
      if (packagesArray != null) {
        for (i in 0 until packagesArray.length()) {
          val id = packagesArray.optString(i)
          if (id.isNotEmpty()) nextPackages.add(id)
        }
      }
      cachedRawSession = raw
      cachedSession = session
      cachedPackages = nextPackages
    } catch (error: Exception) {
      Log.w(TAG, "Corrupted session cache cleared: ${error.javaClass.simpleName}")
      cachedRawSession = null
      cachedSession = null
      cachedPackages = emptySet()
    }
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    val activeSession = cachedSession ?: return
    val packages = cachedPackages
    if (packages.isEmpty()) return

    val packageId = event?.packageName?.toString() ?: return
    if (packageId == applicationContext.packageName) return

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
      return
    }

    if (packages.contains(packageId)) {
      val elapsedNow = SystemClock.elapsedRealtime()
      if (lastBlockedPackage == packageId && elapsedNow - lastBlockedElapsedMs < BURST_DEBOUNCE_MS) return
      lastBlockedPackage = packageId
      lastBlockedElapsedMs = elapsedNow
      runCatching { FocusLockModule.recordBlockedAttemptGlobal(packageId) }
      val intent = Intent(this, FocusLockBlockingActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        .putExtra("packageId", packageId)
      runCatching { startActivity(intent) }
        .onFailure { err -> Log.w(TAG, "Blocking overlay launch failed: ${err.javaClass.simpleName}") }
    } else if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      lastBlockedPackage = null
    }
  }

  override fun onInterrupt() {
    Log.w(TAG, "AccessibilityService interrupted")
  }

  override fun onDestroy() {
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
    const val BURST_DEBOUNCE_MS = 350L
    @Volatile var instance: FocusLockAccessibilityService? = null
  }
}
