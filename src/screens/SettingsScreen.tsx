import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import * as db from '../db';
import * as notif from '../notifications';
import { checkForUpdate, updatesAvailable, UpdateInfo } from '../update';
import UpdateSheet from '../components/UpdateSheet';
import { font, Palette, R, S, themeOrder, themes, type } from '../theme';
import { useThemeControls, useThemedStyles, useTheme } from '../ThemeContext';
import {
  AnimatedIn,
  Card,
  haptic,
  Icon,
  IconBubble,
  PressableScale,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
} from '../components/ui';
import { appAlert } from '../components/dialog';

export default function SettingsScreen() {
  const { theme, setThemeKey } = useThemeControls();
  const styles = useThemedStyles(createStyles);
  const [washOn, setWashOn] = useState(db.getSetting('washReminderOn', '0') === '1');
  const [washDays, setWashDays] = useState(Number(db.getSetting('washReminderDays', '4')));
  const [vitaminOn, setVitaminOn] = useState(db.getSetting('vitaminReminderOn', '0') === '1');
  const [vitaminHour, setVitaminHour] = useState(Number(db.getSetting('vitaminReminderHour', '9')));
  const [trimOn, setTrimOn] = useState(db.getSetting('trimReminderOn', '0') === '1');
  const [trimWeeks, setTrimWeeks] = useState(Number(db.getSetting('trimReminderWeeks', '8')));
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Persist values only. Scheduling happens exclusively in the user-driven
  // handlers below: interval triggers restart their countdown when
  // re-created, so re-scheduling on every mount would keep pushing
  // wash/trim reminders into the future and they'd never fire.
  useEffect(() => {
    db.setSetting('washReminderOn', washOn ? '1' : '0');
    db.setSetting('washReminderDays', String(washDays));
  }, [washOn, washDays]);

  useEffect(() => {
    db.setSetting('vitaminReminderOn', vitaminOn ? '1' : '0');
    db.setSetting('vitaminReminderHour', String(vitaminHour));
  }, [vitaminOn, vitaminHour]);

  useEffect(() => {
    db.setSetting('trimReminderOn', trimOn ? '1' : '0');
    db.setSetting('trimReminderWeeks', String(trimWeeks));
  }, [trimOn, trimWeeks]);

  const ensurePermission = async (): Promise<boolean> => {
    if (!notif.remindersAvailable()) {
      appAlert(
        'Not available in preview',
        'Reminders are disabled in the Expo Go preview. They will work in the installed app build.'
      );
      return false;
    }
    const granted = await notif.setupNotifications();
    if (!granted) {
      appAlert(
        'Notifications blocked',
        'Allow notifications for this app in Android settings to use reminders.'
      );
      return false;
    }
    return true;
  };

  const toggleWash = async (on: boolean) => {
    if (on && !(await ensurePermission())) return;
    haptic.tap();
    setWashOn(on);
    (on ? notif.scheduleWashReminder(washDays) : notif.cancelWashReminder()).catch(() => {});
  };

  const toggleVitamin = async (on: boolean) => {
    if (on && !(await ensurePermission())) return;
    haptic.tap();
    setVitaminOn(on);
    (on ? notif.scheduleVitaminReminder(vitaminHour, 0) : notif.cancelVitaminReminder()).catch(() => {});
  };

  const toggleTrim = async (on: boolean) => {
    if (on && !(await ensurePermission())) return;
    haptic.tap();
    setTrimOn(on);
    (on ? notif.scheduleTrimReminder(trimWeeks) : notif.cancelTrimReminder()).catch(() => {});
  };

  const changeWashDays = (days: number) => {
    setWashDays(days);
    if (washOn) notif.scheduleWashReminder(days).catch(() => {});
  };

  const changeVitaminHour = (hour: number) => {
    setVitaminHour(hour);
    if (vitaminOn) notif.scheduleVitaminReminder(hour, 0).catch(() => {});
  };

  const changeTrimWeeks = (weeks: number) => {
    setTrimWeeks(weeks);
    if (trimOn) notif.scheduleTrimReminder(weeks).catch(() => {});
  };

  const exportData = async () => {
    try {
      const json = db.exportAllData();
      const file = new File(Paths.cache, 'rosewater-export.json');
      if (file.exists) file.delete();
      file.create();
      file.write(json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export hair care data',
        });
      } else {
        appAlert('Saved', `Export written to:\n${file.uri}`);
      }
    } catch (e) {
      appAlert('Export failed', String(e));
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const checkUpdates = async () => {
    if (!updatesAvailable()) {
      appAlert(
        'Not available in preview',
        'Update checks are disabled in the Expo Go preview. They will work in the installed app build.'
      );
      return;
    }
    haptic.tap();
    setCheckingUpdate(true);
    try {
      const info = await checkForUpdate();
      db.setSetting('lastUpdateCheckAt', String(Date.now()));
      if (info) {
        setUpdate(info);
        setUpdateSheetOpen(true);
      } else {
        appAlert('Up to date', `You're on the latest version (v${version}).`);
      }
    } catch (e) {
      appAlert('Check failed', 'Could not reach GitHub. Try again later.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" subtitle="Make it yours" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedIn>
          <SectionTitle>Theme</SectionTitle>
          <Card style={{ paddingHorizontal: S.md }}>
            <View style={styles.themeRow}>
              {themeOrder.map((key) => {
                const t = themes[key];
                const active = theme.key === key;
                return (
                  <PressableScale
                    key={key}
                    scaleTo={0.9}
                    onPress={() => {
                      haptic.select();
                      setThemeKey(key);
                    }}
                    style={styles.themeItem}
                  >
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: t.background, borderColor: active ? t.accent : theme.border },
                        active && { borderWidth: 2.5 },
                      ]}
                    >
                      <View style={[styles.swatchCard, { backgroundColor: t.card }]}>
                        <Icon name={t.icon} size={15} color={t.accent} />
                      </View>
                      <View style={[styles.swatchAccent, { backgroundColor: t.accent }]} />
                      {active && (
                        <View style={[styles.swatchCheck, { backgroundColor: t.accent }]}>
                          <Icon name="check" size={11} color={t.onAccent} />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.themeLabel,
                        active && { color: theme.accent, fontFamily: font.bold },
                      ]}
                      numberOfLines={1}
                    >
                      {t.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </Card>
        </AnimatedIn>

        <AnimatedIn delay={60}>
          <SectionTitle style={{ marginTop: S.lg }}>Reminders</SectionTitle>

          <ReminderCard
            icon="shower-head"
            title="Wash day"
            description="A nudge when it's been a while since your last wash."
            on={washOn}
            onToggle={toggleWash}
            stepperLabel={`Every ${washDays} day${washDays === 1 ? '' : 's'}`}
            onDecrement={() => changeWashDays(Math.max(1, washDays - 1))}
            onIncrement={() => changeWashDays(Math.min(21, washDays + 1))}
          />

          <ReminderCard
            icon="pill"
            title="Daily vitamins"
            description="One ping a day to check off your list."
            on={vitaminOn}
            onToggle={toggleVitamin}
            stepperLabel={`At ${String(vitaminHour).padStart(2, '0')}:00`}
            onDecrement={() => changeVitaminHour((vitaminHour + 23) % 24)}
            onIncrement={() => changeVitaminHour((vitaminHour + 1) % 24)}
          />

          <ReminderCard
            icon="content-cut"
            title="Trim"
            description="Most people book one every six to eight weeks."
            on={trimOn}
            onToggle={toggleTrim}
            stepperLabel={`Every ${trimWeeks} weeks`}
            onDecrement={() => changeTrimWeeks(Math.max(4, trimWeeks - 1))}
            onIncrement={() => changeTrimWeeks(Math.min(16, trimWeeks + 1))}
          />
        </AnimatedIn>

        <AnimatedIn delay={120}>
          <SectionTitle style={{ marginTop: S.lg }}>Your data</SectionTitle>
          <Card>
            <View style={styles.dataRow}>
              <IconBubble name="shield-lock-outline" size={40} />
              <Text style={styles.dataText}>
                Everything lives on this phone only — no account, no cloud, no ads. Export a copy any
                time.
              </Text>
            </View>
            <PrimaryButton
              label="Export all data"
              icon="tray-arrow-up"
              variant="soft"
              onPress={exportData}
              style={{ marginTop: S.lg }}
            />
          </Card>
        </AnimatedIn>

        <AnimatedIn delay={160}>
          <SectionTitle style={{ marginTop: S.lg }}>Updates</SectionTitle>
          <Card>
            <View style={styles.dataRow}>
              <IconBubble name="rocket-launch-outline" size={40} />
              <Text style={styles.dataText}>
                New versions are published on GitHub. Check now, or the app will quietly look once a
                day.
              </Text>
            </View>
            <PrimaryButton
              label={checkingUpdate ? 'Checking…' : 'Check for updates'}
              icon="update"
              variant="soft"
              disabled={checkingUpdate}
              onPress={checkUpdates}
              style={{ marginTop: S.lg }}
            />
          </Card>
        </AnimatedIn>

        <AnimatedIn delay={200}>
          <Text style={styles.about}>Rosewater · v{version}</Text>
        </AnimatedIn>
      </ScrollView>

      <UpdateSheet
        info={update}
        visible={updateSheetOpen}
        onClose={() => setUpdateSheetOpen(false)}
      />
    </View>
  );
}

function ReminderCard({
  icon,
  title,
  description,
  on,
  onToggle,
  stepperLabel,
  onDecrement,
  onIncrement,
}: {
  icon: string;
  title: string;
  description: string;
  on: boolean;
  onToggle: (v: boolean) => void;
  stepperLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Card style={{ marginBottom: S.md }}>
      <View style={styles.reminderRow}>
        <IconBubble name={icon} size={40} color={on ? theme.accent : theme.textMuted} />
        <View style={styles.reminderBody}>
          <Text style={styles.reminderTitle}>{title}</Text>
          <Text style={styles.reminderDesc}>{description}</Text>
        </View>
        <Switch
          value={on}
          onValueChange={onToggle}
          trackColor={{ true: theme.accent, false: theme.borderStrong }}
          thumbColor={theme.dark && on ? theme.card : undefined}
        />
      </View>
      {on && (
        <AnimatedIn distance={6}>
          <View style={styles.stepperRow}>
            <PressableScale onPress={onDecrement} scaleTo={0.85} hitSlop={6}>
              <View style={styles.stepperBtn}>
                <Icon name="minus" size={20} color={theme.accent} />
              </View>
            </PressableScale>
            <Text style={styles.stepperLabel}>{stepperLabel}</Text>
            <PressableScale onPress={onIncrement} scaleTo={0.85} hitSlop={6}>
              <View style={styles.stepperBtn}>
                <Icon name="plus" size={20} color={theme.accent} />
              </View>
            </PressableScale>
          </View>
        </AnimatedIn>
      )}
    </Card>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxl },

    themeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    themeItem: { alignItems: 'center', width: 60 },
    swatch: {
      width: 52,
      height: 52,
      borderRadius: R.md,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    swatchCard: {
      width: 30,
      height: 24,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    swatchAccent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 11 },
    swatchCheck: {
      position: 'absolute',
      top: 3,
      right: 3,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeLabel: {
      ...type.caption,
      fontSize: 10.5,
      color: theme.textMuted,
      marginTop: 6,
      textAlign: 'center',
    },

    reminderRow: { flexDirection: 'row', alignItems: 'center' },
    reminderBody: { flex: 1, marginLeft: S.md, marginRight: S.sm },
    reminderTitle: { ...type.cardTitle, color: theme.text },
    reminderDesc: { ...type.small, color: theme.textMuted, marginTop: 1 },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: S.lg,
      marginTop: S.lg,
      paddingTop: S.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    stepperBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.accentSofter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperLabel: {
      ...type.bodyStrong,
      fontFamily: font.bold,
      color: theme.text,
      minWidth: 130,
      textAlign: 'center',
    },

    dataRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
    dataText: { ...type.small, color: theme.textMuted, flex: 1 },

    about: { ...type.caption, color: theme.textFaint, textAlign: 'center', marginTop: S.xl },
  });
