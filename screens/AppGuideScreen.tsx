import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Shell } from '../components/Shell';
import { Button, Card, Txt } from '../components/ui';
import { radii, useTheme } from '../lib/theme';

const GUIDE_SECTIONS = [
  {
    icon: 'home-outline',
    title: 'Home',
    body: 'Start here for your study plan, progress, and recent resources.',
    route: 'Dashboard',
  },
  {
    icon: 'library-outline',
    title: 'Library',
    body: 'Browse Notes, Books & PDFs, PYQ Sets, Starred resources, and Downloads.',
    route: 'Library',
  },
  {
    icon: 'albums-outline',
    title: 'Practice',
    body: 'Use PYQ Bank for questions and Tests for timed practice and results.',
    route: 'Tests',
  },
  {
    icon: 'sparkles-outline',
    title: 'Sakha AI',
    body: 'Ask Sakha AI a study question or request help with a topic.',
    route: 'SakhaAI',
  },
  {
    icon: 'settings-outline',
    title: 'Settings',
    body: 'Adjust your theme, language, reading comfort, and daily study goal.',
    route: 'Settings',
  },
] as const;

export function AppGuideContent({ onOpen }: { onOpen: (route: string) => void }) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      {GUIDE_SECTIONS.map((section) => (
        <Card key={section.title} style={{ padding: 0 }}>
          <Pressable
            onPress={() => onOpen(section.route)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${section.title}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 16,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View style={{ width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint }}>
              <Ionicons name={section.icon} size={21} color={colors.blue} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt size={14} weight="800">{section.title}</Txt>
              <Txt size={12.5} color={colors.textMuted}>{section.body}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        </Card>
      ))}
    </View>
  );
}

export default function AppGuideScreen() {
  const nav = useNavigation<any>();

  return (
    <Shell active="AppGuide" title="How to Use the App" subtitle="A quick guide to the main Study Sakha sections">
      <View style={{ gap: 12 }}>
        <AppGuideContent onOpen={(route) => nav.navigate(route)} />
        <Button label="Back to Settings" icon="settings-outline" variant="outline" onPress={() => nav.navigate('Settings')} />
      </View>
    </Shell>
  );
}
