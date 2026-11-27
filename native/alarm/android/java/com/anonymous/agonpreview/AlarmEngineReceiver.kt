package com.anonymous.agonpreview

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

class AlarmEngineReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    if (action != AlarmEngineScheduler.ACTION_FIRE && action != AlarmEngineScheduler.ACTION_SNOOZE) return
    val alarmId = intent.getStringExtra(AlarmEngineScheduler.EXTRA_ALARM_ID) ?: return
    val title = intent.getStringExtra(AlarmEngineScheduler.EXTRA_TITLE) ?: "Study Sakha Alarm"
    val serviceIntent = Intent(context, AlarmPlaybackService::class.java).apply {
      putExtra(AlarmEngineScheduler.EXTRA_ALARM_ID, alarmId)
      putExtra(AlarmEngineScheduler.EXTRA_TITLE, title)
      putExtra(AlarmEngineScheduler.EXTRA_SOUND_ID, intent.getStringExtra(AlarmEngineScheduler.EXTRA_SOUND_ID) ?: "default")
      putExtra(AlarmEngineScheduler.EXTRA_VOLUME, intent.getIntExtra(AlarmEngineScheduler.EXTRA_VOLUME, 100))
      putExtra(AlarmEngineScheduler.EXTRA_GRADUAL_VOLUME, intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_GRADUAL_VOLUME, false))
      putExtra(AlarmEngineScheduler.EXTRA_VIBRATION, intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_VIBRATION, true))
      putExtra(AlarmEngineScheduler.EXTRA_VIBRATION_PATTERN, intent.getStringExtra(AlarmEngineScheduler.EXTRA_VIBRATION_PATTERN) ?: "Pulse")
    }
    AlarmPlaybackService.start(context, serviceIntent)
    val preferences = context.getSharedPreferences(AlarmEngineScheduler.PREFS, Context.MODE_PRIVATE)
    preferences.edit().putString(AlarmEngineScheduler.PENDING_KEY, JSONObject().apply {
      put("alarmId", alarmId)
      put("title", title)
    }.toString()).apply()
    AlarmEngineModule.emitTriggered(context, alarmId, title)
    if (action == AlarmEngineScheduler.ACTION_FIRE) rescheduleAlarm(context, alarmId)
  }

  private fun rescheduleAlarm(context: Context, alarmId: String) {
    AlarmEngineScheduler.rescheduleStored(context)
  }
}
