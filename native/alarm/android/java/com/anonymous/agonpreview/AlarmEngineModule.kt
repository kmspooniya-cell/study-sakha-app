package com.anonymous.agonpreview

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

class AlarmEngineModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  init { instance = this }
  override fun getName() = "StudySakhaAlarmEngine"

  @ReactMethod
  fun syncAlarms(snapshot: String, promise: Promise) {
    try {
      val parsed = JSONObject(snapshot)
      require(parsed.optJSONArray("alarms") != null) { "Alarm snapshot must contain an alarms array" }
      AlarmEngineScheduler.sync(reactContext, parsed.toString())
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_ALARM_SYNC", error.message ?: "Alarm schedules could not be synchronized.", error)
    }
  }

  @ReactMethod
  fun cancelAlarm(alarmId: String, promise: Promise) {
    AlarmEngineScheduler.cancelAlarm(reactContext, alarmId)
    promise.resolve(null)
  }

  @ReactMethod
  fun scheduleSnooze(config: ReadableMap, promise: Promise) {
    try {
      val id = config.getString("alarmId")?.takeIf { it.isNotBlank() } ?: throw IllegalArgumentException("Missing alarmId")
      val at = config.getDouble("atMillis").toLong()
      require(at > System.currentTimeMillis()) { "Snooze time must be in the future" }
      AlarmEngineScheduler.scheduleSnooze(
        reactContext,
        id,
        at,
        config.getString("title") ?: "Study Sakha Alarm",
        config.getString("soundId") ?: "default",
        config.getInt("volume"),
        config.getBoolean("vibration"),
        config.getString("vibrationPattern") ?: "Pulse",
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_ALARM_SNOOZE", error.message ?: "Alarm snooze could not be scheduled.", error)
    }
  }

  @ReactMethod
  fun stopAlarm(alarmId: String, promise: Promise) {
    AlarmEngineScheduler.cancelAlarm(reactContext, alarmId)
    AlarmPlaybackService.stop(reactContext, alarmId)
    promise.resolve(null)
  }

  @ReactMethod
  fun consumePendingAlarm(promise: Promise) {
    val preferences = reactContext.getSharedPreferences(AlarmEngineScheduler.PREFS, Context.MODE_PRIVATE)
    val raw = preferences.getString(AlarmEngineScheduler.PENDING_KEY, null)
    if (raw.isNullOrBlank()) {
      promise.resolve(null)
      return
    }
    preferences.edit().remove(AlarmEngineScheduler.PENDING_KEY).apply()
    runCatching {
      val json = JSONObject(raw)
      promise.resolve(Arguments.createMap().apply {
        putString("alarmId", json.optString("alarmId"))
        putString("title", json.optString("title"))
      })
    }.onFailure { promise.resolve(null) }
  }

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) = promise.resolve(AlarmEngineScheduler.canScheduleExactAlarms(reactContext))

  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        reactContext.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${reactContext.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_ALARM_SETTINGS", "Exact alarm settings could not be opened.", error)
    }
  }

  @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) { }
  @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) { }

  companion object {
    @Volatile private var instance: AlarmEngineModule? = null

    fun emitTriggered(context: Context, alarmId: String, title: String) {
      val module = instance ?: return
      if (!module.reactApplicationContext.hasActiveCatalystInstance()) return
      module.reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onStudySakhaAlarmTriggered", Arguments.createMap().apply {
          putString("alarmId", alarmId)
          putString("title", title)
        })
    }
  }
}
