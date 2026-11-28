package com.anonymous.agonpreview

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import org.json.JSONArray
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date

class FocusLockBlockingActivity : Activity() {
  private var backInvokedCallback: OnBackInvokedCallback? = null
  private var targetPackageId: String = ""
  private var blockReason: String = "session"
  private var limitMins: Int = 0
  private var usedMs: Long = 0L
  private var showDisableOptions: Boolean = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    readExtras(intent)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val callback = OnBackInvokedCallback { render() }
      backInvokedCallback = callback
      onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback)
    }
    render()
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    readExtras(intent)
    showDisableOptions = false
    render()
  }

  override fun onResume() {
    super.onResume()
    render()
  }

  override fun onDestroy() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      backInvokedCallback?.let { runCatching { onBackInvokedDispatcher.unregisterOnBackInvokedCallback(it) } }
    }
    backInvokedCallback = null
    super.onDestroy()
  }

  @Deprecated("Use OnBackInvokedDispatcher on API 33+; this fallback covers older devices.")
  override fun onBackPressed() { render() }

  private fun readExtras(intent: Intent?) {
    targetPackageId = intent?.getStringExtra("packageId") ?: targetPackageId
    blockReason = intent?.getStringExtra("reason") ?: blockReason
    limitMins = intent?.getIntExtra("limitMins", limitMins) ?: limitMins
    usedMs = intent?.getLongExtra("usedMs", usedMs) ?: usedMs
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt().coerceAtLeast(1)

  private fun formatDuration(ms: Long): String {
    val totalSecs = (ms / 1000L).coerceAtLeast(0L)
    val hrs = totalSecs / 3600L
    val mins = (totalSecs % 3600L) / 60L
    val secs = totalSecs % 60L
    return when {
      hrs > 0 -> "${hrs}h ${mins}m"
      mins > 0 -> "${mins}m ${secs}s"
      else -> "${secs}s"
    }
  }

  private fun containsPackage(array: JSONArray?, packageId: String): Boolean {
    if (array == null || packageId.isBlank()) return false
    for (i in 0 until array.length()) {
      if (array.isNull(i)) continue
      val entry = array.optString(i, "").trim()
      if (entry.isNotEmpty() && entry == packageId) return true
    }
    return false
  }

  private fun isPackageBlockedBySession(session: JSONObject?): Boolean {
    if (session == null || targetPackageId.isBlank()) return false
    if (session.optString("status") != "active" || FocusLockSessionTiming.isExpired(this, session)) return false
    val strategy = if (session.optString("strategy") == "allow") "allow" else "block"
    return if (strategy == "allow") {
      val allowedArray = session.optJSONArray("allowedPackageIds")
      if (allowedArray != null && allowedArray.length() > 0) {
        !containsPackage(allowedArray, targetPackageId)
      } else {
        containsPackage(session.optJSONArray("packageIds"), targetPackageId)
      }
    } else {
      containsPackage(session.optJSONArray("packageIds"), targetPackageId)
    }
  }

  private fun isPackageBlockedByUsageLimit(nowMs: Long): Boolean {
    if (targetPackageId.isBlank()) return false
    if (FocusLockUsageLimits.isReminderSuspended(this, targetPackageId, nowMs)) return false
    val currentLimit = FocusLockUsageLimits.getPackageLimitMins(this, targetPackageId)
    if (currentLimit <= 0) return false
    val liveUsed = FocusLockUsageLimits.getPackageUsedMsToday(this, targetPackageId, nowMs, forceRefresh = true)
      .coerceAtLeast(usedMs)
    return liveUsed >= currentLimit * 60_000L
  }

  private fun isAccessCurrentlyAuthorized(): Boolean {
    if (targetPackageId.isBlank()) return false
    val nowMs = System.currentTimeMillis()
    if (FocusLockUsageLimits.isPackageUnderEmergencyPass(this, targetPackageId, nowMs)) return true

    val prefs = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
    val raw = prefs.getString(FocusLockModule.SESSION_KEY, null)
    val session = raw?.let { runCatching { org.json.JSONObject(it) }.getOrNull() }
    if (isPackageBlockedBySession(session)) return false
    if (isPackageBlockedByUsageLimit(nowMs)) return false
    return true
  }

  private fun render() {
    val nowMs = System.currentTimeMillis()
    val prefs = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
    val raw = prefs.getString(FocusLockModule.SESSION_KEY, null)
    val session = raw?.let { runCatching { org.json.JSONObject(it) }.getOrNull() }
    val sessionActive = session != null && session.optString("status") == "active" && !FocusLockSessionTiming.isExpired(this, session)
    val blockedBySession = isPackageBlockedBySession(session)
    val blockedByLimit = isPackageBlockedByUsageLimit(nowMs)
    val effectiveReason = when {
      blockedBySession -> "session"
      blockedByLimit -> "usage_limit"
      else -> blockReason
    }
    blockReason = effectiveReason

    val liveLimitMins = if (targetPackageId.isNotBlank()) {
      FocusLockUsageLimits.getPackageLimitMins(this, targetPackageId).takeIf { it > 0 } ?: limitMins
    } else limitMins
    val liveUsedMs = if (targetPackageId.isNotBlank()) {
      FocusLockUsageLimits.getPackageUsedMsToday(this, targetPackageId, nowMs, forceRefresh = true).coerceAtLeast(usedMs)
    } else usedMs

    val authorized = isAccessCurrentlyAuthorized()
    if (authorized && effectiveReason == "session" && !sessionActive && liveLimitMins <= 0) {
      finish()
      return
    }

    window.statusBarColor = Color.rgb(12, 18, 40)
    window.navigationBarColor = Color.rgb(12, 18, 40)

    val appInfo = targetPackageId.takeIf { it.isNotBlank() }?.let {
      runCatching { packageManager.getApplicationInfo(it, 0) }.getOrNull()
    }
    val appName = appInfo?.let { runCatching { packageManager.getApplicationLabel(it).toString() }.getOrNull() }
      ?: targetPackageId.ifBlank { "Restricted App" }
    val appIconDrawable = appInfo?.let { runCatching { packageManager.getApplicationIcon(it) }.getOrNull() }

    val scroll = ScrollView(this).apply {
      setBackgroundColor(Color.rgb(12, 18, 40))
      isFillViewport = true
    }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(40), dp(24), dp(32))
    }

    // App Icon
    val iconView = ImageView(this).apply {
      if (appIconDrawable != null) {
        setImageDrawable(appIconDrawable)
      } else {
        setImageResource(android.R.drawable.sym_def_app_icon)
      }
    }
    root.addView(iconView, LinearLayout.LayoutParams(dp(72), dp(72)).apply { bottomMargin = dp(12) })

    // App Name
    val appTitle = TextView(this).apply {
      text = appName
      textSize = 24f
      setTypeface(null, Typeface.BOLD)
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
    }
    root.addView(appTitle, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) })

    // Status Badge
    val isUsageLimit = blockReason == "usage_limit"
    val badge = TextView(this).apply {
      text = when {
        authorized -> "ACCESS TEMPORARILY AUTHORIZED"
        isUsageLimit -> "DAILY LIMIT EXCEEDED"
        else -> "FOCUS SESSION ACTIVE"
      }
      textSize = 11f
      setTypeface(null, Typeface.BOLD)
      setTextColor(if (authorized) Color.rgb(16, 185, 129) else if (isUsageLimit) Color.rgb(251, 113, 133) else Color.rgb(129, 140, 248))
      setPadding(dp(12), dp(6), dp(12), dp(6))
      background = GradientDrawable().apply {
        cornerRadius = dp(16).toFloat()
        setColor(if (authorized) Color.argb(40, 16, 185, 129) else if (isUsageLimit) Color.argb(40, 244, 63, 94) else Color.argb(40, 99, 102, 241))
      }
      gravity = Gravity.CENTER
    }
    root.addView(badge, LinearLayout.LayoutParams(-2, -2).apply { bottomMargin = dp(20) })

    // Stats Card
    val card = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(18), dp(16), dp(18), dp(16))
      background = GradientDrawable().apply {
        cornerRadius = dp(16).toFloat()
        setColor(Color.rgb(22, 30, 62))
        setStroke(dp(1), Color.rgb(42, 56, 102))
      }
    }

    fun addMetricRow(label: String, value: String, valueColor: Int = Color.WHITE) {
      val row = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        setPadding(0, dp(6), 0, dp(6))
      }
      val l = TextView(this).apply {
        text = label
        textSize = 13f
        setTextColor(Color.rgb(168, 181, 220))
        layoutParams = LinearLayout.LayoutParams(0, -2, 1f)
      }
      val v = TextView(this).apply {
        text = value
        textSize = 14f
        setTypeface(null, Typeface.BOLD)
        setTextColor(valueColor)
      }
      row.addView(l); row.addView(v)
      card.addView(row)
    }

    if (isUsageLimit && liveLimitMins > 0) {
      val limitMs = liveLimitMins * 60_000L
      val remainingMs = (limitMs - liveUsedMs).coerceAtLeast(0L)
      addMetricRow("Configured Daily Limit", "${liveLimitMins}m")
      addMetricRow("Time Spent Today", formatDuration(liveUsedMs))
      addMetricRow(
        "Remaining Today",
        if (remainingMs <= 0L) "0m" else formatDuration(remainingMs),
        if (remainingMs <= 0L) Color.rgb(251, 113, 133) else Color.rgb(16, 185, 129)
      )
    } else if (sessionActive && session != null) {
      val remainingMs = FocusLockSessionTiming.remainingMs(this, session)
      val endText = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(nowMs + remainingMs))
      addMetricRow("Study Session", "Ends at $endText")
      addMetricRow("Time Remaining", formatDuration(remainingMs))
      addMetricRow("Time Spent Today", formatDuration(liveUsedMs))
    } else {
      addMetricRow("Time Spent Today", formatDuration(liveUsedMs))
    }

    root.addView(card, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(20) })

    val buttonHeightPx = dp(52)

    // Open App (ONLY when access is authorized)
    if (authorized && targetPackageId.isNotBlank()) {
      val openBtn = Button(this).apply {
        text = "Open $appName"
        setTextColor(Color.WHITE)
        background = GradientDrawable().apply {
          cornerRadius = dp(12).toFloat()
          setColor(Color.rgb(16, 185, 129))
        }
        setOnClickListener { openTargetAppAndFinish() }
      }
      root.addView(openBtn, LinearLayout.LayoutParams(-1, buttonHeightPx).apply { bottomMargin = dp(10) })
    }

    // Close App (primary safe action)
    val closeBtn = Button(this).apply {
      text = "Close App"
      setTextColor(Color.WHITE)
      background = GradientDrawable().apply {
        cornerRadius = dp(12).toFloat()
        setColor(Color.rgb(79, 70, 229))
      }
      setOnClickListener { closeToHome() }
    }
    root.addView(closeBtn, LinearLayout.LayoutParams(-1, buttonHeightPx).apply { bottomMargin = dp(10) })

    // Return to Study Sakha
    val studyBtn = Button(this).apply {
      text = "Return to Study Sakha"
      setTextColor(Color.rgb(219, 228, 255))
      background = GradientDrawable().apply {
        cornerRadius = dp(12).toFloat()
        setColor(Color.rgb(30, 41, 82))
      }
      setOnClickListener { openStudySakha(null) }
    }
    root.addView(studyBtn, LinearLayout.LayoutParams(-1, buttonHeightPx).apply { bottomMargin = dp(14) })

    // Emergency Access (5m)
    val emgState = FocusLockUsageLimits.getEmergencyState(this, nowMs)
    val maxUses = emgState.optInt("maxDailyUses", FocusLockUsageLimits.DEFAULT_DAILY_EMERGENCY_USES)
    val usedUses = emgState.optInt("usedToday", 0)
    val remainingUses = (maxUses - usedUses).coerceAtLeast(0)
    val requiresPin = FocusLockUsageLimits.requiresPinForEmergency(this)

    if (!authorized) {
      val emgBtn = Button(this).apply {
        text = if (requiresPin) {
          "Emergency Access (PIN Required • $remainingUses left)"
        } else {
          "Emergency Access • 5m ($remainingUses left today)"
        }
        setTextColor(Color.rgb(253, 230, 138))
        background = GradientDrawable().apply {
          cornerRadius = dp(12).toFloat()
          setColor(Color.argb(35, 245, 158, 11))
          setStroke(dp(1), Color.argb(110, 245, 158, 11))
        }
        setOnClickListener {
          if (requiresPin) {
            openStudySakha("studysakha://focus-lock?emergencyPkg=${Uri.encode(targetPackageId)}")
            return@setOnClickListener
          }
          val res = FocusLockUsageLimits.grantEmergencyPass(this@FocusLockBlockingActivity, targetPackageId, appName, "intervention")
          if (res.optBoolean("granted", false)) {
            FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
            Toast.makeText(this@FocusLockBlockingActivity, "5-min Emergency Pass granted", Toast.LENGTH_SHORT).show()
            openTargetAppAndFinish()
          } else {
            Toast.makeText(this@FocusLockBlockingActivity, "No emergency uses remaining today", Toast.LENGTH_SHORT).show()
          }
        }
      }
      root.addView(emgBtn, LinearLayout.LayoutParams(-1, buttonHeightPx).apply { bottomMargin = dp(10) })
    }

    // Temporary Reminder Disable (only for usage_limit when Strict PIN is not locking it)
    if (isUsageLimit && !authorized && !requiresPin && targetPackageId.isNotBlank()) {
      val disableToggle = Button(this).apply {
        text = if (showDisableOptions) "Hide Reminder Options" else "Turn Off Reminder Temporarily"
        setTextColor(Color.rgb(148, 163, 184))
        background = GradientDrawable().apply {
          cornerRadius = dp(12).toFloat()
          setColor(Color.TRANSPARENT)
          setStroke(dp(1), Color.rgb(51, 65, 85))
        }
        setOnClickListener {
          showDisableOptions = !showDisableOptions
          render()
        }
      }
      root.addView(disableToggle, LinearLayout.LayoutParams(-1, buttonHeightPx).apply { bottomMargin = dp(8) })

      if (showDisableOptions) {
        val optionsBox = LinearLayout(this).apply {
          orientation = LinearLayout.VERTICAL
          visibility = View.VISIBLE
        }
        listOf(
          "rest_of_day" to "Rest of the day",
          "till_tomorrow" to "Till tomorrow",
          "7_days" to "7 days",
        ).forEach { (durationKey, label) ->
          val optBtn = Button(this).apply {
            text = label
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
              cornerRadius = dp(10).toFloat()
              setColor(Color.rgb(38, 49, 89))
            }
            setOnClickListener {
              FocusLockUsageLimits.suspendAppReminder(this@FocusLockBlockingActivity, targetPackageId, durationKey)
              FocusLockAccessibilityService.instance?.refreshLimitsAndRecheck()
              Toast.makeText(this@FocusLockBlockingActivity, "Reminder paused: $label", Toast.LENGTH_SHORT).show()
              showDisableOptions = false
              render()
            }
          }
          optionsBox.addView(optBtn, LinearLayout.LayoutParams(-1, dp(46)).apply { bottomMargin = dp(6) })
        }
        root.addView(optionsBox, LinearLayout.LayoutParams(-1, -2))
      }
    }

    scroll.addView(root)
    setContentView(scroll)
  }

  private fun closeToHome() {
    val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { startActivity(home) }
    finish()
  }

  private fun openTargetAppAndFinish() {
    if (targetPackageId.isNotBlank()) {
      packageManager.getLaunchIntentForPackage(targetPackageId)
        ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        ?.let { runCatching { startActivity(it) } }
    }
    finish()
  }

  private fun openStudySakha(deepLinkUri: String?) {
    val intent = if (!deepLinkUri.isNullOrBlank()) {
      Intent(Intent.ACTION_VIEW, Uri.parse(deepLinkUri)).apply {
        setPackage(packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
    } else {
      packageManager.getLaunchIntentForPackage(packageName)
        ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    intent?.let { runCatching { startActivity(it) } }
    finish()
  }
}
