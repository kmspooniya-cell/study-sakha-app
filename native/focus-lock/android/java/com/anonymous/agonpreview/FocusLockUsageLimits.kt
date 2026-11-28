package com.anonymous.agonpreview

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Persistent per-app daily usage tracking, daily usage limits, temporary reminder
 * suspensions, and controlled emergency access state backed by SharedPreferences.
 */
object FocusLockUsageLimits {
  const val LIMITS_KEY = "app_usage_limits"
  const val SUSPENSIONS_KEY = "app_reminder_suspensions"
  const val USAGE_CACHE_KEY = "daily_usage_cache"
  const val USAGE_DATE_KEY = "daily_usage_date"
  const val EMERGENCY_STATE_KEY = "emergency_access_state"
  const val STRICT_POLICY_KEY = "strict_mode_policy"
  const val EMERGENCY_PASS_DURATION_MS = 5L * 60L * 1000L
  const val DEFAULT_DAILY_EMERGENCY_USES = 3

  fun todayDateKey(nowMs: Long = System.currentTimeMillis()): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(nowMs))

  fun localMidnightMs(nowMs: Long = System.currentTimeMillis()): Long {
    val cal = Calendar.getInstance()
    cal.timeInMillis = nowMs
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
  }

  fun computeSuspensionExpiryMs(duration: String, nowMs: Long = System.currentTimeMillis()): Long {
    val cal = Calendar.getInstance()
    cal.timeInMillis = nowMs
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    when (duration) {
      "rest_of_day" -> cal.add(Calendar.DAY_OF_YEAR, 1)
      "till_tomorrow" -> cal.add(Calendar.DAY_OF_YEAR, 2)
      "7_days" -> cal.add(Calendar.DAY_OF_YEAR, 7)
      else -> cal.add(Calendar.DAY_OF_YEAR, 1)
    }
    return cal.timeInMillis
  }

  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  @Volatile private var cachedQueryElapsedMs: Long = 0L
  @Volatile private var cachedQueryDate: String? = null
  @Volatile private var cachedQueryResult: Map<String, Long> = emptyMap()
  private const val QUERY_CACHE_TTL_MS = 1000L

  /**
   * Computes accurate today's foreground usage in milliseconds per package using
   * UsageStatsManager.queryEvents from local midnight to now, persisting a daily
   * cache that resets at local calendar midnight.
   */
  fun queryTodayUsageMs(
    context: Context,
    nowMs: Long = System.currentTimeMillis(),
    forceRefresh: Boolean = true,
  ): Map<String, Long> {
    val today = todayDateKey(nowMs)
    val elapsedNow = SystemClock.elapsedRealtime()
    if (!forceRefresh && cachedQueryDate == today && elapsedNow - cachedQueryElapsedMs < QUERY_CACHE_TTL_MS) {
      return cachedQueryResult
    }

    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val cachedDate = prefs.getString(USAGE_DATE_KEY, null)
    val cachedMap = mutableMapOf<String, Long>()
    if (cachedDate == today) {
      val raw = prefs.getString(USAGE_CACHE_KEY, null)
      if (!raw.isNullOrBlank()) {
        runCatching {
          val obj = JSONObject(raw)
          obj.keys().forEach { pkg -> cachedMap[pkg] = obj.optLong(pkg, 0L).coerceAtLeast(0L) }
        }
      }
    }

    if (!hasUsageAccess(context)) {
      if (cachedDate != today) {
        prefs.edit().putString(USAGE_DATE_KEY, today).putString(USAGE_CACHE_KEY, "{}").apply()
        cachedQueryDate = today
        cachedQueryElapsedMs = elapsedNow
        cachedQueryResult = emptyMap()
        return emptyMap()
      }
      cachedQueryDate = today
      cachedQueryElapsedMs = elapsedNow
      cachedQueryResult = cachedMap
      return cachedMap
    }

    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return cachedMap
    val startMs = localMidnightMs(nowMs)
    val totals = mutableMapOf<String, Long>()
    val activeStart = mutableMapOf<String, Long>()
    val resumedClasses = mutableMapOf<String, MutableSet<String>>()

    runCatching {
      val events = manager.queryEvents(startMs, nowMs)
      val event = UsageEvents.Event()
      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        val pkg = event.packageName ?: continue
        val cls = event.className ?: ""
        when (event.eventType) {
          UsageEvents.Event.ACTIVITY_RESUMED,
          UsageEvents.Event.MOVE_TO_FOREGROUND -> {
            val classes = resumedClasses.getOrPut(pkg) { mutableSetOf() }
            classes.add(cls)
            if (!activeStart.containsKey(pkg)) {
              activeStart[pkg] = event.timeStamp.coerceAtLeast(startMs)
            }
          }
          UsageEvents.Event.ACTIVITY_PAUSED,
          UsageEvents.Event.MOVE_TO_BACKGROUND,
          UsageEvents.Event.ACTIVITY_STOPPED -> {
            val classes = resumedClasses[pkg]
            if (classes != null) {
              classes.remove(cls)
              if (classes.isEmpty()) {
                resumedClasses.remove(pkg)
                val started = activeStart.remove(pkg)
                if (started != null && event.timeStamp > started) {
                  totals[pkg] = (totals[pkg] ?: 0L) + (event.timeStamp - started)
                }
              }
            } else {
              val started = activeStart.remove(pkg)
              if (started != null && event.timeStamp > started) {
                totals[pkg] = (totals[pkg] ?: 0L) + (event.timeStamp - started)
              }
            }
          }
        }
      }
      // Credit any app still in foreground up to nowMs.
      for ((pkg, started) in activeStart) {
        if (nowMs > started) {
          totals[pkg] = (totals[pkg] ?: 0L) + (nowMs - started)
        }
      }
    }

    // Merge with cached today totals using max() so usage never goes backward within the same day.
    val merged = mutableMapOf<String, Long>()
    if (cachedDate == today) {
      cachedMap.forEach { (pkg, ms) -> merged[pkg] = ms }
    }
    totals.forEach { (pkg, ms) ->
      val prev = merged[pkg] ?: 0L
      if (ms > prev) merged[pkg] = ms
    }

    val json = JSONObject()
    merged.forEach { (pkg, ms) -> json.put(pkg, ms) }
    prefs.edit()
      .putString(USAGE_DATE_KEY, today)
      .putString(USAGE_CACHE_KEY, json.toString())
      .apply()
    cachedQueryDate = today
    cachedQueryElapsedMs = elapsedNow
    cachedQueryResult = merged
    return merged
  }

  fun getPackageUsedMsToday(
    context: Context,
    packageId: String,
    nowMs: Long = System.currentTimeMillis(),
    forceRefresh: Boolean = true,
  ): Long {
    val all = queryTodayUsageMs(context, nowMs, forceRefresh)
    return all[packageId] ?: 0L
  }

  fun getAppLimits(context: Context): Map<String, Int> {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(LIMITS_KEY, null) ?: return emptyMap()
    val result = mutableMapOf<String, Int>()
    runCatching {
      val obj = JSONObject(raw)
      obj.keys().forEach { pkg ->
        val mins = obj.optInt(pkg, 0)
        if (mins > 0) result[pkg] = mins
      }
    }
    return result
  }

  fun setAppLimits(context: Context, limits: Map<String, Int>) {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val json = JSONObject()
    limits.forEach { (pkg, mins) ->
      if (pkg.isNotBlank() && mins > 0) json.put(pkg, mins)
    }
    prefs.edit().putString(LIMITS_KEY, json.toString()).commit()
  }

  fun getPackageLimitMins(context: Context, packageId: String): Int =
    getAppLimits(context)[packageId] ?: 0

  fun getSuspensions(context: Context, nowMs: Long = System.currentTimeMillis()): JSONObject {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(SUSPENSIONS_KEY, null) ?: return JSONObject()
    val parsed = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
    val active = JSONObject()
    var pruned = false
    parsed.keys().forEach { pkg ->
      val entry = parsed.optJSONObject(pkg)
      val untilMs = entry?.optLong("suspendedUntilMs", 0L) ?: 0L
      if (untilMs > nowMs) {
        active.put(pkg, entry)
      } else {
        pruned = true
      }
    }
    if (pruned) {
      prefs.edit().putString(SUSPENSIONS_KEY, active.toString()).commit()
    }
    return active
  }

  fun suspendAppReminder(context: Context, packageId: String, duration: String, nowMs: Long = System.currentTimeMillis()): JSONObject {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val untilMs = computeSuspensionExpiryMs(duration, nowMs)
    val entry = JSONObject().apply {
      put("packageId", packageId)
      put("duration", duration)
      put("createdAtMs", nowMs)
      put("suspendedUntilMs", untilMs)
    }
    synchronized(FocusLockModule.sessionLock) {
      val current = getSuspensions(context, nowMs)
      current.put(packageId, entry)
      prefs.edit().putString(SUSPENSIONS_KEY, current.toString()).commit()
    }
    return entry
  }

  fun clearSuspension(context: Context, packageId: String) {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    synchronized(FocusLockModule.sessionLock) {
      val current = getSuspensions(context)
      current.remove(packageId)
      prefs.edit().putString(SUSPENSIONS_KEY, current.toString()).commit()
    }
  }

  fun isReminderSuspended(context: Context, packageId: String, nowMs: Long = System.currentTimeMillis()): Boolean {
    val entry = getSuspensions(context, nowMs).optJSONObject(packageId) ?: return false
    return entry.optLong("suspendedUntilMs", 0L) > nowMs
  }

  fun setStrictPolicy(context: Context, strictLevel: Int, pinProtection: Boolean, hasConfiguredPin: Boolean, limitEmergencyExits: Boolean) {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val policy = JSONObject().apply {
      put("strictLevel", strictLevel.coerceIn(1, 3))
      put("pinProtection", pinProtection)
      put("hasConfiguredPin", hasConfiguredPin)
      put("limitEmergencyExits", limitEmergencyExits)
    }
    prefs.edit().putString(STRICT_POLICY_KEY, policy.toString()).commit()
  }

  fun getStrictPolicy(context: Context): JSONObject {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(STRICT_POLICY_KEY, null)
    return runCatching { if (raw != null) JSONObject(raw) else JSONObject() }.getOrElse { JSONObject() }
  }

  fun requiresPinForEmergency(context: Context): Boolean {
    val policy = getStrictPolicy(context)
    val level = policy.optInt("strictLevel", 1)
    return level >= 2 && policy.optBoolean("pinProtection", false) && policy.optBoolean("hasConfiguredPin", false)
  }

  fun getEmergencyState(context: Context, nowMs: Long = System.currentTimeMillis()): JSONObject {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    val today = todayDateKey(nowMs)
    val raw = prefs.getString(EMERGENCY_STATE_KEY, null)
    val state = runCatching { if (raw != null) JSONObject(raw) else JSONObject() }.getOrElse { JSONObject() }

    if (state.optString("dateKey") != today) {
      state.put("dateKey", today)
      state.put("usedToday", 0)
      state.put("maxDailyUses", DEFAULT_DAILY_EMERGENCY_USES)
    }
    if (!state.has("maxDailyUses")) {
      state.put("maxDailyUses", DEFAULT_DAILY_EMERGENCY_USES)
    }
    if (!state.has("history")) {
      state.put("history", JSONArray())
    }

    // Expire activePass if elapsed time or wall time exceeded.
    val activePass = state.optJSONObject("activePass")
    if (activePass != null && isEmergencyPassExpired(context, activePass, nowMs)) {
      state.remove("activePass")
      prefs.edit().putString(EMERGENCY_STATE_KEY, state.toString()).commit()
    }
    return state
  }

  fun isEmergencyPassExpired(context: Context, pass: JSONObject, nowMs: Long = System.currentTimeMillis()): Boolean {
    val durationMs = pass.optLong("durationMs", EMERGENCY_PASS_DURATION_MS)
    val savedBoot = pass.optInt("bootCount", -1)
    val nowBoot = FocusLockSessionTiming.currentBootCount(context)
    val expiresElapsed = pass.optLong("expiresElapsedMs", -1L)
    if (savedBoot != -1 && nowBoot != -1 && savedBoot == nowBoot && expiresElapsed > 0L) {
      val remaining = (expiresElapsed - SystemClock.elapsedRealtime()).coerceAtMost(durationMs)
      return remaining <= 0L
    }
    val expiresAt = pass.optLong("expiresAtMs", 0L)
    return expiresAt <= nowMs
  }

  fun isPackageUnderEmergencyPass(context: Context, packageId: String, nowMs: Long = System.currentTimeMillis()): Boolean {
    val state = getEmergencyState(context, nowMs)
    val pass = state.optJSONObject("activePass") ?: return false
    if (isEmergencyPassExpired(context, pass, nowMs)) return false
    val passPkg = pass.optString("packageId", "")
    return passPkg == packageId || passPkg == "*"
  }

  fun rebaseEmergencyPassOnBootOrClockChange(context: Context): Long? {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    synchronized(FocusLockModule.sessionLock) {
      val state = getEmergencyState(context)
      val pass = state.optJSONObject("activePass") ?: return null
      val durationMs = pass.optLong("durationMs", EMERGENCY_PASS_DURATION_MS)
      val savedBoot = pass.optInt("bootCount", -1)
      val nowBoot = FocusLockSessionTiming.currentBootCount(context)
      val remaining = if (savedBoot != -1 && nowBoot != -1 && savedBoot == nowBoot && pass.has("expiresElapsedMs")) {
        (pass.optLong("expiresElapsedMs", 0L) - SystemClock.elapsedRealtime()).coerceIn(0L, durationMs)
      } else {
        (pass.optLong("expiresAtMs", 0L) - System.currentTimeMillis()).coerceIn(0L, durationMs)
      }
      if (remaining <= 0L) {
        state.remove("activePass")
        prefs.edit().putString(EMERGENCY_STATE_KEY, state.toString()).commit()
        return null
      }
      val elapsedNow = SystemClock.elapsedRealtime()
      val nowWall = System.currentTimeMillis()
      pass.put("expiresElapsedMs", elapsedNow + remaining)
      pass.put("expiresAtMs", nowWall + remaining)
      pass.put("bootCount", nowBoot)
      prefs.edit().putString(EMERGENCY_STATE_KEY, state.toString()).commit()
      return elapsedNow + remaining
    }
  }

  /**
   * Grants a 5-minute emergency pass. If a pass is already active, returns the existing pass
   * without resetting its timer or consuming an extra use.
   */
  fun grantEmergencyPass(
    context: Context,
    packageId: String,
    appName: String,
    source: String = "intervention",
    nowMs: Long = System.currentTimeMillis(),
  ): JSONObject {
    val prefs = context.getSharedPreferences(FocusLockModule.PREFS, Context.MODE_PRIVATE)
    synchronized(FocusLockModule.sessionLock) {
      val state = getEmergencyState(context, nowMs)
      val existing = state.optJSONObject("activePass")
      if (existing != null && !isEmergencyPassExpired(context, existing, nowMs)) {
        return JSONObject().apply {
          put("granted", true)
          put("reusedExisting", true)
          put("activePass", existing)
          put("remainingUses", (state.optInt("maxDailyUses", DEFAULT_DAILY_EMERGENCY_USES) - state.optInt("usedToday", 0)).coerceAtLeast(0))
          put("state", state)
        }
      }

      val maxUses = state.optInt("maxDailyUses", DEFAULT_DAILY_EMERGENCY_USES)
      val usedToday = state.optInt("usedToday", 0)
      if (usedToday >= maxUses) {
        return JSONObject().apply {
          put("granted", false)
          put("reason", "daily_limit_reached")
          put("remainingUses", 0)
          put("state", state)
        }
      }

      val elapsedNow = SystemClock.elapsedRealtime()
      val expiresAtMs = nowMs + EMERGENCY_PASS_DURATION_MS
      val expiresElapsedMs = elapsedNow + EMERGENCY_PASS_DURATION_MS
      val pass = JSONObject().apply {
        put("id", "emg-${nowMs}")
        put("packageId", packageId)
        put("appName", appName)
        put("grantedAtMs", nowMs)
        put("expiresAtMs", expiresAtMs)
        put("expiresElapsedMs", expiresElapsedMs)
        put("durationMs", EMERGENCY_PASS_DURATION_MS)
        put("bootCount", FocusLockSessionTiming.currentBootCount(context))
        put("source", source)
      }

      val history = state.optJSONArray("history") ?: JSONArray()
      val entry = JSONObject().apply {
        put("id", pass.optString("id"))
        put("packageId", packageId)
        put("appName", appName)
        put("grantedAtMs", nowMs)
        put("expiresAtMs", expiresAtMs)
        put("durationMs", EMERGENCY_PASS_DURATION_MS)
        put("source", source)
      }
      history.put(entry)
      // Keep last 50 audit entries.
      val trimmedHistory = JSONArray()
      val startIdx = (history.length() - 50).coerceAtLeast(0)
      for (i in startIdx until history.length()) {
        trimmedHistory.put(history.get(i))
      }

      state.put("usedToday", usedToday + 1)
      state.put("activePass", pass)
      state.put("history", trimmedHistory)
      prefs.edit().putString(EMERGENCY_STATE_KEY, state.toString()).commit()
      FocusLockAlarm.scheduleEmergencyExpiry(context, expiresElapsedMs)

      return JSONObject().apply {
        put("granted", true)
        put("reusedExisting", false)
        put("activePass", pass)
        put("remainingUses", (maxUses - (usedToday + 1)).coerceAtLeast(0))
        put("state", state)
      }
    }
  }
}
