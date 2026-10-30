import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { MoreOptionsGrid, Shell } from '../components/Shell';
import { useStore } from '../lib/store';

export default function MoreScreen() {
  const nav = useNavigation<any>();
  const { state, unread } = useStore();

  return (
    <Shell active="More" title="More" subtitle="Explore more Study Sakha features">
      <MoreOptionsGrid
        onGo={(route) => nav.navigate(route === 'Dashboard' ? 'DashboardRoot' : route)}
        active="More"
        isAdmin={state.user?.role === 'admin'}
        unread={unread}
      />
    </Shell>
  );
}
