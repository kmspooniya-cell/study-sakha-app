import React from 'react';
import { BackHandler, Keyboard } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../lib/theme';
import { shouldHideAppShell } from '../lib/navigation';
import { Shell } from '../components/Shell';
import { GroupChatHeader } from '../components/groups/GroupChatHeader';
import { ChannelBar, ChannelSelectorSheet } from '../components/groups/ChannelSelectorSheet';
import { GroupMessageList } from '../components/groups/GroupMessageList';
import { MessageActionSheet } from '../components/groups/MessageActionSheet';
import { GroupChatComposer } from '../components/groups/GroupChatComposer';
import type { ChatChannelDef, ChatMessageItem } from '../components/groups/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('lucide-react-native', () =>
  new Proxy({}, {
    get: () => () => null,
  })
);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@react-navigation/native', () => ({
  StackActions: { popTo: (name: string) => ({ type: 'POP_TO', payload: { name } }) },
  useNavigation: () => ({
    navigate: jest.fn(),
    popTo: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    getState: () => ({ index: 0, routes: [{ name: 'Groups' }] }),
    addListener: () => () => {},
  }),
  useRoute: () => ({ name: 'Groups', params: undefined }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactLocal = require('react');
    ReactLocal.useEffect(() => cb(), [cb]);
  },
}));

jest.mock('../lib/store', () => ({
  useStore: () => ({
    state: {
      user: { id: 'user-1', name: 'Aarav', email: 'a@example.com', role: 'learner' },
      settings: { language: 'en', themeMode: 'light' },
    },
    unread: 0,
    syncStatus: 'synced',
    dispatch: jest.fn(),
  }),
}));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 20 },
};

