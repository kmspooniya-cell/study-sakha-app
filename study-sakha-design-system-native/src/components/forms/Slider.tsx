/**
 * Study Sakha Design System (SSDS v1.0)
 * File: src/components/forms/Slider.tsx
 *
 * Pure React Native Slider using PanResponder so zero additional native
 * packages are required beyond core React Native.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../foundation/Text';

export interface SliderProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange?: (value: number) => void;
  style?: StyleProp<ViewStyle>;
}

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  disabled = false,
  onChange,
  style,
}: SliderProps) {
  const { tokens } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);

  const clampAndSnap = (ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const raw = min + clampedRatio * (max - min);
    const snapped = Math.round((raw - min) / step) * step + min;
    return Math.max(min, Math.min(max, Math.round(snapped * 1000) / 1000));
  };

  const updateFromLocationX = (locationX: number) => {
    if (disabled || trackWidthRef.current <= 0) return;
    const next = clampAndSnap(locationX / trackWidthRef.current);
    onChange?.(next);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          updateFromLocationX(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          updateFromLocationX(evt.nativeEvent.locationX);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, min, max, step, onChange]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidthRef.current = w;
    setTrackWidth(w);
  };

  const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const thumbLeft = Math.max(0, ratio * trackWidth - 10);
  const clampedValue = Math.max(min, Math.min(max, value));

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (disabled) return;
    const safeStep = step > 0 ? step : 1;
    let next = clampedValue;
    if (event.nativeEvent.actionName === 'increment') {
      next = clampedValue + safeStep;
    } else if (event.nativeEvent.actionName === 'decrement') {
      next = clampedValue - safeStep;
    } else {
      return;
    }
    const snapped = Math.max(min, Math.min(max, Math.round(next * 1000) / 1000));
    if (snapped !== clampedValue) {
      onChange?.(snapped);
    }
  };

  return (
    <View style={[styles.wrapper, { opacity: disabled ? 0.5 : 1 }, style]}>
      {!!label && (
        <View style={styles.headerRow}>
          <Text variant="InputLabel">{label}</Text>
          <Text variant="Caption" color="primary" style={{ fontWeight: '600' }}>
            {value}
            {unit}
          </Text>
        </View>
      )}

      <View
        onLayout={handleLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min, max, now: clampedValue }}
        accessibilityActions={
          disabled
            ? undefined
            : [
                { name: 'increment', label: 'Increase value' },
                { name: 'decrement', label: 'Decrease value' },
              ]
        }
        onAccessibilityAction={handleAccessibilityAction}
        style={styles.touchArea}
        {...panResponder.panHandlers}
      >
        <View
          pointerEvents="none"
          style={[
            styles.track,
            { backgroundColor: tokens.colors.surfaceTertiary },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                width: `${ratio * 100}%`,
                backgroundColor: tokens.colors.primary,
              },
            ]}
          />
        </View>
        {trackWidth > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              tokens.shadows.elevation2,
              {
                left: thumbLeft,
                backgroundColor: tokens.colors.primary,
                borderColor: tokens.colors.surface,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  touchArea: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 9999,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 9999,
    borderWidth: 2,
  },
});
