import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { EXAMS } from '../lib/data';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { Card, SectionHeader, Txt } from './ui';

export function FocusSelector() {
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { state } = useStore();
  const selectedExam = state.user?.exam ?? 'upsc';

  return (
    <Card style={{ marginTop: 18, gap: 2 }}>
      <SectionHeader title="Switch Focus" icon="swap-horizontal" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
        {EXAMS.map((item) => {
          const active = item.id === selectedExam;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={item.id}
              onPress={() => nav.navigate('Library', { exam: item.id })}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                backgroundColor: active ? colors.textPrimary : colors.surfaceAlt,
                borderColor: active ? colors.textPrimary : colors.surfaceAlt,
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <Txt size={13} weight="600" color={active ? colors.surface : colors.textPrimary}>
                {item.short}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </Card>
  );
}
