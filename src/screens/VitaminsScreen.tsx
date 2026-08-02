import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as db from '../db';
import { addDays, formatDateShort, relativeDay, today } from '../dates';
import { font, Palette, R, S, type } from '../theme';
import { useTheme, useThemedStyles } from '../ThemeContext';
import {
  AnimatedIn,
  Badge,
  Card,
  EmptyState,
  haptic,
  Icon,
  IconButton,
  Input,
  PressableScale,
  ProgressRing,
  ScreenHeader,
  mix,
  SectionTitle,
  TextButton,
  useKeyboardHeight,
} from '../components/ui';
import { Vitamin } from '../types';

const SUGGESTIONS = ['Biotin', 'Iron', 'Vitamin D', 'Zinc', 'Multivitamin', 'Omega-3', 'Collagen'];

export default function VitaminsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [date, setDate] = useState(today());
  const [vitamins, setVitamins] = useState<Vitamin[]>([]);
  const [allVitamins, setAllVitamins] = useState<Vitamin[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);
  const [newName, setNewName] = useState('');
  const [managing, setManaging] = useState(false);
  const keyboard = useKeyboardHeight();

  const reload = useCallback(() => {
    setVitamins(db.listVitamins(!managing));
    setAllVitamins(db.listVitamins(false));
    setChecked(db.vitaminsCheckedOn(date));
    setStreak(db.vitaminStreak(today()));
  }, [date, managing]);

  useFocusEffect(reload);

  const activeVitamins = vitamins.filter((v) => v.active === 1);
  const done = activeVitamins.filter((v) => checked.has(v.id)).length;
  const total = activeVitamins.length;
  const allDone = total > 0 && done === total;

  const toggle = (v: Vitamin) => {
    const isChecked = checked.has(v.id);
    if (!isChecked && done + 1 === total) haptic.success();
    else haptic.tap();
    db.setVitaminChecked(v.id, date, !isChecked);
    reload();
  };

  const add = (name: string) => {
    const trimmed = name.trim();
    if (trimmed === '') return;
    haptic.tap();
    db.insertVitamin(trimmed);
    setNewName('');
    reload();
  };

  const removeVitamin = (v: Vitamin) => {
    Alert.alert(
      `Remove ${v.name}?`,
      'Its check-off history goes too. Deactivating keeps the history and just hides it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', onPress: () => { db.setVitaminActive(v.id, false); reload(); } },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { db.deleteVitamin(v.id); reload(); },
        },
      ]
    );
  };

  const isToday = date === today();
  const suggestions = SUGGESTIONS.filter(
    (s) => !allVitamins.some((v) => v.name.toLowerCase() === s.toLowerCase())
  );

  return (
    <View style={[styles.screen, { paddingBottom: keyboard }]}>
      <ScreenHeader
        title="Vitamins"
        subtitle={streak > 0 ? `${streak}-day streak going` : 'Check them off as you take them'}
        right={
          allVitamins.length > 0 ? (
            <IconButton
              name={managing ? 'check' : 'tune'}
              onPress={() => {
                haptic.tap();
                setManaging(!managing);
              }}
              background={managing ? theme.accentSoft : theme.card}
            />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {total > 0 && (
          <AnimatedIn>
            <Card style={styles.heroCard} level={2}>
              <View style={styles.dateRow}>
                <PressableScale onPress={() => setDate(addDays(date, -1))} scaleTo={0.85} hitSlop={6}>
                  <View style={styles.dateBtn}>
                    <Icon name="chevron-left" size={20} color={theme.accent} />
                  </View>
                </PressableScale>
                <Text style={styles.dateLabel}>
                  {isToday ? 'Today' : relativeDay(date)}
                </Text>
                <PressableScale
                  onPress={() => !isToday && setDate(addDays(date, 1))}
                  scaleTo={0.85}
                  hitSlop={6}
                >
                  <View style={[styles.dateBtn, isToday && { opacity: 0.3 }]}>
                    <Icon name="chevron-right" size={20} color={theme.accent} />
                  </View>
                </PressableScale>
              </View>

              <View style={styles.heroBody}>
                <ProgressRing
                  progress={total === 0 ? 0 : done / total}
                  size={92}
                  thickness={10}
                  color={allDone ? theme.success : theme.accent}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.ringNumber, allDone && { color: theme.success }]}>
                      {done}
                    </Text>
                    <Text style={styles.ringTotal}>of {total}</Text>
                  </View>
                </ProgressRing>
                <View style={styles.heroText}>
                  <Text style={styles.heroTitle}>
                    {allDone ? 'All done!' : `${total - done} to go`}
                  </Text>
                  <Text style={styles.heroSub}>
                    {allDone
                      ? isToday
                        ? 'Every one checked off today.'
                        : `Everything was taken on ${formatDateShort(date)}.`
                      : 'Tap a card below as you take each one.'}
                  </Text>
                  {streak > 0 && (
                    <Badge icon="fire" label={`${streak}-day streak`} color={theme.star} style={{ marginTop: S.sm }} />
                  )}
                </View>
              </View>
            </Card>
          </AnimatedIn>
        )}

        {allVitamins.length === 0 ? (
          <EmptyState
            icon="pill"
            title="No vitamins yet"
            body="Add the vitamins or medications you take and they'll show up here as a daily checklist."
          />
        ) : (
          <AnimatedIn delay={60}>
            {managing && <SectionTitle>Manage your list</SectionTitle>}
            {vitamins.map((v) => (
              <VitaminRow
                key={v.id}
                vitamin={v}
                checked={checked.has(v.id)}
                managing={managing}
                onToggle={() => toggle(v)}
                onRemove={() => removeVitamin(v)}
                onActivate={() => { db.setVitaminActive(v.id, true); reload(); }}
              />
            ))}
          </AnimatedIn>
        )}

        <AnimatedIn delay={110}>
          <SectionTitle style={{ marginTop: S.lg }}>Add one</SectionTitle>
          <View style={styles.addRow}>
            <Input
              value={newName}
              onChangeText={setNewName}
              placeholder="Biotin, iron, a medication…"
              onSubmitEditing={() => add(newName)}
              returnKeyType="done"
              style={{ flex: 1, minHeight: 52 }}
            />
            <PressableScale onPress={() => add(newName)} scaleTo={0.92}>
              <View
                style={[
                  styles.addBtn,
                  newName.trim() === '' && { backgroundColor: theme.accentSoft },
                ]}
              >
                <Icon
                  name="plus"
                  size={24}
                  color={newName.trim() === '' ? theme.accent : theme.onAccent}
                />
              </View>
            </PressableScale>
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestionRow}>
              {suggestions.map((s) => (
                <PressableScale key={s} onPress={() => add(s)} scaleTo={0.92}>
                  <View style={styles.suggestion}>
                    <Icon name="plus" size={14} color={theme.accent} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          )}
        </AnimatedIn>
      </ScrollView>
    </View>
  );
}

