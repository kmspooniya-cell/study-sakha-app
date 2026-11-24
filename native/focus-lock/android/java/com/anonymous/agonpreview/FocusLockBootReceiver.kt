package com.anonymous.agonpreview

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

class FocusLockBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED && intent?.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(FocusLockModule.SESSION_KEY, null) ?: return
    val endsAt = runCatching { JSONObject(raw).optLong("endsAt") }.getOrDefault(0L)
    if (endsAt > System.currentTimeMillis()) FocusLockAlarm.schedule(context, endsAt)
    else prefs.edit().remove(FocusLockModule.SESSION_KEY).apply()
  }
}
