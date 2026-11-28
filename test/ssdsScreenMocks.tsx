import React from 'react';
import { Pressable, Text, View } from 'react-native';

export const SSDSText = ({ children, ...props }: React.ComponentProps<typeof Text> & { variant?: string; color?: string; align?: string }) => (
  <Text {...props}>{children}</Text>
);
export const SSDSSurface = ({ children, ...props }: React.ComponentProps<typeof View> & { variant?: string }) => (
  <View {...props}>{children}</View>
);
export const SSDSButton = ({ children, variant: _variant, ...props }: React.ComponentProps<typeof Pressable> & { variant?: string }) => (
  <Pressable {...props}><Text>{children}</Text></Pressable>
);
export const useSSDSTheme = () => ({
  tokens: {
    colors: {
      background: '#F7F8FA',
      surface: '#FFFFFF',
      border: '#E2E7EF',
      textPrimary: '#111827',
      textSecondary: '#374151',
      primary: '#2B4C7E',
      secondary: '#2E6F6B',
      accent: '#B87314',
    },
  },
});

const passthrough = ({ children, ...props }: React.ComponentProps<typeof View>) => (
  <View {...props}>{children}</View>
);
export const SSDSIcon = () => null;
export const SSDSAvatar = passthrough;
export const SSDSBadge = passthrough;
export const SSDSConfirmationPattern = passthrough;
export const SSDSEmptyState = passthrough;
export const SSDSRow = passthrough;
export const SSDSStack = passthrough;
export const SSDSSectionHeader = passthrough;
export const SSDSSearchInput = passthrough;
export const SSDSTextInput = (props: React.ComponentProps<typeof Text>) => <Text {...props} />;
