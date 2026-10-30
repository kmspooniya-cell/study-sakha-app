
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, radii } from '../lib/theme';
import { useStore } from '../lib/store';
import { ProgressRing, Txt } from './ui';

type Props = {
  onFocusTimer?: () => void;
  studiedMinutes?: number;
  dailyGoalMinutes?: number;
  completedTasks?: number;
  totalTasks?: number;
  streak?: number;
};

export function StitchDashboardHero({
  studiedMinutes = 0,
  dailyGoalMinutes = 60,
  streak = 0,
}: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { state } = useStore();
  const firstName = String(state.user?.name || 'Learner').trim().split(' ')[0];
  const progress =
    dailyGoalMinutes > 0
      ? Math.min(1, Math.max(0, studiedMinutes / dailyGoalMinutes))
      : 0;

  const hours = Math.floor(studiedMinutes / 60);
  const minutes = studiedMinutes % 60;
  const studyTime =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

  return (
    <View style={{ marginBottom: 22 }}>
      <LinearGradient
        colors={['#172B50', '#234B70', '#176B78']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 24,
          padding: 20,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Txt
              size={11}
              weight="800"
              color="#A9E8E0"
              style={{ letterSpacing: 1.5, marginBottom: 8 }}
            >
              TODAY’S MISSION
            </Txt>

            <Txt
              size={25}
              weight="800"
              color="#FFFFFF"
              display
              style={{ lineHeight: 32, marginBottom: 7 }}
            >
              Make today count.
            </Txt>

            <Txt size={13} color="#D5E3F0">
              One focused session at a time, {firstName}.
            </Txt>
          </View>

          <ProgressRing
            size={78}
            stroke={7}
            progress={progress}
            track="rgba(255,255,255,0.20)"
            from="#9EF0D9"
            to="#D0FFF0"
          >
            <Txt size={17} weight="800" color="#FFFFFF">
              {Math.round(progress * 100)}%
            </Txt>
          </ProgressRing>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            marginTop: 22,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderRadius: 15,
              padding: 13,
            }}
          >
            <Ionicons name="time-outline" size={19} color="#A9E8E0" />
            <Txt
              size={20}
              weight="800"
              color="#FFFFFF"
              style={{ marginTop: 5 }}
            >
              {studyTime}
            </Txt>
            <Txt size={11} color="#D5E3F0">
              Studied today
            </Txt>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderRadius: 15,
              padding: 13,
            }}
          >
            <Ionicons name="flame-outline" size={19} color="#FFD18A" />
            <Txt
              size={20}
              weight="800"
              color="#FFFFFF"
              style={{ marginTop: 5 }}
            >
              {streak} day{streak === 1 ? '' : 's'}
            </Txt>
            <Txt size={11} color="#D5E3F0">
              Study streak
            </Txt>
          </View>
        </View>

        <View
          style={{
            height: 7,
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.18)',
            overflow: 'hidden',
            marginBottom: 18,
          }}
        >
          <View
            style={{
              width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              height: 7,
              borderRadius: 8,
              backgroundColor: '#9EF0D9',
            }}
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate('Library')}
          style={({ pressed }) => ({
            marginTop: 11,
            minHeight: 46,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.32)',
            backgroundColor: pressed
              ? 'rgba(255,255,255,0.16)'
              : 'rgba(255,255,255,0.08)',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          })}
        >
          <Ionicons name="book-outline" size={18} color="#FFFFFF" />
          <Txt size={14} weight="700" color="#FFFFFF">
            Resume learning
          </Txt>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>
      </LinearGradient>
    </View>
  );
}
