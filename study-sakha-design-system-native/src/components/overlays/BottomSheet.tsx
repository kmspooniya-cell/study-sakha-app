/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/overlays/BottomSheet.tsx
 */

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { IconButton } from '../buttons/IconButton';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={open}
      transparent
      animationType={tokens.motion.reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessible={false}
      >
        <Pressable
          onPress={() => undefined}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            tokens.shadows.elevation5,
            {
              backgroundColor: tokens.colors.surfaceElevated,
              borderColor: tokens.colors.border,
              borderTopLeftRadius: tokens.radius['2xl'],
              borderTopRightRadius: tokens.radius['2xl'],
              paddingBottom: Math.max(insets.bottom + 16, 24),
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: tokens.colors.borderStrong },
            ]}
          />
          <View style={styles.headerRow}>
            {!!title ? <Text variant="SectionTitle">{title}</Text> : <View />}
            <IconButton
              icon={X}
              size="small"
              label="Close bottom sheet"
              onPress={onClose}
            />
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 25, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
});
