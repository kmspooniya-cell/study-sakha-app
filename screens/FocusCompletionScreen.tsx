import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigation, AppRoute } from '../lib/navigation';
import React, { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Shell } from '../components/Shell';
import { Button, Card, Txt } from '../components/ui';
import { useTheme } from '../lib/theme';

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export default function FocusCompletionScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<AppNavigation>();
  const { params } = useRoute<AppRoute<'FocusCompletion'>>();
  const [entrance] = useState(() => new Animated.Value(0.82));
  const [sparkle] = useState(() => new Animated.Value(0.6));
  const { session } = params;

  useEffect(() => {
    const entranceAnimation = Animated.parallel([
      Animated.spring(entrance, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 150 }),
      Animated.timing(sparkle, { toValue: 1, duration: 520, useNativeDriver: true }),
    ]);
    entranceAnimation.start();
    return () => entranceAnimation.stop();
  }, [entrance, sparkle]);

  const taskLabel = session.topic || session.subject;
  const planned = session.plannedSeconds === null
    ? 'Open-ended'
    : formatDuration(session.plannedSeconds);

  return (
    <Shell active="Dashboard" title="Session Complete" subtitle="A moment to recognize your progress">
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center', gap: 20, paddingVertical: 18 }}>
        <Animated.View
          accessibilityLabel="Celebration trophy"
          style={{
            width: 118,
            height: 118,
            borderRadius: 40,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${colors.amber}20`,
            borderWidth: 1,
            borderColor: `${colors.amber}55`,
            transform: [{ scale: entrance }],
            opacity: sparkle,
          }}
        >
          <Ionicons name="trophy" size={54} color={colors.amber} />
          <Ionicons name="sparkles" size={23} color={colors.rose} style={{ position: 'absolute', top: 13, right: 12 }} />
          <Ionicons name="star" size={15} color={colors.teal} style={{ position: 'absolute', left: 13, bottom: 17 }} />
        </Animated.View>

        <View style={{ alignItems: 'center', gap: 8 }}>
          <Txt size={26} weight="800" display style={{ textAlign: 'center' }}>
            {params.message}
          </Txt>
          <Txt size={14} color={colors.textMuted} style={{ textAlign: 'center', lineHeight: 21, maxWidth: 360 }}>
            Every focused minute brings you closer to your goal.
          </Txt>
        </View>

        <Card style={{ width: '100%', padding: 20, gap: 16 }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Txt size={11} weight="800" color={colors.textFaint} style={{ letterSpacing: 1 }}>
              ACTUAL FOCUS TIME
            </Txt>
            <View accessible accessibilityLabel={`Focused for ${formatDuration(session.focusedSeconds)}`}>
              <Txt size={42} weight="800" display style={{ color: colors.blue, fontVariant: ['tabular-nums'] }}>
                {formatDuration(session.focusedSeconds)}
              </Txt>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {[
              { icon: 'timer-outline' as const, label: 'Planned duration', value: planned },
              { icon: 'time-outline' as const, label: 'Session mode', value: session.mode.charAt(0).toUpperCase() + session.mode.slice(1) },
              { icon: 'checkmark-circle-outline' as const, label: 'Status', value: session.status === 'completed' ? 'Completed' : 'Saved early' },
              ...(taskLabel ? [{ icon: 'book-outline' as const, label: 'Subject / task', value: taskLabel }] : []),
            ].map((item) => (
              <View key={item.label} style={{ minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={item.icon} size={18} color={colors.blue} />
                <Txt size={12} color={colors.textMuted} style={{ flex: 1 }}>{item.label}</Txt>
                <Txt size={13} weight="700" style={{ maxWidth: '55%', textAlign: 'right' }}>{item.value}</Txt>
              </View>
            ))}
          </View>
        </Card>

        {params.groupSyncWarning ? (
          <Txt size={12} color={colors.warning} style={{ textAlign: 'center' }}>
            Saved on this device. Group statistics could not sync: {params.groupSyncWarning}
          </Txt>
        ) : null}

        <Button label="View Statistics" icon="analytics-outline" size="lg" full onPress={() => navigation.navigate('Statistics')} />
        <View style={{ width: '100%' }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.popTo('DashboardRoot')}
            style={({ pressed }) => ({
              minHeight: 48,
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
            })}
          >
            <Txt size={13} weight="700">Homepage</Txt>
          </Pressable>
        </View>
      </View>
    </Shell>
  );
}
