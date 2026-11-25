package com.anonymous.agonpreview

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments

object FocusLockAlarm {
  private const val ACTION = "com.anonymous.agonpreview.FOCUS_LOCK_EXPIRED"
  private const val EXTRA_SESSION_ID = "sessionId"

  fun schedule(context: Context, sessionId: String, endsAt: Long) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    val intent = pending(context, sessionId)
    try {
      manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endsAt, intent)
    } catch (_: Exception) {
      runCatching { manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endsAt, intent) }
    }
  }

  fun cancel(context: Context) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    runCatching { manager.cancel(pending(context, null)) }
  }

  private fun pending(context: Context, sessionId: String?) = PendingIntent.getBroadcast(
    context,
    91,
    Intent(context, Receiver::class.java).setAction(ACTION).apply {
      if (!sessionId.isNullOrEmpty()) putExtra(EXTRA_SESSION_ID, sessionId)
    },
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  class Receiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
      if (intent?.action != ACTION) return
      val expectedSessionId = intent.getStringExtra(EXTRA_SESSION_ID) ?: ""
      val expiredSessionId = synchronized(FocusLockModule.sessionLock) {
        val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(FocusLockModule.SESSION_KEY, null) ?: return@synchronized null
        val parsed = runCatching { org.json.JSONObject(raw) }.getOrNull()
        if (parsed == null) {
          prefs.edit().remove(FocusLockModule.SESSION_KEY).apply()
          return@synchronized null
        }
        val currentId = parsed.optString("id")
        val status = parsed.optString("status")
        val endsAt = parsed.optLong("endsAt", 0L)
        if (status != "active") return@synchronized null
        if (expectedSessionId.isNotEmpty() && currentId != expectedSessionId) return@synchronized null
        if (endsAt > System.currentTimeMillis() + 5000L) return@synchronized null
        prefs.edit().remove(FocusLockModule.SESSION_KEY).apply()
        currentId
      } ?: return
      runCatching {
        FocusLockModule.emitGlobal("onSessionExpired", Arguments.createMap().apply { putString("sessionId", expiredSessionId) })
      }
    }
  }
}
