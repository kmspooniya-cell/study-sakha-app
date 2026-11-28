import { CommonActions, useNavigation } from '@react-navigation/native';
import type { AppNavigation, AppNavigationRouteName } from '../lib/navigation';
import React from 'react';
import { Pressable, View } from 'react-native';
import {
  BookOpen,
  ChevronRight,
  Home,
  Layers,
  Settings,
  Sparkles,
} from 'lucide-react-native';
import { Shell } from '../components/Shell';
import {
  SSDSButton,
  SSDSColumn,
  SSDSIcon,
  SSDSRow,
  SSDSSectionHeader,
  SSDSStack,
  SSDSSurface,
  SSDSText,
  useSSDSTheme,
} from '../lib/ssds';

const GUIDE_SECTIONS = [
  {
    icon: Home,
    title: 'Home',
    body: 'Start here for your study plan, progress, and recent resources.',
    route: 'Dashboard',
  },
  {
    icon: BookOpen,
    title: 'Library',
    body: 'Browse Notes, Books & PDFs, PYQ Sets, Starred resources, and Downloads.',
    route: 'Library',
  },
  {
    icon: Layers,
    title: 'Practice',
    body: 'Use PYQ Bank for questions and Tests for timed practice and results.',
    route: 'Tests',
  },
  {
    icon: Sparkles,
    title: 'Sakha AI',
    body: 'Ask Sakha AI a study question or request help with a topic.',
    route: 'SakhaAI',
  },
  {
    icon: Settings,
    title: 'Settings',
    body: 'Adjust your theme, language, reading comfort, and daily study goal.',
    route: 'Settings',
  },
] as const;

type GuideRouteName = Extract<AppNavigationRouteName, 'Dashboard' | 'Library' | 'Tests' | 'SakhaAI' | 'Settings'>;

export function AppGuideContent({ onOpen }: { onOpen: (route: GuideRouteName) => void }) {
  const { tokens } = useSSDSTheme();

  return (
    <SSDSStack gap={12}>
      <SSDSSectionHeader
        title="App Sections"
        subtitle="Tap any section below to jump straight to it"
        compact
      />
      {GUIDE_SECTIONS.map((section) => (
        <SSDSSurface key={section.title} variant="outlined" radius="lg">
          <Pressable
            onPress={() => onOpen(section.route)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${section.title}`}
            style={({ pressed }) => ({
              padding: 16,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <SSDSRow gap={14}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: tokens.radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tokens.colors.primaryLight,
                }}
              >
                <SSDSIcon icon={section.icon} size={21} color="primary" />
              </View>
              <SSDSColumn gap={3} style={{ flex: 1 }}>
                <SSDSText variant="CardTitle">{section.title}</SSDSText>
                <SSDSText variant="BodySecondary">{section.body}</SSDSText>
              </SSDSColumn>
              <SSDSIcon icon={ChevronRight} size={18} color="textTertiary" />
            </SSDSRow>
          </Pressable>
        </SSDSSurface>
      ))}
    </SSDSStack>
  );
}

export default function AppGuideScreen() {
  const nav = useNavigation<AppNavigation>();

  return (
    <Shell active="AppGuide" title="How to Use the App" subtitle="A quick guide to the main Study Sakha sections">
      <SSDSStack gap={12}>
        <AppGuideContent onOpen={(route) => nav.dispatch(CommonActions.navigate(route))} />
        <SSDSButton
          variant="outline"
          leadingIcon={Settings}
          onPress={() => nav.navigate('Settings')}
        >
          Back to Settings
        </SSDSButton>
      </SSDSStack>
    </Shell>
  );
}
