import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  AlertCircle,
  Bookmark,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  MessageCircle,
  RefreshCw,
  Search,
  WifiOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import type { ChatMessageItem } from './types';

function formatDayLabel(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsg = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfMsg) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDayKey(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

interface MessageRowProps {
  message: ChatMessageItem;
  showSenderHeader: boolean;
  showDateSeparator: string | null;
  showUnreadDivider: boolean;
  onLongPress: (msg: ChatMessageItem) => void;
  onVotePoll: (msgId: string, optionId: string) => void;
  onToggleReaction: (msgId: string, reactionIndex: number) => void;
  onPreviewAttachment: (msg: ChatMessageItem) => void;
  onSaveAttachment: (msg: ChatMessageItem) => void;
  onDownloadAttachment: (msg: ChatMessageItem) => void;
  onRetryFailed?: (msg: ChatMessageItem) => void;
}

const MessageBubbleRow = React.memo(function MessageBubbleRow({
  message,
  showSenderHeader,
  showDateSeparator,
  showUnreadDivider,
  onLongPress,
  onVotePoll,
  onToggleReaction,
  onPreviewAttachment,
  onSaveAttachment,
  onDownloadAttachment,
  onRetryFailed,
}: MessageRowProps) {
  const { colors, scheme, f } = useTheme();
  const isMine = message.sender.endsWith(' (You)');
  const displaySender = isMine ? 'You' : message.sender;
  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';

  const handleLongPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onLongPress(message);
  }, [message, onLongPress]);

  const roleColors = useMemo(() => {
    switch (message.role) {
      case 'Owner':
        return { bg: scheme === 'dark' ? 'rgba(99,102,241,0.22)' : '#EEF2FF', fg: scheme === 'dark' ? '#A5B4FC' : '#4338CA' };
      case 'Mentor':
        return { bg: scheme === 'dark' ? 'rgba(43,214,155,0.16)' : 'rgba(52,199,89,0.12)', fg: colors.green };
      case 'Admin':
        return { bg: scheme === 'dark' ? 'rgba(255,184,77,0.16)' : 'rgba(255,149,0,0.12)', fg: colors.warning };
      case 'Moderator':
        return { bg: scheme === 'dark' ? 'rgba(154,130,255,0.18)' : 'rgba(175,82,222,0.12)', fg: colors.purple };
      default:
        return null;
    }
  }, [colors.green, colors.purple, colors.warning, message.role, scheme]);

  const bubbleBg = isFailed
    ? scheme === 'dark' ? 'rgba(255,107,112,0.14)' : 'rgba(255,59,48,0.08)'
    : isMine
      ? colors.selectedSurface
      : colors.surface;
  const bubbleBorder = isFailed
    ? colors.danger
    : isMine
      ? `${colors.blue}33`
      : colors.borderSubtle;

  return (
    <View style={{ marginTop: showSenderHeader ? 12 : 4 }}>
      {showDateSeparator ? (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text style={{ fontSize: f(11), fontWeight: '600', color: colors.textMuted }}>
              {showDateSeparator}
            </Text>
          </View>
        </View>
      ) : null}

      {showUnreadDivider ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: `${colors.blue}55` }} />
          <Text style={{ fontSize: f(11), fontWeight: '700', color: colors.blue }}>
            Unread messages
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: `${colors.blue}55` }} />
        </View>
      ) : null}

      <View
        style={{
          flexDirection: isMine ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          gap: 8,
          paddingHorizontal: 12,
        }}
      >
        {!isMine ? (
          showSenderHeader ? (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: message.role === 'Mentor' ? '#0D9488' : colors.navy,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Text style={{ fontSize: f(11), fontWeight: '700', color: '#FFFFFF' }}>
                {message.initials}
              </Text>
            </View>
          ) : (
            <View style={{ width: 32, flexShrink: 0 }} />
          )
        ) : null}

        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={260}
          accessibilityRole="button"
          accessibilityLabel={`Message from ${displaySender}: ${message.text}. Long press for actions.`}
          style={({ pressed }) => ({
            maxWidth: '82%',
            minWidth: 84,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 16,
            borderTopLeftRadius: !isMine && showSenderHeader ? 4 : 16,
            borderTopRightRadius: isMine && showSenderHeader ? 4 : 16,
            backgroundColor: bubbleBg,
            borderWidth: 1,
            borderColor: bubbleBorder,
            opacity: pressed ? 0.92 : isSending ? 0.78 : 1,
          })}
        >
          {!isMine && showSenderHeader && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 }}>
              <Text style={{ fontSize: f(12), fontWeight: '700', color: colors.blue }}>
                {message.sender}
              </Text>
              {roleColors && (
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 1.5,
                    borderRadius: 6,
                    backgroundColor: roleColors.bg,
                  }}
                >
                  <Text style={{ fontSize: f(10), fontWeight: '700', color: roleColors.fg }}>
                    {message.role}
                  </Text>
                </View>
              )}
            </View>
          )}

          {message.replyTo && (
            <View
              style={{
                borderLeftWidth: 3,
                borderLeftColor: colors.blue,
                backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 5,
                marginBottom: 6,
              }}
            >
              <Text numberOfLines={1} style={{ fontSize: f(11), fontWeight: '700', color: colors.blue }}>
                {message.replyTo.sender}
              </Text>
              <Text numberOfLines={2} style={{ fontSize: f(11.5), color: colors.textSecondary, marginTop: 1 }}>
                {message.replyTo.text}
              </Text>
            </View>
          )}

          <Text
            selectable
            style={{
              fontSize: f(14.5),
              lineHeight: f(20.5),
              color: colors.textPrimary,
            }}
          >
            {message.text}
          </Text>

          {message.attachment && (
            message.attachment.kind === 'image' && message.attachment.uri ? (
              <Pressable
                onPress={() => onPreviewAttachment(message)}
                style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSubtle }}
              >
                <Image
                  source={{ uri: message.attachment.uri }}
                  style={{ width: 220, height: 150, backgroundColor: colors.surfaceAlt }}
                  resizeMode="cover"
                />
                <View style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: colors.surfaceAlt }}>
                  <Text numberOfLines={1} style={{ fontSize: f(11), color: colors.textSecondary }}>
                    {message.attachment.name} · {message.attachment.size}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: scheme === 'dark' ? 'rgba(255,107,112,0.14)' : 'rgba(255,59,48,0.10)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={16} color={colors.danger} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: f(12), fontWeight: '600', color: colors.textPrimary }}>
                    {message.attachment.name}
                  </Text>
                  <Text style={{ fontSize: f(10.5), color: colors.textSecondary }}>
                    {message.attachment.size}
                    {message.attachment.pages ? ` · ${message.attachment.pages} pages` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onPreviewAttachment(message)}
                  hitSlop={6}
                  accessibilityLabel="Preview attachment"
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Eye size={15} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => onSaveAttachment(message)}
                  hitSlop={6}
                  accessibilityLabel="Save attachment to resources"
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Bookmark size={15} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => onDownloadAttachment(message)}
                  hitSlop={6}
                  accessibilityLabel="Download attachment"
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Download size={15} color={colors.textSecondary} />
                </Pressable>
              </View>
            )
          )}

          {message.poll && (
            <View
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 12,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: f(12.5), fontWeight: '700', color: colors.textPrimary }}>
                {message.poll.question}
              </Text>
              <Text style={{ fontSize: f(10.5), color: colors.textSecondary }}>
                {message.poll.options.reduce((total, option) => total + option.votes, 0)} votes
              </Text>
              {message.poll.options.map((opt) => {
                const total = message.poll!.options.reduce((s, o) => s + o.votes, 0);
                const pct = Math.round((opt.votes / Math.max(1, total)) * 100);
                const picked = message.poll!.votedId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => onVotePoll(message.id, opt.id)}
                    style={{
                      minHeight: 38,
                      position: 'relative',
                      overflow: 'hidden',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: picked ? colors.blue : colors.borderSubtle,
                      backgroundColor: colors.surface,
                      gap: 8,
                    }}
                  >
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${pct}%`,
                        backgroundColor: picked ? colors.selectedSurface : colors.surfaceAlt,
                      }}
                    />
                    <Text style={{ fontSize: f(12), fontWeight: picked ? '700' : '500', color: colors.textPrimary, flex: 1 }}>
                      {opt.label}
                    </Text>
                    {picked && <Check size={13} color={colors.blue} />}
                    <Text style={{ fontSize: f(11.5), fontWeight: '700', color: colors.blue, fontVariant: ['tabular-nums'] }}>
                      {pct}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {message.reactions.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {message.reactions.map((r, i) => (
                <Pressable
                  key={`${r.emoji}-${i}`}
                  onPress={() => onToggleReaction(message.id, i)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor: r.reacted ? colors.selectedSurface : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: r.reacted ? `${colors.blue}44` : colors.borderSubtle,
                  }}
                >
                  <Text style={{ fontSize: f(11.5), color: r.reacted ? colors.blue : colors.textPrimary }}>
                    {r.emoji} {r.count}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 5,
              marginTop: 4,
            }}
          >
            {message.edited && (
              <Text style={{ fontSize: f(10), color: colors.textFaint }}>
                edited
              </Text>
            )}
            <Text style={{ fontSize: f(10.5), color: colors.textMuted }}>
              {message.time}
            </Text>
            {isMine && (
              isFailed ? (
                <Pressable
                  onPress={() => onRetryFailed?.(message)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Message failed to send. Tap to retry."
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                >
                  <AlertCircle size={12} color={colors.danger} />
                  <Text style={{ fontSize: f(10.5), fontWeight: '700', color: colors.danger }}>
                    Retry
                  </Text>
                </Pressable>
              ) : isSending ? (
                <Clock size={11} color={colors.textMuted} />
              ) : (
                <Check size={12} color={colors.blue} />
              )
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
});

export interface GroupMessageListProps {
  listRef: React.RefObject<FlatList<ChatMessageItem> | null>;
  channelId: string;
  messages: ChatMessageItem[];
  isLoading: boolean;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
  loadError: string | null;
  isOffline: boolean;
  searchQuery: string;
  firstUnreadId: string | null;
  onRetryLoad: () => void;
  onLoadOlder: () => void;
  onLongPressMessage: (msg: ChatMessageItem) => void;
  onVotePoll: (msgId: string, optionId: string) => void;
  onToggleReaction: (msgId: string, reactionIndex: number) => void;
  onPreviewAttachment: (msg: ChatMessageItem) => void;
  onSaveAttachment: (msg: ChatMessageItem) => void;
  onDownloadAttachment: (msg: ChatMessageItem) => void;
  onRetryFailedMessage?: (msg: ChatMessageItem) => void;
}

export const GroupMessageList = React.memo(function GroupMessageList({
  listRef,
  channelId,
  messages,
  isLoading,
  isLoadingOlder,
  hasMoreOlder,
  loadError,
  isOffline,
  searchQuery,
  firstUnreadId,
  onRetryLoad,
  onLoadOlder,
  onLongPressMessage,
  onVotePoll,
  onToggleReaction,
  onPreviewAttachment,
  onSaveAttachment,
  onDownloadAttachment,
  onRetryFailedMessage,
}: GroupMessageListProps) {
  const { colors, f } = useTheme();

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        (m.attachment?.name.toLowerCase().includes(q) ?? false)
    );
  }, [messages, searchQuery]);

  const keyExtractor = useCallback((item: ChatMessageItem) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessageItem; index: number }) => {
      const prev = index > 0 ? filteredMessages[index - 1] : null;
      const curDay = getDayKey(item.createdAt);
      const prevDay = prev ? getDayKey(prev.createdAt) : null;
      const showDateSeparator = curDay && curDay !== prevDay ? formatDayLabel(item.createdAt) : null;
      const showSenderHeader = !prev || prev.sender !== item.sender || Boolean(showDateSeparator);
      const showUnreadDivider = firstUnreadId !== null && item.id === firstUnreadId;

      return (
        <MessageBubbleRow
          message={item}
          showSenderHeader={showSenderHeader}
          showDateSeparator={showDateSeparator}
          showUnreadDivider={showUnreadDivider}
          onLongPress={onLongPressMessage}
          onVotePoll={onVotePoll}
          onToggleReaction={onToggleReaction}
          onPreviewAttachment={onPreviewAttachment}
          onSaveAttachment={onSaveAttachment}
          onDownloadAttachment={onDownloadAttachment}
          onRetryFailed={onRetryFailedMessage}
        />
      );
    },
    [
      filteredMessages,
      firstUnreadId,
      onDownloadAttachment,
      onLongPressMessage,
      onPreviewAttachment,
      onRetryFailedMessage,
      onSaveAttachment,
      onToggleReaction,
      onVotePoll,
    ]
  );

  if (isLoading && messages.length === 0) {
    return (
      <View testID="chat-loading-skeleton" style={{ flex: 1, padding: 16, gap: 14, justifyContent: 'flex-end' }}>
        {[false, true, false, true, false].map((mine, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: mine ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            {!mine && <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt }} />}
            <View
              style={{
                width: idx % 2 === 0 ? '68%' : '54%',
                height: idx === 2 ? 64 : 46,
                borderRadius: 16,
                backgroundColor: colors.surfaceAlt,
              }}
            />
          </View>
        ))}
      </View>
    );
  }

  if (loadError && messages.length === 0) {
    return (
      <View testID="chat-error-state" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WifiOff size={22} color={colors.danger} />
        </View>
        <Text style={{ fontSize: f(15), fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
          Unable to load messages
        </Text>
        <Text style={{ fontSize: f(13), color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }}>
          {loadError}
        </Text>
        <Pressable
          onPress={onRetryLoad}
          accessibilityRole="button"
          accessibilityLabel="Retry loading messages"
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 18,
            borderRadius: 12,
            backgroundColor: colors.blue,
            opacity: pressed ? 0.85 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          })}
        >
          <RefreshCw size={15} color="#FFFFFF" />
          <Text style={{ fontSize: f(13.5), fontWeight: '700', color: '#FFFFFF' }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  if (filteredMessages.length === 0) {
    const isSearchEmpty = Boolean(searchQuery.trim());
    return (
      <View testID="chat-empty-state" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSearchEmpty ? (
            <Search size={22} strokeWidth={1.9} color={colors.textMuted} />
          ) : (
            <MessageCircle size={22} strokeWidth={1.9} color={colors.textMuted} />
          )}
        </View>
        <Text style={{ fontSize: f(15), fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
          {isSearchEmpty ? 'No matching messages' : `No messages in #${channelId} yet`}
        </Text>
        <Text style={{ fontSize: f(13), color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }}>
          {isSearchEmpty
            ? 'Try a different keyword or sender name.'
            : 'Start a focused discussion, share a study resource, or ask a question.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {isOffline && (
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            backgroundColor: colors.surfaceAlt,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <WifiOff size={13} color={colors.warning} />
          <Text style={{ fontSize: f(11.5), fontWeight: '600', color: colors.warning }}>
            Offline — messages will send when reconnected
          </Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={filteredMessages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 14 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          hasMoreOlder && !searchQuery.trim() ? (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Pressable
                onPress={onLoadOlder}
                disabled={isLoadingOlder}
                accessibilityRole="button"
                accessibilityLabel="Load older messages"
                style={({ pressed }) => ({
                  minHeight: 36,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: pressed ? colors.surfaceInteractive : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                })}
              >
                {isLoadingOlder ? (
                  <ActivityIndicator size="small" color={colors.blue} />
                ) : (
                  <Text style={{ fontSize: f(12), fontWeight: '600', color: colors.blue }}>
                    Load older messages
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
});
