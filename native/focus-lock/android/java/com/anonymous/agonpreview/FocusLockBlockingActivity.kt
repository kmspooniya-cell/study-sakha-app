package com.anonymous.agonpreview

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.text.DateFormat
import java.util.Date

class FocusLockBlockingActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); render() }
  override fun onNewIntent(intent: Intent?) { super.onNewIntent(intent); render() }
  override fun onResume() { super.onResume(); render() }

  @Deprecated("Use OnBackInvokedDispatcher on API 33+; this fallback covers older devices.")
  override fun onBackPressed() { render() }

  private fun render() {
    val prefs = getSharedPreferences(FocusLockModule.PREFS, MODE_PRIVATE)
    val raw = prefs.getString(FocusLockModule.SESSION_KEY, null)
    val session = raw?.let { runCatching { org.json.JSONObject(it) }.getOrNull() }
    if (session == null || session.optString("status") != "active" || session.optLong("endsAt") <= System.currentTimeMillis()) {
      finish()
      return
    }
    window.statusBarColor = Color.rgb(17, 26, 59)
    window.navigationBarColor = Color.rgb(17, 26, 59)
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(32, 48, 32, 48)
      setBackgroundColor(Color.rgb(17, 26, 59))
    }
    val owl = TextView(this).apply { text = "🦉"; textSize = 64f; gravity = Gravity.CENTER }
    val title = TextView(this).apply { text = "Focus Lock"; textSize = 30f; setTextColor(Color.WHITE); gravity = Gravity.CENTER; setPadding(0, 20, 0, 8) }
    val message = TextView(this).apply { text = "Stay focused. Your goals are waiting."; textSize = 18f; setTextColor(Color.rgb(219, 228, 255)); gravity = Gravity.CENTER; setPadding(0, 0, 0, 24) }
    val end = TextView(this).apply { text = "Session ends ${DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(session.optLong("endsAt")))}"; textSize = 14f; setTextColor(Color.rgb(168, 181, 220)); gravity = Gravity.CENTER; setPadding(0, 0, 0, 28) }
    val button = Button(this).apply { text = "Return to Study"; setOnClickListener { openStudySakha() } }
    root.addView(owl); root.addView(title); root.addView(message); root.addView(end); root.addView(button, LinearLayout.LayoutParams(-1, 56))
    setContentView(root)
  }

  private fun openStudySakha() {
    packageManager.getLaunchIntentForPackage(packageName)
      ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      ?.let { startActivity(it) }
    finish()
  }
}
