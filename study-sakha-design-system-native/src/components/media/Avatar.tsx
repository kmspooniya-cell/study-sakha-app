/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/media/Avatar.tsx
 */

import React, { useEffect, useState } from 'react';
import { Image, ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export type AvatarVariant = 'primary' | 'secondary' | 'accent';
export type AvatarStatus = 'online' | 'away';

export interface AvatarProps {
  name?: string;
  source?: ImageSourcePropType;
  size?: number;
  variant?: AvatarVariant;
  status?: AvatarStatus;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({
  name = 'SS',
  source,
  size = 40,
  variant = 'primary',
  status,
  style,
}: AvatarProps) {
  const { tokens } = useTheme();
  const [imgError, setImgError] = useState(false);

  const sourceKey =
    typeof source === 'number'
      ? source
      : source && !Array.isArray(source) && 'uri' in source
      ? source.uri
      : Array.isArray(source)
      ? source.map((s) => s.uri ?? '').join('|')
      : null;

  useEffect(() => {
    setImgError((prev) => (prev ? false : prev));
  }, [sourceKey]);

  const initials = name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bg =
    variant === 'secondary'
      ? tokens.colors.secondaryLight
      : variant === 'accent'
      ? tokens.colors.accentSoft
      : tokens.colors.primaryLight;

  const fg =
    variant === 'secondary'
      ? tokens.colors.secondary
      : variant === 'accent'
      ? tokens.colors.accent
      : tokens.colors.primary;

  const dotSize = Math.max(9, Math.round(size * 0.25));

  return (
    <View style={[{ width: size, height: size, flexShrink: 0 }, style]}>
      {source && !imgError ? (
        <Image
          source={source}
          accessibilityLabel={name}
          onError={() => setImgError(true)}
          style={{
            width: size,
            height: size,
            borderRadius: tokens.radius.full,
            borderWidth: 1,
            borderColor: tokens.colors.borderSubtle,
          }}
        />
      ) : (
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: tokens.radius.full,
              backgroundColor: bg,
              borderColor: tokens.colors.borderSubtle,
            },
          ]}
        >
          <Text
            variant="CardTitle"
            color={fg}
            style={{
              fontWeight: '700',
              fontSize: Math.round(size * 0.36 * tokens.typography.scale),
            }}
          >
            {initials}
          </Text>
        </View>
      )}

      {status && (
        <View
          style={[
            styles.statusDot,
            {
              width: dotSize,
              height: dotSize,
              backgroundColor:
                status === 'online' ? tokens.colors.success : tokens.colors.warning,
              borderColor: tokens.colors.surface,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 9999,
    borderWidth: 2,
  },
});
