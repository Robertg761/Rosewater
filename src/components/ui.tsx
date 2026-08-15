import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { font, Palette, R, S, shadow, type } from '../theme';
import { useTheme, useThemedStyles } from '../ThemeContext';

/* ------------------------------------------------------------------ *
 * Feedback
 * ------------------------------------------------------------------ */

/**
 * Haptics are best-effort: they are missing on some emulators and on devices
 * with vibration switched off, and a failure there must never break a tap.
 */
export const haptic = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  select: () => Haptics.selectionAsync().catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};

/**
 * Height of the on-screen keyboard, or 0 when it is closed.
 *
 * Under Android's edge-to-edge mode the window no longer resizes for the IME,
 * and a Modal is its own window regardless — so screens with inputs near the
 * bottom have to reserve the space themselves.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = React.useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/* ------------------------------------------------------------------ *
 * Icon
 * ------------------------------------------------------------------ */

export function Icon({
  name,
  size = 20,
  color,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <MaterialCommunityIcons
      name={name as any}
      size={size}
      color={color ?? theme.text}
      style={style}
    />
  );
}

/** Icon inside a soft tinted rounded square — the app's list-row avatar. */
export function IconBubble({
  name,
  color,
  size = 40,
  iconSize,
  tint,
}: {
  name: string;
  color?: string;
  size?: number;
  iconSize?: number;
  tint?: string;
}) {
  const theme = useTheme();
  const fg = color ?? theme.accent;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        backgroundColor: tint ?? withAlpha(fg, theme.dark ? 0.22 : 0.13),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={iconSize ?? Math.round(size * 0.52)} color={fg} />
    </View>
  );
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `#RRGGBB` + opacity → `rgba(...)`. Keeps tints in sync with entry colours. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Opaque blend of two colours. Elevated surfaces need this rather than
 * `withAlpha`: Android draws its elevation shadow straight through a
 * translucent background, which reads as a grey slab.
 */
export function mix(base: string, tint: string, t: number): string {
  const a = rgb(base);
  const b = rgb(tint);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/* ------------------------------------------------------------------ *
 * Motion
 * ------------------------------------------------------------------ */

/** Fades and lifts its children in on mount, with an optional stagger delay. */
export function AnimatedIn({
  children,
  delay = 0,
  distance = 14,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Pressable that dips slightly while held. The caller's layout styles live on
 * the animated wrapper so the scale transform never fights flex/margins.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  innerStyle,
  scaleTo = 0.97,
  hapticOnPress = true,
  hitSlop,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticOnPress?: boolean;
  hitSlop?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      speed: 40,
      bounciness: v === 1 ? 6 : 0,
    }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        disabled={disabled}
        hitSlop={hitSlop}
        onPressIn={() => to(scaleTo)}
        onPressOut={() => to(1)}
        onLongPress={onLongPress}
        onPress={
          onPress &&
          (() => {
            if (hapticOnPress) haptic.tap();
            onPress();
          })
        }
        style={innerStyle}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

export function Card({
  children,
  style,
  onPress,
  onLongPress,
  padded = true,
  level = 1,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  padded?: boolean;
  level?: 1 | 2 | 3;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const body = (
    <View style={[styles.card, shadow(theme, level), !padded && { padding: 0 }, style]}>
      {children}
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress} scaleTo={0.985}>
      {body}
    </PressableScale>
  );
}

export function SectionTitle({
  children,
  action,
  onAction,
  style,
}: {
  children: React.ReactNode;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action != null && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: theme.accent }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.border }, style]} />;
}

/* ------------------------------------------------------------------ *
 * Screen chrome
 * ------------------------------------------------------------------ */

