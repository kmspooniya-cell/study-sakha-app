package com.anonymous.agonpreview

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

object AlarmEngineScheduler {
  const val PREFS = "study_sakha_alarm_engine"
  const val SCHEDULES_KEY = "alarm_snapshot"
  const val PENDING_KEY = "pending_alarm"
  const val PENDING_ACTION_KEY = "pending_alarm_action"
  const val ACTION_FIRE = "com.anonymous.agonpreview.STUDY_SAKHA_ALARM_FIRE"
  const val ACTION_SNOOZE = "com.anonymous.agonpreview.STUDY_SAKHA_ALARM_SNOOZE"
  const val ACTION_DISMISS_NOTIFICATION = "com.anonymous.agonpreview.STUDY_SAKHA_ALARM_DISMISS_NOTIFICATION"
  const val ACTION_SNOOZE_NOTIFICATION = "com.anonymous.agonpreview.STUDY_SAKHA_ALARM_SNOOZE_NOTIFICATION"
  const val EXTRA_ALARM_ID = "alarmId"
  const val EXTRA_TITLE = "title"
  const val EXTRA_SOUND_ID = "soundId"
  const val EXTRA_VOLUME = "volume"
  const val EXTRA_GRADUAL_VOLUME = "gradualVolume"
  const val EXTRA_VIBRATION = "vibration"
  const val EXTRA_VIBRATION_PATTERN = "vibrationPattern"
  const val EXTRA_SNOOZE_ENABLED = "snoozeEnabled"
  const val EXTRA_SNOOZE_DURATION = "snoozeDuration"
  const val EXTRA_ANTI_SNOOZE = "antiSnooze"

  fun sync(context: Context, snapshot: String) {
    val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val previous = runCatching { JSONObject(preferences.getString(SCHEDULES_KEY, "{}") ?: "{}") }.getOrNull()
    cancelSnapshot(context, previous)
    preferences.edit().putString(SCHEDULES_KEY, snapshot).apply()
    scheduleSnapshot(context, runCatching { JSONObject(snapshot) }.getOrNull())
  }

  fun rescheduleStored(context: Context) {
    val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val snapshot = runCatching { JSONObject(preferences.getString(SCHEDULES_KEY, "{}") ?: "{}") }.getOrNull()
    cancelSnapshot(context, snapshot)
    scheduleSnapshot(context, snapshot)
  }

  fun handleAlarmFiredInStore(context: Context, alarmId: String) {
    val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val raw = preferences.getString(SCHEDULES_KEY, null) ?: return
    val snapshot = runCatching { JSONObject(raw) }.getOrNull() ?: return
    val alarms = snapshot.optJSONArray("alarms") ?: return
    var modified = false
    for (index in 0 until alarms.length()) {
      val alarm = alarms.optJSONObject(index) ?: continue
      if (alarm.optString("id") != alarmId) continue
      val days = alarm.optJSONArray("days")
      val hasRepeatDays = days != null && days.length() > 0
      val hasSpecificDate = alarm.optString("specificDate", "").isNotBlank()
      if (!hasRepeatDays && !hasSpecificDate) {
        alarm.put("enabled", false)
        modified = true
      }
    }
    if (modified) {
      preferences.edit().putString(SCHEDULES_KEY, snapshot.toString()).apply()
    }
    rescheduleStored(context)
  }

