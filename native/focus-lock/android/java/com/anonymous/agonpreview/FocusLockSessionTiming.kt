package com.anonymous.agonpreview

import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import org.json.JSONArray
import org.json.JSONObject

object FocusLockSessionTiming {
  const val PENDING_COMPLETIONS_KEY = "pending_completions"

  fun currentBootCount(context: Context): Int =
    runCatching { Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1) }
      .getOrDefault(-1)

  fun attachTimingMetadata(context: Context, session: JSONObject, startedAt: Long, endsAt: Long) {
    val durationMs = (endsAt - startedAt).coerceAtLeast(0L)
    val elapsedNow = SystemClock.elapsedRealtime()
    session.put("durationMs", durationMs)
    session.put("startedElapsedMs", elapsedNow)
    session.put("endsElapsedMs", elapsedNow + durationMs)
    session.put("bootCount", currentBootCount(context))
  }

  fun isSameBoot(context: Context, session: JSONObject): Boolean {
    if (!session.has("endsElapsedMs") || !session.has("startedElapsedMs")) return false
    val savedBoot = session.optInt("bootCount", -1)
    val nowBoot = currentBootCount(context)
    if (savedBoot != -1 && nowBoot != -1) {
      return savedBoot == nowBoot
    }
    val startedElapsed = session.optLong("startedElapsedMs", -1L)
    val endsElapsed = session.optLong("endsElapsedMs", -1L)
    val elapsedNow = SystemClock.elapsedRealtime()
    return startedElapsed >= 0L && endsElapsed >= startedElapsed && elapsedNow >= startedElapsed
  }

  fun remainingMs(context: Context, session: JSONObject): Long {
    val status = session.optString("status")
    if (status == "paused") {
      return session.optLong("pausedRemainingMs", 0L).coerceAtLeast(0L)
    }
    if (status != "active") return 0L
    val durationMs = session.optLong("durationMs", -1L)
    if (isSameBoot(context, session)) {
      val endsElapsed = session.optLong("endsElapsedMs", 0L)
      val remaining = (endsElapsed - SystemClock.elapsedRealtime()).coerceAtLeast(0L)
      return if (durationMs > 0L) remaining.coerceAtMost(durationMs) else remaining
    }
    val endsAt = session.optLong("endsAt", 0L)
    val wallRemaining = (endsAt - System.currentTimeMillis()).coerceAtLeast(0L)
    return if (durationMs > 0L) wallRemaining.coerceAtMost(durationMs) else wallRemaining
  }

  fun isExpired(context: Context, session: JSONObject): Boolean {
    val status = session.optString("status")
    if (status == "paused") return false
    if (status != "active") return true
    val durationMs = session.optLong("durationMs", -1L)
    if (durationMs == 0L || (durationMs > 0L && durationMs > FocusLockModule.MAX_SESSION_MS)) {
      return true
    }
    return remainingMs(context, session) <= 0L
  }

  fun rebaseForBootOrClockChange(context: Context, session: JSONObject): Boolean {
    val status = session.optString("status")
    if (status == "paused") {
      val pausedRemaining = session.optLong("pausedRemainingMs", 0L)
      return pausedRemaining > 0L && pausedRemaining <= FocusLockModule.MAX_SESSION_MS
    }
    if (status != "active") return false
    val durationMs = session.optLong("durationMs", (session.optLong("endsAt", 0L) - session.optLong("startedAt", 0L)).coerceAtLeast(0L))
    if (durationMs <= 0L || durationMs > FocusLockModule.MAX_SESSION_MS) return false

    val remaining = if (isSameBoot(context, session)) {
      (session.optLong("endsElapsedMs", 0L) - SystemClock.elapsedRealtime()).coerceIn(0L, durationMs)
    } else {
      (session.optLong("endsAt", 0L) - System.currentTimeMillis()).coerceIn(0L, durationMs)
    }
    if (remaining <= 0L) return false

    val elapsedNow = SystemClock.elapsedRealtime()
    val nowWall = System.currentTimeMillis()
    session.put("durationMs", durationMs)
    session.put("startedElapsedMs", elapsedNow)
    session.put("endsElapsedMs", elapsedNow + remaining)
    session.put("endsAt", nowWall + remaining)
    session.put("bootCount", currentBootCount(context))
    return true
  }

  fun recordPendingCompletion(context: Context, session: JSONObject) {
    val sessionId = session.optString("id")
    if (sessionId.isBlank()) return
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val existingRaw = prefs.getString(PENDING_COMPLETIONS_KEY, null)
    val queue = runCatching { if (existingRaw != null) JSONArray(existingRaw) else JSONArray() }
      .getOrElse { JSONArray() }

    for (i in 0 until queue.length()) {
      if (queue.optJSONObject(i)?.optString("id") == sessionId) {
        return
      }
    }

    val endsAt = session.optLong("endsAt", System.currentTimeMillis())
    val startedAt = session.optLong("startedAt", endsAt)
    val record = JSONObject().apply {
      put("id", sessionId)
      put("userId", session.optString("userId", "local-user"))
      put("startedAt", startedAt)
      put("endsAt", endsAt)
      put("completedAt", System.currentTimeMillis().coerceAtMost(endsAt.coerceAtLeast(startedAt)))
      put("packageIds", session.optJSONArray("packageIds") ?: JSONArray())
      put("strategy", session.optString("strategy", "block"))
    }
    queue.put(record)
    prefs.edit().putString(PENDING_COMPLETIONS_KEY, queue.toString()).commit()
  }
}