/**
 * Fixed screen header: a soft gradient wash, an optional back button, a
 * display-face title and an optional trailing control.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backIcon = 'chevron-left',
  right,
  compact,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backIcon?: string;
  right?: React.ReactNode;
  compact?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={theme.hero}
      style={[styles.header, { paddingTop: insets.top + (compact ? S.sm : S.md) }]}
    >
      <View style={styles.headerRow}>
        {onBack != null && (
          <PressableScale onPress={onBack} scaleTo={0.88} style={{ marginRight: S.xs }}>
            <View style={styles.headerBack}>
              <Icon name={backIcon} size={backIcon === 'close' ? 21 : 26} color={theme.text} />
            </View>
          </PressableScale>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.headerTitle, compact && { fontSize: 21, lineHeight: 27 }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle != null && subtitle !== '' && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
    </LinearGradient>
  );
}

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

export function PrimaryButton({
  label,
  onPress,
  icon,
  style,
  variant = 'solid',
  size = 'md',
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'solid' | 'soft' | 'outline';
  size?: 'md' | 'lg';
  disabled?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const padV = size === 'lg' ? 16 : 13;
  const fg = variant === 'solid' ? theme.onAccent : theme.accent;

  const inner = (
    <View style={[styles.btnInner, { paddingVertical: padV }]}>
      {icon != null && <Icon name={icon} size={19} color={fg} style={{ marginRight: 7 }} />}
      <Text style={[styles.btnLabel, { color: fg, fontSize: size === 'lg' ? 16.5 : 15.5 }]}>
        {label}
      </Text>
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.965}
      style={[disabled && { opacity: 0.45 }, style]}
    >
      {variant === 'solid' ? (
        <LinearGradient
          colors={[theme.accent, theme.accentDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, shadow(theme, 2)]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.btn,
            variant === 'soft'
              ? { backgroundColor: theme.accentSoft }
              : { borderWidth: 1.5, borderColor: theme.accent },
          ]}
        >
          {inner}
        </View>
      )}
    </PressableScale>
  );
}

/** Circular icon button used in headers and photo overlays. */
export function IconButton({
  name,
  onPress,
  size = 38,
  color,
  background,
  style,
}: {
  name: string;
  onPress: () => void;
  size?: number;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} scaleTo={0.86} style={style}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background ?? theme.card,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadow(theme, 1),
        }}
      >
        <Icon name={name} size={size * 0.52} color={color ?? theme.accent} />
      </View>
    </PressableScale>
  );
}

export function TextButton({
  label,
  onPress,
  icon,
  color,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const fg = color ?? theme.accent;
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} style={style}>
      <View style={styles.textBtn}>
        {icon != null && <Icon name={icon} size={17} color={fg} style={{ marginRight: 5 }} />}
        <Text style={[styles.textBtnLabel, { color: fg }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

/** Floating action button, pinned by the caller. */
export function Fab({
  icon,
  label,
  onPress,
  style,
}: {
  icon: string;
  label?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} scaleTo={0.92} style={style}>
      <LinearGradient
        colors={[theme.accent, theme.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 54,
          borderRadius: 27,
          paddingHorizontal: label != null ? S.xl : 0,
          width: label != null ? undefined : 54,
          justifyContent: 'center',
          ...shadow(theme, 3),
        }}
      >
        <Icon name={icon} size={23} color={theme.onAccent} />
        {label != null && (
          <Text
            style={{
              fontFamily: font.bold,
              fontSize: 15.5,
              color: theme.onAccent,
              marginLeft: 7,
            }}
          >
            {label}
          </Text>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

/* ------------------------------------------------------------------ *
 * Text input
 * ------------------------------------------------------------------ */

export function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
  minHeight,
  onSubmitEditing,
  returnKeyType,
  autoFocus,
  maxLength,
  style,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  minHeight?: number;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'go';
  autoFocus?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textFaint}
      multiline={multiline}
      autoFocus={autoFocus}
      maxLength={maxLength}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: R.md,
          borderWidth: 1.5,
          borderColor: focused ? theme.accent : theme.border,
          paddingHorizontal: S.md,
          paddingVertical: S.md,
          fontFamily: font.regular,
          fontSize: 15,
          color: theme.text,
          minHeight: minHeight ?? (multiline ? 92 : undefined),
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Chips
 * ------------------------------------------------------------------ */

export function Chip({
  label,
  selected,
  onPress,
  color,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  icon?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const tint = color ?? theme.accent;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    haptic.select();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], marginRight: S.sm, marginBottom: S.sm }}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.chip,
          selected && {
            backgroundColor: withAlpha(tint, theme.dark ? 0.3 : 0.15),
            borderColor: tint,
          },
        ]}
      >
        {icon != null && (
          <Icon
            name={icon}
            size={15}
            color={selected ? tint : theme.textMuted}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[styles.chipText, selected && { color: tint, fontFamily: font.bold }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function Badge({
  label,
  icon,
  color,
  style,
}: {
  label: string;
  icon?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const tint = color ?? theme.accent;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: withAlpha(tint, theme.dark ? 0.26 : 0.14),
          borderRadius: R.pill,
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
        style,
      ]}
    >
      {icon != null && <Icon name={icon} size={13} color={tint} style={{ marginRight: 4 }} />}
      <Text style={{ ...type.caption, color: tint }}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Rating
 * ------------------------------------------------------------------ */

function Star({ filled, size, onPress }: { filled: boolean; size: number; onPress?: () => void }) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const wasFilled = useRef(filled);

  useEffect(() => {
    if (filled && !wasFilled.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.35, duration: 110, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 3.5, tension: 140 }),
      ]).start();
    }
    wasFilled.current = filled;
  }, [filled]);

  return (
    <Pressable disabled={!onPress} onPress={onPress} hitSlop={6}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name={filled ? 'star' : 'star-outline'}
          size={size}
          color={filled ? theme.star : theme.textFaint}
        />
      </Animated.View>
    </Pressable>
  );
}

