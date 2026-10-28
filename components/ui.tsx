import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { fonts, radii, shadow, useTheme } from '../lib/theme';

export function Card({
  children,
  style,
  padded = true,
  level = 1,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  level?: 1 | 2 | 3;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padded ? 16 : 0,
          ...shadow(colors, level),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Txt({
  children,
  size = 14,
  weight = '500',
  color,
  style,
  numberOfLines,
  display,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  display?: boolean;
}) {
  const { colors, f } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: display ? fonts.display : fonts.body,
          fontSize: f(size),
          fontWeight: weight,
          color: color ?? colors.text,
          lineHeight: f(size) * 1.45,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'md',
  style,
  loading,
  disabled,
  full,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'soft' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
}) {
  const { colors, f } = useTheme();
  const h = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const fs = size === 'sm' ? 13 : size === 'lg' ? 16 : 14.5;
  const base: ViewStyle = {
    height: h,
    borderRadius: radii.md,
    paddingHorizontal: size === 'sm' ? 12 : 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: full ? 'stretch' : 'flex-start',
    opacity: disabled ? 0.5 : 1,
  };
  const fg =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'soft'
      ? colors.blue
      : colors.text;

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={f(fs) + 3} color={fg} />
      ) : null}
      <Text style={{ fontFamily: fonts.body, fontWeight: '700', fontSize: f(fs), color: fg }}>{label}</Text>
    </>
  );

  if (variant === 'primary') {
    return (
      <Pressable onPress={disabled || loading ? undefined : onPress} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1, alignSelf: full ? 'stretch' : 'flex-start' }, style]}>
        <LinearGradient colors={[colors.blue, colors.navy]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[base, shadow(colors, 1)]}>
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  const bg =
    variant === 'soft' ? colors.tint : variant === 'danger' ? colors.danger : variant === 'outline' ? 'transparent' : 'transparent';

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        base,
        {
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {inner}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  icon,
  tone,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: string;
}) {
  const { colors, f } = useTheme();
  const accent = tone ?? colors.blue;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        height: 34,
        borderRadius: radii.pill,
        backgroundColor: active ? accent : colors.surface,
        borderWidth: 1,
        borderColor: active ? accent : colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={f(13)} color={active ? '#fff' : colors.textMuted} /> : null}
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: f(12.5),
          fontWeight: '600',
          color: active ? '#fff' : colors.textMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Tag({ label, color }: { label: string; color?: string }) {
  const { colors, f } = useTheme();
  const c = color ?? colors.blue;
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: `${c}1A` }}>
      <Text style={{ fontFamily: fonts.body, fontSize: f(11), fontWeight: '700', color: c }}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  icon,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors, f } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <Ionicons name={icon} size={f(17)} color={colors.blue} /> : null}
        <Text style={{ fontFamily: fonts.display, fontSize: f(17), fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
          {title}
        </Text>
      </View>
      {action ? (
        <Pressable onPress={onAction} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', gap: 3 })}>
          <Text style={{ fontFamily: fonts.body, fontSize: f(13), fontWeight: '700', color: colors.blue }}>{action}</Text>
          <Ionicons name="chevron-forward" size={f(14)} color={colors.blue} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
  action,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={32} color={colors.blue} />
      </View>
      <Txt size={16} weight="800" display style={{ marginBottom: 6, textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt size={13.5} color={colors.textMuted} style={{ textAlign: 'center', maxWidth: 340 }}>
        {body}
      </Txt>
      {action ? <Button label={action} onPress={onAction} variant="soft" style={{ marginTop: 18 }} /> : null}
    </View>
  );
}

export function Skeleton({ height = 80, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height, borderRadius: radii.md, backgroundColor: colors.surfaceAlt }, style]} />;
}

export function ProgressRing({
  size = 120,
  stroke = 12,
  progress,
  track,
  from,
  to,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  track?: string;
  from?: string;
  to?: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGrad id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from ?? colors.teal} />
            <Stop offset="1" stopColor={to ?? '#8FE9DD'} />
          </SvgGrad>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? 'rgba(255,255,255,0.22)'} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c * clamped} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  );
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(2, Math.min(100, value))}%`, height, borderRadius: height, backgroundColor: color ?? colors.blue }} />
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  icon,
  multiline,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
  style,
  minHeight,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  icon?: keyof typeof Ionicons.glyphMap;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  returnKeyType?: 'done' | 'next' | 'go' | 'search';
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
  minHeight?: number;
}) {
  const { colors, f } = useTheme();
  const [focus, setFocus] = React.useState(false);
  const [hide, setHide] = React.useState(!!secure);
  return (
    <View style={style}>
      {label ? (
        <Txt size={12.5} weight="700" color={colors.textMuted} style={{ marginBottom: 7 }}>
          {label}
        </Txt>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 10,
          backgroundColor: colors.surface,
          borderWidth: 1.4,
          borderColor: focus ? colors.blue : colors.border,
          borderRadius: radii.md,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          minHeight: minHeight ?? (multiline ? 140 : 48),
        }}
      >
        {icon ? <Ionicons name={icon} size={f(17)} color={focus ? colors.blue : colors.textFaint} style={{ marginTop: multiline ? 2 : 0 }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hide}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? (keyboardType === 'email-address' ? 'none' : 'sentences')}
          autoCorrect={false}
          multiline={multiline}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            fontFamily: fonts.body,
            fontSize: f(14.5),
            color: colors.text,
            paddingVertical: multiline ? 0 : 12,
            textAlignVertical: multiline ? 'top' : 'center',
            minHeight: multiline ? 110 : undefined,
            outlineStyle: 'none',
          } as any}
        />
        {secure ? (
          <Pressable onPress={() => setHide((h) => !h)} hitSlop={10}>
            <Ionicons name={hide ? 'eye-outline' : 'eye-off-outline'} size={f(18)} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const { colors, f } = useTheme();
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <LinearGradient
      colors={[colors.teal, colors.blue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: f(size * 0.36), fontWeight: '800', color: '#fff' }}>{initials}</Text>
    </LinearGradient>
  );
}

export function IconButton({
  icon,
  onPress,
  badge,
  color,
  size = 20,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  badge?: number;
  color?: string;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
      })}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.textMuted} />
      {badge && badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 3,
            borderRadius: 8,
            backgroundColor: colors.danger,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: fonts.body }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Divider({ vertical }: { vertical?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: colors.border }
          : { height: 1, alignSelf: 'stretch', backgroundColor: colors.border }
      }
    />
  );
}
