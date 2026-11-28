package com.anonymous.agonpreview

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AlarmRingingActivity : AppCompatActivity() {
  private var currentAlarmId: String = ""
  private var titleText: TextView? = null
  private var timeText: TextView? = null
  private var dateText: TextView? = null
  private var badgeText: TextView? = null
  private var primaryButton: Button? = null
  private var snoozeButton: Button? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    applyLockScreenFlags()
    activeInstance = this

    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        // Require explicit Dismiss, Snooze, or Mission completion.
      }
    })

    buildUi()
    bindIntent(intent, allowDuplicateSameId = true)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    bindIntent(intent, allowDuplicateSameId = false)
  }

  override fun onDestroy() {
    if (activeInstance === this) {
      activeInstance = null
    }
    super.onDestroy()
  }

  private fun applyLockScreenFlags() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      value.toFloat(),
      resources.displayMetrics,
    ).toInt()

  private fun buildUi() {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(56), dp(24), dp(36))
      background = GradientDrawable(
        GradientDrawable.Orientation.TOP_BOTTOM,
        intArrayOf(
          Color.parseColor("#0B1120"),
          Color.parseColor("#111C33"),
          Color.parseColor("#0F172A"),
        ),
      )
    }

    badgeText = TextView(this).apply {
      setTextColor(Color.parseColor("#5EEAD4"))
      textSize = 12f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(dp(14), dp(6), dp(14), dp(6))
      background = GradientDrawable().apply {
        setColor(Color.parseColor("#1A14B8A6"))
        cornerRadius = dp(99).toFloat()
        setStroke(dp(1), Color.parseColor("#405EEAD4"))
      }
    }

    dateText = TextView(this).apply {
      setTextColor(Color.parseColor("#CBD5E1"))
      textSize = 15f
      gravity = Gravity.CENTER
      setPadding(0, dp(24), 0, 0)
    }

    timeText = TextView(this).apply {
      setTextColor(Color.WHITE)
      textSize = 54f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(0, dp(8), 0, 0)
    }

    titleText = TextView(this).apply {
      setTextColor(Color.WHITE)
      textSize = 22f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(0, dp(14), 0, 0)
    }

    val spacer = View(this).apply {
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        0,
        1f,
      )
    }

    snoozeButton = Button(this).apply {
      isAllCaps = false
      textSize = 16f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      background = GradientDrawable().apply {
        setColor(Color.parseColor("#1E293B"))
        cornerRadius = dp(18).toFloat()
        setStroke(dp(1), Color.parseColor("#334155"))
      }
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        dp(56),
      ).apply {
        bottomMargin = dp(12)
      }
    }

    primaryButton = Button(this).apply {
      isAllCaps = false
      textSize = 17f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.parseColor("#020617"))
      background = GradientDrawable().apply {
        setColor(Color.parseColor("#FFFFFF"))
        cornerRadius = dp(18).toFloat()
      }
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        dp(60),
      )
    }

    root.addView(badgeText)
    root.addView(dateText)
    root.addView(timeText)
    root.addView(titleText)
    root.addView(spacer)
    root.addView(snoozeButton)
    root.addView(primaryButton)
    setContentView(root)
  }

  private fun bindIntent(intent: Intent?, allowDuplicateSameId: Boolean) {
    val alarmId = intent?.getStringExtra(AlarmEngineScheduler.EXTRA_ALARM_ID)
      ?.takeIf { it.isNotBlank() }
      ?: return finish()

    if (!allowDuplicateSameId && alarmId == currentAlarmId) {
      return
    }
    currentAlarmId = alarmId

    val title = intent.getStringExtra(AlarmEngineScheduler.EXTRA_TITLE) ?: "Study Sakha Alarm"
    val soundId = intent.getStringExtra(AlarmEngineScheduler.EXTRA_SOUND_ID) ?: "default"
    val volume = intent.getIntExtra(AlarmEngineScheduler.EXTRA_VOLUME, 100)
    val gradualVolume = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_GRADUAL_VOLUME, false)
    val vibration = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_VIBRATION, true)
    val vibrationPattern = intent.getStringExtra(AlarmEngineScheduler.EXTRA_VIBRATION_PATTERN) ?: "Pulse"
    val snoozeEnabled = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_SNOOZE_ENABLED, true)
    val snoozeDuration = intent.getIntExtra(AlarmEngineScheduler.EXTRA_SNOOZE_DURATION, 5).coerceAtLeast(1)
    val antiSnooze = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_ANTI_SNOOZE, false)
    val heavySleeper = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_HEAVY_SLEEPER, false)
    val missionBeforeSnooze = intent.getBooleanExtra(AlarmEngineScheduler.EXTRA_MISSION_BEFORE_SNOOZE, false)

    val now = Date()
    dateText?.text = SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(now)
    timeText?.text = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(now)
    titleText?.text = title
    badgeText?.text = if (heavySleeper) {
      "HEAVY SLEEPER · MISSION REQUIRED"
    } else {
      "STUDY SAKHA ALARM"
    }

    if (heavySleeper) {
      primaryButton?.text = "Start Mission to Dismiss"
      primaryButton?.setOnClickListener {
        launchReactNativeAlarm(alarmId, title, launchMode = "mission", action = null)
      }
    } else {
      primaryButton?.text = "Dismiss Alarm"
      primaryButton?.setOnClickListener {
        AlarmEngineScheduler.cancelSnooze(this, alarmId)
        AlarmEngineScheduler.clearPendingAlarm(this, alarmId)
        AlarmPlaybackService.stop(this, alarmId)
        AlarmEngineScheduler.recordPendingAction(this, alarmId, "dismissed")
        AlarmEngineModule.emitAction(alarmId, "dismissed", 0)
        launchReactNativeAlarm(alarmId, title, launchMode = "greeting", action = "dismissed")
      }
    }

    val canDirectSnooze = snoozeEnabled && !antiSnooze && !(heavySleeper && missionBeforeSnooze)
    val canMissionSnooze = snoozeEnabled && !antiSnooze && heavySleeper && missionBeforeSnooze
    if (canDirectSnooze) {
      snoozeButton?.visibility = View.VISIBLE
      snoozeButton?.text = "Snooze (${snoozeDuration} min)"
      snoozeButton?.setOnClickListener {
        AlarmEngineScheduler.clearPendingAlarm(this, alarmId)
        AlarmPlaybackService.stop(this, alarmId)
        AlarmEngineScheduler.scheduleSnooze(
          context = this,
          alarmId = alarmId,
          atMillis = System.currentTimeMillis() + snoozeDuration * 60_000L,
          title = title,
          soundId = soundId,
          volume = volume,
          gradualVolume = gradualVolume,
          vibration = vibration,
          vibrationPattern = vibrationPattern,
          heavySleeper = heavySleeper,
          missionBeforeSnooze = missionBeforeSnooze,
        )
        AlarmEngineScheduler.recordPendingAction(this, alarmId, "snoozed", snoozeDuration)
        AlarmEngineModule.emitAction(alarmId, "snoozed", snoozeDuration)
        finish()
      }
    } else if (canMissionSnooze) {
      snoozeButton?.visibility = View.VISIBLE
      snoozeButton?.text = "Complete Mission to Snooze"
      snoozeButton?.setOnClickListener {
        launchReactNativeAlarm(alarmId, title, launchMode = "snooze_mission", action = null)
      }
    } else {
      snoozeButton?.visibility = View.GONE
    }
  }

  private fun launchReactNativeAlarm(
    alarmId: String,
    title: String,
    launchMode: String,
    action: String?,
  ) {
    val openApp = {
      val launchIntent = (packageManager.getLaunchIntentForPackage(packageName) ?: Intent(Intent.ACTION_VIEW)).apply {
        data = Uri.parse("studysakha://alarm")
        putExtra("study_sakha_alarm_id", alarmId)
        putExtra("study_sakha_alarm_title", title)
        putExtra("study_sakha_alarm_launch_mode", launchMode)
        if (action != null) putExtra("study_sakha_alarm_action", action)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      runCatching { startActivity(launchIntent) }
      finish()
    }

    val km = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && km?.isKeyguardLocked == true) {
      km.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
        override fun onDismissSucceeded() = openApp()
        override fun onDismissCancelled() = openApp()
        override fun onDismissError() = openApp()
      })
    } else {
      openApp()
    }
  }

  companion object {
    @Volatile
    private var activeInstance: AlarmRingingActivity? = null

    fun finishActive(alarmId: String? = null) {
      val instance = activeInstance ?: return
      if (alarmId == null || instance.currentAlarmId == alarmId) {
        instance.runOnUiThread {
          if (!instance.isFinishing && !instance.isDestroyed) {
            instance.finish()
          }
        }
      }
    }
  }
}
