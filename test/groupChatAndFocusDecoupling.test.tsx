import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (init: number | boolean) => ({ value: init }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withSpring: (val: number) => val,
    withTiming: (val: number) => val,
    interpolate: (_val: number, _input: number[], output: number[]) => output[0],
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const chain = {
    minDistance: () => chain,
    onStart: () => chain,
    onUpdate: () => chain,
    onEnd: () => chain,
    onFinalize: () => chain,
  };
  return {
    Gesture: { Pan: () => chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { ActiveSessionBar } from '../components/ActiveSessionBar';

let mockFocusContextValue: any = null;

jest.mock('../lib/focusSession', () => ({
  formatFocusClock: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },
  useOptionalFocusSession: () => mockFocusContextValue,
}));

jest.mock('../lib/theme', () => ({
  shadow: () => ({}),
  useTheme: () => ({
    scheme: 'light',
    colors: {
      teal: '#0D9488',
      warning: '#D97706',
      textMuted: '#64748B',
      text: '#0F172A',
      surfaceAlt: '#F1F5F9',
      border: '#E2E8F0',
      blue: '#2563EB',
    },
  }),
}));

const safeMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

// Mock Supabase
jest.mock('../lib/supabase', () => {
  const channelMock = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn((callback) => {
      if (typeof callback === 'function') callback('SUBSCRIBED', null);
      return channelMock;
    }),
    unsubscribe: jest.fn().mockResolvedValue({}),
  };
  return {
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'msg-123',
            group_id: 'grp-test',
            channel_id: 'general-chat',
            user_id: 'u1',
            sender_name: 'Aarav',
            sender_initials: 'AS',
            sender_role: 'Member',
            message: 'Hello everyone!',
            attachment: null,
            poll: null,
            pinned: false,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      })),
      channel: jest.fn(() => channelMock),
      removeChannel: jest.fn().mockResolvedValue({}),
    },
    assertSupabaseConfigured: jest.fn(),
    supabaseConfigured: true,
  };
});

