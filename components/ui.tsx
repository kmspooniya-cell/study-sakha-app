import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { fonts, radii, shadow, spacing, typography, useTheme } from '../lib/theme';

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
          backgroundColor: colors.surfaceRaised,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          padding: padded ? spacing.card : 0,
          ...shadow(colors, level),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Shared Stitch-inspired surface for content sections. */
export function StitchCard({
  children,
  style,
  padded = true,
  level = 1,
  tone = 'raised',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  level?: 1 | 2 | 3;
  tone?: 'raised' | 'soft' | 'glass';
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'soft' ? colors.surfaceSubtle : colors.surfaceRaised,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: tone === 'glass' ? colors.borderStrong : colors.borderSubtle,
          padding: padded ? spacing.card : 0,
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
  size,
  weight,
  color,
  style,
  numberOfLines,
  display,
  variant,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  display?: boolean;
  variant?: keyof typeof typography;
}) {
  const { colors, f } = useTheme();
  const role = variant ? typography[variant] : undefined;
  const resolvedSize = size ?? role?.fontSize ?? 14;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: display || role?.fontFamily === fonts.display ? fonts.display : fonts.body,
          fontSize: f(resolvedSize),
          fontWeight: weight ?? role?.fontWeight ?? '500',
          color: color ?? colors.textPrimary,
          lineHeight: f(role?.lineHeight ?? Math.round(resolvedSize * 1.4)),
          letterSpacing: role?.letterSpacing ?? -0.15,
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
  accessibilityLabel,
  accessibilityHint,
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
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { colors, f } = useTheme();
  const h = size === 'sm' ? 38 : size === 'lg' ? 50 : 44;
  const fs = size === 'sm' ? 13 : size === 'lg' ? 15.5 : 14;
  const base: ViewStyle = {
    height: h,
    borderRadius: radii.control,
    paddingHorizontal: size === 'sm' ? 14 : size === 'lg' ? 22 : 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: full ? 'stretch' : 'flex-start',
    opacity: disabled ? 0.45 : 1,
  };

  const fg =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'soft'
      ? colors.blue
      : variant === 'ghost'
      ? colors.blue
      : colors.textPrimary;

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={f(fs) + 2} color={fg} />
      ) : null}
      <Text style={{ fontFamily: fonts.body, fontWeight: '700', fontSize: f(fs), color: fg, letterSpacing: -0.2 }}>
        {label}
      </Text>
    </>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        disabled={disabled || loading}
        onPress={onPress}
        style={({ pressed }) => [
          base,
          {
            backgroundColor: colors.blue,
            opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
            ...shadow(colors, 1),
          },
          style,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  const bg =
    variant === 'soft'
      ? colors.tint
      : variant === 'danger'
      ? colors.danger
      : variant === 'outline'
      ? colors.surfaceRaised
      : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        {
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.borderSubtle,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...(variant === 'outline' || variant === 'danger' ? shadow(colors, 1) : {}),
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
  disabled,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: string;
  disabled?: boolean;
}) {
  const { colors, f } = useTheme();
  const activeColor = tone ?? colors.dark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        height: 36,
        borderRadius: 18,
        backgroundColor: active ? activeColor : colors.surfaceRaised,
        borderWidth: 1,
        borderColor: active ? activeColor : colors.borderSubtle,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        ...(active ? shadow(colors, 1) : {}),
      })}
    >
      {icon ? <Ionicons name={icon} size={f(13)} color={active ? colors.surface : colors.textMuted} /> : null}
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: f(13),
          fontWeight: active ? '700' : '600',
          color: active ? colors.surface : colors.textPrimary,
          letterSpacing: -0.1,
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
    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: `${c}18` }}>
      <Text style={{ fontFamily: fonts.body, fontSize: f(11), fontWeight: '700', color: c, letterSpacing: 0.1 }}>
        {label}
      </Text>
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
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        {icon ? <Ionicons name={icon} size={f(17)} color={colors.blue} /> : null}
        <Txt size={16} weight="700" display style={{ letterSpacing: -0.2 }}>
          {title}
        </Txt>
      </View>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => ({
            minHeight: 36,
            opacity: pressed ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingVertical: 4,
            paddingHorizontal: 6,
          })}
        >
          <Text style={{ fontFamily: fonts.body, fontSize: f(13), fontWeight: '600', color: colors.blue }}>
            {action}
          </Text>
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
  compact,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? 24 : 40, paddingHorizontal: 20 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        <Ionicons name={icon} size={28} color={colors.blue} />
      </View>
      <Txt size={16} weight="700" display style={{ marginBottom: 6, textAlign: 'center', letterSpacing: -0.2 }}>
        {title}
      </Txt>
      <Txt size={13} color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 320, lineHeight: 18 }}>
        {body}
      </Txt>
      {action && onAction ? (
        <Button label={action} onPress={onAction} variant="soft" size="sm" style={{ marginTop: 16 }} />
      ) : null}
    </View>
  );
}

