import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileText,
  Image as ImageIcon,
  Lock,
  Paperclip,
  Send,
  Smile,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../lib/theme';
import type { ChatAttachment, ChatMessageItem } from './types';

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '💡', '👏', '🎯', '📚', '✅', '🙏', '💪', '✍️', '😊'];

export interface GroupChatComposerProps {
  channelName: string;
  lockedWrite: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  keyboardVisible: boolean;
  replyingTo: ChatMessageItem | null;
  onClearReply: () => void;
  pendingAttachment: ChatAttachment | null;
  onPickImage: () => void;
  onPickDocument: () => void;
  onClearAttachment: () => void;
}

export const GroupChatComposer = React.memo(function GroupChatComposer({
  channelName,
  lockedWrite,
  value,
  onChangeText,
  onSend,
  sending,
  keyboardVisible,
  replyingTo,
  onClearReply,
  pendingAttachment,
  onPickImage,
  onPickDocument,
  onClearAttachment,
}: GroupChatComposerProps) {
  const { colors, f } = useTheme();
  const insets = useSafeAreaInsets();
  const [inputHeight, setInputHeight] = useState(42);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiTray, setShowEmojiTray] = useState(false);

  const canSend = !lockedWrite && !sending && (Boolean(value.trim()) || Boolean(pendingAttachment));

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      onChangeText(`${value}${emoji}`);
    },
    [onChangeText, value]
  );

  if (lockedWrite) {
    return (
      <View
        testID="chat-readonly-banner"
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Lock size={15} color={colors.textMuted} />
        <Text style={{ fontSize: f(12.5), fontWeight: '600', color: colors.textMuted }}>
          Only Admins & Mentors can post in #{channelName}
        </Text>
      </View>
    );
  }

  return (
    <View
      testID="group-chat-composer"
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
        backgroundColor: colors.surface,
        paddingBottom: keyboardVisible ? 6 : Math.max(insets.bottom, 8),
      }}
    >
      {/* Reply Preview */}
      {replyingTo && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: colors.selectedSurface,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
          }}
        >
          <View style={{ width: 3, height: 28, borderRadius: 2, backgroundColor: colors.blue }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: f(11.5), fontWeight: '700', color: colors.blue }}>
              Replying to {replyingTo.sender.replace(' (You)', '')}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: f(12), color: colors.textSecondary }}>
              {replyingTo.text}
            </Text>
          </View>
          <Pressable
            onPress={onClearReply}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Pending Attachment Preview */}
      {pendingAttachment && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginHorizontal: 12,
            marginTop: 8,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 12,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          {pendingAttachment.kind === 'image' ? (
            <ImageIcon size={16} color={colors.blue} />
          ) : (
            <FileText size={16} color={colors.blue} />
          )}
          <Text numberOfLines={1} style={{ flex: 1, fontSize: f(12.5), fontWeight: '600', color: colors.textPrimary }}>
            {pendingAttachment.name}
          </Text>
          <Text style={{ fontSize: f(11), color: colors.textMuted }}>
            {pendingAttachment.size}
          </Text>
          <Pressable
            onPress={onClearAttachment}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Remove attachment"
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={15} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Attachment Source Bar */}
      {showAttachMenu && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Pressable
            onPress={() => {
              setShowAttachMenu(false);
              onPickImage();
            }}
            accessibilityRole="button"
            accessibilityLabel="Attach photo or image"
            style={({ pressed }) => ({
              minHeight: 38,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: pressed ? colors.surfaceInteractive : colors.surface,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            })}
          >
            <ImageIcon size={16} color={colors.blue} />
            <Text style={{ fontSize: f(12.5), fontWeight: '600', color: colors.textPrimary }}>
              Photo
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setShowAttachMenu(false);
              onPickDocument();
            }}
            accessibilityRole="button"
            accessibilityLabel="Attach document or PDF"
            style={({ pressed }) => ({
              minHeight: 38,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: pressed ? colors.surfaceInteractive : colors.surface,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            })}
          >
            <FileText size={16} color={colors.blue} />
            <Text style={{ fontSize: f(12.5), fontWeight: '600', color: colors.textPrimary }}>
              Document / PDF
            </Text>
          </Pressable>
        </View>
      )}

      {/* Compact Emoji Tray */}
      {showEmojiTray && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
            backgroundColor: colors.surfaceAlt,
          }}
        >
          {COMMON_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => handleInsertEmoji(emoji)}
              accessibilityRole="button"
              accessibilityLabel={`Insert ${emoji}`}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.surfaceInteractive : 'transparent',
              })}
            >
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Main Input Row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 6,
          paddingHorizontal: 10,
          paddingTop: 8,
        }}
      >
        <Pressable
          onPress={() => {
            setShowEmojiTray(false);
            setShowAttachMenu((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityLabel="Attach file or image"
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: showAttachMenu || pressed ? colors.surfaceAlt : 'transparent',
          })}
        >
          <Paperclip size={20} color={showAttachMenu ? colors.blue : colors.textSecondary} />
        </Pressable>

        <View
          style={{
            flex: 1,
            minHeight: 42,
            maxHeight: 120,
            borderRadius: 21,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceAlt,
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingLeft: 14,
            paddingRight: 6,
          }}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onContentSizeChange={(e) => {
              const h = e.nativeEvent.contentSize.height + 16;
              setInputHeight(Math.min(116, Math.max(42, h)));
            }}
            placeholder={`Message #${channelName}…`}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            returnKeyType={Platform.OS === 'web' ? 'send' : 'default'}
            onSubmitEditing={Platform.OS === 'web' ? onSend : undefined}
            blurOnSubmit={false}
            style={{
              flex: 1,
              fontSize: f(14.5),
              lineHeight: f(20),
              color: colors.textPrimary,
              minHeight: 42,
              height: inputHeight,
              maxHeight: 116,
              paddingTop: 10,
              paddingBottom: 10,
              textAlignVertical: 'center',
              ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
            }}
          />

          <Pressable
            onPress={() => {
              setShowAttachMenu(false);
              setShowEmojiTray((v) => !v);
            }}
            accessibilityRole="button"
            accessibilityLabel="Toggle emoji picker"
            style={{
              width: 38,
              height: 42,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Smile size={20} color={showEmojiTray ? colors.blue : colors.textMuted} />
          </Pressable>
        </View>

        <Pressable
          disabled={!canSend}
          onPress={onSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          testID="group-chat-send-btn"
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canSend ? colors.blue : colors.surfaceAlt,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={18} color={canSend ? '#FFFFFF' : colors.textFaint} />
          )}
        </Pressable>
      </View>
    </View>
  );
});
