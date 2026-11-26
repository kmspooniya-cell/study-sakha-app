import React, { StrictMode } from 'react';
import { act, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

type MockChannelRecord = {
  topic: string;
  subscribed: boolean;
  handlers: string[];
  on: jest.Mock;
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
  teardown: jest.Mock;
  presenceState: jest.Mock;
  track: jest.Mock;
  send: jest.Mock;
};

const mockActiveChannels: MockChannelRecord[] = [];
const mockCreatedChannelTopics: string[] = [];
const mockRemovedChannelTopics: string[] = [];

const mockChannel = jest.fn((topic: string) => {
  const realtimeTopic = `realtime:${topic}`;
  const existing = mockActiveChannels.find((c) => c.topic === realtimeTopic);
  if (existing) {
    return existing;
  }

  const record: MockChannelRecord = {
    topic: realtimeTopic,
    subscribed: false,
    handlers: [],
    on: jest.fn((type: string) => {
      if (record.subscribed && (type === 'postgres_changes' || type === 'presence')) {
        throw new Error(`cannot add \`${type}\` callbacks for ${record.topic} after \`subscribe()\`.`);
      }
      record.handlers.push(type);
      return record;
    }),
    subscribe: jest.fn((cb?: (status: string) => void) => {
      record.subscribed = true;
      cb?.('SUBSCRIBED');
      return record;
    }),
    unsubscribe: jest.fn(async () => 'ok'),
    teardown: jest.fn(() => {
      const idx = mockActiveChannels.indexOf(record);
      if (idx >= 0) mockActiveChannels.splice(idx, 1);
    }),
    presenceState: jest.fn(() => ({})),
    track: jest.fn(async () => 'ok'),
    send: jest.fn(async () => 'ok'),
  };
  mockActiveChannels.push(record);
  mockCreatedChannelTopics.push(realtimeTopic);
  return record;
});

const mockRemoveChannel = jest.fn(async (channel: MockChannelRecord) => {
  mockRemovedChannelTopics.push(channel.topic);
  // Deliberately delay teardown across microtasks to mirror real async unsubscribe()
  await Promise.resolve();
  await channel.unsubscribe();
  channel.teardown();
  return 'ok';
});

const mockGetChannels = jest.fn(() => [...mockActiveChannels]);
const mockSetAuth = jest.fn(async () => {});
const mockGetSession = jest.fn(async () => ({
  data: { session: { access_token: 'tok-test', user: { id: 'user-1' } } },
}));
const mockFrom = jest.fn(() => ({
  select: () => ({
    eq: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: { phase: 'focus' }, error: null }),
      }),
    }),
  }),
}));

jest.mock('../lib/supabase', () => ({
  supabaseConfigured: true,
  supabase: {
    channel: (topic: string) => mockChannel(topic),
    removeChannel: (channel: MockChannelRecord) => mockRemoveChannel(channel),
    getChannels: () => mockGetChannels(),
    realtime: { setAuth: () => mockSetAuth() },
    auth: { getSession: () => mockGetSession() },
    from: () => mockFrom(),
  },
}));

const mockNavStub = {
  navigate: jest.fn(),
  popTo: jest.fn(),
  goBack: jest.fn(),
  getParent: () => null,
};

const mockRouteStub = {
  key: 'Groups-1',
  name: 'Groups' as const,
  params: undefined,
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
  useNavigation: () => mockNavStub,
  useRoute: () => mockRouteStub,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare', appOwnership: null },
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `exp://127.0.0.1:8081/--/${path}`),
}));

jest.mock('lucide-react-native', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return true;
        return () => ReactActual.createElement(RNView, null);
      },
    },
  );
});

jest.mock('react-native-svg', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  const Stub = ({ children }: { children?: React.ReactNode }) => ReactActual.createElement(RNView, null, children);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Ellipse: Stub,
    Rect: Stub,
    Circle: Stub,
  };
});

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    replace: jest.fn(),
    volume: 1,
    loop: false,
  }),
  useAudioPlayerStatus: () => ({ playing: false, error: null }),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => {}),
}));

jest.mock('../lib/audioPlayerLifecycle', () => ({
  AudioPlayerLifecycle: class AudioPlayerLifecycle {
    playSource = jest.fn(async () => {});
    pause = jest.fn();
    close = jest.fn();
  },
}));

jest.mock('../lib/store', () => ({
  useStore: () => ({
    state: {
      user: {
        id: 'user-1',
        name: 'Aspirant',
        email: 'aspirant@example.com',
        examId: 'upsc',
        streak: 3,
      },
      notifications: [],
      settings: { focusMusicVolume: 0.5 },
      plannerScheduleItems: [],
      plannerTasks: [],
      studyLogs: [],
    },
    dispatch: jest.fn(),
  }),
}));

