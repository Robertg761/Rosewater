import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as db from '../db';
import { daysBetween, formatDate, formatDateShort, monthName, relativeDay, today } from '../dates';
import { font, Palette, R, S, shadow, type } from '../theme';
import { useTheme, useThemedStyles } from '../ThemeContext';
import {
  AnimatedIn,
  EmptyState,
  haptic,
  Icon,
  IconButton,
  PressableScale,
  PrimaryButton,
  ScreenHeader,
  SectionTitle,
} from '../components/ui';
import { appAlert } from '../components/dialog';
import { captureAndStorePhoto, removeStoredPhoto } from '../photoStore';
import { Photo } from '../types';

const GAP = S.sm;
const COLS = 3;

export default function PhotosScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const thumbSize = (winWidth - S.lg * 2 - GAP * (COLS - 1)) / COLS;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Photo[]>([]);
  const [viewing, setViewing] = useState<Photo | null>(null);

  const reload = useCallback(() => {
    setPhotos(db.listPhotos());
  }, []);

  useFocusEffect(reload);

  // The journal reads better broken into months than as one endless grid.
  const months = useMemo(() => {
    const out: { key: string; label: string; items: Photo[] }[] = [];
    for (const p of photos) {
      const key = p.date.slice(0, 7);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(p);
      else {
        const [y, m] = key.split('-').map(Number);
        out.push({ key, label: `${monthName(m - 1)} ${y}`, items: [p] });
      }
    }
    return out;
  }, [photos]);

  const addPhoto = async (fromCamera: boolean) => {
    const uri = await captureAndStorePhoto(fromCamera);
    if (uri) {
      db.insertPhoto({ date: today(), uri, note: '', entryId: null });
      haptic.success();
      reload();
    }
  };

  const onTapPhoto = (p: Photo) => {
    haptic.tap();
    if (!compareMode) {
      setViewing(p);
      return;
    }
    setSelected((prev) => {
      if (prev.some((s) => s.id === p.id)) return prev.filter((s) => s.id !== p.id);
      if (prev.length === 2) return [prev[1], p];
      return [...prev, p];
    });
  };

  const deleteViewing = () => {
    if (!viewing) return;
    appAlert('Delete photo?', 'This removes it from your progress journal for good.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          db.deletePhoto(viewing.id);
          removeStoredPhoto(viewing.uri);
          setViewing(null);
          reload();
        },
      },
    ]);
  };

  const comparePair = [...selected].sort((a, b) => a.date.localeCompare(b.date));
  const span =
    comparePair.length === 2 ? daysBetween(comparePair[0].date, comparePair[1].date) : 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Progress Photos"
        subtitle={
          photos.length === 0
            ? 'Watch the change add up'
            : `${photos.length} photo${photos.length === 1 ? '' : 's'} · latest ${relativeDay(photos[0].date)}`
        }
        onBack={() => navigation.goBack()}
        compact
        right={
          photos.length >= 2 ? (
            <IconButton
              name={compareMode ? 'close' : 'compare-horizontal'}
              onPress={() => {
                haptic.tap();
                setCompareMode(!compareMode);
                setSelected([]);
              }}
              background={compareMode ? theme.accentSoft : theme.card}
            />
          ) : undefined
        }
      />

      {compareMode && (
        <AnimatedIn style={styles.compareBanner}>
          <Icon name="compare-horizontal" size={17} color={theme.accent} />
          <Text style={styles.compareBannerText}>
            {selected.length < 2
              ? `Pick ${2 - selected.length} photo${selected.length === 1 ? '' : 's'} to compare`
              : 'Opening comparison…'}
          </Text>
        </AnimatedIn>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {photos.length === 0 ? (
          <EmptyState
            icon="camera-plus"
            title="No photos yet"
            body="Take one every few weeks — same spot, same lighting — and the progress becomes obvious fast."
            action="Take the first one"
            onAction={() => addPhoto(true)}
          />
        ) : (
          months.map((group, gi) => (
            <AnimatedIn key={group.key} delay={gi * 40}>
              <SectionTitle style={gi > 0 ? { marginTop: S.lg } : undefined}>
                {group.label}
              </SectionTitle>
              <View style={styles.grid}>
                {group.items.map((p) => {
                  const index = selected.findIndex((s) => s.id === p.id);
                  return (
                    <PressableScale key={p.id} onPress={() => onTapPhoto(p)} scaleTo={0.94}>
                      <View>
                        <Image
                          source={{ uri: p.uri }}
                          style={[
                            styles.thumb,
                            { width: thumbSize, height: thumbSize },
                            compareMode && index >= 0 && styles.thumbSelected,
                            compareMode && index < 0 && { opacity: 0.55 },
                          ]}
                        />
                        <View style={styles.thumbDatePill}>
                          <Text style={styles.thumbDate}>{formatDateShort(p.date)}</Text>
                        </View>
                        {compareMode && index >= 0 && (
                          <View style={styles.selectBadge}>
                            <Text style={styles.selectBadgeText}>{index + 1}</Text>
                          </View>
                        )}
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </AnimatedIn>
          ))
        )}
      </ScrollView>

      {photos.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + S.md }, shadow(theme, 3)]}>
          <PrimaryButton
            label="Camera"
            icon="camera"
            onPress={() => addPhoto(true)}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Gallery"
            icon="image-multiple-outline"
            variant="soft"
            onPress={() => addPhoto(false)}
            style={{ flex: 1 }}
          />
        </View>
      )}

      {/* Full-size viewer */}
      <Modal
        visible={viewing !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewing(null)}
      >
        <View style={styles.viewerBackdrop}>
          {/* The viewer is black regardless of theme, so the bar must be too. */}
          <StatusBar style="light" />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewing(null)} />
          {viewing && (
            <>
              <View style={[styles.viewerBar, { paddingTop: insets.top + S.sm }]}>
                <View>
                  <Text style={styles.viewerTitle}>{relativeDay(viewing.date)}</Text>
                  <Text style={styles.viewerDate}>{formatDate(viewing.date)}</Text>
                </View>
                <IconButton
                  name="close"
                  onPress={() => setViewing(null)}
                  background="rgba(255,255,255,0.16)"
                  color="#FFFFFF"
                />
              </View>
              <Image
                source={{ uri: viewing.uri }}
                style={{ width: '100%', height: winHeight * 0.66 }}
                resizeMode="contain"
              />
              <View style={[styles.viewerActions, { paddingBottom: insets.bottom + S.lg }]}>
                <PressableScale onPress={deleteViewing} scaleTo={0.94}>
                  <View style={styles.viewerDelete}>
                    <Icon name="trash-can-outline" size={18} color="#FF9B9B" />
                    <Text style={styles.viewerDeleteText}>Delete photo</Text>
                  </View>
                </PressableScale>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Side-by-side compare */}
      <Modal
        visible={compareMode && selected.length === 2}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelected([])}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setSelected([])}>
          <StatusBar style="light" />
          <View style={{ paddingHorizontal: S.md }}>
            <Text style={styles.compareHeading}>
              {span > 0 ? `${span} day${span === 1 ? '' : 's'} apart` : 'Side by side'}
            </Text>
            <View style={styles.compareRow}>
              {comparePair.map((p, i) => (
                <View key={p.id} style={{ flex: 1 }}>
                  <Image source={{ uri: p.uri }} style={styles.compareImage} resizeMode="cover" />
                  <Text style={styles.compareLabel}>{i === 0 ? 'Then' : 'Now'}</Text>
                  <Text style={styles.viewerDate}>{formatDate(p.date)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.compareHint}>Tap anywhere to close</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxl },

    compareBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      justifyContent: 'center',
      backgroundColor: theme.accentSoft,
      paddingVertical: S.sm,
    },
    compareBannerText: { ...type.smallStrong, color: theme.accent },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    thumb: { borderRadius: R.md, backgroundColor: theme.backgroundAlt },
    thumbSelected: { borderWidth: 3, borderColor: theme.accent },
    thumbDatePill: {
      position: 'absolute',
      left: 6,
      bottom: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: R.pill,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    thumbDate: { fontFamily: font.medium, fontSize: 10.5, color: '#FFFFFF' },
    selectBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectBadgeText: { fontFamily: font.black, fontSize: 12, color: theme.onAccent },

    footer: {
      flexDirection: 'row',
      gap: S.md,
      paddingHorizontal: S.lg,
      paddingTop: S.md,
      backgroundColor: theme.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },

    // Opaque, not translucent: a photo reads badly with the grid ghosting through.
    viewerBackdrop: { flex: 1, backgroundColor: '#0B0A0D', justifyContent: 'center' },
    viewerBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: S.lg,
      paddingBottom: S.md,
    },
    viewerTitle: { fontFamily: font.displayBold, fontSize: 20, color: '#FFFFFF' },
    viewerDate: { fontFamily: font.regular, fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
    viewerActions: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
    viewerDelete: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: S.md },
    viewerDeleteText: { fontFamily: font.bold, fontSize: 15, color: '#FF9B9B' },

    compareHeading: {
      fontFamily: font.displayBold,
      fontSize: 19,
      color: '#FFFFFF',
      textAlign: 'center',
      marginBottom: S.md,
    },
    compareRow: { flexDirection: 'row', gap: S.sm },
    compareImage: { width: '100%', aspectRatio: 0.75, borderRadius: R.md },
    compareLabel: {
      fontFamily: font.bold,
      fontSize: 14,
      color: '#FFFFFF',
      textAlign: 'center',
      marginTop: S.sm,
    },
    compareHint: {
      fontFamily: font.regular,
      fontSize: 13,
      color: 'rgba(255,255,255,0.5)',
      textAlign: 'center',
      marginTop: S.xl,
    },
  });
