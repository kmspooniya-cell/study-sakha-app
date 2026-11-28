import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../lib/navigation';
import React from 'react';
import { MoreOptionsGrid, Shell } from '../components/Shell';
import { SSDSSectionHeader, SSDSStack } from '../lib/ssds';
import { useStore } from '../lib/store';

export default function MoreScreen() {
  const nav = useNavigation<AppNavigation>();
  const { state, unread } = useStore();

  return (
    <Shell active="More" title="More" subtitle="Explore more Study Sakha features">
      <SSDSStack gap={12}>
        <SSDSSectionHeader
          title="Options"
          subtitle="Manage your Study Sakha preferences"
          compact
        />
        <MoreOptionsGrid
          onGo={(route) => nav.navigate(route === 'Dashboard' ? 'DashboardRoot' : route)}
          active="More"
          isAdmin={state.user?.role === 'admin'}
          unread={unread}
          onlyKeys={['Settings']}
        />
      </SSDSStack>
    </Shell>
  );
}
