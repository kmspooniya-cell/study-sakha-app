import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MeditationPresetId } from './MeditationPresets';

interface SceneProps {
  presetId: MeditationPresetId;
  isPlaying?: boolean;
  width: number;
  height: number;
}

export function MeditationSceneRenderer({
  presetId,
  isPlaying = true,
  width,
  height,
}: SceneProps) {
  switch (presetId) {
    case 'pure_cosmic_waves':
      return <PureCosmicWavesScene isPlaying={isPlaying} width={width} height={height} />;
    case 'ocean_waves':
      return <OceanWavesScene isPlaying={isPlaying} width={width} height={height} />;
    case 'forest_calm':
      return <ForestCalmScene isPlaying={isPlaying} width={width} height={height} />;
    case 'rain_relaxation':
      return <RainRelaxationScene isPlaying={isPlaying} width={width} height={height} />;
    case 'cosmic_meditation':
      return <CosmicMeditationScene isPlaying={isPlaying} width={width} height={height} />;
    case 'zen_garden':
      return <ZenGardenScene isPlaying={isPlaying} width={width} height={height} />;
    case 'calm_breathing':
    default:
      return <CalmBreathingScene isPlaying={isPlaying} width={width} height={height} />;
  }
}

// ==========================================
// 1. CALM BREATHING SCENE
// ==========================================
function CalmBreathingScene({ isPlaying, width, height }: { isPlaying: boolean; width: number; height: number }) {
  const breathAnim = useRef(new Animated.Value(0.72)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const animLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const cycle = Animated.sequence([
        // Inhale (4s)
        Animated.parallel([
          Animated.timing(breathAnim, {
            toValue: 1.2,
            duration: 4000,
            easing: Easing.bezier(0.42, 0.0, 0.58, 1.0),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.85,
            duration: 4000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
        // Hold (2s)
        Animated.delay(2000),
        // Exhale (6s)
        Animated.parallel([
          Animated.timing(breathAnim, {
            toValue: 0.72,
            duration: 6000,
            easing: Easing.bezier(0.42, 0.0, 0.58, 1.0),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.28,
            duration: 6000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
      ]);

      animLoop.current = Animated.loop(cycle);
      animLoop.current.start();
    } else {
      breathAnim.stopAnimation();
      glowAnim.stopAnimation();
      if (animLoop.current) animLoop.current.stop();
    }

    return () => {
      breathAnim.stopAnimation();
      glowAnim.stopAnimation();
      if (animLoop.current) animLoop.current.stop();
    };
  }, [isPlaying]);

  const orbSize = Math.min(width * 0.55, 240);

  return (
    <View style={[StyleSheet.absoluteFill, styles.center]}>
      {/* Outer blurred aura */}
      <Animated.View
        style={{
          position: 'absolute',
          width: orbSize * 1.5,
          height: orbSize * 1.5,
          borderRadius: (orbSize * 1.5) / 2,
          backgroundColor: 'rgba(90, 200, 250, 0.25)',
          opacity: glowAnim,
          transform: [{ scale: breathAnim }],
        }}
      />
      {/* Middle shimmer ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: orbSize * 1.22,
          height: orbSize * 1.22,
          borderRadius: (orbSize * 1.22) / 2,
          borderWidth: 2,
          borderColor: 'rgba(90, 200, 250, 0.5)',
          opacity: glowAnim,
          transform: [{ scale: breathAnim }],
        }}
      />
      {/* Core Glowing Orb */}
      <Animated.View
        style={{
          width: orbSize,
          height: orbSize,
          borderRadius: orbSize / 2,
          backgroundColor: 'rgba(28, 54, 98, 0.92)',
          borderWidth: 2.5,
          borderColor: 'rgba(90, 200, 250, 0.7)',
          shadowColor: '#5AC8FA',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 28,
          elevation: 10,
          transform: [{ scale: breathAnim }],
        }}
      />
    </View>
  );
}

// ==========================================
// 2. OCEAN WAVES SCENE
// ==========================================
function OceanWavesScene({ isPlaying, width, height }: { isPlaying: boolean; width: number; height: number }) {
  const waveHeave = useRef(new Animated.Value(0)).current;
  const waveShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      const heave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveHeave, {
            toValue: 1,
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(waveHeave, {
            toValue: 0,
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      const shift = Animated.loop(
        Animated.timing(waveShift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      heave.start();
      shift.start();
    } else {
      waveHeave.stopAnimation();
      waveShift.stopAnimation();
    }
    return () => {
      waveHeave.stopAnimation();
      waveShift.stopAnimation();
    };
  }, [isPlaying]);

  const translateY1 = waveHeave.interpolate({
    inputRange: [0, 1],
    outputRange: [15, -15],
  });
  const translateY2 = waveHeave.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 14],
  });
  const translateX = waveShift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60],
  });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {/* Rising Ocean Horizon & Sea Mist */}
      <View
        style={{
          position: 'absolute',
          top: '36%',
          left: 0,
          right: 0,
          height: 120,
          backgroundColor: 'rgba(0, 122, 255, 0.08)',
        }}
      />

      {/* Layer 1: Distant Deep Wave */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 40,
          left: -40,
          width: width + 120,
          height: height * 0.45,
          transform: [{ translateY: translateY1 }, { translateX }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
          <Path
            d="M 0 60 Q 125 10 250 60 T 500 60 L 500 200 L 0 200 Z"
            fill="rgba(10, 42, 85, 0.55)"
          />
        </Svg>
      </Animated.View>

      {/* Layer 2: Middle Translucent Teal Wave */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 20,
          left: -20,
          width: width + 100,
          height: height * 0.4,
          transform: [{ translateY: translateY2 }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
          <Path
            d="M 0 70 Q 125 110 250 70 T 500 70 L 500 200 L 0 200 Z"
            fill="rgba(0, 122, 255, 0.45)"
          />
        </Svg>
      </Animated.View>

      {/* Layer 3: Foreground Cresting Wave with Foam Accent */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: width + 60,
          height: height * 0.35,
          transform: [{ translateY: translateY1 }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
          <Path
            d="M 0 55 Q 125 20 250 55 T 500 55 L 500 200 L 0 200 Z"
            fill="rgba(0, 95, 204, 0.85)"
          />
          <Path
            d="M 0 55 Q 125 20 250 55 T 500 55"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="3.5"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ==========================================
// 3. FOREST CALM SCENE
// ==========================================
function ForestCalmScene({ isPlaying, width, height }: { isPlaying: boolean; width: number; height: number }) {
  const treeSway = useRef(new Animated.Value(0)).current;
  const fireflyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      const sway = Animated.loop(
        Animated.sequence([
          Animated.timing(treeSway, {
            toValue: 1,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(treeSway, {
            toValue: -1,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const fireflies = Animated.loop(
        Animated.sequence([
          Animated.timing(fireflyAnim, {
            toValue: 1,
            duration: 3500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fireflyAnim, {
            toValue: 0,
            duration: 3500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      sway.start();
      fireflies.start();
    } else {
      treeSway.stopAnimation();
      fireflyAnim.stopAnimation();
    }

    return () => {
      treeSway.stopAnimation();
      fireflyAnim.stopAnimation();
    };
  }, [isPlaying]);

  const treeRotate = treeSway.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1.8deg', '1.8deg'],
  });

  const fireflyOpacity = fireflyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.95],
  });

  const fireflyTranslateY = fireflyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {/* Background Soft Sunbeams */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.15 }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Path d={`M 0 0 L ${width * 0.4} ${height} L ${width * 0.25} ${height} Z`} fill="#34C759" />
          <Path d={`M ${width * 0.3} 0 L ${width * 0.8} ${height} L ${width * 0.65} ${height} Z`} fill="#34C759" />
        </Svg>
      </View>

      {/* Layered Swaying Pine Silhouettes */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: -10,
          left: -20,
          right: -20,
          height: height * 0.45,
          transform: [{ rotate: treeRotate }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none">
          <G fill="rgba(14, 46, 32, 0.92)">
            {/* Tree 1 */}
            <Path d="M 60 220 L 60 120 L 40 120 L 60 70 L 45 70 L 60 20 L 75 70 L 60 70 L 80 120 L 60 120 Z" />
            {/* Tree 2 */}
            <Path d="M 140 220 L 140 140 L 115 140 L 140 85 L 122 85 L 140 35 L 158 85 L 140 85 L 165 140 L 140 140 Z" />
            {/* Tree 3 */}
            <Path d="M 230 220 L 230 110 L 205 110 L 230 65 L 212 65 L 230 15 L 248 65 L 230 65 L 255 110 L 230 110 Z" />
            {/* Tree 4 */}
            <Path d="M 320 220 L 320 130 L 298 130 L 320 80 L 305 80 L 320 30 L 335 80 L 320 80 L 342 130 L 320 130 Z" />
          </G>
        </Svg>
      </Animated.View>

      {/* Shimmering Fireflies */}
      {[
        { x: '18%', y: '40%', size: 5 },
        { x: '35%', y: '52%', size: 6 },
        { x: '58%', y: '36%', size: 4 },
        { x: '72%', y: '60%', size: 7 },
        { x: '82%', y: '45%', size: 5 },
        { x: '28%', y: '68%', size: 4 },
      ].map((pt, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: pt.x as any,
            top: pt.y as any,
            width: pt.size,
            height: pt.size,
            borderRadius: pt.size / 2,
            backgroundColor: '#A8FFB2',
            shadowColor: '#34C759',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 8,
            elevation: 4,
            opacity: fireflyOpacity,
            transform: [{ translateY: fireflyTranslateY }],
          }}
        />
      ))}
    </View>
  );
}

// ==========================================
// 4. RAIN & RELAXATION SCENE
// ==========================================
function RainRelaxationScene({ isPlaying, width, height }: { isPlaying: boolean; width: number; height: number }) {
  const rainFall = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      const rain = Animated.loop(
        Animated.timing(rainFall, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      const ripples = Animated.loop(
        Animated.timing(rippleScale, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );

      rain.start();
      ripples.start();
    } else {
      rainFall.stopAnimation();
      rippleScale.stopAnimation();
    }

    return () => {
      rainFall.stopAnimation();
      rippleScale.stopAnimation();
    };
  }, [isPlaying]);

  const rainTranslateY = rainFall.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, height + 60],
  });

  const rippleSize = rippleScale.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.8],
  });

  const rippleOpacity = rippleScale.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.75, 0.35, 0],
  });

  // Raindrop column positions
  const dropColumns = [
    { left: '10%', len: 26, op: 0.5 },
    { left: '22%', len: 34, op: 0.7 },
    { left: '35%', len: 22, op: 0.4 },
    { left: '48%', len: 38, op: 0.8 },
    { left: '60%', len: 28, op: 0.6 },
    { left: '74%', len: 32, op: 0.7 },
    { left: '88%', len: 24, op: 0.5 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {/* Falling Rain Streaks */}
      {dropColumns.map((col, idx) => (
        <Animated.View
          key={idx}
          style={{
            position: 'absolute',
            left: col.left as any,
            top: 0,
            width: 1.5,
            height: col.len,
            borderRadius: 1,
            backgroundColor: 'rgba(180, 215, 255, 0.8)',
            opacity: col.op,
            transform: [
              { translateY: rainTranslateY },
              { rotate: '-6deg' },
            ],
          }}
        />
      ))}

      {/* Concentric Puddle Water Ripples at Bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 70,
          left: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: 90,
            height: 38,
            borderRadius: 45,
            borderWidth: 1.5,
            borderColor: 'rgba(180, 215, 255, 0.65)',
            opacity: rippleOpacity,
            transform: [{ scale: rippleSize }],
          }}
        />
      </View>
    </View>
  );
}

// ==========================================
// 5. COSMIC MEDITATION SCENE
// ==========================================
function CosmicMeditationScene({ isPlaying, width, height }: { isPlaying: boolean; width: number; height: number }) {
  const galaxyRotate = useRef(new Animated.Value(0)).current;
  const starTwinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      const rotate = Animated.loop(
        Animated.timing(galaxyRotate, {
          toValue: 1,
          duration: 38000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      const twinkle = Animated.loop(
        Animated.sequence([
          Animated.timing(starTwinkle, {
            toValue: 1,
            duration: 2400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(starTwinkle, {
            toValue: 0,
            duration: 2400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      rotate.start();
      twinkle.start();
    } else {
      galaxyRotate.stopAnimation();
      starTwinkle.stopAnimation();
    }

    return () => {
      galaxyRotate.stopAnimation();
      starTwinkle.stopAnimation();
    };
  }, [isPlaying]);

  const spin = galaxyRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const starOpacity = starTwinkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.95],
  });

  const galaxySize = Math.min(width * 0.78, 300);

  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { overflow: 'hidden' }]}>
      {/* Deep Space Dust / Stars */}
      {[
        { x: '12%', y: '15%', size: 2.5 },
        { x: '24%', y: '32%', size: 3.5 },
        { x: '38%', y: '18%', size: 2 },
        { x: '68%', y: '22%', size: 3 },
        { x: '82%', y: '36%', size: 4 },
        { x: '16%', y: '72%', size: 3 },
        { x: '32%', y: '84%', size: 2.5 },
        { x: '62%', y: '76%', size: 3.5 },
        { x: '78%', y: '82%', size: 2 },
      ].map((star, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: star.x as any,
            top: star.y as any,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: '#FFFFFF',
            opacity: starOpacity,
          }}
        />
      ))}

      {/* Rotating Spiral Galaxy & Nebula Rings */}
      <Animated.View
        style={{
          width: galaxySize,
          height: galaxySize,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: spin }],
        }}
      >
        <Svg width={galaxySize} height={galaxySize} viewBox="0 0 200 200">
          {/* Nebula Arm 1 */}
          <Ellipse
            cx="100"
            cy="100"
            rx="85"
            ry="38"
            stroke="rgba(175, 82, 222, 0.45)"
            strokeWidth="8"
            fill="none"
            transform="rotate(-28 100 100)"
          />
          {/* Nebula Arm 2 */}
          <Ellipse
            cx="100"
            cy="100"
            rx="75"
            ry="28"
            stroke="rgba(90, 200, 250, 0.4)"
            strokeWidth="6"
            fill="none"
            transform="rotate(38 100 100)"
          />
          {/* Central Bright Stellar Core */}
          <Circle cx="100" cy="100" r="16" fill="rgba(255, 255, 255, 0.85)" />
          <Circle cx="100" cy="100" r="28" fill="rgba(175, 82, 222, 0.35)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ==========================================
// 6. ZEN GARDEN SCENE
// ==========================================
function ZenGardenScene({ isPlaying, width, height }: { isPlaying: boolean; width: number; height: number }) {
  const sandRipple = useRef(new Animated.Value(0)).current;
  const petalDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      const ripples = Animated.loop(
        Animated.sequence([
          Animated.timing(sandRipple, {
            toValue: 1,
            duration: 5500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(sandRipple, {
            toValue: 0,
            duration: 5500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      const drift = Animated.loop(
        Animated.timing(petalDrift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      ripples.start();
      drift.start();
    } else {
      sandRipple.stopAnimation();
      petalDrift.stopAnimation();
    }

    return () => {
      sandRipple.stopAnimation();
      petalDrift.stopAnimation();
    };
  }, [isPlaying]);

  const rippleScale1 = sandRipple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1.08],
  });
  const rippleScale2 = sandRipple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.15],
  });

  const petalX = petalDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, width + 40],
  });
  const petalY = petalDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  const stoneSize = Math.min(width * 0.28, 100);

  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { overflow: 'hidden' }]}>
      {/* Concentric Raked Sand Ripple Rings */}
      <Animated.View
        style={{
          position: 'absolute',
          width: stoneSize * 2.8,
          height: stoneSize * 1.9,
          borderRadius: (stoneSize * 2.8) / 2,
          borderWidth: 1.5,
          borderColor: 'rgba(255, 149, 0, 0.35)',
          transform: [{ scale: rippleScale2 }],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: stoneSize * 2.1,
          height: stoneSize * 1.45,
          borderRadius: (stoneSize * 2.1) / 2,
          borderWidth: 1.8,
          borderColor: 'rgba(255, 149, 0, 0.5)',
          transform: [{ scale: rippleScale1 }],
        }}
      />

      {/* Smooth Zen River Stones */}
      <View
        style={{
          width: stoneSize,
          height: stoneSize * 0.72,
          borderRadius: stoneSize / 2,
          backgroundColor: '#2A2016',
          borderWidth: 2,
          borderColor: '#4A3B2A',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#FF9500',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 14,
          elevation: 6,
        }}
      >
        {/* Smaller Top Stacking Stone */}
        <View
          style={{
            width: stoneSize * 0.58,
            height: stoneSize * 0.42,
            borderRadius: (stoneSize * 0.58) / 2,
            backgroundColor: '#3E3022',
            borderWidth: 1.5,
            borderColor: '#5D4A36',
          }}
        />
      </View>

      {/* Drifting Petals */}
      {[
        { top: '30%', delay: 0 },
        { top: '55%', delay: 3000 },
        { top: '72%', delay: 6000 },
      ].map((p, idx) => (
        <Animated.View
          key={idx}
          style={{
            position: 'absolute',
            top: p.top as any,
            width: 12,
            height: 7,
            borderRadius: 6,
            backgroundColor: '#FFA3B8',
            opacity: 0.75,
            transform: [
              { translateX: petalX },
              { translateY: petalY },
              { rotate: '35deg' },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ==========================================
// 7. PURE COSMIC WAVES SCENE
// Recreated from user's video: Meditating lotus figure with
// blazing golden heart chakra, breathing nebula & ascending stardust
// ==========================================
const COSMIC_STARS = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  x: ((i * 73 + 19) % 100),
  y: ((i * 47 + 13) % 100),
  size: (i % 3 === 0 ? 2.5 : i % 2 === 0 ? 1.8 : 1.2),
  opacity: 0.35 + ((i * 17) % 55) / 100,
  isCyan: i % 4 === 0,
}));

const COSMIC_EMBERS = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  startX: 15 + ((i * 37) % 70),
  startY: 55 + ((i * 23) % 40),
  size: 1.5 + (i % 4) * 0.8,
  speed: 4000 + (i % 5) * 1200,
  delay: (i * 350) % 5000,
  swayAmp: 10 + (i % 3) * 8,
  isGold: i % 3 !== 0,
}));