  fun cancelAlarm(context: Context, alarmId: String) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    manager.cancel(pendingIntent(context, ACTION_FIRE, alarmId, stableRequestCode(alarmId, false)))
    manager.cancel(pendingIntent(context, ACTION_SNOOZE, alarmId, stableRequestCode(alarmId, true)))
  }

  fun cancelSnooze(context: Context, alarmId: String) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    manager.cancel(pendingIntent(context, ACTION_SNOOZE, alarmId, stableRequestCode(alarmId, true)))
  }

  fun setPendingAlarm(context: Context, alarmId: String, title: String) {
    val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    preferences.edit().putString(
      PENDING_KEY,
      JSONObject().apply {
        put("alarmId", alarmId)
        put("title", title)
      }.toString(),
    ).apply()
  }

  fun clearPendingAlarm(context: Context, alarmId: String?) {
    val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (alarmId.isNullOrBlank()) {
      preferences.edit().remove(PENDING_KEY).apply()
      return
    }
    val raw = preferences.getString(PENDING_KEY, null) ?: return
    val currentId = runCatching { JSONObject(raw).optString("alarmId") }.getOrNull()
    if (currentId == alarmId) {
      preferences.edit().remove(PENDING_KEY).apply()
    }
  }

  fun recordPendingAction(context: Context, alarmId: String, action: String, snoozeMinutes: Int = 0) {
    val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    preferences.edit().putString(
      PENDING_ACTION_KEY,
      JSONObject().apply {
        put("alarmId", alarmId)
        put("action", action)
        put("snoozeMinutes", snoozeMinutes)
        put("atMillis", System.currentTimeMillis())
      }.toString(),
    ).apply()
  }

  fun scheduleSnooze(
    context: Context,
    alarmId: String,
    atMillis: Long,
    title: String,
    soundId: String,
    volume: Int,
    gradualVolume: Boolean,
    vibration: Boolean,
    vibrationPattern: String,
  ) {
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    val intent = pendingIntent(context, ACTION_SNOOZE, alarmId, stableRequestCode(alarmId, true)) {
      putExtra(EXTRA_TITLE, title)
      putExtra(EXTRA_SOUND_ID, soundId)
      putExtra(EXTRA_VOLUME, volume)
      putExtra(EXTRA_GRADUAL_VOLUME, gradualVolume)
      putExtra(EXTRA_VIBRATION, vibration)
      putExtra(EXTRA_VIBRATION_PATTERN, vibrationPattern)
      putExtra(EXTRA_SNOOZE_ENABLED, true)
      putExtra(EXTRA_SNOOZE_DURATION, 5)
      putExtra(EXTRA_ANTI_SNOOZE, false)
    }
    manager.cancel(intent)
    setAlarm(manager, atMillis, intent)
  }

  fun canScheduleExactAlarms(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      context.getSystemService(AlarmManager::class.java)?.canScheduleExactAlarms() == true

  private fun scheduleSnapshot(context: Context, snapshot: JSONObject?) {
    val alarms = snapshot?.optJSONArray("alarms") ?: return
    for (index in 0 until alarms.length()) {
      val alarm = alarms.optJSONObject(index) ?: continue
      if (!alarm.optBoolean("enabled", false) || alarm.optBoolean("skippedOnce", false)) continue
      val id = alarm.optString("id").takeIf { it.isNotBlank() } ?: continue
      val triggerAt = nextOccurrence(alarm) ?: continue
      val intent = pendingIntent(context, ACTION_FIRE, id, stableRequestCode(id, false)) {
        putExtra(EXTRA_TITLE, alarm.optString("title", "Study Sakha Alarm"))
        putExtra(EXTRA_SOUND_ID, alarm.optString("soundId", "default"))
        putExtra(EXTRA_VOLUME, alarm.optInt("volume", 100))
        putExtra(EXTRA_GRADUAL_VOLUME, alarm.optBoolean("gradualVolume", false))
        putExtra(EXTRA_VIBRATION, alarm.optBoolean("vibration", true))
        putExtra(EXTRA_VIBRATION_PATTERN, alarm.optString("vibrationPattern", "Pulse"))
        putExtra(EXTRA_SNOOZE_ENABLED, alarm.optBoolean("snoozeEnabled", true))
        putExtra(EXTRA_SNOOZE_DURATION, alarm.optInt("snoozeDuration", 5))
        putExtra(EXTRA_ANTI_SNOOZE, alarm.optBoolean("antiSnooze", false))
      }
      setAlarm(context.getSystemService(AlarmManager::class.java) ?: continue, triggerAt, intent)
    }
  }

  private fun cancelSnapshot(context: Context, snapshot: JSONObject?) {
    val alarms = snapshot?.optJSONArray("alarms") ?: return
    for (index in 0 until alarms.length()) {
      val id = alarms.optJSONObject(index)?.optString("id") ?: continue
      if (id.isNotBlank()) cancelAlarm(context, id)
    }
  }

  private fun setAlarm(manager: AlarmManager, triggerAt: Long, intent: PendingIntent) {
    runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && manager.canScheduleExactAlarms()) {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent)
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent)
      } else {
        manager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, intent)
      }
    }.onFailure {
      runCatching { manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent) }
    }
  }

  private fun nextOccurrence(alarm: JSONObject, nowMillis: Long = System.currentTimeMillis()): Long? {
    val hour = alarm.optInt("hour", -1)
    val minute = alarm.optInt("minute", -1)
    if (hour !in 0..23 || minute !in 0..59) return null
    val specificDate = alarm.optString("specificDate", "")
    if (specificDate.isNotBlank()) {
      val format = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
      val date = runCatching { format.parse(specificDate) }.getOrNull() ?: return null
      return Calendar.getInstance().apply {
        time = date
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }.timeInMillis.takeIf { it > nowMillis }
    }

    val days = alarm.optJSONArray("days")?.let { array ->
      (0 until array.length()).mapNotNull { dayNumber(array.optString(it)) }.toSet()
    } ?: emptySet()
    for (offset in 0..if (days.isNotEmpty()) 7 else 0) {
      val candidate = Calendar.getInstance().apply {
        timeInMillis = nowMillis
        add(Calendar.DAY_OF_YEAR, offset)
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }
      if (days.isNotEmpty() && candidate.get(Calendar.DAY_OF_WEEK) !in days) continue
      if (candidate.timeInMillis > nowMillis) return candidate.timeInMillis
    }
    return null
  }

  private fun dayNumber(value: String): Int = when (value.take(3).lowercase(Locale.US)) {
    "sun" -> Calendar.SUNDAY
    "mon" -> Calendar.MONDAY
    "tue" -> Calendar.TUESDAY
    "wed" -> Calendar.WEDNESDAY
    "thu" -> Calendar.THURSDAY
    "fri" -> Calendar.FRIDAY
    "sat" -> Calendar.SATURDAY
    else -> -1
  }

  private fun stableRequestCode(alarmId: String, snooze: Boolean): Int =
    (alarmId.hashCode() xor if (snooze) 0x40000000 else 0).and(0x7fffffff)

  private fun pendingIntent(
    context: Context,
    action: String,
    alarmId: String,
    requestCode: Int,
    configureIntent: Intent.() -> Unit = {},
  ): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      requestCode,
      Intent(context, AlarmEngineReceiver::class.java)
        .setAction(action)
        .setData(Uri.parse("studysakha-alarm://$action/$alarmId"))
        .apply {
          putExtra(EXTRA_ALARM_ID, alarmId)
          configureIntent()
        },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
}