jest.mock('../lib/theme', () => ({
  useTheme: () => ({
    scheme: 'light',
    colors: {
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceAlt: '#F3F4F6',
      text: '#111827',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      blue: '#2563EB',
      blueSoft: '#EFF6FF',
      teal: '#0D9488',
      amber: '#D97706',
      red: '#DC2626',
      green: '#16A34A',
    },
  }),
  shadow: () => ({}),
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radii: { sm: 8, md: 12, card: 16, dialog: 20, pill: 999 },
}));

jest.mock('../lib/focusSession', () => ({
  useOptionalFocusSession: () => null,
  useFocusSession: () => ({
    session: null,
    activeHallContext: null,
    setActiveHallContext: jest.fn(),
    startSession: jest.fn(),
    pauseSession: jest.fn(),
    resumeSession: jest.fn(),
    endSession: jest.fn(),
  }),
}));

jest.mock('../lib/groupRooms', () => ({
  createRoomSession: jest.fn(),
  createStudyGroup: jest.fn(),
  createStudyGroupInvite: jest.fn(),
  disbandStudyGroup: jest.fn(),
  getActiveStudyGroups: jest.fn(async () => []),
  getBreakRoomMessages: jest.fn(async () => []),
  getStudyGroupInvitePreview: jest.fn(),
  getStudyRoomLogs: jest.fn(async () => []),
  getStudyRoomProfiles: jest.fn(async () => []),
  joinStudyGroup: jest.fn(),
  joinStudyGroupByInvite: jest.fn(),
  leaveStudyGroup: jest.fn(),
  listDiscoverableStudyGroups: jest.fn(async () => []),
  listStudyGroupInvites: jest.fn(async () => []),
  revokeStudyGroupInvite: jest.fn(),
  sendBreakRoomMessage: jest.fn(),
  submitStudyRoomReport: jest.fn(),
  updateRoomSession: jest.fn(),
  updateSharedRoomPhase: jest.fn(),
}));

jest.mock('../components/Shell', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    Shell: ({ children }: { children: React.ReactNode }) => ReactActual.createElement(RNView, null, children),
  };
});

jest.mock('../components/Popup', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    Popup: ({ children }: { children: React.ReactNode }) => ReactActual.createElement(RNView, null, children),
  };
});

jest.mock('../components/RoomHeader', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    RoomHeader: () => ReactActual.createElement(RNView, null),
  };
});

jest.mock('../screens/SmartStudyRoomScreen', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    SmartStudyRoomScreen: () => ReactActual.createElement(RNView, null),
  };
});

import GroupsScreen from '../screens/GroupsScreen';
import { useGroupRoomRealtime } from '../lib/groupRoomRealtime';

const safeMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('Group Hall Realtime channel lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveChannels.length = 0;
    mockCreatedChannelTopics.length = 0;
    mockRemovedChannelTopics.length = 0;
  });

  it('registers postgres_changes before subscribe and survives StrictMode + repeated navigation remounts without error', async () => {
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const tree = render(
        <StrictMode>
          <SafeAreaProvider initialMetrics={safeMetrics}>
            <GroupsScreen />
          </SafeAreaProvider>
        </StrictMode>,
      );
      await act(async () => {
        await Promise.resolve();
      });
      tree.unmount();
    }

    expect(mockCreatedChannelTopics.length).toBeGreaterThanOrEqual(3);
    expect(new Set(mockCreatedChannelTopics).size).toBe(mockCreatedChannelTopics.length);
    for (const callResult of mockChannel.mock.results) {
      const ch = callResult.value as MockChannelRecord;
      expect(ch.handlers).toEqual(['postgres_changes', 'postgres_changes']);
      expect(ch.subscribe).toHaveBeenCalledTimes(1);
    }
    expect(mockRemovedChannelTopics.length).toBe(mockCreatedChannelTopics.length);
  });

  it('useGroupRoomRealtime cleans up any stale channel before re-subscribing to the same room topic', async () => {
    function RoomProbe({ roomId }: { roomId: 'silent-focus' | null }) {
      useGroupRoomRealtime({
        groupId: 'grp-1',
        roomId,
        userId: 'user-1',
        displayName: 'Aspirant',
        subject: 'Polity',
        focusing: true,
        focusActivity: null,
      });
      return <View />;
    }

    const tree = render(<RoomProbe roomId="silent-focus" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Simulate rapid navigation out and back before async removeChannel completes
    tree.rerender(<RoomProbe roomId={null} />);
    tree.rerender(<RoomProbe roomId="silent-focus" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    tree.unmount();

    const roomChannels = mockChannel.mock.results
      .map((r) => r.value as MockChannelRecord)
      .filter((c) => c.topic === 'realtime:study-room:grp-1:silent-focus');
    expect(roomChannels.length).toBeGreaterThanOrEqual(2);
    for (const ch of roomChannels) {
      expect(ch.subscribe).toHaveBeenCalledTimes(1);
    }
  });
});
