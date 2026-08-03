import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { font, Palette, R, S, shadow, type } from '../theme';
import { useTheme, useThemedStyles } from '../ThemeContext';
import { haptic, PressableScale } from './ui';

/**
 * Themed replacement for Alert.alert so popups match the app instead of
 * showing stock Android dialogs. DialogHost is mounted once at the app root;
 * appAlert() can then be called from anywhere, with the same signature as
 * Alert.alert.
 */

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface DialogRequest {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

let enqueue: ((d: DialogRequest) => void) | null = null;

export function appAlert(title: string, message?: string, buttons?: DialogButton[]): void {
  const req: DialogRequest = {
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
  };
  // The host is mounted for the app's whole life, so this only drops a dialog
  // if something fires during the splash screen; nothing does today.
  enqueue?.(req);
}

export function DialogHost() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const [closing, setClosing] = useState(false);
  const scale = useRef(new Animated.Value(0.92)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const current = queue[0] ?? null;

  useEffect(() => {
    enqueue = (d) => setQueue((q) => [...q, d]);
    return () => {
      enqueue = null;
    };
  }, []);

  useEffect(() => {
    if (current && !closing) {
      scale.setValue(0.92);
      fade.setValue(0);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      ]).start();
    }
  }, [current != null && !closing]);

  const close = (button?: DialogButton) => {
    if (closing) return;
    setClosing(true);
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setQueue((q) => q.slice(1));
      setClosing(false);
      button?.onPress?.();
    });
  };

  // Tapping the backdrop only dismisses dialogs that have a harmless way out:
  // a cancel button, or a single lone button.
  const backdropButton =
    current == null
      ? undefined
      : current.buttons.find((b) => b.style === 'cancel') ??
        (current.buttons.length === 1 ? current.buttons[0] : undefined);

  if (!current) return null;

  const stacked = current.buttons.length > 2;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => backdropButton && close(backdropButton)}
    >
      <Animated.View style={[styles.dialogBackdrop, { opacity: fade }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => backdropButton && close(backdropButton)}
        />
        <Animated.View style={[styles.dialogCard, shadow(theme, 3), { transform: [{ scale }] }]}>
          <Text style={styles.dialogTitle}>{current.title}</Text>
          {current.message != null && current.message !== '' && (
            <Text style={styles.dialogMessage}>{current.message}</Text>
          )}
          <View style={[styles.dialogButtons, stacked && { flexDirection: 'column' }]}>
            {current.buttons.map((b, i) => (
              <DialogButtonView
                key={i}
                button={b}
                stacked={stacked}
                onPress={() => {
                  haptic.tap();
                  close(b);
                }}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function DialogButtonView({
  button,
  stacked,
  onPress,
}: {
  button: DialogButton;
  stacked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const kind = button.style ?? 'default';
  const bg =
    kind === 'destructive' ? theme.danger : kind === 'cancel' ? theme.cardAlt : theme.accent;
  const fg = kind === 'cancel' ? theme.textMuted : theme.onAccent;
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} style={!stacked && { flex: 1 }}>
      <View style={[styles.dialogBtn, { backgroundColor: bg }]}>
        <Text style={[styles.dialogBtnLabel, { color: fg }]}>{button.text}</Text>
      </View>
    </PressableScale>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    dialogBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(20,10,14,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: S.xl,
    },
    dialogCard: {
      backgroundColor: theme.card,
      borderRadius: R.lg,
      padding: S.lg,
      width: '100%',
      maxWidth: 360,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    dialogTitle: { fontFamily: font.displayBold, fontSize: 20, lineHeight: 26, color: theme.text },
    dialogMessage: { ...type.body, color: theme.textMuted, marginTop: S.sm },
    dialogButtons: { flexDirection: 'row', gap: S.sm, marginTop: S.lg },
    dialogBtn: {
      borderRadius: R.md,
      paddingVertical: 12,
      paddingHorizontal: S.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dialogBtnLabel: { fontFamily: font.bold, fontSize: 15, letterSpacing: 0.2 },
  });
