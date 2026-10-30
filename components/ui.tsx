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
          lineHeight: f(role?.lineHeight ?? resolvedSize * 1.45),
          letterSpacing: role?.letterSpacing,
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
  const h = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const fs = size === 'sm' ? 13 : size === 'lg' ? 16 : 14.5;
  const base: ViewStyle = {
    height: h,
    borderRadius: radii.control,
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
      : colors.textPrimary;

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
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityHint={accessibilityHint} accessibilityState={{ disabled: !!disabled, busy: !!loading }} onPress={disabled || loading ? undefined : onPress} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1, alignSelf: full ? 'stretch' : 'flex-start' }, style]}>
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
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
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
  const accent = tone ?? colors.blue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        height: 34,
        borderRadius: radii.pill,
        backgroundColor: active ? accent : colors.surfaceRaised,
        borderWidth: 1,
        borderColor: active ? accent : colors.borderSubtle,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
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
        {icon ? <Ionicons name={icon} size={f(17)} color={colors.brandPrimary} /> : null}
        <Txt variant="sectionTitle" display>
          {title}
        </Txt>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => ({ minHeight: 36, opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', gap: 3 })}>
          <Txt variant="label" color={colors.brandPrimary}>{action}</Txt>
          <Ionicons name="chevron-forward" size={f(14)} color={colors.brandPrimary} />
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
    <View style={{ alignItems: 'center', paddingVertical: compact ? 24 : 48, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.selectedSurface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={32} color={colors.info} />
      </View>
      <Txt size={16} weight="800" display style={{ marginBottom: 6, textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt variant="supporting" color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 340 }}>
        {body}
      </Txt>
      {action ? <Button label={action} onPress={onAction} variant="soft" style={{ marginTop: 18 }} /> : null}
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

export function ProgressBar({ value, color, height = 8, accessibilityLabel }: { value: number; color?: string; height?: number; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: 100, now: clamped }} style={{ height, borderRadius: height, backgroundColor: colors.surfaceSubtle, overflow: 'hidden' }}>
      <View style={{ width: `${clamped === 0 ? 0 : Math.max(2, clamped)}%`, height, borderRadius: height, backgroundColor: color ?? colors.brandPrimary }} />
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
        <Txt size={12.5} weight="700" color={colors.textMuted} style={{ marginBottom: 7 }}>
          {label}
        </Txt>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 10,
          backgroundColor: colors.surfaceRaised,
          borderWidth: 1.4,
          borderColor: error ? colors.danger : focus ? colors.focus : colors.borderSubtle,
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
          editable={!disabled}
          accessibilityLabel={accessibilityLabel ?? label}
          selectionColor={colors.focus}
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
      {error || helper ? <Txt variant="caption" color={error ? colors.danger : colors.textSecondary} style={{ marginTop: 6 }}>{error ?? helper}</Txt> : null}
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
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surfaceInteractive : 'transparent',
        opacity: disabled ? 0.5 : 1,
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
          opacity: disabled ? 0.5 : pressed ? 0.94 : 1,
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
  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Txt variant="label" color={colors.textSecondary}>{label}</Txt>
        {icon ? <Ionicons name={icon} size={f(18)} color={color ?? colors.brandPrimary} /> : null}
      </View>
      <Txt variant="kpi" display color={color ?? colors.textPrimary} style={{ marginTop: 8 }}>{value}</Txt>
      {description ? <Txt variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>{description}</Txt> : null}
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
    <View style={[{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.borderSubtle }, style]}>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} variant="cardTitle">{title}</Txt>
        {subtitle ? <Txt numberOfLines={2} variant="supporting" color={colors.textSecondary}>{subtitle}</Txt> : null}
      </View>
      {trailing}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.72 : 1 })}>{content}</Pressable> : content;
}

export function FilterBar({ options, value, onChange, scrollable = false, style }: {
  options: Array<{ label: string; value: string; disabled?: boolean }>;
  value: string;
  onChange: (value: string) => void;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const content = options.map((option) => <Chip key={option.value} label={option.label} active={option.value === value} disabled={option.disabled} onPress={() => onChange(option.value)} />);
  return scrollable ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: spacing.xs }, style]}>{content}</ScrollView> : <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, style]}>{content}</View>;
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
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ flex: 1 }} />
      <View style={[{ maxHeight: '88%', backgroundColor: colors.surfaceRaised, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.card, ...shadow(colors, 3) }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          {title ? <Txt variant="sectionTitle" display>{title}</Txt> : <View />}
          <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        {actions ? <View style={{ marginTop: spacing.md }}>{actions}</View> : null}
      </View>
    </View>
  </Modal>;
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
