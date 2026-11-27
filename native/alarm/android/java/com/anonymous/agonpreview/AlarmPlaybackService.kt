package com.anonymous.agonpreview

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat

class AlarmPlaybackService : Service() {
  private val players = mutableMapOf<String, MediaPlayer>()
  private val vibrators = mutableMapOf<String, Vibrator>()
  private val titles = mutableMapOf<String, String>()
  private val volumeRamps = mutableMapOf<String, Runnable>()
  private val handler = Handler(Looper.getMainLooper())

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val alarmId = intent?.getStringExtra(AlarmEngineScheduler.EXTRA_ALARM_ID) ?: return START_NOT_STICKY
    if (intent.action == ACTION_STOP) {
      stopAlarm(alarmId)
      return START_NOT_STICKY
    }
    val title = intent?.getStringExtra(AlarmEngineScheduler.EXTRA_TITLE) ?: "Study Sakha Alarm"
    titles[alarmId] = title
    val volume = (intent?.getIntExtra(AlarmEngineScheduler.EXTRA_VOLUME, 100) ?: 100).coerceIn(0, 100) / 100f
    val gradualVolume = intent?.getBooleanExtra(AlarmEngineScheduler.EXTRA_GRADUAL_VOLUME, false) ?: false
    val vibrationEnabled = intent?.getBooleanExtra(AlarmEngineScheduler.EXTRA_VIBRATION, true) ?: true
    createChannel()
    val notificationId = notificationId(alarmId)
    if (players.isEmpty()) startForeground(notificationId, buildNotification(alarmId, title))
    else getSystemService(NotificationManager::class.java).notify(notificationId, buildNotification(alarmId, title))
    val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    players.remove(alarmId)?.let { oldPlayer -> oldPlayer.runCatching { stop() }; oldPlayer.release() }
    players[alarmId] = MediaPlayer.create(this, alarmUri)?.also { player ->
      player.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
      player.isLooping = true
      player.setVolume(if (gradualVolume) 0.05f else volume, if (gradualVolume) 0.05f else volume)
      player.start()
    } ?: return START_NOT_STICKY
    if (vibrationEnabled) startVibration(alarmId, intent?.getStringExtra(AlarmEngineScheduler.EXTRA_VIBRATION_PATTERN) ?: "Pulse")
    if (gradualVolume) rampVolume(alarmId, volume)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    players.values.forEach { player -> player.runCatching { stop() }; player.release() }
    players.clear()
    titles.clear()
    vibrators.values.forEach { it.cancel() }
    vibrators.clear()
    volumeRamps.values.forEach(handler::removeCallbacks)
    volumeRamps.clear()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun buildNotification(alarmId: String, title: String): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      putExtra("study_sakha_alarm_id", alarmId)
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val pending = launchIntent?.let {
      PendingIntent.getActivity(this, alarmId.hashCode(), it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Alarm ringing")
      .setContentText(title)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(pending, true)
      .build()
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Study Sakha Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Scheduled Study Sakha alarm notifications"
      setSound(null, null)
      enableVibration(false)
    })
  }

  private fun startVibration(alarmId: String, pattern: String) {
    val vibrator = getSystemService(Vibrator::class.java)
    vibrators[alarmId] = vibrator
    val waveform = if (pattern.equals("Strong", true)) longArrayOf(0, 700, 300, 700) else longArrayOf(0, 400, 600, 400, 600)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) vibrator.vibrate(VibrationEffect.createWaveform(waveform, 0)) else @Suppress("DEPRECATION") vibrator.vibrate(waveform, 0)
  }

  private fun stopAlarm(alarmId: String) {
    volumeRamps.remove(alarmId)?.let(handler::removeCallbacks)
    players.remove(alarmId)?.let { player -> player.runCatching { stop() }; player.release() }
    vibrators.remove(alarmId)?.cancel()
    titles.remove(alarmId)
    getSystemService(NotificationManager::class.java).cancel(notificationId(alarmId))
    if (players.isEmpty()) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE) else @Suppress("DEPRECATION") stopForeground(true)
      stopSelf()
    } else {
      val remainingId = players.keys.first()
      startForeground(notificationId(remainingId), buildNotification(remainingId, titles[remainingId] ?: "Study Sakha Alarm"))
    }
  }

  private fun rampVolume(alarmId: String, target: Float) {
    val steps = 10
    val runnable = object : Runnable {
      var step = 0
      override fun run() {
        val player = players[alarmId] ?: return
        step += 1
        val value = 0.05f + (target - 0.05f) * (step.toFloat() / steps)
        player.setVolume(value, value)
        if (step < steps) handler.postDelayed(this, 1500L) else volumeRamps.remove(alarmId)
      }
    }
    volumeRamps[alarmId] = runnable
    handler.post(runnable)
  }

  companion object {
    private const val CHANNEL_ID = "study-sakha-alarm-engine"
    private const val ACTION_STOP = "com.anonymous.agonpreview.STUDY_SAKHA_ALARM_STOP"

    private fun notificationId(alarmId: String) = 7301 + (alarmId.hashCode() and 0x0fff)

    fun start(context: Context, intent: Intent) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
    }

    fun stop(context: Context, alarmId: String) {
      context.startService(Intent(context, AlarmPlaybackService::class.java).apply {
        action = ACTION_STOP
        putExtra(AlarmEngineScheduler.EXTRA_ALARM_ID, alarmId)
      })
    }
  }
}
