import React from 'react';
import { Image, View, Text } from 'react-native';
import { brand, fonts, useTheme } from '../lib/theme';

const MASCOT_HEADER = require('../assets/mascot/study-sakha-mascot.png');

export function LogoMark({ size = 36 }: { size?: number }) {
  return <Image source={MASCOT_HEADER} accessibilityLabel="Study Sakha mascot" resizeMode="contain" style={{ width: size, height: size }} />;
}

export function Logo({
  size = 34,
  showWord = true,
  compact = false,
  wordmark = 'Study Sakha',
  direction = 'row',
  wordmarkSize,
  wordmarkColor,
  accentColor,
}: {
  size?: number;
  showWord?: boolean;
  compact?: boolean;
  wordmark?: 'Study Sakha' | 'Sakha AI';
  direction?: 'row' | 'column';
  wordmarkSize?: number;
  wordmarkColor?: string;
  accentColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: direction, alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      {showWord ? (
        <View>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: wordmarkSize ?? size * 0.56,
              fontWeight: '800',
              color: wordmarkColor ?? colors.text,
              letterSpacing: -0.6,
            }}
          >
            {wordmark === 'Sakha AI' ? (
              <>Sakha <Text style={{ color: accentColor ?? colors.blue }}>AI</Text></>
            ) : (
              <>Study <Text style={{ color: accentColor ?? brand.teal }}>Sakha</Text></>
            )}
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
