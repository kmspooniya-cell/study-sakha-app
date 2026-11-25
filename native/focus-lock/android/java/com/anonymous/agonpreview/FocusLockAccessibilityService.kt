package com.anonymous.agonpreview

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject

class FocusLockAccessibilityService : AccessibilityService() {
  private var lastBlockedPackage: String? = null
  private var lastBlockedAt = 0L
  private var cachedRawSession: String? = null
  private var cachedEndsAt = 0L
  private var cachedPackages: Set<String> = emptySet()

  override fun onServiceConnected() { instance = this }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    val packageId = event?.packageName?.toString() ?: return
    if (packageId == applicationContext.packageName) return
    val prefs = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
    val raw = prefs.getString(FocusLockModule.SESSION_KEY, null) ?: return
    try {
      if (raw != cachedRawSession) {
        val session = JSONObject(raw)
        if (session.optString("status") != "active") {
          cachedRawSession = raw
          cachedEndsAt = 0L
          cachedPackages = emptySet()
          return
        }
        val packagesArray = session.optJSONArray("packageIds")
        val nextPackages = mutableSetOf<String>()
        if (packagesArray != null) {
          for (i in 0 until packagesArray.length()) {
            val id = packagesArray.optString(i)
            if (id.isNotEmpty()) nextPackages.add(id)
          }
        }
        cachedRawSession = raw
        cachedEndsAt = session.optLong("endsAt", 0L)
        cachedPackages = nextPackages
      }
      if (cachedPackages.isEmpty()) return
      val now = System.currentTimeMillis()
      if (cachedEndsAt <= now) {
        synchronized(FocusLockModule.sessionLock) {
          if (prefs.getString(FocusLockModule.SESSION_KEY, null) == raw) {
            prefs.edit().remove(FocusLockModule.SESSION_KEY).apply()
          }
        }
        cachedRawSession = null
        cachedEndsAt = 0L
        cachedPackages = emptySet()
        return
      }
      if (cachedPackages.contains(packageId)) {
        if (lastBlockedPackage == packageId && now - lastBlockedAt < 1500L) return
        lastBlockedPackage = packageId
        lastBlockedAt = now
        runCatching { FocusLockModule.recordBlockedAttemptGlobal(packageId) }
        val intent = Intent(this, FocusLockBlockingActivity::class.java)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
          .putExtra("packageId", packageId)
        startActivity(intent)
      }
    } catch (_: Exception) {
      cachedRawSession = null
      cachedEndsAt = 0L
      cachedPackages = emptySet()
    }
  }

  override fun onInterrupt() { }
  override fun onDestroy() { if (instance === this) instance = null; super.onDestroy() }

  companion object { @Volatile var instance: FocusLockAccessibilityService? = null }
}
