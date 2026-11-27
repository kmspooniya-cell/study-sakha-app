/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/templates/FormScreen.tsx
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PageLayout } from '../components/layout/PageLayout';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { Button } from '../components/buttons/Button';

export interface FormScreenProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  safeTop?: boolean;
  submitLabel?: string;
  onSubmit?: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  children?: React.ReactNode;
}

export function FormScreen({
  title,
  subtitle,
  onBackPress,
  safeTop = true,
  submitLabel = 'Save',
  onSubmit,
  submitting = false,
  submitDisabled = false,
  secondaryLabel,
  onSecondaryPress,
  children,
}: FormScreenProps) {
  return (
    <PageLayout
      scrollable
      keyboardAvoiding
      header={
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          onBackPress={onBackPress}
          safeTop={safeTop}
        />
      }
      footer={
        <View style={styles.footerRow}>
          {!!secondaryLabel && (
            <View style={styles.flex}>
              <Button variant="outline" fullWidth onPress={onSecondaryPress}>
                {secondaryLabel}
              </Button>
            </View>
          )}
          <View style={styles.flex}>
            <Button
              fullWidth
              loading={submitting}
              disabled={submitDisabled}
              onPress={onSubmit}
            >
              {submitLabel}
            </Button>
          </View>
        </View>
      }
    >
      <View style={styles.formBody}>{children}</View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  formBody: {
    gap: 16,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
});
