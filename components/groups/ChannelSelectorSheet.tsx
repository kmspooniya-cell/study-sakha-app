import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, ChevronDown, Hash, Lock } from 'lucide-react-native';
import { BottomSheet } from '../BottomSheet';
import { useTheme } from '../../lib/theme';
import type { ChatChannelDef } from './types';

export interface ChannelBarProps {
  currentChannel: ChatChannelDef;
  unreadTotal: number;
  messageCount: number;
  onOpenSelector: () => void;
}

export const ChannelBar = React.memo(function ChannelBar({
  currentChannel,
  unreadTotal,
  messageCount,
  onOpenSelector,
}: ChannelBarProps) {
  const { colors, f } = useTheme();

  return (
    <Pressable
      onPress={onOpenSelector}
      accessibilityRole="button"
      accessibilityLabel={`Current channel ${currentChannel.name}. Tap to switch channels.`}
      testID="channel-selector-trigger"
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
        <Hash size={15} color={colors.blue} />
        <Text
          numberOfLines={1}
          style={{
            fontSize: f(13.5),
            fontWeight: '700',
            color: colors.textPrimary,
          }}
        >
          {currentChannel.name}
        </Text>
        {currentChannel.lockedWrite && <Lock size={12} color={colors.textMuted} />}
        <ChevronDown size={15} color={colors.textSecondary} />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: f(11.5),
            color: colors.textMuted,
            marginLeft: 4,
          }}
        >
          {currentChannel.desc}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {unreadTotal > 0 && (
          <View
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              paddingHorizontal: 6,
              backgroundColor: colors.blue,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: f(10.5), fontWeight: '700', color: '#FFFFFF' }}>
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </Text>
          </View>
        )}
        <Text style={{ fontSize: f(11), color: colors.textFaint }}>
          {messageCount}
        </Text>
      </View>
    </Pressable>
  );
});

export interface ChannelSelectorSheetProps {
  visible: boolean;
  channels: ChatChannelDef[];
  activeChannelId: string;
  unreadByChannel: Record<string, number>;
  onSelectChannel: (channelId: string) => void;
  onClose: () => void;
}

export const ChannelSelectorSheet = React.memo(function ChannelSelectorSheet({
  visible,
  channels,
  activeChannelId,
  unreadByChannel,
  onSelectChannel,
  onClose,
}: ChannelSelectorSheetProps) {
  const { colors, scheme, f } = useTheme();

  return (
    <BottomSheet isOpen={visible} onClose={onClose} isDark={scheme === 'dark'}>
      <View style={{ gap: 6, paddingBottom: 8 }}>
        <View style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
          <Text style={{ fontSize: f(16), fontWeight: '800', color: colors.textPrimary }}>
            Channels
          </Text>
          <Text style={{ fontSize: f(12), color: colors.textSecondary, marginTop: 2 }}>
            Switch topic without leaving your group conversation
          </Text>
        </View>

        {channels.map((channel) => {
          const active = channel.id === activeChannelId;
          const unreadCount = unreadByChannel[channel.id] ?? 0;

          return (
            <Pressable
              key={channel.id}
              onPress={() => {
                onSelectChannel(channel.id);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Channel ${channel.name}`}
              testID={`channel-option-${channel.id}`}
              style={({ pressed }) => ({
                minHeight: 54,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: active
                  ? colors.selectedSurface
                  : pressed
                    ? colors.surfaceAlt
                    : 'transparent',
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: active ? colors.blue : colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Hash size={17} color={active ? '#FFFFFF' : colors.textSecondary} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: f(14),
                      fontWeight: active ? '700' : '600',
                      color: active ? colors.blue : colors.textPrimary,
                    }}
                  >
                    {channel.name}
                  </Text>
                  {channel.lockedWrite && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: colors.surfaceAlt,
                      }}
                    >
                      <Lock size={10} color={colors.textMuted} />
                      <Text style={{ fontSize: f(10), fontWeight: '600', color: colors.textMuted }}>
                        Read-only
                      </Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={{ fontSize: f(12), color: colors.textSecondary, marginTop: 2 }}>
                  {channel.desc}
                </Text>
              </View>

              {unreadCount > 0 && !active ? (
                <View
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: 11,
                    paddingHorizontal: 6,
                    backgroundColor: colors.blue,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: f(11), fontWeight: '700', color: '#FFFFFF' }}>
                    {unreadCount}
                  </Text>
                </View>
              ) : active ? (
                <Check size={18} color={colors.blue} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
});
