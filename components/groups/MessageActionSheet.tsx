import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Bookmark, Copy, Flag, Reply } from 'lucide-react-native';
import { BottomSheet } from '../BottomSheet';
import { useTheme } from '../../lib/theme';
import type { ChatMessageItem } from './types';

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '💡', '👏', '🎯'];

export interface MessageActionSheetProps {
  message: ChatMessageItem | null;
  onClose: () => void;
  onReply: (msg: ChatMessageItem) => void;
  onReact: (msg: ChatMessageItem, emoji: string) => void;
  onCopy: (msg: ChatMessageItem) => void;
  onSaveAttachment: (msg: ChatMessageItem) => void;
  onReport: (msg: ChatMessageItem) => void;
}

export const MessageActionSheet = React.memo(function MessageActionSheet({
  message,
  onClose,
  onReply,
  onReact,
  onCopy,
  onSaveAttachment,
  onReport,
}: MessageActionSheetProps) {
  const { colors, scheme, f } = useTheme();
  const isMine = Boolean(message?.sender.endsWith(' (You)'));

  return (
    <BottomSheet isOpen={Boolean(message)} onClose={onClose} isDark={scheme === 'dark'}>
      {message ? (
        <View style={{ gap: 12, paddingBottom: 8 }}>
          {/* Quick Reaction Row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 8,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: colors.surfaceAlt,
            }}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  onReact(message, emoji);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`React with ${emoji}`}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? colors.surfaceInteractive : 'transparent',
                })}
              >
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {/* Quoted Message Preview */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: colors.surfaceAlt,
              borderLeftWidth: 3,
              borderLeftColor: colors.blue,
            }}
          >
            <Text style={{ fontSize: f(11.5), fontWeight: '700', color: colors.blue }}>
              {isMine ? 'You' : message.sender}
            </Text>
            <Text numberOfLines={2} style={{ fontSize: f(12.5), color: colors.textSecondary, marginTop: 2 }}>
              {message.text}
            </Text>
          </View>

          {/* Permission-aware Actions */}
          <View style={{ gap: 4 }}>
            <Pressable
              onPress={() => {
                onReply(message);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Reply to message"
              style={({ pressed }) => ({
                minHeight: 48,
                paddingHorizontal: 12,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <Reply size={20} color={colors.textPrimary} />
              <Text style={{ fontSize: f(14.5), fontWeight: '600', color: colors.textPrimary }}>
                Reply
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onCopy(message);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Copy message text"
              style={({ pressed }) => ({
                minHeight: 48,
                paddingHorizontal: 12,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <Copy size={20} color={colors.textPrimary} />
              <Text style={{ fontSize: f(14.5), fontWeight: '600', color: colors.textPrimary }}>
                Copy text
              </Text>
            </Pressable>

            {message.attachment && (
              <Pressable
                onPress={() => {
                  onSaveAttachment(message);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel="Save attachment to group resources"
                style={({ pressed }) => ({
                  minHeight: 48,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                })}
              >
                <Bookmark size={20} color={colors.textPrimary} />
                <Text style={{ fontSize: f(14.5), fontWeight: '600', color: colors.textPrimary }}>
                  Save to group resources
                </Text>
              </Pressable>
            )}

            {!isMine && (
              <Pressable
                onPress={() => {
                  onReport(message);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel="Report message to moderators"
                style={({ pressed }) => ({
                  minHeight: 48,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                })}
              >
                <Flag size={20} color={colors.danger} />
                <Text style={{ fontSize: f(14.5), fontWeight: '600', color: colors.danger }}>
                  Report message
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
});
