/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/layout/ScreenContainer.tsx
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';

export interface ScreenContainerProps {
  children?: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  maxWidth?: number;
  safeAreaEdges?: Edge[];
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function ScreenContainer({
  children,
  scrollable = false,
  padding = true,
  maxWidth,
  safeAreaEdges = ['left', 'right'],
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  const { tokens } = useTheme();
  const resolvedMaxWidth = maxWidth ?? tokens.dimensions.contentMaxWidth;
  const pad = padding ? tokens.spacing.screenPadding : 0;

  const innerContent = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.centered,
        {
          maxWidth: resolvedMaxWidth,
          padding: pad,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        styles.centered,
        {
          maxWidth: resolvedMaxWidth,
          padding: pad,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {innerContent}
    </KeyboardAvoidingView>
  ) : (
    innerContent
  );

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[styles.flex, { backgroundColor: tokens.colors.background }, style]}
    >
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    width: '100%',
    alignSelf: 'center',
  },
});
