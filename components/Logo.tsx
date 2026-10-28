import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle, G } from 'react-native-svg';
import { brand, fonts, useTheme } from '../lib/theme';

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="bookGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={brand.navy} />
          <Stop offset="1" stopColor={brand.blue} />
        </LinearGradient>
        <LinearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={brand.teal} />
          <Stop offset="1" stopColor="#5FE3CF" />
        </LinearGradient>
      </Defs>
      <Path
        d="M6 12.5c5.2-2.6 11-2.6 16 .9v26c-5-3.5-10.8-3.5-16-.9z"
        fill="url(#bookGrad)"
      />
      <Path
        d="M42 12.5c-5.2-2.6-11-2.6-16 .9v26c5-3.5 10.8-3.5 16-.9z"
        fill="url(#bookGrad)"
        opacity={0.72}
      />
      <G>
        <Path
          d="M24 2.5l2.6 6.1 6.1 2.6-6.1 2.6L24 20l-2.6-6.2-6.1-2.6 6.1-2.6z"
          fill="url(#sparkGrad)"
        />
        <Circle cx="35.5" cy="6.5" r="2.1" fill={brand.teal} opacity={0.85} />
        <Circle cx="13" cy="5.5" r="1.4" fill={brand.teal} opacity={0.6} />
      </G>
    </Svg>
  );
}

export function Logo({ size = 34, showWord = true, compact = false }: { size?: number; showWord?: boolean; compact?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      {showWord ? (
        <View>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: size * 0.56,
              fontWeight: '800',
              color: colors.text,
              letterSpacing: -0.6,
            }}
          >
            Study <Text style={{ color: brand.teal }}>Sakha</Text>
          </Text>
          {!compact ? (
            <Text style={{ fontFamily: fonts.body, fontSize: size * 0.26, color: colors.textFaint, letterSpacing: 1.6, marginTop: 1 }}>
              YOUR EXAM COMPANION
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
