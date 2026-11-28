package com.anonymous.agonpreview

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager

class AlarmEngineReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    val alarmId = intent.getStringExtra(AlarmEngineScheduler.EXTRA_ALARM_ID) ?: return

    when (action) {
      AlarmEngineScheduler.ACTION_FIRE,
      AlarmEngineScheduler.ACTION_SNOOZE -> {
        if (AlarmPlaybackService.isAlarmRinging(alarmId)) {
          return
        }
        val pm = context.getSystemService(PowerManager::class.java)
        val wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "StudySakha:AlarmReceiver")?.apply {
          setReferenceCounted(false)
          acquire(5_000L)
        }
        try {
          val title = intent.getStringExtra(AlarmEngineScheduler.EXTRA_TITLE) ?: "Study Sakha Alarm"
          val heavySleeper = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_HEAVY_SLEEPER, false)
          val missionBeforeSnooze = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_MISSION_BEFORE_SNOOZE, false)
          val serviceIntent = Intent(context, AlarmPlaybackService::class.java).apply {
            putExtra(AlarmEngineScheduler.EXTRA_ALARM_ID, alarmId)
            putExtra(AlarmEngineScheduler.EXTRA_TITLE, title)
            putExtra(AlarmEngineScheduler.EXTRA_SOUND_ID, intent.getStringExtra(AlarmEngineScheduler.EXTRA_SOUND_ID) ?: "default")
            putExtra(AlarmEngineScheduler.EXTRA_VOLUME, intent.getIntExtra(AlarmEngineScheduler.EXTRA_VOLUME, 100))
            putExtra(AlarmEngineScheduler.EXTRA_GRADUAL_VOLUME, intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_GRADUAL_VOLUME, false))
            putExtra(AlarmEngineScheduler.EXTRA_VIBRATION, intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_VIBRATION, true))
            putExtra(AlarmEngineScheduler.EXTRA_VIBRATION_PATTERN, intent.getStringExtra(AlarmEngineScheduler.EXTRA_VIBRATION_PATTERN) ?: "Pulse")
            putExtra(AlarmEngineScheduler.EXTRA_SNOOZE_ENABLED, intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_SNOOZE_ENABLED, true))
            putExtra(AlarmEngineScheduler.EXTRA_SNOOZE_DURATION, intent.getIntExtra(AlarmEngineScheduler.EXTRA_SNOOZE_DURATION, 5))
            putExtra(AlarmEngineScheduler.EXTRA_ANTI_SNOOZE, intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_ANTI_SNOOZE, false))
            putExtra(AlarmEngineScheduler.EXTRA_HEAVY_SLEEPER, heavySleeper)
            putExtra(AlarmEngineScheduler.EXTRA_MISSION_BEFORE_SNOOZE, missionBeforeSnooze)
          }
          AlarmPlaybackService.start(context, serviceIntent)
          AlarmEngineScheduler.setPendingAlarm(context, alarmId, title, heavySleeper, missionBeforeSnooze)
          AlarmEngineModule.emitTriggered(alarmId, title, heavySleeper, missionBeforeSnooze)
          if (action == AlarmEngineScheduler.ACTION_FIRE) {
            AlarmEngineScheduler.handleAlarmFiredInStore(context, alarmId)
          } else {
            AlarmEngineScheduler.clearStoredSnooze(context, alarmId)
          }
        } finally {
          wakeLock?.runCatching { if (isHeld) release() }
        }
      }

      AlarmEngineScheduler.ACTION_DISMISS_NOTIFICATION -> {
        if (AlarmEngineScheduler.isHeavySleeperAlarm(context, alarmId)) {
          return
        }
        AlarmEngineScheduler.cancelSnooze(context, alarmId)
        AlarmEngineScheduler.clearPendingAlarm(context, alarmId)
        AlarmPlaybackService.stop(context, alarmId)
        AlarmEngineScheduler.recordPendingAction(context, alarmId, "dismissed")
        AlarmEngineModule.emitAction(alarmId, "dismissed", 0)
      }

      AlarmEngineScheduler.ACTION_SNOOZE_NOTIFICATION -> {
        val heavySleeper = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_HEAVY_SLEEPER, false)
        val missionBeforeSnooze = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_MISSION_BEFORE_SNOOZE, false)
        if (heavySleeper && missionBeforeSnooze) {
          return
        }
        val mins = intent.getIntExtra(AlarmEngineScheduler.EXTRA_SNOOZE_DURATION, 5).coerceAtLeast(1)
        val title = intent.getStringExtra(AlarmEngineScheduler.EXTRA_TITLE) ?: "Study Sakha Alarm"
        AlarmEngineScheduler.clearPendingAlarm(context, alarmId)
        AlarmPlaybackService.stop(context, alarmId)
        AlarmEngineScheduler.scheduleSnooze(
          context = context,
          alarmId = alarmId,
          atMillis = System.currentTimeMillis() + mins * 60_000L,
          title = title,
          soundId = intent.getStringExtra(AlarmEngineScheduler.EXTRA_SOUND_ID) ?: "default",
          volume = intent.getIntExtra(AlarmEngineScheduler.EXTRA_VOLUME, 100),
          gradualVolume = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_GRADUAL_VOLUME, false),
          vibration = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_VIBRATION, true),
          vibrationPattern = intent.getStringExtra(AlarmEngineScheduler.EXTRA_VIBRATION_PATTERN) ?: "Pulse",
          heavySleeper = heavySleeper,
          missionBeforeSnooze = missionBeforeSnooze,
        )
        AlarmEngineScheduler.recordPendingAction(context, alarmId, "snoozed", mins)
        AlarmEngineModule.emitAction(alarmId, "snoozed", mins)
      }
    }
  }
}
