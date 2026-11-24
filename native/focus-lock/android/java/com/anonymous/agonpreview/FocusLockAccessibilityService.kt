package com.anonymous.agonpreview

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject

class FocusLockAccessibilityService : AccessibilityService() {
  private var lastBlockedPackage: String? = null
  private var lastBlockedAt = 0L

  override fun onServiceConnected() { instance = this }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    val packageId = event?.packageName?.toString() ?: return
    if (packageId == applicationContext.packageName) return
    val raw = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE).getString(FocusLockModule.SESSION_KEY, null) ?: return
    try {
      val session = JSONObject(raw)
      if (session.optString("status") != "active") return
      if (session.optLong("endsAt") <= System.currentTimeMillis()) {
        getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE).edit().remove(FocusLockModule.SESSION_KEY).apply()
        return
      }
      val packages = session.optJSONArray("packageIds") ?: return
      if ((0 until packages.length()).any { packages.optString(it) == packageId }) {
        val now = System.currentTimeMillis()
        if (lastBlockedPackage == packageId && now - lastBlockedAt < 1500L) return
        lastBlockedPackage = packageId
        lastBlockedAt = now
        FocusLockModule.recordBlockedAttemptGlobal(packageId)
        val intent = Intent(this, FocusLockBlockingActivity::class.java)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
          .putExtra("packageId", packageId)
        startActivity(intent)
      }
    } catch (_: Exception) { }
  }

  override fun onInterrupt() { }
  override fun onDestroy() { if (instance === this) instance = null; super.onDestroy() }

  companion object { @Volatile var instance: FocusLockAccessibilityService? = null }
}