export function Skeleton({ height = 80, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View accessible accessibilityRole="progressbar" style={[{ height, borderRadius: radii.md, backgroundColor: colors.surfaceSubtle }, style]} />;
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
            <Stop offset="1" stopColor={to ?? colors.brandSecondary} />
          </SvgGrad>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? colors.surfaceSubtle} strokeWidth={stroke} fill="none" />
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

export function ProgressBar({ value, color, height = 6, accessibilityLabel }: { value: number; color?: string; height?: number; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: 100, now: clamped }} style={{ height, borderRadius: height / 2, backgroundColor: colors.surfaceSubtle, overflow: 'hidden' }}>
      <View style={{ width: `${clamped === 0 ? 0 : Math.max(2, clamped)}%`, height, borderRadius: height / 2, backgroundColor: color ?? colors.blue }} />
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
  error,
  helper,
  disabled,
  accessibilityLabel,
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
  error?: string;
  helper?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors, f } = useTheme();
  const [focus, setFocus] = React.useState(false);
  const [hide, setHide] = React.useState(!!secure);
  return (
    <View style={style}>
      {label ? (
        <Txt size={13} weight="600" color={colors.textSecondary} style={{ marginBottom: 6 }}>
          {label}
        </Txt>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 10,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: error ? colors.danger : focus ? colors.blue : colors.borderSubtle,
          borderRadius: radii.control,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          minHeight: minHeight ?? (multiline ? 120 : 46),
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
          editable={!disabled}
          accessibilityLabel={accessibilityLabel ?? label}
          selectionColor={colors.blue}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            fontFamily: fonts.body,
            fontSize: f(14),
            color: colors.text,
            paddingVertical: multiline ? 0 : 10,
            textAlignVertical: multiline ? 'top' : 'center',
            minHeight: multiline ? 90 : undefined,
            outlineStyle: 'none',
          } as any}
        />
        {secure ? (
          <Pressable onPress={() => setHide((h) => !h)} hitSlop={10}>
            <Ionicons name={hide ? 'eye-outline' : 'eye-off-outline'} size={f(18)} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>
      {error || helper ? <Txt variant="caption" color={error ? colors.danger : colors.textSecondary} style={{ marginTop: 5 }}>{error ?? helper}</Txt> : null}
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
      colors={[colors.orange, colors.red]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', ...shadow(colors, 1) }}
    >
      <Text style={{ fontFamily: fonts.body, fontSize: f(size * 0.38), fontWeight: '700', color: '#fff' }}>{initials}</Text>
    </LinearGradient>
  );
}

export function IconButton({
  icon,
  onPress,
  badge,
  color,
  size = 20,
  disabled,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  badge?: number;
  color?: string;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surfaceInteractive : 'transparent',
        opacity: disabled ? 0.45 : 1,
      })}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.textSecondary} />
      {badge && badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 5,
            right: 5,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 4,
            borderRadius: 8,
            backgroundColor: colors.danger,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: colors.surface,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '700', fontFamily: fonts.body }}>{badge > 9 ? '9+' : badge}</Text>
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
          ? { width: 1, alignSelf: 'stretch', backgroundColor: colors.borderSubtle }
          : { height: 1, alignSelf: 'stretch', backgroundColor: colors.borderSubtle }
      }
    />
  );
}

