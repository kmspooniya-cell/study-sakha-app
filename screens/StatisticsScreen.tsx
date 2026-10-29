import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { BarChart, LineChart } from '../components/Charts';
import { Shell, useLayout } from '../components/Shell';
import {
  Card,
  EmptyState,
  SectionHeader,
  Txt,
} from '../components/ui';
import { useStore, dayKey } from '../lib/store';
import { radii, useTheme } from '../lib/theme';

const HISTORY_KEY = 'study-sakha-focus-history-v1';

type FocusSession = {
  id: string;
  subject: string;
  topic: string;
  minutes: number;
  completedAt: string;
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function safeParseSessions(raw: unknown): FocusSession[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw as string);
    if (!Array.isArray(parsed)) return [];
    const seenIds = new Set<string>();

return parsed.filter(
  (s: any) => {
    if (
      !s ||
      typeof s.id !== 'string' ||
      typeof s.minutes !== 'number' ||
      !Number.isFinite(s.minutes) ||
      s.minutes < 0 ||
      typeof s.completedAt !== 'string' ||
      Number.isNaN(Date.parse(s.completedAt)) ||
      new Date(s.completedAt).getTime() > Date.now() ||
      seenIds.has(s.id)
    ) {
      return false;
    }

    seenIds.add(s.id);
    return true;
  }
);
  } catch {
    return [];
  }
}

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { streak } = useStore();
  const { isMobile, isDesktop } = useLayout();

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        if (!active) return;
        setSessions(safeParseSessions(raw));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const [now, setNow] = useState(() => new Date());

