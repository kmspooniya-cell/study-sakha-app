import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { radii, shadow, spacing, useTheme } from '../lib/theme';

export type PopupPresentation = 'sheet' | 'center';

type PopupProps = {
  visible: boolean;
  onClose: () => void;
  presentation?: PopupPresentation;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
};

export function Popup({
  visible,
  onClose,
  presentation = 'sheet',
  title,
  subtitle,
  children,
  actions,
  style,
  scrollable = true,
}: PopupProps) {
  const { colors } = useTheme();
  const isSheet = presentation === 'sheet';
  const content = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      {children}
    </ScrollView>
  ) : children;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isSheet ? 'slide' : 'fade'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.root, isSheet ? styles.sheetRoot : styles.centerRoot]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={onClose}
        />
        <View
          style={[
            isSheet ? styles.sheetCard : styles.centerCard,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.borderSubtle },
            shadow(colors, isSheet ? 3 : 2),
            style,
          ]}
        >
          {isSheet ? <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} /> : null}
          <PopupHeader title={title} subtitle={subtitle} onClose={onClose} />
          {content}
          {actions ? <View style={[styles.actions, { borderTopColor: colors.borderSubtle }]}>{actions}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function PopupHeader({
  title,
  subtitle,
  onClose,
}: {
  title?: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const { colors, f } = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {title ? <Text style={[styles.title, { color: colors.textPrimary, fontSize: f(18) }]}>{title}</Text> : null}
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: f(13) }]}>{subtitle}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title ? `Close ${title}` : 'Close'}
        hitSlop={8}
        onPress={onClose}
        style={({ pressed }) => [styles.closeButton, { backgroundColor: pressed ? colors.surfaceInteractive : 'transparent' }]}
      >
        <Ionicons name="close" size={22} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export function PopupActions({ children }: { children: React.ReactNode }) {
  return <View style={styles.actionRow}>{children}</View>;
}

export function PopupConfirmation({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Popup
      visible={visible}
      onClose={onCancel}
      presentation="center"
      title={title}
      scrollable={false}
      actions={(
        <PopupActions>
          <Pressable onPress={onCancel} style={[styles.secondaryAction, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{cancelLabel}</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={[styles.primaryAction, { backgroundColor: danger ? colors.danger : colors.brandPrimary }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{confirmLabel}</Text>
          </Pressable>
        </PopupActions>
      )}
    >
      <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{message}</Text>
    </Popup>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sheetRoot: { justifyContent: 'flex-end', alignItems: 'center' },
  centerRoot: { justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  backdrop: { ...StyleSheet.absoluteFill },
  sheetCard: { width: '100%', maxWidth: 672, maxHeight: '90%', borderTopLeftRadius: radii.dialog, borderTopRightRadius: radii.dialog, borderWidth: 1, overflow: 'hidden' },
  centerCard: { width: '100%', maxWidth: 420, maxHeight: '88%', borderRadius: radii.dialog, borderWidth: 1, padding: spacing.lg },
  handle: { width: 44, height: 5, borderRadius: 999, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontWeight: '800' },
  subtitle: { marginTop: 4, lineHeight: 18 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  actions: { padding: spacing.lg, borderTopWidth: 1 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  secondaryAction: { flex: 1, minHeight: 48, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  primaryAction: { flex: 1, minHeight: 48, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
});
