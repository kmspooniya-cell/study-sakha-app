/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/PageLayout.tsx
 */

import React from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { ScreenContainer } from './ScreenContainer';

export interface PageLayoutProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function PageLayout({
  header,
  footer,
  scrollable = true,
  padding = true,
  keyboardAvoiding = false,
  style,
  contentContainerStyle,
  children,
}: PageLayoutProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const mainContent = (
    <>
      <ScreenContainer
        scrollable={scrollable}
        padding={padding}
        keyboardAvoiding={false}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </ScreenContainer>
      {!!footer && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: tokens.colors.surface,
              borderTopColor: tokens.colors.divider,
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: tokens.spacing.screenPadding,
            },
          ]}
        >
          {footer}
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: tokens.colors.background }, style]}>
      {header}
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {mainContent}
        </KeyboardAvoidingView>
      ) : (
        mainContent
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
});
