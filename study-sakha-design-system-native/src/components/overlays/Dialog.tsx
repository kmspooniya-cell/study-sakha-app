/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/overlays/Dialog.tsx
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Button } from '../buttons/Button';
import { IconButton } from '../buttons/IconButton';

export type DialogVariant = 'default' | 'danger' | 'success' | 'info';

export interface DialogAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: DialogVariant;
  primaryAction?: DialogAction;
  secondaryAction?: DialogAction;
  children?: React.ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  variant = 'default',
  primaryAction,
  secondaryAction,
  children,
}: DialogProps) {
  const { tokens } = useTheme();

  return (
    <Modal
      visible={open}
      transparent
      animationType={tokens.motion.reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={() => undefined}
          style={[
            styles.card,
            tokens.shadows.elevation5,
            {
              maxWidth: tokens.dimensions.modalMaxWidth,
              backgroundColor: tokens.colors.surfaceElevated,
              borderRadius: tokens.radius.xl,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              {variant === 'danger' && (
                <Icon icon={AlertTriangle} size={22} color="danger" />
              )}
              {variant === 'success' && (
                <Icon icon={CheckCircle2} size={22} color="success" />
              )}
              {variant === 'info' && <Icon icon={Info} size={22} color="info" />}
              <Text variant="SectionTitle" style={styles.title}>
                {title}
              </Text>
            </View>
            <IconButton
              icon={X}
              size="small"
              label="Close dialog"
              onPress={onClose}
            />
          </View>

          {!!description && (
            <Text variant="BodySecondary" style={styles.description}>
              {description}
            </Text>
          )}

          {!!children && <View style={styles.body}>{children}</View>}

          {(primaryAction || secondaryAction) && (
            <View style={styles.footer}>
              {secondaryAction && (
                <Button
                  variant="outline"
                  size="medium"
                  onPress={secondaryAction.onPress}
                >
                  {secondaryAction.label}
                </Button>
              )}
              {primaryAction && (
                <Button
                  variant={variant === 'danger' ? 'destructive' : 'primary'}
                  size="medium"
                  loading={primaryAction.loading}
                  onPress={primaryAction.onPress}
                >
                  {primaryAction.label}
                </Button>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 25, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
  },
  description: {
    marginTop: 10,
  },
  body: {
    marginTop: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
});
