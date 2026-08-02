import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as db from '../db';
import { monthName, today, formatDateLong, relativeDay } from '../dates';
import { entryTypeMeta, font, Palette, S, type } from '../theme';
import { useTheme, useThemedStyles } from '../ThemeContext';
import {
  AnimatedIn,
  Card,
  haptic,
  Icon,
  IconBubble,
  IconButton,
  PressableScale,
  ScreenHeader,
  StarRow,
  TextButton,
} from '../components/ui';
import { EntryWithDetails, RootStackParamList, TabParamList } from '../types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Calendar'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<EntryWithDetails[]>([]);
  const [vitaminDates, setVitaminDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(today());

  // Seven columns have to fit exactly, and card padding plus a hairline border
  // make that impossible to compute reliably — so measure the row instead and
  // round the cell down, letting `justifyContent: center` absorb the remainder.
  const [gridWidth, setGridWidth] = useState(width - S.lg * 2);
  const cellW = Math.floor((gridWidth / 7) * 10) / 10;
  const cellH = Math.round(cellW * 1.02);
  const dayCircle = Math.min(36, Math.round(cellW * 0.76));

  const reload = useCallback(() => {
    setEntries(db.entriesForMonth(year, month));
    setVitaminDates(db.vitaminDatesForMonth(year, month));
  }, [year, month]);

  useFocusEffect(reload);

  // Cross-fade the grid whenever the month changes so the swap doesn't snap.
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [year, month]);

  const shiftMonth = (delta: number) => {
    haptic.select();
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
    setSelectedDate(null);
  };

  const jumpToToday = () => {
    haptic.tap();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(today());
  };

  const cells = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const out: (string | null)[] = [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const d = String(i + 1).padStart(2, '0');
        return `${year}-${String(month + 1).padStart(2, '0')}-${d}`;
      }),
    ];
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, month]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, EntryWithDetails[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [entries]);

  const legendTypes = useMemo(() => {
    const seen: string[] = [];
    for (const e of entries) if (!seen.includes(e.type)) seen.push(e.type);
    return seen;
  }, [entries]);

  const dayEntries = selectedDate ? entriesByDate.get(selectedDate) ?? [] : [];
  const isThisMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Calendar"
        subtitle={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} in ${monthName(month)}`}
        right={
          !isThisMonth || selectedDate !== today() ? (
            <IconButton name="calendar-today" onPress={jumpToToday} />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <PressableScale onPress={() => shiftMonth(-1)} scaleTo={0.85} hitSlop={6}>
              <View style={styles.monthBtn}>
                <Icon name="chevron-left" size={22} color={theme.accent} />
              </View>
            </PressableScale>
            <Text style={styles.monthTitle}>
              {monthName(month)} {year}
            </Text>
            <PressableScale onPress={() => shiftMonth(1)} scaleTo={0.85} hitSlop={6}>
              <View style={styles.monthBtn}>
                <Icon name="chevron-right" size={22} color={theme.accent} />
              </View>
            </PressableScale>
          </View>

          <View
            style={styles.weekRow}
            onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
          >
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={[styles.weekday, { width: cellW }]}>
                {d}
              </Text>
            ))}
          </View>

          <Animated.View style={[styles.grid, { opacity: fade }]}>
            {cells.map((date, i) => {
              if (!date) return <View key={i} style={{ width: cellW, height: cellH }} />;
              const dayNum = Number(date.slice(-2));
              const dayList = entriesByDate.get(date) ?? [];
              const isToday = date === today();
              const isSelected = date === selectedDate;
              const hasVitamins = vitaminDates.has(date);
              return (
                <Pressable
                  key={i}
                  style={{ width: cellW, height: cellH, alignItems: 'center', paddingTop: 3 }}
                  onPress={() => {
                    haptic.select();
                    setSelectedDate(isSelected ? null : date);
                  }}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      { width: dayCircle, height: dayCircle, borderRadius: dayCircle / 2 },
                      isToday && !isSelected && styles.dayToday,
                      isSelected && styles.daySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday && !isSelected && { color: theme.accent, fontFamily: font.black },
                        isSelected && { color: theme.onAccent, fontFamily: font.black },
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </View>
                  <View style={styles.dotRow}>
                    {dayList.slice(0, 3).map((e, j) => (
                      <View
                        key={j}
                        style={[
                          styles.dot,
                          { backgroundColor: (entryTypeMeta[e.type] ?? entryTypeMeta.other).color },
                        ]}
                      />
                    ))}
                    {hasVitamins && <View style={[styles.dot, { backgroundColor: theme.star }]} />}
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>

          {(legendTypes.length > 0 || vitaminDates.size > 0) && (
            <View style={styles.legend}>
              {legendTypes.map((t) => {
                const meta = entryTypeMeta[t] ?? entryTypeMeta.other;
                return (
                  <View key={t} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: meta.color }]} />
                    <Text style={styles.legendText}>{meta.short}</Text>
                  </View>
                );
              })}
              {vitaminDates.size > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: theme.star }]} />
                  <Text style={styles.legendText}>Vitamins</Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {selectedDate != null && (
          <AnimatedIn key={selectedDate} delay={20}>
            <View style={styles.dayHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dayTitle}>{relativeDay(selectedDate)}</Text>
                <Text style={styles.dayDate}>{formatDateLong(selectedDate)}</Text>
              </View>
              <IconButton
                name="plus"
                onPress={() => navigation.navigate('LogEntry', { date: selectedDate })}
              />
            </View>

            {dayEntries.length === 0 ? (
              <Card style={styles.emptyDayCard}>
                <Icon name="calendar-blank-outline" size={22} color={theme.textFaint} />
                <Text style={styles.emptyDayText}>Nothing logged this day.</Text>
                <TextButton
                  label="Add an entry"
                  icon="plus"
                  onPress={() => navigation.navigate('LogEntry', { date: selectedDate })}
                />
              </Card>
            ) : (
              dayEntries.map((e) => {
                const meta = entryTypeMeta[e.type] ?? entryTypeMeta.other;
                return (
                  <Card
                    key={e.id}
                    onPress={() => navigation.navigate('LogEntry', { entryId: e.id })}
                    style={styles.entryCard}
                  >
                    <IconBubble name={meta.icon} color={meta.color} size={42} />
                    <View style={styles.entryBody}>
                      <View style={styles.entryTitleRow}>
                        <Text style={styles.entryTitle} numberOfLines={1}>
                          {meta.label}
                        </Text>
                        {e.rating != null && <StarRow value={e.rating} />}
                      </View>
                      {e.productNames.length > 0 && (
                        <Text style={styles.entrySub} numberOfLines={1}>
                          {e.productNames.join(', ')}
                        </Text>
                      )}
                      {e.note !== '' && (
                        <Text style={styles.entryNote} numberOfLines={2}>
                          {e.note}
                        </Text>
                      )}
                    </View>
                  </Card>
                );
              })
            )}
          </AnimatedIn>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxl },

    calendarCard: { paddingHorizontal: 0, paddingTop: S.md, paddingBottom: S.md },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: S.md,
      marginBottom: S.sm,
    },
    monthBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.accentSofter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthTitle: { fontFamily: font.displayBold, fontSize: 19, color: theme.text },

    weekRow: { flexDirection: 'row', justifyContent: 'center' },
    weekday: { ...type.caption, color: theme.textFaint, textAlign: 'center', paddingVertical: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    dayCircle: { alignItems: 'center', justifyContent: 'center' },
    dayToday: { borderWidth: 1.5, borderColor: theme.accent },
    daySelected: { backgroundColor: theme.accent },
    dayText: { fontFamily: font.medium, fontSize: 14.5, color: theme.text },
    dotRow: { flexDirection: 'row', gap: 3, marginTop: 3, justifyContent: 'center' },
    dot: { width: 5.5, height: 5.5, borderRadius: 3 },

    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: S.md,
      marginTop: S.md,
      paddingHorizontal: S.lg,
      paddingTop: S.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendText: { ...type.caption, color: theme.textMuted },

    dayHeader: { flexDirection: 'row', alignItems: 'center', marginTop: S.xl, marginBottom: S.md },
    dayTitle: { fontFamily: font.displayBold, fontSize: 20, color: theme.text },
    dayDate: { ...type.small, color: theme.textMuted },

    emptyDayCard: { alignItems: 'center', gap: 6, paddingVertical: S.xl },
    emptyDayText: { ...type.small, color: theme.textMuted },

    entryCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: S.sm },
    entryBody: { flex: 1, marginLeft: S.md },
    entryTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
    entryTitle: { ...type.bodyStrong, fontFamily: font.bold, color: theme.text, flexShrink: 1 },
    entrySub: { ...type.small, color: theme.textMuted, marginTop: 2 },
    entryNote: { ...type.small, color: theme.textFaint, marginTop: 3 },
  });
