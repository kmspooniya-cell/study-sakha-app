package com.anonymous.agonpreview

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments

object FocusLockAlarm {
  private const val ACTION = "com.anonymous.agonpreview.FOCUS_LOCK_EXPIRED"

  fun schedule(context: Context, endsAt: Long) {
    val manager = context.getSystemService(AlarmManager::class.java)
    try {
      manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endsAt, pending(context))
    } catch (_: SecurityException) {
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endsAt, pending(context))
    }
  }

  fun cancel(context: Context) {
    context.getSystemService(AlarmManager::class.java).cancel(pending(context))
  }

  private fun pending(context: Context) = PendingIntent.getBroadcast(
    context,
    91,
    Intent(context, Receiver::class.java).setAction(ACTION),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  class Receiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
      if (intent?.action != ACTION) return
      val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
      val sessionId = runCatching {
        org.json.JSONObject(prefs.getString(FocusLockModule.SESSION_KEY, "{}") ?: "{}").optString("id")
      }.getOrDefault("")
      prefs.edit().remove(FocusLockModule.SESSION_KEY).apply()
      FocusLockModule.emitGlobal("onSessionExpired", Arguments.createMap().apply { putString("sessionId", sessionId) })
    }
  }
}
