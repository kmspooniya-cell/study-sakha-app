package com.anonymous.agonpreview

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log
import com.facebook.react.bridge.Arguments

object FocusLockAlarm {
  private const val TAG = "StudySakhaFocusLock"
  private const val ACTION = "com.anonymous.agonpreview.FOCUS_LOCK_EXPIRED"
  private const val ACTION_EMERGENCY_EXPIRED = "com.anonymous.agonpreview.FOCUS_LOCK_EMERGENCY_EXPIRED"
  private const val EXTRA_SESSION_ID = "sessionId"

  fun canScheduleExactAlarms(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      context.getSystemService(AlarmManager::class.java)?.canScheduleExactAlarms() == true

  fun schedule(context: Context, sessionId: String, triggerElapsedMs: Long): Boolean {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return false
    val intent = pending(context, sessionId)
    val safeTrigger = triggerElapsedMs.coerceAtLeast(SystemClock.elapsedRealtime() + 1000L)
    return try {
      if (canScheduleExactAlarms(context)) {
        manager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent)
        true
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Log.i(TAG, "Exact alarm unavailable; using inexact allow-while-idle fallback")
        manager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent)
        false
      } else {
        manager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent)
        false
      }
    } catch (err: SecurityException) {
      Log.w(TAG, "Exact alarm SecurityException; falling back to inexact alarm: ${err.javaClass.simpleName}")
      runCatching {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          manager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent)
        } else {
          manager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent)
        }
      }
      false
    } catch (err: Exception) {
      Log.w(TAG, "Alarm schedule fallback: ${err.javaClass.simpleName}")
      runCatching { manager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent) }
      false
    }
  }

  fun cancel(context: Context) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    runCatching { manager.cancel(pending(context, null)) }
  }

  fun scheduleEmergencyExpiry(context: Context, triggerElapsedMs: Long): Boolean {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return false
    val intent = emergencyPending(context)
    val safeTrigger = triggerElapsedMs.coerceAtLeast(SystemClock.elapsedRealtime() + 1000L)
    return try {
      if (canScheduleExactAlarms(context)) {
        manager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent)
        true
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        manager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent)
        false
      } else {
        manager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent)
        false
      }
    } catch (_: Exception) {
      runCatching { manager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, safeTrigger, intent) }
      false
    }
  }

  fun cancelEmergencyExpiry(context: Context) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    runCatching { manager.cancel(emergencyPending(context)) }
  }

  private fun emergencyPending(context: Context) = PendingIntent.getBroadcast(
    context,
    92,
    Intent(context, Receiver::class.java).setAction(ACTION_EMERGENCY_EXPIRED),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

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
      if (intent?.action == ACTION_EMERGENCY_EXPIRED) {
        synchronized(FocusLockModule.sessionLock) {
          val state = FocusLockUsageLimits.getEmergencyState(context)
          val pass = state.optJSONObject("activePass")
          if (pass != null && FocusLockUsageLimits.isEmergencyPassExpired(context, pass)) {
            state.remove("activePass")
            context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
              .edit()
              .putString(FocusLockUsageLimits.EMERGENCY_STATE_KEY, state.toString())
              .commit()
          }
        }
        runCatching { FocusLockAccessibilityService.instance?.recheckForegroundOnEmergencyExpiry() }
        runCatching { FocusLockModule.emitGlobal("onEmergencyAccessExpired", Arguments.createMap()) }
        return
      }
      if (intent?.action != ACTION) return
      val expectedSessionId = intent.getStringExtra(EXTRA_SESSION_ID) ?: ""
      val expiredSessionId = synchronized(FocusLockModule.sessionLock) {
        val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(FocusLockModule.SESSION_KEY, null) ?: return@synchronized null
        val parsed = runCatching { org.json.JSONObject(raw) }.getOrNull()
        if (parsed == null) {
          prefs.edit().remove(FocusLockModule.SESSION_KEY).commit()
          return@synchronized null
        }
        val currentId = parsed.optString("id")
        val status = parsed.optString("status")
        if (status != "active") return@synchronized null
        if (expectedSessionId.isNotEmpty() && currentId != expectedSessionId) return@synchronized null

        val remaining = FocusLockSessionTiming.remainingMs(context, parsed)
        if (remaining > 5000L) {
          if (FocusLockSessionTiming.rebaseForBootOrClockChange(context, parsed)) {
            prefs.edit().putString(FocusLockModule.SESSION_KEY, parsed.toString()).commit()
            schedule(context, currentId, parsed.optLong("endsElapsedMs"))
          }
          return@synchronized null
        }

        FocusLockSessionTiming.recordPendingCompletion(context, parsed)
        prefs.edit().remove(FocusLockModule.SESSION_KEY).commit()
        currentId
      } ?: return
      runCatching {
        FocusLockModule.emitGlobal("onSessionExpired", Arguments.createMap().apply { putString("sessionId", expiredSessionId) })
      }
    }
  }
}