function PureCosmicWavesScene({ isPlaying, width, height }: { isPlaying: boolean; width: number; height: number }) {
  // Breathing animation synchronized with 4s inhale, 2s hold, 6s exhale
  const breathAnim = useRef(new Animated.Value(1)).current;
  const nebulaGlow = useRef(new Animated.Value(0.7)).current;
  const starRotation = useRef(new Animated.Value(0)).current;

  // Expanding coronal wave pulses
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;

  // Floating stardust embers
  const embersAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) return;

    // 1. Synchronized breath cycle (4s inhale -> 2s hold -> 6s exhale)
    const breathLoop = Animated.loop(
      Animated.sequence([
        // Inhale 4s (Expansion)
        Animated.parallel([
          Animated.timing(breathAnim, {
            toValue: 1.35,
            duration: 4000,
            easing: Easing.bezier(0.42, 0.0, 0.58, 1.0),
            useNativeDriver: true,
          }),
          Animated.timing(nebulaGlow, {
            toValue: 1.0,
            duration: 4000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
        // Hold 2s
        Animated.delay(2000),
        // Exhale 6s (Gentle contraction)
        Animated.parallel([
          Animated.timing(breathAnim, {
            toValue: 1.0,
            duration: 6000,
            easing: Easing.bezier(0.42, 0.0, 0.58, 1.0),
            useNativeDriver: true,
          }),
          Animated.timing(nebulaGlow, {
            toValue: 0.7,
            duration: 6000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 2. Continuous cosmic rotation of heart star rays
    const rotLoop = Animated.loop(
      Animated.timing(starRotation, {
        toValue: 1,
        duration: 48000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 3. Expanding cosmic wave pulses
    const wave1Loop = Animated.loop(
      Animated.timing(wave1Anim, {
        toValue: 1,
        duration: 4500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );

    const wave2Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2250),
        Animated.timing(wave2Anim, {
          toValue: 1,
          duration: 4500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 4. Stardust floating cycle
    const embersLoop = Animated.loop(
      Animated.timing(embersAnim, {
        toValue: 1,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    breathLoop.start();
    rotLoop.start();
    wave1Loop.start();
    wave2Loop.start();
    embersLoop.start();

    return () => {
      breathLoop.stop();
      rotLoop.stop();
      wave1Loop.stop();
      wave2Loop.stop();
      embersLoop.stop();
    };
  }, [breathAnim, embersAnim, isPlaying, nebulaGlow, starRotation, wave1Anim, wave2Anim]);

  const spin = starRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const wave1Scale = wave1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 2.4],
  });

  const wave1Opacity = wave1Anim.interpolate({
    inputRange: [0, 0.25, 0.75, 1],
    outputRange: [0, 0.85, 0.45, 0],
  });

  const wave2Scale = wave2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 2.4],
  });

  const wave2Opacity = wave2Anim.interpolate({
    inputRange: [0, 0.25, 0.75, 1],
    outputRange: [0, 0.85, 0.45, 0],
  });

  // Responsive scale factor for viewBox 0 0 500 500
  const scale = Math.min(width / 500, height / 500) * 1.05;

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: '#030814',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* 1. Deep Space Cosmic Void & Stars Background */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="cosmicBgGrad" cx="50%" cy="50%" rx="60%" ry="60%">
            <Stop offset="0%" stopColor="#0B263B" stopOpacity="0.75" />
            <Stop offset="45%" stopColor="#061726" stopOpacity="0.85" />
            <Stop offset="80%" stopColor="#030A14" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#01040A" stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#cosmicBgGrad)" />

        {/* Scattered background starfield */}
        {COSMIC_STARS.map((star) => (
          <Circle
            key={star.id}
            cx={`${star.x}%`}
            cy={`${star.y}%`}
            r={star.size}
            fill={star.isCyan ? '#8EE7FF' : '#FFF9E6'}
            opacity={star.opacity}
          />
        ))}
      </Svg>

      {/* 2. Floating Ascending Stardust Particles */}
      {COSMIC_EMBERS.map((ember) => {
        const emberTranslateY = embersAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -height * 0.7],
        });
        const emberOpacity = embersAnim.interpolate({
          inputRange: [0, 0.2, 0.65, 1],
          outputRange: [0, 0.9, 0.7, 0],
        });
        const emberSway = embersAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-ember.swayAmp, ember.swayAmp, -ember.swayAmp],
        });

        return (
          <Animated.View
            key={ember.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${ember.startX}%`,
              top: `${ember.startY}%`,
              width: ember.size * 2,
              height: ember.size * 2,
              borderRadius: ember.size,
              backgroundColor: ember.isGold ? '#FFD54F' : '#80DEEA',
              opacity: emberOpacity,
              transform: [
                { translateY: emberTranslateY },
                { translateX: emberSway },
              ],
            }}
          />
        );
      })}

      {/* 3. Center Meditator & Heart Star Composition */}
      <View
        style={{
          width: 500,
          height: 500,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        <Svg width={500} height={500} viewBox="0 0 500 500">
          <Defs>
            {/* Fiery Golden Nebula Behind Meditator */}
            <RadialGradient id="nebulaCore" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FFE082" stopOpacity="0.95" />
              <Stop offset="25%" stopColor="#FFA000" stopOpacity="0.8" />
              <Stop offset="55%" stopColor="#FF6F00" stopOpacity="0.55" />
              <Stop offset="80%" stopColor="#D84315" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#BF360C" stopOpacity="0" />
            </RadialGradient>

            {/* Heart Starburst Core Gradient */}
            <RadialGradient id="heartCoreGrad" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="25%" stopColor="#FFF9C4" stopOpacity="1" />
              <Stop offset="60%" stopColor="#FFD54F" stopOpacity="0.9" />
              <Stop offset="85%" stopColor="#FFA000" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#FF6F00" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Golden Cosmic Nebula Cloud (Behind Body) */}
          <G>
            <Ellipse
              cx={250}
              cy={240}
              rx={180}
              ry={110}
              fill="url(#nebulaCore)"
              opacity={0.8}
            />
            <Ellipse
              cx={250}
              cy={235}
              rx={125}
              ry={75}
              fill="url(#nebulaCore)"
              opacity={0.9}
            />
          </G>

          {/* Meditator Silhouette Aura (Golden Rim Lighting) */}
          <G opacity={0.9}>
            {/* Soft outer amber rim aura */}
            <Path
              d={LOTUS_MEDITATOR_PATH}
              fill="none"
              stroke="#FFA000"
              strokeWidth={8}
              strokeOpacity={0.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Sharp inner golden rim contour */}
            <Path
              d={LOTUS_MEDITATOR_PATH}
              fill="none"
              stroke="#FFE082"
              strokeWidth={3.5}
              strokeOpacity={0.85}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>

          {/* Meditator Body Silhouette (Dark Obsidian Void) */}
          <Path
            d={LOTUS_MEDITATOR_PATH}
            fill="#050B12"
          />
        </Svg>

        {/* 4. Pulsing Coronal Light Waves from Heart Center */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 250 - 75,
            top: 245 - 75,
            width: 150,
            height: 150,
            borderRadius: 75,
            borderWidth: 2,
            borderColor: '#FFD54F',
            opacity: wave1Opacity,
            transform: [{ scale: wave1Scale }],
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 250 - 75,
            top: 245 - 75,
            width: 150,
            height: 150,
            borderRadius: 75,
            borderWidth: 1.5,
            borderColor: '#FFECB3',
            opacity: wave2Opacity,
            transform: [{ scale: wave2Scale }],
          }}
        />

        {/* 5. Breathing Heart Chakra Radiant Starburst (Chest Center cx=250, cy=245) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 250 - 100,
            top: 245 - 100,
            width: 200,
            height: 200,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [
              { scale: breathAnim },
              { rotate: spin },
            ],
          }}
        >
          <Svg width={200} height={200} viewBox="0 0 200 200">
            {/* Radial Core Glow */}
            <Circle cx={100} cy={100} r={45} fill="url(#heartCoreGrad)" />
            <Circle cx={100} cy={100} r={20} fill="#FFE082" opacity={0.85} />
            <Circle cx={100} cy={100} r={9} fill="#FFFFFF" />

            {/* Primary Diamond Star Rays (Vertical & Horizontal) */}
            {/* Vertical primary spike */}
            <Path
              d="M 100,10 L 103.5,100 L 100,190 L 96.5,100 Z"
              fill="#FFFFFF"
              opacity={0.9}
            />
            {/* Horizontal primary spike */}
            <Path
              d="M 10,100 L 100,103.5 L 190,100 L 100,96.5 Z"
              fill="#FFFFFF"
              opacity={0.9}
            />

            {/* Secondary Golden Flare Spikes */}
            <Path
              d="M 100,25 L 102.5,100 L 100,175 L 97.5,100 Z"
              fill="#FFD54F"
              opacity={0.75}
            />
            <Path
              d="M 25,100 L 100,102.5 L 175,100 L 100,97.5 Z"
              fill="#FFD54F"
              opacity={0.75}
            />

            {/* Diagonal Star Rays (45 deg) */}
            <Path
              d="M 35,35 L 102,100 L 165,165 L 100,102 Z"
              fill="#FFF9C4"
              opacity={0.65}
            />
            <Path
              d="M 165,35 L 102,100 L 35,165 L 100,98 Z"
              fill="#FFF9C4"
              opacity={0.65}
            />

            {/* Concentric diamond facets */}
            <Path
              d="M 100,72 L 128,100 L 100,128 L 72,100 Z"
              fill="#FFE082"
              opacity={0.4}
            />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

// Precision SVG Path for Meditating Yogi in Full Lotus (Padmasana) with Gyan Mudra
// Coordinate space: 0 0 500 500
const LOTUS_MEDITATOR_PATH = `
  M 250,118
  C 255,115 258,118 259,124
  C 264,124 266,128 266,134
  C 275,142 276,158 274,168
  C 272,176 266,183 261,188
  C 259,193 258,198 259,204
  C 272,207 296,215 315,224
  C 328,230 338,242 344,258
  C 351,277 353,298 356,318
  C 358,335 362,352 368,368
  C 374,379 383,388 396,394
  C 405,398 414,403 418,410
  C 422,417 419,425 410,429
  C 398,434 380,432 366,428
  C 345,422 324,417 302,415
  C 285,413 268,416 250,417
  C 232,416 215,413 198,415
  C 176,417 155,422 134,428
  C 120,432 102,434 90,429
  C 81,425 78,417 82,410
  C 86,403 95,398 104,394
  C 117,388 126,379 132,368
  C 138,352 142,335 144,318
  C 147,298 149,277 156,258
  C 162,242 172,230 185,224
  C 204,215 228,207 241,204
  C 242,198 241,193 239,188
  C 234,183 228,176 226,168
  C 224,158 225,142 234,134
  C 234,128 236,124 241,124
  C 242,118 245,115 250,118
  Z
`;

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