export function RatingStars({
  value,
  onChange,
  size = 30,
  style,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', gap: 2 }, style]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          filled={value != null && n <= value}
          size={size}
          onPress={
            onChange &&
            (() => {
              haptic.select();
              onChange(value === n ? null : n);
            })
          }
        />
      ))}
    </View>
  );
}

/** Compact read-only rating used inside dense list rows. */
export function StarRow({ value, size = 13 }: { value: number; size?: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: value }, (_, i) => (
        <Icon key={i} name="star" size={size} color={theme.star} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

/** Circular progress ring that animates to `progress` (0–1). */
export function ProgressRing({
  progress,
  size = 84,
  thickness = 9,
  color,
  trackColor,
  children,
}: {
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const anim = useRef(new Animated.Value(0)).current;
  const [offset, setOffset] = React.useState(circumference);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setOffset(circumference * (1 - value)));
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 620,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [progress, circumference]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? theme.accentSoft}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? theme.accent}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Horizontal bar that animates its fill width. */
export function ProgressBar({
  progress,
  color,
  height = 7,
  style,
}: {
  progress: number;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 520,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View
      style={[
        { height, borderRadius: height / 2, backgroundColor: theme.accentSoft, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? theme.accent,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Empty state
 * ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <AnimatedIn style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={34} color={theme.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action != null && onAction != null && (
        <PrimaryButton label={action} onPress={onAction} variant="soft" style={{ marginTop: S.lg }} />
      )}
    </AnimatedIn>
  );
}

/* ------------------------------------------------------------------ *
 * Bottom sheet
 * ------------------------------------------------------------------ */

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const keyboard = useKeyboardHeight();

  useEffect(() => {
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 140,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.sheetBackdrop, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <View style={[styles.sheetWrap, { paddingBottom: keyboard }]} pointerEvents="box-none">
        <View
          style={[
            styles.sheet,
            { paddingBottom: keyboard > 0 ? S.md : insets.bottom + S.lg },
            shadow(theme, 3),
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <IconButton
              name="close"
              onPress={onClose}
              size={32}
              background={theme.cardAlt}
              color={theme.textMuted}
            />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ *
 * Styles
 * ------------------------------------------------------------------ */

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: R.lg,
      padding: S.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: S.sm,
      marginTop: S.xs,
    },
    sectionTitle: { ...type.label, color: theme.textMuted },
    sectionAction: { ...type.smallStrong },

    header: {
      paddingHorizontal: S.lg,
      paddingBottom: S.md,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 46 },
    headerBack: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
    },
    headerTitle: { ...type.title, color: theme.text },
    headerSubtitle: { ...type.small, color: theme.textMuted, marginTop: 1 },

    btn: { borderRadius: R.md, overflow: 'hidden' },
    btnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: S.lg,
    },
    btnLabel: { fontFamily: font.bold, letterSpacing: 0.2 },
    textBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    textBtnLabel: { ...type.bodyStrong },

    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: R.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    chipText: { ...type.small, fontFamily: font.medium, color: theme.textMuted },

    empty: { alignItems: 'center', paddingVertical: S.xxl, paddingHorizontal: S.lg },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: S.lg,
    },
    emptyTitle: { fontFamily: font.displayBold, fontSize: 19, color: theme.text, marginBottom: 6 },
    emptyBody: {
      ...type.small,
      color: theme.textMuted,
      textAlign: 'center',
      maxWidth: 290,
    },

    sheetBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.overlay,
    },
    sheetWrap: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: R.xl,
      borderTopRightRadius: R.xl,
      paddingHorizontal: S.xl,
      paddingTop: S.sm,
      maxHeight: '88%',
    },
    sheetHandle: {
      width: 42,
      height: 4.5,
      borderRadius: 3,
      backgroundColor: theme.borderStrong,
      alignSelf: 'center',
      marginBottom: S.md,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: S.md,
    },
    sheetTitle: { fontFamily: font.displayBold, fontSize: 21, color: theme.text },
  });
