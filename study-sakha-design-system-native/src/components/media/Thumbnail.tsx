/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/media/Thumbnail.tsx
 */

import React, { useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { AlertCircle, BookOpen } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';
import { Icon } from '../foundation/Icon';
import { Skeleton } from '../feedback/Skeleton';

export interface ThumbnailProps {
  title?: string;
  subtitle?: string;
  source?: ImageSourcePropType;
  icon?: LucideIcon;
  aspectRatio?: number;
  broken?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Thumbnail({
  title,
  subtitle,
  source,
  icon = BookOpen,
  aspectRatio = 16 / 10,
  broken = false,
  loading = false,
  style,
}: ThumbnailProps) {
  const { tokens } = useTheme();
  const [imgError, setImgError] = useState(false);

  if (loading) {
    return <Skeleton height={110} radius="md" style={style} />;
  }

  const isBroken = broken || imgError;

  if (source && !isBroken) {
    return (
      <Image
        source={source}
        onError={() => setImgError(true)}
        style={[
          {
            width: '100%',
            aspectRatio,
            borderRadius: tokens.radius.md,
            borderWidth: 1,
            borderColor: tokens.colors.border,
          },
          style as never,
        ]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          aspectRatio,
          borderRadius: tokens.radius.md,
          backgroundColor: isBroken
            ? tokens.colors.dangerBackground
            : tokens.colors.surfaceTertiary,
          borderColor: tokens.colors.border,
        },
        style,
      ]}
    >
      <Icon
        icon={isBroken ? AlertCircle : icon}
        size={24}
        color={isBroken ? 'danger' : 'primary'}
      />
      <Text
        variant="Caption"
        color={isBroken ? 'danger' : 'textPrimary'}
        align="center"
        style={{ fontWeight: '600' }}
      >
        {isBroken ? 'Image unavailable' : title}
      </Text>
      {!isBroken && !!subtitle && (
        <Text variant="Caption" align="center">
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
});
