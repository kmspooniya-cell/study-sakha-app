package com.anonymous.agonpreview

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONObject

class FocusLockBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    if (
      action != Intent.ACTION_BOOT_COMPLETED &&
      action != Intent.ACTION_MY_PACKAGE_REPLACED &&
      action != Intent.ACTION_TIME_CHANGED &&
      action != Intent.ACTION_TIMEZONE_CHANGED
    ) return

    synchronized(FocusLockModule.sessionLock) {
      val nextEmergencyElapsed = FocusLockUsageLimits.rebaseEmergencyPassOnBootOrClockChange(context)
      if (nextEmergencyElapsed != null) {
        FocusLockAlarm.scheduleEmergencyExpiry(context, nextEmergencyElapsed)
      } else {
        FocusLockAlarm.cancelEmergencyExpiry(context)
      }

      val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
      val raw = prefs.getString(FocusLockModule.SESSION_KEY, null) ?: return
      val parsed = runCatching { JSONObject(raw) }.getOrNull()
      val sessionId = parsed?.optString("id") ?: ""
      val status = parsed?.optString("status") ?: ""
      val isActiveOrPaused = status == "active" || status == "paused"
      val recoveryEnabled = prefs.getBoolean(FocusLockModule.RESTART_RECOVERY_KEY, true)

      if (action == Intent.ACTION_BOOT_COMPLETED && !recoveryEnabled) {
        Log.i("StudySakhaFocusLock", "Boot recovery disabled by user preference; clearing session")
        if (status == "active" && sessionId.isNotEmpty() && parsed != null) {
          FocusLockSessionTiming.recordPendingCompletion(context, parsed)
        }
        prefs.edit().remove(FocusLockModule.SESSION_KEY).commit()
        FocusLockAlarm.cancel(context)
        return
      }

      if (isActiveOrPaused && sessionId.isNotEmpty() && FocusLockSessionTiming.rebaseForBootOrClockChange(context, parsed!!)) {
        prefs.edit().putString(FocusLockModule.SESSION_KEY, parsed.toString()).commit()
        if (status == "active") {
          FocusLockAlarm.schedule(context, sessionId, parsed.optLong("endsElapsedMs"))
          Log.i("StudySakhaFocusLock", "Rebased active session on $action")
        } else {
          FocusLockAlarm.cancel(context)
        }
      } else {
        Log.i("StudySakhaFocusLock", "Session expired or invalid on $action; recording pending completion if active")
        if (status == "active" && sessionId.isNotEmpty() && parsed != null) {
          FocusLockSessionTiming.recordPendingCompletion(context, parsed)
        }
        prefs.edit().remove(FocusLockModule.SESSION_KEY).commit()
      }
    }
  }
}
