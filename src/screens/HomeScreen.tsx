import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import * as db from '../db';
import { today, daysBetween, formatDateShort, formatDateLong, greeting, relativeDay } from '../dates';
import { entryTypeMeta, entryTypesLabel, font, Palette, primaryEntryType, R, S, shadow, type, WASH_TYPES } from '../theme';
import { useTheme, useThemedStyles } from '../ThemeContext';
import {
  AnimatedIn,
  Badge,
  Card,
  EmptyState,
  Icon,
  IconBubble,
  PrimaryButton,
  ProgressRing,
  ScreenHeader,
  SectionTitle,
  StarRow,
} from '../components/ui';
import { EntryWithDetails, RootStackParamList, TabParamList } from '../types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Stats {
  wash: EntryWithDetails | null;
  deep: string | null;
  trim: string | null;
  recent: EntryWithDetails[];
  vitaminsDone: number;
  vitaminsTotal: number;
  streak: number;
  photoCount: number;
  lastPhoto: string | null;
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      const t = today();
      const vitamins = db.listVitamins();
      const checked = db.vitaminsCheckedOn(t);
      const entries = db.listEntries(200);
      const photos = db.listPhotos();
      setStats({
        wash: entries.find((e) => e.types.some((t) => WASH_TYPES.includes(t))) ?? null,
        deep: db.lastDateOfTypes(['deep']),
        trim: db.lastDateOfTypes(['trim']),
        recent: entries.slice(0, 4),
        vitaminsDone: vitamins.filter((v) => checked.has(v.id)).length,
        vitaminsTotal: vitamins.length,
        streak: db.vitaminStreak(t),
        photoCount: photos.length,
        lastPhoto: photos[0]?.date ?? null,
      });
    }, [])
  );

  const t = today();

  if (!stats) return <View style={styles.screen} />;

  const daysSince = (d: string | null) => (d == null ? null : daysBetween(d, t));
  const washDays = daysSince(stats.wash?.date ?? null);
  const vitaminProgress =
    stats.vitaminsTotal === 0 ? 0 : stats.vitaminsDone / stats.vitaminsTotal;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={greeting()}
        subtitle={formatDateLong(t)}
        right={
          stats.streak > 0 ? (
            <Badge
              icon="fire"
              label={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`}
              color={theme.star}
            />
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedIn>
          <WashHero days={washDays} entry={stats.wash} />
        </AnimatedIn>

        <AnimatedIn delay={50}>
          <View style={styles.tileRow}>
            <MiniTile
              icon="bottle-tonic-plus"
              color={entryTypeMeta.deep.color}
              label="Deep condition"
              days={daysSince(stats.deep)}
              date={stats.deep}
            />
            <MiniTile
              icon="content-cut"
              color={entryTypeMeta.trim.color}
              label="Last trim"
              days={daysSince(stats.trim)}
              date={stats.trim}
            />
          </View>
        </AnimatedIn>

        <AnimatedIn delay={100}>
          <PrimaryButton
            label="Log a wash day"
            icon="plus"
            size="lg"
            onPress={() => navigation.navigate('LogEntry')}
            style={{ marginBottom: S.md }}
          />
        </AnimatedIn>

        <AnimatedIn delay={150}>
          <Card onPress={() => navigation.navigate('Vitamins')} style={styles.quickCard}>
            <ProgressRing
              progress={vitaminProgress}
              size={52}
              thickness={6}
              color={vitaminProgress >= 1 ? theme.success : theme.accent}
            >
              <Text style={styles.ringText}>
                {stats.vitaminsTotal === 0 ? '–' : `${stats.vitaminsDone}/${stats.vitaminsTotal}`}
              </Text>
            </ProgressRing>
            <View style={styles.quickBody}>
              <Text style={styles.cardTitle}>Today's vitamins</Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {stats.vitaminsTotal === 0
                  ? 'Tap to set up your daily list'
                  : stats.vitaminsDone === stats.vitaminsTotal
                    ? 'All done for today'
                    : `${stats.vitaminsTotal - stats.vitaminsDone} left to check off`}
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color={theme.textFaint} />
          </Card>

          <Card onPress={() => navigation.navigate('Photos')} style={styles.quickCard}>
            <IconBubble name="camera" size={52} iconSize={25} />
            <View style={styles.quickBody}>
              <Text style={styles.cardTitle}>Progress photos</Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {stats.photoCount === 0
                  ? 'Start your before-and-after'
                  : `${stats.photoCount} photo${stats.photoCount === 1 ? '' : 's'} · latest ${relativeDay(stats.lastPhoto!)}`}
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color={theme.textFaint} />
          </Card>
        </AnimatedIn>

        <AnimatedIn delay={200}>
          <SectionTitle
            action={stats.recent.length > 0 ? 'See all' : undefined}
            onAction={() => navigation.navigate('Calendar')}
            style={{ marginTop: S.md }}
          >
            Recent
          </SectionTitle>
          {stats.recent.length === 0 ? (
            <Card>
              <EmptyState
                icon="notebook-heart-outline"
                title="Nothing logged yet"
                body="Your first wash day takes about thirty seconds — and future you will be glad you did it."
                action="Log a wash day"
                onAction={() => navigation.navigate('LogEntry')}
              />
            </Card>
          ) : (
            stats.recent.map((e) => {
              const meta = entryTypeMeta[primaryEntryType(e.types)] ?? entryTypeMeta.other;
              return (
                <Card
                  key={e.id}
                  onPress={() => navigation.navigate('LogEntry', { entryId: e.id })}
                  style={styles.entryCard}
                >
                  <IconBubble name={meta.icon} color={meta.color} size={42} />
                  <View style={styles.entryBody}>
                    <Text style={styles.entryTitle} numberOfLines={1}>
                      {entryTypesLabel(e.types)}
                    </Text>
                    <Text style={styles.entrySub} numberOfLines={1}>
                      {relativeDay(e.date)}
                      {e.productNames.length > 0 ? ` · ${e.productNames.join(', ')}` : ''}
                    </Text>
                  </View>
                  {e.rating != null && <StarRow value={e.rating} />}
                  <Icon
                    name="chevron-right"
                    size={20}
                    color={theme.textFaint}
                    style={{ marginLeft: 4 }}
                  />
                </Card>
              );
            })
          )}
        </AnimatedIn>
      </ScrollView>
    </View>
  );
}

/** Headline metric: how long since the last wash, with the entry that set it. */
function WashHero({ days, entry }: { days: number | null; entry: EntryWithDetails | null }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const meta = entry ? entryTypeMeta[primaryEntryType(entry.types)] ?? entryTypeMeta.other : null;

  return (
    <LinearGradient
      colors={[theme.accentSofter, theme.card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, shadow(theme, 2)]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.heroLabel}>Since last wash</Text>
        {days == null ? (
          <>
            <Text style={styles.heroNumberEmpty}>No washes yet</Text>
            <Text style={styles.heroSub}>Log one to start tracking your rhythm</Text>
          </>
        ) : (
          <>
            <View style={styles.heroNumberRow}>
              <Text style={styles.heroNumber}>{days}</Text>
              <Text style={styles.heroUnit}>{days === 1 ? 'day' : 'days'}</Text>
            </View>
            <Text style={styles.heroSub} numberOfLines={1}>
              {meta!.label} · {formatDateShort(entry!.date)}
            </Text>
          </>
        )}
      </View>
      <View style={styles.heroIcon}>
        <Icon name="shower-head" size={30} color={theme.accent} />
      </View>
    </LinearGradient>
  );
}

function MiniTile({
  icon,
  color,
  label,
  days,
  date,
}: {
  icon: string;
  color: string;
  label: string;
  days: number | null;
  date: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Card style={styles.tile}>
      <IconBubble name={icon} color={color} size={34} />
      {days == null ? (
        <Text style={styles.tileEmpty}>Not yet</Text>
      ) : (
        <View style={styles.tileNumberRow}>
          <Text style={styles.tileNumber}>{days}</Text>
          <Text style={styles.tileUnit}>{days === 1 ? 'day' : 'days'}</Text>
        </View>
      )}
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileDate}>{date == null ? 'nothing logged' : formatDateShort(date)}</Text>
    </Card>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxl },

    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: R.xl,
      padding: S.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      marginBottom: S.md,
    },
    heroLabel: { ...type.label, color: theme.textMuted },
    heroNumberRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
    heroNumber: { fontFamily: font.displayBold, fontSize: 46, lineHeight: 54, color: theme.accent },
    heroUnit: { fontFamily: font.bold, fontSize: 17, color: theme.accent, marginLeft: 7 },
    heroNumberEmpty: {
      fontFamily: font.displayBold,
      fontSize: 24,
      lineHeight: 34,
      color: theme.accent,
      marginTop: 2,
    },
    heroSub: { ...type.small, color: theme.textMuted, marginTop: 1 },
    heroIcon: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: theme.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: S.md,
    },

    tileRow: { flexDirection: 'row', gap: S.md, marginBottom: S.md },
    tile: { flex: 1, paddingVertical: S.md },
    tileNumberRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: S.md },
    tileNumber: { fontFamily: font.displayBold, fontSize: 26, lineHeight: 30, color: theme.text },
    tileUnit: { ...type.caption, color: theme.textMuted, marginLeft: 4 },
    tileEmpty: {
      fontFamily: font.displayBold,
      fontSize: 19,
      lineHeight: 30,
      color: theme.textMuted,
      marginTop: S.md,
    },
    tileLabel: { ...type.smallStrong, color: theme.text, marginTop: 2 },
    tileDate: { ...type.caption, color: theme.textFaint, marginTop: 1 },

    quickCard: { flexDirection: 'row', alignItems: 'center', marginBottom: S.md },
    quickBody: { flex: 1, marginLeft: S.md, marginRight: S.sm },
    ringText: { fontFamily: font.bold, fontSize: 12, color: theme.text },
    cardTitle: { ...type.cardTitle, color: theme.text },
    cardSub: { ...type.small, color: theme.textMuted, marginTop: 1 },

    entryCard: { flexDirection: 'row', alignItems: 'center', marginBottom: S.sm },
    entryBody: { flex: 1, marginLeft: S.md, marginRight: S.sm },
    entryTitle: { ...type.bodyStrong, fontFamily: font.bold, color: theme.text },
    entrySub: { ...type.small, color: theme.textMuted, marginTop: 1 },
  });
