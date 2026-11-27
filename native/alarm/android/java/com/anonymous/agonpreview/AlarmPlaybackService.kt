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
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat

class AlarmPlaybackService : Service() {
  private val players = mutableMapOf<String, MediaPlayer>()
  private val vibrators = mutableMapOf<String, Vibrator>()
  private val titles = mutableMapOf<String, String>()
  private val volumeRamps = mutableMapOf<String, Runnable>()
  private val handler = Handler(Looper.getMainLooper())
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onCreate() {
    super.onCreate()
    activeService = this
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val alarmId = intent?.getStringExtra(AlarmEngineScheduler.EXTRA_ALARM_ID) ?: return START_NOT_STICKY
    if (intent.action == ACTION_STOP) {
      stopAlarm(alarmId)
      return START_NOT_STICKY
    }
    val title = intent.getStringExtra(AlarmEngineScheduler.EXTRA_TITLE) ?: "Study Sakha Alarm"
    titles[alarmId] = title
    val soundId = intent.getStringExtra(AlarmEngineScheduler.EXTRA_SOUND_ID) ?: "default"
    val rawVolume = intent.getIntExtra(AlarmEngineScheduler.EXTRA_VOLUME, 100)
    val volume = rawVolume.coerceIn(0, 100) / 100f
    val gradualVolume = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_GRADUAL_VOLUME, false)
    val vibrationEnabled = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_VIBRATION, true)
    val vibrationPattern = intent.getStringExtra(AlarmEngineScheduler.EXTRA_VIBRATION_PATTERN) ?: "Pulse"
    val snoozeEnabled = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_SNOOZE_ENABLED, true)
    val snoozeDuration = intent.getIntExtra(AlarmEngineScheduler.EXTRA_SNOOZE_DURATION, 5)
    val antiSnooze = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_ANTI_SNOOZE, false)

    acquireWakeLock()
    createChannel()
    val notificationId = notificationId(alarmId)
    val notification = buildNotification(
      alarmId = alarmId,
      title = title,
      soundId = soundId,
      volume = rawVolume,
      gradualVolume = gradualVolume,
      vibration = vibrationEnabled,
      vibrationPattern = vibrationPattern,
      snoozeEnabled = snoozeEnabled && !antiSnooze,
      snoozeDuration = snoozeDuration,
    )
    if (players.isEmpty()) startForeground(notificationId, notification)
    else getSystemService(NotificationManager::class.java)?.notify(notificationId, notification)

    val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

    players.remove(alarmId)?.let { oldPlayer ->
      oldPlayer.runCatching { stop() }
      oldPlayer.runCatching { release() }
    }
    if (alarmUri != null) {
      runCatching {
        MediaPlayer.create(this, alarmUri)?.also { player ->
          player.setAudioAttributes(
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_ALARM)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
          player.isLooping = true
          val initialVol = if (gradualVolume) 0.05f else volume
          player.setVolume(initialVol, initialVol)
          player.start()
          players[alarmId] = player
        }
      }
    }
    if (vibrationEnabled) startVibration(alarmId, vibrationPattern)
    if (gradualVolume && players.containsKey(alarmId)) rampVolume(alarmId, volume)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    if (activeService === this) activeService = null
    players.values.forEach { player ->
      player.runCatching { stop() }
      player.runCatching { release() }
    }
    players.clear()
    titles.clear()
    vibrators.values.forEach { it.runCatching { cancel() } }
    vibrators.clear()
    volumeRamps.values.forEach(handler::removeCallbacks)
    volumeRamps.clear()
    releaseWakeLock()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) return
    val pm = getSystemService(PowerManager::class.java) ?: return
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "StudySakha:AlarmPlayback").apply {
      setReferenceCounted(false)
      acquire(10 * 60 * 1000L)
    }
  }

  private fun releaseWakeLock() {
    wakeLock?.runCatching { if (isHeld) release() }
    wakeLock = null
  }

  private fun buildNotification(
    alarmId: String,
    title: String,
    soundId: String,
    volume: Int,
    gradualVolume: Boolean,
    vibration: Boolean,
    vibrationPattern: String,
    snoozeEnabled: Boolean,
    snoozeDuration: Int,
  ): Notification {
    val launchIntent = (packageManager.getLaunchIntentForPackage(packageName) ?: Intent(Intent.ACTION_VIEW)).apply {
      data = Uri.parse("studysakha://alarm")
      putExtra("study_sakha_alarm_id", alarmId)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val contentPending = PendingIntent.getActivity(
      this,
      (alarmId.hashCode() and 0x0fffffff),
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val stopIntent = Intent(this, AlarmEngineReceiver::class.java).apply {
      action = AlarmEngineScheduler.ACTION_DISMISS_NOTIFICATION
      data = Uri.parse("studysakha-alarm://dismiss/$alarmId")
      putExtra(AlarmEngineScheduler.EXTRA_ALARM_ID, alarmId)
    }
    val stopPending = PendingIntent.getBroadcast(
      this,
      (alarmId.hashCode() xor 0x11111111) and 0x7fffffff,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Alarm ringing")
      .setContentText(title)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(contentPending)
      .setFullScreenIntent(contentPending, true)
      .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPending)

    if (snoozeEnabled) {
      val mins = if (snoozeDuration > 0) snoozeDuration else 5
      val snoozeIntent = Intent(this, AlarmEngineReceiver::class.java).apply {
        action = AlarmEngineScheduler.ACTION_SNOOZE_NOTIFICATION
        data = Uri.parse("studysakha-alarm://snooze-now/$alarmId")
        putExtra(AlarmEngineScheduler.EXTRA_ALARM_ID, alarmId)
        putExtra(AlarmEngineScheduler.EXTRA_TITLE, title)
        putExtra(AlarmEngineScheduler.EXTRA_SOUND_ID, soundId)
        putExtra(AlarmEngineScheduler.EXTRA_VOLUME, volume)
        putExtra(AlarmEngineScheduler.EXTRA_GRADUAL_VOLUME, gradualVolume)
        putExtra(AlarmEngineScheduler.EXTRA_VIBRATION, vibration)
        putExtra(AlarmEngineScheduler.EXTRA_VIBRATION_PATTERN, vibrationPattern)
        putExtra(AlarmEngineScheduler.EXTRA_SNOOZE_DURATION, mins)
      }
      val snoozePending = PendingIntent.getBroadcast(
        this,
        (alarmId.hashCode() xor 0x22222222) and 0x7fffffff,
        snoozeIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      builder.addAction(android.R.drawable.ic_popup_reminder, "Snooze (${mins}m)", snoozePending)
    }

    return builder.build()
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return
    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Study Sakha Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Scheduled Study Sakha alarm notifications"
        setSound(null, null)
        enableVibration(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      },
    )
  }

  private fun startVibration(alarmId: String, pattern: String) {
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Vibrator::class.java)
    } ?: return
    vibrators[alarmId] = vibrator
    val waveform = if (pattern.equals("Strong", true)) longArrayOf(0, 700, 300, 700) else longArrayOf(0, 400, 600, 400, 600)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createWaveform(waveform, 0))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(waveform, 0)
    }
  }

  fun stopAlarm(alarmId: String) {
    volumeRamps.remove(alarmId)?.let(handler::removeCallbacks)
    players.remove(alarmId)?.let { player ->
      player.runCatching { stop() }
      player.runCatching { release() }
    }
    vibrators.remove(alarmId)?.runCatching { cancel() }
    titles.remove(alarmId)
    getSystemService(NotificationManager::class.java)?.cancel(notificationId(alarmId))
    if (players.isEmpty() && vibrators.isEmpty()) {
      releaseWakeLock()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
      else @Suppress("DEPRECATION") stopForeground(true)
      stopSelf()
    } else {
      val remainingId = players.keys.firstOrNull() ?: vibrators.keys.first()
      startForeground(
        notificationId(remainingId),
        buildNotification(
          alarmId = remainingId,
          title = titles[remainingId] ?: "Study Sakha Alarm",
          soundId = "default",
          volume = 100,
          gradualVolume = false,
          vibration = true,
          vibrationPattern = "Pulse",
          snoozeEnabled = true,
          snoozeDuration = 5,
        ),
      )
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
        player.runCatching { setVolume(value, value) }
        if (step < steps) handler.postDelayed(this, 1500L) else volumeRamps.remove(alarmId)
      }
    }
    volumeRamps[alarmId] = runnable
    handler.post(runnable)
  }

  companion object {
    private const val CHANNEL_ID = "study-sakha-alarm-engine"
    private const val ACTION_STOP = "com.anonymous.agonpreview.STUDY_SAKHA_ALARM_STOP"

    @Volatile
    private var activeService: AlarmPlaybackService? = null

    private fun notificationId(alarmId: String) = 7301 + (alarmId.hashCode() and 0x0fff)

    fun start(context: Context, intent: Intent) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
      else context.startService(intent)
    }

    fun stop(context: Context, alarmId: String) {
      val running = activeService
      if (running != null) {
        running.handler.post { running.stopAlarm(alarmId) }
      }
      context.getSystemService(NotificationManager::class.java)?.cancel(notificationId(alarmId))
      if (running == null) {
        context.runCatching {
          context.stopService(Intent(context, AlarmPlaybackService::class.java))
        }
      }
    }
  }
}