function VitaminRow({
  vitamin,
  checked,
  managing,
  onToggle,
  onRemove,
  onActivate,
}: {
  vitamin: Vitamin;
  checked: boolean;
  managing: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onActivate: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const inactive = vitamin.active === 0;

  const fill = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(fill, {
      toValue: checked ? 1 : 0,
      duration: 240,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [checked]);

  const showCheck = checked && !managing;

  return (
    <Card
      onPress={managing ? undefined : onToggle}
      style={[
        styles.vitaminCard,
        showCheck && {
          backgroundColor: mix(theme.card, theme.success, theme.dark ? 0.22 : 0.1),
          borderColor: mix(theme.card, theme.success, theme.dark ? 0.45 : 0.35),
        },
        inactive && { opacity: 0.55 },
      ]}
    >
      {!managing && (
        <View style={[styles.checkbox, showCheck && styles.checkboxOn]}>
          <Animated.View style={{ opacity: fill, transform: [{ scale: fill }] }}>
            <Icon name="check-bold" size={16} color={theme.onAccent} />
          </Animated.View>
        </View>
      )}
      {managing && (
        <Icon name="pill" size={20} color={theme.textFaint} style={{ marginRight: S.md }} />
      )}
      <Text style={[styles.vitaminName, showCheck && styles.vitaminNameDone]} numberOfLines={1}>
        {vitamin.name}
        {inactive ? '  (inactive)' : ''}
      </Text>
      {managing &&
        (inactive ? (
          <TextButton label="Activate" icon="check" onPress={onActivate} />
        ) : (
          <TextButton
            label="Remove"
            icon="trash-can-outline"
            color={theme.danger}
            onPress={onRemove}
          />
        ))}
    </Card>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxl },

    heroCard: { marginBottom: S.lg, paddingBottom: S.xl },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: S.md,
    },
    dateBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.accentSofter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateLabel: { ...type.label, color: theme.textMuted },
    heroBody: { flexDirection: 'row', alignItems: 'center' },
    heroText: { flex: 1, marginLeft: S.lg },
    ringNumber: { fontFamily: font.displayBold, fontSize: 27, lineHeight: 30, color: theme.accent },
    ringTotal: { ...type.caption, color: theme.textMuted },
    heroTitle: { fontFamily: font.displayBold, fontSize: 21, color: theme.text },
    heroSub: { ...type.small, color: theme.textMuted, marginTop: 2 },

    vitaminCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: S.md,
      marginBottom: S.sm,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.borderStrong,
      marginRight: S.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: theme.success, borderColor: theme.success },
    vitaminName: { ...type.body, fontFamily: font.medium, color: theme.text, flex: 1 },
    vitaminNameDone: { color: theme.textMuted, textDecorationLine: 'line-through' },

    addRow: { flexDirection: 'row', gap: S.sm, alignItems: 'center' },
    addBtn: {
      width: 52,
      height: 52,
      borderRadius: R.md,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.md },
    suggestion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: R.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: theme.card,
    },
    suggestionText: { ...type.small, fontFamily: font.medium, color: theme.accent },
  });
