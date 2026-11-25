package com.anonymous.agonpreview

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

class FocusLockBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED && intent?.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    synchronized(FocusLockModule.sessionLock) {
      val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
      val raw = prefs.getString(FocusLockModule.SESSION_KEY, null) ?: return
      val parsed = runCatching { JSONObject(raw) }.getOrNull()
      val sessionId = parsed?.optString("id") ?: ""
      val isActive = parsed?.optString("status") == "active"
      val endsAt = parsed?.optLong("endsAt") ?: 0L
      if (isActive && sessionId.isNotEmpty() && endsAt > System.currentTimeMillis()) {
        FocusLockAlarm.schedule(context, sessionId, endsAt)
      } else {
        prefs.edit().remove(FocusLockModule.SESSION_KEY).apply()
      }
    }
  }
}