function wrap(ui: React.ReactElement) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ThemeProvider mode="light">{ui}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('Phase 1 Groups & Chat Full-Screen Redesign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Route-aware App Shell visibility', () => {
    it('detects fullScreen param via shouldHideAppShell', () => {
      expect(shouldHideAppShell('Groups', { fullScreen: true })).toBe(true);
      expect(shouldHideAppShell('Groups', { fullScreen: false })).toBe(false);
      expect(shouldHideAppShell('Groups', undefined)).toBe(false);
      expect(shouldHideAppShell('DashboardRoot', { fullScreen: true })).toBe(false);
    });

    it('hides AppHeader and AppBottomNav when hideChrome is true and restores when false', () => {
      const { getByTestId, queryByTestId, rerender } = render(
        wrap(
          <Shell active="Groups" title="" scroll={false} hideChrome={false}>
            <></>
          </Shell>
        )
      );

      expect(getByTestId('app-bottom-nav')).toBeTruthy();
      expect(getByTestId('header-more-button')).toBeTruthy();

      rerender(
        wrap(
          <Shell active="Groups" title="" scroll={false} hideChrome={true}>
            <></>
          </Shell>
        )
      );

      expect(queryByTestId('app-bottom-nav')).toBeNull();
      expect(queryByTestId('header-more-button')).toBeNull();

      rerender(
        wrap(
          <Shell active="Groups" title="" scroll={false} hideChrome={false}>
            <></>
          </Shell>
        )
      );

      expect(getByTestId('app-bottom-nav')).toBeTruthy();
      expect(getByTestId('header-more-button')).toBeTruthy();
    });
  });

  describe('Compact Group Chat Header & Channel Selector', () => {
    const channels: ChatChannelDef[] = [
      { id: 'general-chat', name: 'general-chat', desc: 'Daily coordination', lockedWrite: false },
      { id: 'announcements', name: 'announcements', desc: 'Admin notices', lockedWrite: true },
    ];

    it('renders compact header with group name, member count, real studying indicator, search and menu', () => {
      const onBack = jest.fn();
      const onToggleSearch = jest.fn();
      const onOpenMenu = jest.fn();

      const { getByText, getByTestId } = render(
        wrap(
          <GroupChatHeader
            groupName="RAS Mains 2026"
            shortName="RM"
            accentHex="#2563EB"
            membersCount={42}
            memberLimit={100}
            liveMemberCount={3}
            joined={true}
            joining={false}
            showSearchButton={true}
            searchOpen={false}
            searchQuery=""
            onBack={onBack}
            onJoin={jest.fn()}
            onOpenMenu={onOpenMenu}
            onToggleSearch={onToggleSearch}
            onChangeSearchQuery={jest.fn()}
          />
        )
      );

      expect(getByText('RAS Mains 2026')).toBeTruthy();
      expect(getByText('42/100 members')).toBeTruthy();
      expect(getByText('3 studying')).toBeTruthy();

      fireEvent.press(getByTestId('group-chat-back-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);

      fireEvent.press(getByTestId('group-chat-search-btn'));
      expect(onToggleSearch).toHaveBeenCalledTimes(1);

      fireEvent.press(getByTestId('group-chat-more-btn'));
      expect(onOpenMenu).toHaveBeenCalledTimes(1);
    });

    it('switches channels from ChannelSelectorSheet without fake unread badges', () => {
      const onSelectChannel = jest.fn();
      const onClose = jest.fn();

      const { getByTestId, queryByText } = render(
        wrap(
          <>
            <ChannelBar
              currentChannel={channels[0]}
              unreadTotal={0}
              messageCount={5}
              onOpenSelector={jest.fn()}
            />
            <ChannelSelectorSheet
              visible={true}
              channels={channels}
              activeChannelId="general-chat"
              unreadByChannel={{}}
              onSelectChannel={onSelectChannel}
              onClose={onClose}
            />
          </>
        )
      );

      expect(queryByText('2')).toBeNull();
      fireEvent.press(getByTestId('channel-option-announcements'));
      expect(onSelectChannel).toHaveBeenCalledWith('announcements');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Virtualized Message List, Action Sheet & Composer', () => {
    const sampleMessages: ChatMessageItem[] = [
      {
        id: 'm1',
        createdAt: new Date().toISOString(),
        sender: 'Priya',
        initials: 'PR',
        role: 'Mentor',
        time: '10:00 AM',
        text: 'Let us revise Polity Article 356 today.',
        reactions: [],
        replies: 0,
      },
      {
        id: 'm2',
        createdAt: new Date().toISOString(),
        sender: 'Aarav (You)',
        initials: 'AA',
        role: 'Member',
        time: '10:02 AM',
        status: 'failed',
        text: 'Sharing my short notes.',
        reactions: [],
        replies: 0,
      },
    ];

    it('renders messages without permanent per-bubble Report/Reply clutter and supports retry on failed send', () => {
      const onLongPress = jest.fn();
      const onRetryFailed = jest.fn();
      const listRef = React.createRef<any>();

      const { getByText, queryByText } = render(
        wrap(
          <GroupMessageList
            listRef={listRef}
            channelId="general-chat"
            messages={sampleMessages}
            isLoading={false}
            isLoadingOlder={false}
            hasMoreOlder={false}
            loadError={null}
            isOffline={false}
            searchQuery=""
            firstUnreadId={null}
            onRetryLoad={jest.fn()}
            onLoadOlder={jest.fn()}
            onLongPressMessage={onLongPress}
            onVotePoll={jest.fn()}
            onToggleReaction={jest.fn()}
            onPreviewAttachment={jest.fn()}
            onSaveAttachment={jest.fn()}
            onDownloadAttachment={jest.fn()}
            onRetryFailedMessage={onRetryFailed}
          />
        )
      );

      expect(getByText('Let us revise Polity Article 356 today.')).toBeTruthy();
      expect(getByText('Sharing my short notes.')).toBeTruthy();
      expect(queryByText('Reply')).toBeNull();

      fireEvent(getByText('Let us revise Polity Article 356 today.'), 'longPress');
      expect(onLongPress).toHaveBeenCalledWith(sampleMessages[0]);

      fireEvent.press(getByText('Retry'));
      expect(onRetryFailed).toHaveBeenCalledWith(sampleMessages[1]);
    });

    it('renders loading skeleton, error state, and empty state appropriately', () => {
      const listRef = React.createRef<any>();
      const baseProps = {
        listRef,
        channelId: 'general-chat',
        messages: [],
        isLoadingOlder: false,
        hasMoreOlder: false,
        isOffline: false,
        searchQuery: '',
        firstUnreadId: null,
        onRetryLoad: jest.fn(),
        onLoadOlder: jest.fn(),
        onLongPressMessage: jest.fn(),
        onVotePoll: jest.fn(),
        onToggleReaction: jest.fn(),
        onPreviewAttachment: jest.fn(),
        onSaveAttachment: jest.fn(),
        onDownloadAttachment: jest.fn(),
      };

      const { getByTestId, rerender } = render(
        wrap(<GroupMessageList {...baseProps} isLoading={true} loadError={null} />)
      );
      expect(getByTestId('chat-loading-skeleton')).toBeTruthy();

      rerender(wrap(<GroupMessageList {...baseProps} isLoading={false} loadError="Network timeout" />));
      expect(getByTestId('chat-error-state')).toBeTruthy();

      rerender(wrap(<GroupMessageList {...baseProps} isLoading={false} loadError={null} />));
      expect(getByTestId('chat-empty-state')).toBeTruthy();
    });

    it('opens MessageActionSheet with permission-aware actions and handles Reply & Copy', () => {
      const onReply = jest.fn();
      const onCopy = jest.fn();
      const onClose = jest.fn();
      const msg: ChatMessageItem = {
        id: 'm1',
        sender: 'Priya',
        initials: 'PR',
        role: 'Member',
        time: '10:00 AM',
        text: 'Revise Polity',
        reactions: [],
        replies: 0,
      };

      const { getByText } = render(
        wrap(
          <MessageActionSheet
            message={msg}
            onClose={onClose}
            onReply={onReply}
            onReact={jest.fn()}
            onCopy={onCopy}
            onSaveAttachment={jest.fn()}
            onReport={jest.fn()}
          />
        )
      );

      fireEvent.press(getByText('Reply'));
      expect(onReply).toHaveBeenCalledWith(msg);

      fireEvent.press(getByText('Copy text'));
      expect(onCopy).toHaveBeenCalledWith(msg);
    });

    it('renders read-only banner when channel is lockedWrite and sends when writable', () => {
      const onSend = jest.fn();
      const { getByTestId, rerender } = render(
        wrap(
          <GroupChatComposer
            channelName="announcements"
            lockedWrite={true}
            value=""
            onChangeText={jest.fn()}
            onSend={onSend}
            sending={false}
            keyboardVisible={false}
            replyingTo={null}
            onClearReply={jest.fn()}
            pendingAttachment={null}
            onPickImage={jest.fn()}
            onPickDocument={jest.fn()}
            onClearAttachment={jest.fn()}
          />
        )
      );

      expect(getByTestId('chat-readonly-banner')).toBeTruthy();

      rerender(
        wrap(
          <GroupChatComposer
            channelName="general-chat"
            lockedWrite={false}
            value="Hello group"
            onChangeText={jest.fn()}
            onSend={onSend}
            sending={false}
            keyboardVisible={false}
            replyingTo={null}
            onClearReply={jest.fn()}
            pendingAttachment={null}
            onPickImage={jest.fn()}
            onPickDocument={jest.fn()}
            onClearAttachment={jest.fn()}
          />
        )
      );

      fireEvent.press(getByTestId('group-chat-send-btn'));
      expect(onSend).toHaveBeenCalledTimes(1);
    });
  });
});
