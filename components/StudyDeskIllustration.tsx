import React from 'react';
import Svg, { Path, Rect, Line, Circle, G } from 'react-native-svg';
import type { ChairState } from '../lib/smartStudyRoomTypes';

export interface StudyDeskIllustrationProps {
  state: ChairState;
  isDark: boolean;
  width: number;
  height: number;
}

export const StudyDeskIllustration: React.FC<StudyDeskIllustrationProps> = ({
  state,
  isDark,
  width,
  height,
}) => {
  const isFocusing = state === 'focusing';
  const isPaused = state === 'paused';

  const strokeColor = isFocusing
    ? isDark
      ? '#34D399'
      : '#059669'
    : isPaused
    ? isDark
      ? '#FBBF24'
      : '#D97706'
    : isDark
    ? '#475569'
    : '#CBD5E1';

  const lampGlow = isFocusing
    ? isDark
      ? 'rgba(52, 211, 153, 0.22)'
      : 'rgba(16, 185, 129, 0.16)'
    : isPaused
    ? isDark
      ? 'rgba(251, 191, 36, 0.16)'
      : 'rgba(245, 158, 11, 0.14)'
    : 'transparent';

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 80 58"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Subtle lamp light cone when studying or paused */}
      {(isFocusing || isPaused) && (
        <Path d="M54 21 L44 37 L67 37 L61 21 Z" fill={lampGlow} />
      )}

      {/* Study Desk Table Top & Legs */}
      <Rect
        x={12}
        y={37}
        width={56}
        height={4.5}
        rx={2.25}
        stroke={strokeColor}
        strokeWidth={2.2}
        fill={isFocusing ? lampGlow : 'none'}
      />
      <Line
        x1={18}
        y1={42}
        x2={18}
        y2={53}
        stroke={strokeColor}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Line
        x1={62}
        y1={42}
        x2={62}
        y2={53}
        stroke={strokeColor}
        strokeWidth={2.2}
        strokeLinecap="round"
      />

      {/* Desk Lamp on Right Side */}
      <Path d="M57 37 V23" stroke={strokeColor} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M52 23 H62 L60 15 H54 L52 23 Z"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinejoin="round"
        fill={isFocusing ? strokeColor : 'none'}
        fillOpacity={isFocusing ? 0.2 : 0}
      />

      {/* Student Silhouette when Focusing */}
      {isFocusing && (
        <G>
          <Circle
            cx={33}
            cy={19}
            r={6}
            stroke={strokeColor}
            strokeWidth={2.2}
            fill={isDark ? '#064E3B' : '#ECFDF5'}
          />
          <Path
            d="M21 37 C21 29.5 26 26.5 33 26.5 C40 26.5 45 29.5 45 37"
            stroke={strokeColor}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <Line
            x1={22}
            y1={12}
            x2={24}
            y2={14}
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Line
            x1={25}
            y1={9}
            x2={26.5}
            y2={11.5}
            stroke={strokeColor}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </G>
      )}

      {/* Paused / On Break Visual Cue */}
      {isPaused && (
        <G>
          <Rect
            x={24}
            y={21}
            width={18}
            height={14}
            rx={4}
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray="3 2.5"
          />
          <Path
            d="M29 31 H37 V36 C37 36.6 36.6 37 36 37 H30 C29.4 37 29 36.6 29 36 V31 Z"
            stroke={strokeColor}
            strokeWidth={1.8}
          />
          <Path
            d="M31.5 28 Q32 26.5 31.5 25"
            stroke={strokeColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path
            d="M34.5 28 Q35 26.5 34.5 25"
            stroke={strokeColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </G>
      )}

      {/* Empty Available Chair Outline */}
      {!isFocusing && !isPaused && (
        <G>
          <Rect
            x={24}
            y={19}
            width={18}
            height={14}
            rx={4.5}
            stroke={strokeColor}
            strokeWidth={2}
            fill={isDark ? 'rgba(71, 85, 105, 0.15)' : 'rgba(226, 232, 240, 0.45)'}
          />
          <Line
            x1={28}
            y1={33}
            x2={28}
            y2={37}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Line
            x1={38}
            y1={33}
            x2={38}
            y2={37}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </G>
      )}
    </Svg>
  );
};