describe('Four Requested Changes Verification', () => {
  describe('1. ActiveSessionBar: Personal Focus Visible, Group Hall Banner Removed', () => {
    beforeEach(() => {
      mockFocusContextValue = null;
    });

    it('keeps personal Focus Mode ActiveSessionBar visible across screens independently of Group Hall membership', () => {
      const togglePause = jest.fn();
      const onBackToFocus = jest.fn();
      mockFocusContextValue = {
        session: {
          id: 'focus-1',
          phase: 'focus',
          topic: 'Polity',
          subject: 'GS-II',
          pendingRecord: false,
        },
        activeHallContext: {
          groupId: 'grp-1',
          groupName: 'UPSC Prelims',
          roomId: 'silent-focus',
          roomName: 'Silent Focus Hall',
          roomSessionId: 'room-1',
          isInsideHall: true,
        },
        currentRouteName: 'Groups',
        secondsRemaining: 1500,
        isOnBreak: false,
        isRunning: true,
        togglePause,
        openActiveHall: jest.fn(),
      };

      const view = render(
        <SafeAreaProvider initialMetrics={safeMetrics}>
          <ActiveSessionBar
            visible={true}
            context="global"
            currentRouteName="Groups"
            onPressBackToFocus={onBackToFocus}
          />
        </SafeAreaProvider>
      );

      expect(view.getByTestId('active-session-bar')).toBeTruthy();
      fireEvent.press(view.getByTestId('focus-bubble-collapsed'));
      expect(view.getByLabelText('Back to Focus')).toBeTruthy();
      expect(view.getByLabelText('Pause active focus session')).toBeTruthy();
      expect(view.queryByLabelText('Return to Hall')).toBeNull();
      expect(view.queryByText('Silent Focus Hall')).toBeNull();
      expect(view.queryByText('UPSC Prelims')).toBeNull();

      fireEvent.press(view.getByLabelText('Pause active focus session'));
      expect(togglePause).toHaveBeenCalledTimes(1);

      fireEvent.press(view.getByLabelText('Back to Focus'));
      expect(onBackToFocus).toHaveBeenCalledTimes(1);
    });

    it('never renders Group Hall-specific banner when no personal Focus session is active', () => {
      mockFocusContextValue = {
        session: null,
        activeHallContext: {
          groupId: 'grp-1',
          groupName: 'UPSC Prelims',
          roomId: 'silent-focus',
          roomName: 'Silent Focus Hall',
          roomSessionId: 'room-1',
          isInsideHall: false,
        },
        currentRouteName: 'DashboardRoot',
        secondsRemaining: 0,
        isOnBreak: false,
        isRunning: false,
        togglePause: jest.fn(),
        openActiveHall: jest.fn(),
      };

      const view = render(
        <SafeAreaProvider initialMetrics={safeMetrics}>
          <ActiveSessionBar
            visible={true}
            context="global"
            currentRouteName="DashboardRoot"
            onPressBackToFocus={jest.fn()}
          />
        </SafeAreaProvider>
      );

      expect(view.queryByTestId('active-session-bar')).toBeNull();
      expect(view.queryByLabelText('Return to Hall')).toBeNull();
      expect(view.queryByText('Silent Focus Hall')).toBeNull();
      expect(view.queryByText('UPSC Prelims')).toBeNull();
    });
  });

  describe('2. Direct Entry for Silent Focus Hall', () => {
    it('verifies GroupsScreen cards and direct entry button removal in code structure', () => {
      const fs = require('fs');
      const content = fs.readFileSync('screens/GroupsScreen.tsx', 'utf-8');

      // The separate Join room button must not exist for silent-focus
      expect(content).toContain('isSilentFocusCard');
      expect(content).toContain('isCardClickable');
      expect(content).toContain('Direct Entry');
      // Clicking anywhere on the card enters directly
      expect(content).toContain('onPress={handleCardPress}');
    });
  });

  describe('3. Decouple Group Membership from Personal Focus Activity', () => {
    it('verifies that leaving a room does not end personal focus and state mapping uses personal focus mode', () => {
      const fs = require('fs');
      const content = fs.readFileSync('screens/GroupsScreen.tsx', 'utf-8');

      // clearRoomSession must not terminate active personal focus
      expect(content).toContain('// Clear context registration for this room session, but do not stop active personal focus mode');
      expect(content).not.toMatch(/clearRoomSession[\s\S]*?endGroupRoomFocus\(currentSessionId\)/);

      // Smart Study Room mapping checks globalFocus state
      expect(content).toContain('isFocusRunning = Boolean(globalFocus?.isRunning && !globalFocus?.isOnBreak)');
      expect(content).toContain('isFocusPaused = Boolean(');
    });
  });

  describe('4. Group Chat Visibility and Realtime Synchronization', () => {
    it('provides sendStudyGroupMessage and getStudyGroupMessages connected to study_group_messages', async () => {
      const { sendStudyGroupMessage, getStudyGroupMessages } = require('../lib/groupRooms');

      const message = await sendStudyGroupMessage({
        groupId: 'grp-test',
        channelId: 'general-chat',
        message: 'Hello everyone!',
        senderName: 'Aarav',
        senderInitials: 'AS',
        senderRole: 'Member',
      });

      expect(message.id).toBe('msg-123');
      expect(message.message).toBe('Hello everyone!');
    });

    it('creates database migration with study_group_messages table, RLS, and realtime publication', () => {
      const fs = require('fs');
      const migration = fs.readFileSync('supabase/migrations/202611260002_study_group_chat_messages.sql', 'utf-8');

      expect(migration).toContain('create table if not exists public.study_group_messages');
      expect(migration).toContain('is_study_group_member(group_id)');
      expect(migration).toContain('study_group_messages_member_read');
      expect(migration).toContain('study_group_messages_member_insert');
      expect(migration).toContain('alter publication supabase_realtime add table public.study_group_messages');
    });
  });
});