useEffect(() => {
  const updateDate = () => setNow(new Date());

  const interval = setInterval(updateDate, 60_000);

  return () => clearInterval(interval);
}, []);

  const stats = useMemo(() => {
    const today = now;
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const todaySessions = sessions.filter((s) => {
      const d = new Date(s.completedAt);
      return isSameDay(d, today);
    });
    const todayMinutes = todaySessions.reduce((sum, s) => sum + Math.max(0, s.minutes), 0);
    const todayCount = todaySessions.length;

    const weekStart = new Date(startOfToday);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekSessions = sessions.filter((s) => new Date(s.completedAt) >= weekStart);
    const weekMinutes = weekSessions.reduce((sum, s) => sum + Math.max(0, s.minutes), 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthSessions = sessions.filter((s) => new Date(s.completedAt) >= monthStart);
    const monthMinutes = monthSessions.reduce((sum, s) => sum + Math.max(0, s.minutes), 0);

    const last7Days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const dayMins = sessions
        .filter((s) => isSameDay(new Date(s.completedAt), d))
        .reduce((sum, s) => sum + Math.max(0, s.minutes), 0);
      last7Days.push({ label: DAY_LABELS[d.getDay()], value: dayMins });
    }

    const weeksInMonth: { label: string; value: number }[] = [];
    const weeksCount = Math.ceil(today.getDate() / 7);
    for (let w = 0; w < weeksCount; w++) {
      const wStart = new Date(monthStart);
      wStart.setDate(wStart.getDate() + w * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      const wMins = sessions
        .filter((s) => {
          const d = new Date(s.completedAt);
          return d >= wStart && d < wEnd;
        })
        .reduce((sum, s) => sum + Math.max(0, s.minutes), 0);
      weeksInMonth.push({ label: `W${w + 1}`, value: wMins });
    }

    const subjectMap = new Map<string, number>();
    sessions.forEach((s) => {
      const subj = s.subject || 'General Study';
      subjectMap.set(subj, (subjectMap.get(subj) ?? 0) + Math.max(0, s.minutes));
    });
    const subjects = Array.from(subjectMap.entries())
      .map(([name, mins]) => ({ name, mins }))
      .sort((a, b) => b.mins - a.mins);

    const recentSessions = sessions.slice(0, 10);

    return {
      todayMinutes,
      todayCount,
      weekMinutes,
      monthMinutes,
      last7Days,
      weeksInMonth,
      subjects,
      recentSessions,
    };
  }, [sessions, now]);
  const DAILY_GOAL_MINUTES = 120;
  const WEEKLY_GOAL_MINUTES = 600;

  const dailyGoalProgress = Math.min(
    100,
    Math.round((stats.todayMinutes / DAILY_GOAL_MINUTES) * 100)
  );

  const weeklyGoalProgress = Math.min(
    100,
    Math.round((stats.weekMinutes / WEEKLY_GOAL_MINUTES) * 100)
  );

  const smartInsight = useMemo(() => {
    if (sessions.length === 0) {
      return {
        title: 'Your journey starts here',
        message: 'Complete your first focus session to unlock personalized study insights.',
        icon: 'sparkles-outline' as const,
      };
    }

    if (stats.todayMinutes >= DAILY_GOAL_MINUTES) {
      return {
        title: 'Daily goal achieved!',
        message: 'You reached your daily focus target. Great consistency!',
        icon: 'trophy-outline' as const,
      };
    }

    if (stats.todayMinutes > 0) {
      const remaining = DAILY_GOAL_MINUTES - stats.todayMinutes;

      return {
        title: 'Keep your momentum',
        message: `${formatDuration(remaining)} more to reach today's study goal.`,
        icon: 'trending-up-outline' as const,
      };
    }

    return {
      title: 'Start with one session',
      message: 'A short focused session today can help build a consistent study habit.',
      icon: 'bulb-outline' as const,
    };
  }, [sessions.length, stats.todayMinutes]);
  const hasHistory = sessions.length > 0;
  const performanceStats = useMemo(() => {
    const activeDays = stats.last7Days.filter(
      (day) => day.value > 0
    ).length;

    const consistency = Math.round((activeDays / 7) * 100);

    const averageSession = sessions.length
      ? Math.round(
          sessions.reduce(
            (sum, session) => sum + Math.max(0, session.minutes),
            0
          ) / sessions.length
        )
      : 0;

    return {
      activeDays,
      consistency,
      averageSession,
    };
  }, [stats.last7Days, sessions]);
  const subjectColors = [colors.blue, colors.teal, colors.amber, colors.violet, colors.rose, colors.success];
  const hasSubjects = stats.subjects.some(
    (subject) => subject.name !== 'General Study'
  );
  
  const activityHeatmap = useMemo(() => {
    const days: { date: Date; minutes: number }[] = [];
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
    for (let i = 83; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
  
      const minutes = sessions
        .filter((session) => isSameDay(new Date(session.completedAt), date))
        .reduce((sum, session) => sum + Math.max(0, session.minutes), 0);
  
      days.push({ date, minutes });
    }
  
    return days;
  }, [sessions, now]);
  const overviewCards = [
    {
      icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
      label: 'Today',
      value: formatDuration(stats.todayMinutes),
      sub: `${stats.todayCount} session${stats.todayCount !== 1 ? 's' : ''}`,
      color: colors.blue,
    },
    {
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
      label: 'This Week',
      value: formatDuration(stats.weekMinutes),
      sub: 'last 7 days',
      color: colors.teal,
    },
    {
      icon: 'flame-outline' as keyof typeof Ionicons.glyphMap,
      label: 'Streak',
      value: `${Math.max(0, Number(streak) || 0)} days`,
      sub: hasHistory ? 'consecutive days' : 'no history yet',
      color: colors.amber,
    },
    {
      icon: 'bar-chart-outline' as keyof typeof Ionicons.glyphMap,
      label: MONTH_NAMES[now.getMonth()],
      value: formatDuration(stats.monthMinutes),
      sub: 'this month',
      color: colors.violet,
    },
  ];

  return (
    <Shell
      active="Statistics"
      title="Statistics"
      subtitle="Track your focus sessions and study patterns"
    >
      {!loaded ? (
        <Card>
          <Txt size={14} color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: 24 }}>
            Loading statistics…
          </Txt>
        </Card>
      ) : !hasHistory ? (
        <EmptyState
          icon="analytics-outline"
          title="No study history yet"
          body="Complete a focus session from the Focus Timer to start building your study statistics. Your sessions will appear here with detailed breakdowns."
        />
      ) : (
        <View style={{ gap: 20 }}>
          {/* Overview cards */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {overviewCards.map((card) => (
              <View
                key={card.label}
                style={{
                  flexBasis: isMobile ? '47%' : isDesktop ? '23.5%' : '31%',
                  flexGrow: 1,
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: `${card.color}1A`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={card.icon} size={19} color={card.color} />
                </View>
                <View>
                  <Txt size={22} weight="800" display>
                    {card.value}
                  </Txt>
                  <Txt size={11.5} color={colors.textMuted} style={{ marginTop: 2 }}>
                    {card.label}
                  </Txt>
                  <Txt size={10.5} color={colors.textFaint} style={{ marginTop: 1 }}>
                    {card.sub}
                  </Txt>
                </View>
              </View>
            ))}
          </View>
{/* Smart Study Insights */}
<Card>
  <SectionHeader title="Smart Insights" icon="sparkles-outline" />

  <View
    style={{
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceAlt,
    }}
  >
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: `${colors.teal}20`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons
        name={smartInsight.icon}
        size={22}
        color={colors.teal}
      />
    </View>

    <View style={{ flex: 1, gap: 5 }}>
      <Txt size={15} weight="800">
        {smartInsight.title}
      </Txt>

      <Txt size={12.5} color={colors.textMuted}>
        {smartInsight.message}
      </Txt>
    </View>
  </View>
</Card>

{/* Study Goal Tracker */}
<Card>
  <SectionHeader title="Study Goals" icon="flag-outline" />

  <View style={{ gap: 22 }}>
    <View style={{ gap: 9 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Txt size={14} weight="700">
            Daily Focus Goal
          </Txt>
          <Txt size={11.5} color={colors.textMuted}>
            Target: 2 hours per day
          </Txt>
        </View>

        <Txt size={13} weight="800" color={colors.blue}>
          {dailyGoalProgress}%
        </Txt>
      </View>

      <View
        style={{
          height: 10,
          borderRadius: 10,
          backgroundColor: colors.surfaceAlt,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${dailyGoalProgress}%`,
            height: '100%',
            backgroundColor: colors.blue,
            borderRadius: 10,
          }}
        />
      </View>

      <Txt size={11.5} color={colors.textMuted}>
        {formatDuration(stats.todayMinutes)} of 2h completed
      </Txt>
    </View>

    <View style={{ gap: 9 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Txt size={14} weight="700">
            Weekly Focus Goal
          </Txt>
          <Txt size={11.5} color={colors.textMuted}>
            Target: 10 hours per week
          </Txt>
        </View>

        <Txt size={13} weight="800" color={colors.teal}>
          {weeklyGoalProgress}%
        </Txt>
      </View>

      <View
        style={{
          height: 10,
          borderRadius: 10,
          backgroundColor: colors.surfaceAlt,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${weeklyGoalProgress}%`,
            height: '100%',
            backgroundColor: colors.teal,
            borderRadius: 10,
          }}
        />
      </View>

      <Txt size={11.5} color={colors.textMuted}>
        {formatDuration(stats.weekMinutes)} of 10h completed
      </Txt>
    </View>
  </View>
</Card>
{/* 12-Week Study Activity */}
<Card>
  <SectionHeader
    title="Study Activity"
    icon="calendar-outline"
  />

  <Txt size={12} color={colors.textMuted}>
    Your focus activity over the last 12 weeks
  </Txt>

  <View style={{ gap: 8, marginTop: 14 }}>
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
        (day) => (
          <Txt
            key={day}
            size={9}
            color={colors.textMuted}
            style={{ width: '13%', textAlign: 'center' }}
          >
            {day}
          </Txt>
        )
      )}
    </View>

    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 4,
      }}
    >
      {activityHeatmap.map((day) => {
        const intensity =
          day.minutes === 0 ? 0 :
          day.minutes < 25 ? 1 :
          day.minutes < 60 ? 2 :
          day.minutes < 120 ? 3 : 4;

        const backgrounds = [
          colors.surfaceAlt,
          `${colors.teal}35`,
          `${colors.teal}65`,
          `${colors.teal}A0`,
          colors.teal,
        ];

        return (
          <View
            key={dayKey(day.date)}
            style={{
              width: '2.7%',
              aspectRatio: 1,
              minWidth: 7,
              borderRadius: 3,
              backgroundColor: backgrounds[intensity],
            }}
          />
        );
      })}
    </View>

    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 5,
        marginTop: 8,
      }}
    >
      <Txt size={10} color={colors.textMuted}>Less</Txt>

      {[colors.surfaceAlt, `${colors.teal}35`, `${colors.teal}65`, `${colors.teal}A0`, colors.teal].map(
        (color, index) => (
          <View
            key={index}
            style={{
              width: 11,
              height: 11,
              borderRadius: 3,
              backgroundColor: color,
            }}
          />
        )
      )}

      <Txt size={10} color={colors.textMuted}>More</Txt>
    </View>
  </View>
</Card>{/* Weekly Performance */}
<Card>
  <SectionHeader
    title="Weekly Performance"
    icon="analytics-outline"
  />

  <View
    style={{
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    }}
  >
    {[
      {
        label: 'Active Days',
        value: `${performanceStats.activeDays}/7`,
        icon: 'calendar-outline' as const,
        color: colors.blue,
      },
      {
        label: 'Consistency',
        value: `${performanceStats.consistency}%`,
        icon: 'trending-up-outline' as const,
        color: colors.teal,
      },
      {
        label: 'Avg. Session',
        value: formatDuration(performanceStats.averageSession),
        icon: 'time-outline' as const,
        color: colors.violet,
      },
    ].map((item) => (
      <View
        key={item.label}
        style={{
          flexGrow: 1,
          flexBasis: '28%',
          minWidth: 100,
          padding: 14,
          gap: 10,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons
          name={item.icon}
          size={21}
          color={item.color}
        />

        <Txt size={20} weight="800" display>
          {item.value}
        </Txt>

        <Txt size={11} color={colors.textMuted}>
          {item.label}
        </Txt>
      </View>
    ))}
  </View>

  <Txt
    size={12}
    color={colors.textMuted}
    style={{ marginTop: 12 }}
  >
    Consistency is based on the number of days with recorded focus time in the last 7 days.
  </Txt>
</Card>
          {/* Weekly chart */}
          <Card>
            <SectionHeader title="Last 7 days" icon="bar-chart-outline" />
            <View style={{ flexDirection: 'row', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>
              <View>
                <Txt size={22} weight="800" display>
                  {formatDuration(stats.weekMinutes)}
                </Txt>
                <Txt size={11.5} color={colors.textMuted}>
                  total this week
                </Txt>
              </View>
              <View>
                <Txt size={22} weight="800" display color={colors.teal}>
                  {formatDuration(Math.round(stats.weekMinutes / 7))}
                </Txt>
                <Txt size={11.5} color={colors.textMuted}>
                  daily average
                </Txt>
              </View>
            </View>
            <BarChart data={stats.last7Days} height={170} />
          </Card>

          {/* Monthly trend */}
          <Card>
            <SectionHeader
              title={`${MONTH_NAMES[now.getMonth()]} weekly trend`}
              icon="trending-up-outline"
            />
            <View style={{ flexDirection: 'row', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>
              <View>
                <Txt size={22} weight="800" display>
                  {formatDuration(stats.monthMinutes)}
                </Txt>
                <Txt size={11.5} color={colors.textMuted}>
                  this month total
                </Txt>
              </View>
              <View>
                <Txt size={22} weight="800" display color={colors.blue}>
                  {stats.weeksInMonth.length}
                </Txt>
                <Txt size={11.5} color={colors.textMuted}>
                  active weeks
                </Txt>
              </View>
            </View>
            {stats.weeksInMonth.some((w) => w.value > 0) ? (
              <LineChart data={stats.weeksInMonth} height={140} color={colors.violet} />
            ) : (
              <Txt size={12.5} color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: 20 }}>
                No sessions recorded this month yet.
              </Txt>
            )}
          </Card>

          {/* Subject-wise statistics */}
          <Card>
            <SectionHeader title="Study time by subject" icon="book-outline" />
            {hasSubjects ? (
              <View style={{ gap: 14 }}>
                {stats.subjects.map((subj, i) => {
                  const maxMins = stats.subjects[0].mins;
                  const pct = maxMins > 0 ? (subj.mins / maxMins) * 100 : 0;
                  const color = subjectColors[i % subjectColors.length];
                  return (
                    <View key={subj.name}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Txt size={13} weight="600">
                          {subj.name}
                        </Txt>
                        <Txt size={12.5} weight="700" color={colors.textMuted}>
                          {formatDuration(subj.mins)}
                        </Txt>
                      </View>
                      <View
                        style={{
                          height: 8,
                          borderRadius: 8,
                          backgroundColor: colors.surfaceAlt,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${Math.max(2, pct)}%`,
                            height: 8,
                            backgroundColor: color,
                            borderRadius: 8,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Txt size={12.5} color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: 20 }}>
                Subjects will appear here once you complete focus sessions with a subject set.
              </Txt>
            )}
          </Card>

          {/* Recent sessions */}
          <Card>
            <SectionHeader title="Recent sessions" icon="time-outline" />
            {stats.recentSessions.length > 0 ? (
              <View style={{ gap: 10 }}>
                {stats.recentSessions.map((session) => {
                  const d = new Date(session.completedAt);
                  const dateStr = d.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeStr = d.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <View
                      key={session.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: colors.tint,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="checkmark-done-outline" size={20} color={colors.blue} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Txt size={13.5} weight="700" numberOfLines={1}>
                          {session.subject}
                          {session.topic ? ` · ${session.topic}` : ''}
                        </Txt>
                        <Txt size={11.5} color={colors.textMuted}>
                          {dateStr} · {timeStr}
                        </Txt>
                      </View>
                      <View
                        style={{
                          backgroundColor: colors.surfaceAlt,
                          borderRadius: radii.pill,
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                        }}
                      >
                        <Txt size={12} weight="800" color={colors.teal}>
                          {formatDuration(session.minutes)}
                        </Txt>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Txt size={12.5} color={colors.textMuted} style={{ textAlign: 'center', paddingVertical: 20 }}>
                No completed sessions yet.
              </Txt>
            )}
          </Card>
        </View>
      )}
    </Shell>
  );
}
