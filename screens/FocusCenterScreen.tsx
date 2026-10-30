import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FocusActivity, FocusActivityTimer } from '../components/DashboardStudyTools';
import { Shell } from '../components/Shell';
import { Txt } from '../components/ui';
import { useTheme } from '../lib/theme';

const ACTIVITIES: {
  id: FocusActivity;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'blue' | 'teal' | 'violet';
}[] = [
  { id: 'study', title: 'Focus for Study', subtitle: 'Build a focused study session.', icon: 'book-outline', colorKey: 'blue' },
  { id: 'meditation', title: 'Meditation', subtitle: 'Take a mindful pause.', icon: 'leaf-outline', colorKey: 'teal' },
  { id: 'break', title: 'Break', subtitle: 'Recharge before the next task.', icon: 'cafe-outline', colorKey: 'violet' },
];

export default function FocusCenterScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [activity, setActivity] = useState<FocusActivity | null>(null);

  useEffect(() => {
    return navigation.addListener('blur', () => setActivity(null));
  }, [navigation]);

  return (
    <Shell active="FocusCenter" title="Focus & Wellness" subtitle="Choose a session for your next study moment">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {ACTIVITIES.map((item, index) => {
          const color = colors[item.colorKey];
          const fullWidth = index === ACTIVITIES.length - 1;
          return (
            <Pressable
              key={item.id}
              onPress={() => setActivity(item.id)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                width: fullWidth ? '100%' : '48%',
                flexGrow: fullWidth ? 0 : 1,
                minHeight: 148,
                justifyContent: 'space-between',
                backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 20,
                padding: 18,
              })}
            >
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: `${color}1A` }}>
                <Ionicons name={item.icon} size={23} color={color} />
              </View>
              <View style={{ marginTop: 16 }}>
                <Txt size={15} weight="800">{item.title}</Txt>
                <Txt size={12} color={colors.textMuted} style={{ marginTop: 4 }}>{item.subtitle}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
      {activity ? (
        <FocusActivityTimer
          key={activity}
          activity={activity}
          onClose={() => setActivity(null)}
        />
      ) : null}
    </Shell>
  );
}