export function PressableCard({
  children,
  onPress,
  style,
  padded = true,
  level = 1,
  disabled,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  level?: 1 | 2 | 3;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const content = <View style={{ padding: padded ? spacing.card : 0 }}>{children}</View>;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surfaceRaised,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...shadow(colors, level),
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function StatCard({ label, value, description, icon, color, onPress, style }: {
  label: string;
  value: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, f } = useTheme();
  const accent = color ?? colors.blue;
  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: f(12), fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {label}
        </Text>
        {icon ? (
          <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: `${accent}18` }}>
            <Ionicons name={icon} size={f(16)} color={accent} />
          </View>
        ) : null}
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: f(24), lineHeight: f(29), fontWeight: '800', color: colors.textPrimary, marginTop: 8, letterSpacing: -0.4 }}>
        {value}
      </Text>
      {description ? (
        <Text style={{ fontFamily: fonts.body, fontSize: f(12), color: colors.textSecondary, marginTop: 4 }}>
          {description}
        </Text>
      ) : null}
    </>
  );
  return onPress ? <PressableCard onPress={onPress} style={style}>{content}</PressableCard> : <Card style={style}>{content}</Card>;
}

export function ListRow({ title, subtitle, leading, trailing, onPress, disabled, divider, style }: {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const content = (
    <View style={[{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.borderSubtle }, style]}>
      {leading}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt numberOfLines={1} size={14} weight="700" style={{ letterSpacing: -0.15 }}>{title}</Txt>
        {subtitle ? <Txt numberOfLines={2} size={12} color={colors.textSecondary}>{subtitle}</Txt> : null}
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.75 : 1 })}>
      {content}
    </Pressable>
  ) : content;
}

export function FilterBar({ options, value, onChange, scrollable = false, style }: {
  options: Array<{ label: string; value: string; disabled?: boolean }>;
  value: string;
  onChange: (value: string) => void;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const content = options.map((option) => <Chip key={option.value} label={option.label} active={option.value === value} disabled={option.disabled} onPress={() => onChange(option.value)} />);
  return scrollable ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 8, paddingVertical: 4 }, style]}>{content}</ScrollView> : <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{content}</View>;
}

export function ModalSheet({ visible, onClose, title, children, actions, style }: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ flex: 1 }} />
        <View style={[{ maxHeight: '88%', backgroundColor: colors.surfaceRaised, borderTopLeftRadius: radii.dialog, borderTopRightRadius: radii.dialog, padding: spacing.card, ...shadow(colors, 3) }, style]}>
          <View style={{ width: 38, height: 4.5, borderRadius: 2.5, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            {title ? <Txt size={17} weight="700" display>{title}</Txt> : <View />}
            <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
          {actions ? <View style={{ marginTop: 16 }}>{actions}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel }: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return <ModalSheet visible={visible} onClose={onCancel} title={title} actions={<View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}><Button label={cancelLabel} variant="ghost" onPress={onCancel} /><Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} /></View>}><Txt variant="body" color={colors.textSecondary}>{message}</Txt></ModalSheet>;
}

export function InlineBanner({ tone = 'info', title, body, action, onAction }: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const toneColor = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : colors.info;
  return <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: `${toneColor}18`, borderWidth: 1, borderColor: `${toneColor}55` }}><Ionicons name={tone === 'danger' ? 'alert-circle-outline' : 'information-circle-outline'} size={20} color={toneColor} /><View style={{ flex: 1 }}>{title ? <Txt variant="cardTitle" color={toneColor}>{title}</Txt> : null}<Txt variant="supporting" color={colors.textPrimary}>{body}</Txt>{action ? <Button label={action} variant="ghost" size="sm" onPress={onAction} style={{ marginTop: spacing.xs }} /> : null}</View></View>;
}

export function AsyncState({ loading, error, empty, onRetry, emptyTitle = 'Nothing here yet', emptyBody = 'There is no data to display.' , children }: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyBody?: string;
  children: React.ReactNode;
}) {
  if (loading) return <View accessible accessibilityRole="progressbar" style={{ minHeight: 100, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (error) return <InlineBanner tone="danger" body={error} action={onRetry ? 'Retry' : undefined} onAction={onRetry} />;
  if (empty) return <EmptyState compact title={emptyTitle} body={emptyBody} />;
  return <>{children}</>;
}
