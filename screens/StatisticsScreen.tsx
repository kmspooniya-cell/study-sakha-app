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
    return parsed.filter(
      (s: any) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.minutes === 'number' &&
        typeof s.completedAt === 'string'
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

  const now = useMemo(() => new Date(), []);

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

  const hasHistory = sessions.length > 0;
  const hasSubjects = stats.subjects.length > 0;
  const subjectColors = [colors.blue, colors.teal, colors.amber, colors.violet, colors.rose, colors.success];

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
