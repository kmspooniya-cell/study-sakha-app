import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { radii, shadow, useTheme } from '../../lib/theme';
import { Txt } from '../ui';

type UndoSnackbarProps = {
  visible: boolean;
  message: string;
  onUndo: () => void;
};

export function UndoSnackbar({ visible, message, onUndo }: UndoSnackbarProps) {
  const { colors, scheme } = useTheme();
  if (!visible) return null;

  return (
    <View
      testID="notification-undo-snackbar"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        borderRadius: radii.md,
        backgroundColor: scheme === 'dark' ? '#24304B' : '#1C1C1E',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        ...shadow(colors, 3),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
        <Txt size={13.5} weight="600" color="#FFFFFF" numberOfLines={1} style={{ flex: 1 }}>
          {message}
        </Txt>
      </View>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel="Undo delete"
        testID="notification-undo-button"
        style={({ pressed }) => ({
          minHeight: 36,
          paddingHorizontal: 12,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? 'rgba(255,255,255,0.16)' : 'transparent',
        })}
      >
        <Txt size={13.5} weight="800" color={colors.teal}>
          UNDO
        </Txt>
      </Pressable>
    </View>
  );
}
