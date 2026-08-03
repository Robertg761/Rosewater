import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as db from '../db';
import { addDays, formatDate, relativeDay, today } from '../dates';
import { entryTypeMeta, entryTypeOrder, font, Palette, R, S, shadow, type } from '../theme';
import { useTheme, useThemedStyles } from '../ThemeContext';
import {
  Card,
  Chip,
  haptic,
  Icon,
  IconButton,
  Input,
  PressableScale,
  PrimaryButton,
  RatingStars,
  ScreenHeader,
  SectionTitle,
  useKeyboardHeight,
} from '../components/ui';
import { appAlert } from '../components/dialog';
import { captureAndStorePhoto, removeStoredPhoto } from '../photoStore';
import { Product, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'LogEntry'>;
type Route = RouteProp<RootStackParamList, 'LogEntry'>;

export default function LogEntryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const entryId = route.params?.entryId;
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();

  const [date, setDate] = useState(route.params?.date ?? today());
  const [types, setTypes] = useState<string[]>(['wash']);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [newPhotoUris, setNewPhotoUris] = useState<string[]>([]);
  const newPhotoUrisRef = useRef<string[]>([]);
  const savedRef = useRef(false);

  // New photos are copied into app storage as soon as they're picked; if the
  // user backs out without saving, delete those copies or they'd sit on disk
  // with no database row pointing at them.
  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      if (!savedRef.current) {
        for (const uri of newPhotoUrisRef.current) removeStoredPhoto(uri);
      }
    });
  }, [navigation]);

  useEffect(() => {
    setProducts(db.listProducts());
    if (entryId != null) {
      const e = db.getEntry(entryId);
      if (e) {
        setDate(e.date);
        setTypes(e.types);
        setRating(e.rating);
        setNote(e.note);
        setSelectedProducts(new Set(e.productIds));
        setPhotoUris(e.photoUris);
      }
    }
  }, [entryId]);

  const toggleType = (t: string) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const toggleProduct = (id: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addPhoto = async (fromCamera: boolean) => {
    const uri = await captureAndStorePhoto(fromCamera);
    if (uri) {
      newPhotoUrisRef.current = [...newPhotoUrisRef.current, uri];
      setNewPhotoUris(newPhotoUrisRef.current);
    }
  };

  const dropNewPhoto = (uri: string) => {
    haptic.tap();
    removeStoredPhoto(uri);
    newPhotoUrisRef.current = newPhotoUrisRef.current.filter((u) => u !== uri);
    setNewPhotoUris(newPhotoUrisRef.current);
  };

  const save = () => {
    const data = { date, types, rating, note: note.trim() };
    const productIds = [...selectedProducts];
    let id: number;
    if (entryId != null) {
      db.updateEntry(entryId, data, productIds);
      id = entryId;
    } else {
      id = db.insertEntry(data, productIds);
    }
    for (const uri of newPhotoUris) {
      db.insertPhoto({ date, uri, note: '', entryId: id });
    }
    savedRef.current = true;
    haptic.success();
    navigation.goBack();
  };

  const remove = () => {
    if (entryId == null) return;
    appAlert('Delete entry?', 'This removes the entry from your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          db.deleteEntry(entryId);
          navigation.goBack();
        },
      },
    ]);
  };

  const isToday = date === today();
  const allPhotos = [...photoUris.map((u) => ({ uri: u, isNew: false })), ...newPhotoUris.map((u) => ({ uri: u, isNew: true }))];

  return (
    // Reserve the keyboard's space so the notes field and the save bar stay
    // above it — Android's edge-to-edge window no longer resizes for the IME.
    <View style={[styles.screen, { paddingBottom: keyboard }]}>
      <ScreenHeader
        title={entryId != null ? 'Edit entry' : 'Log a day'}
        subtitle={relativeDay(date)}
        onBack={() => navigation.goBack()}
        backIcon="close"
        compact
        right={
          entryId != null ? (
            <IconButton name="trash-can-outline" onPress={remove} color={theme.danger} />
          ) : undefined
        }
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SectionTitle>Date</SectionTitle>
          <Card style={styles.dateCard}>
            <PressableScale onPress={() => setDate(addDays(date, -1))} scaleTo={0.85} hitSlop={6}>
              <View style={styles.dateBtn}>
                <Icon name="chevron-left" size={22} color={theme.accent} />
              </View>
            </PressableScale>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.dateText}>{formatDate(date)}</Text>
              {isToday ? (
                <Text style={styles.dateHint}>Today</Text>
              ) : (
                <PressableScale onPress={() => setDate(today())} scaleTo={0.9}>
                  <Text style={styles.dateLink}>Jump to today</Text>
                </PressableScale>
              )}
            </View>
            <PressableScale
              onPress={() => !isToday && setDate(addDays(date, 1))}
              scaleTo={0.85}
              hitSlop={6}
            >
              <View style={[styles.dateBtn, isToday && { opacity: 0.3 }]}>
                <Icon name="chevron-right" size={22} color={theme.accent} />
              </View>
            </PressableScale>
          </Card>

          <SectionTitle style={{ marginTop: S.lg }}>What did you do?</SectionTitle>
          <View style={styles.chipWrap}>
            {entryTypeOrder.map((t) => (
              <Chip
                key={t}
                label={entryTypeMeta[t].label}
                icon={entryTypeMeta[t].icon}
                selected={types.includes(t)}
                color={entryTypeMeta[t].color}
                onPress={() => toggleType(t)}
              />
            ))}
          </View>

          <SectionTitle style={{ marginTop: S.sm }}>Products used</SectionTitle>
          {products.length === 0 ? (
            <Card style={styles.hintCard}>
              <Icon name="bottle-tonic-outline" size={20} color={theme.textFaint} />
              <Text style={styles.hintText}>
                No products yet — add some on the Shelf tab and they'll show up here.
              </Text>
            </Card>
          ) : (
            <View style={styles.chipWrap}>
              {products.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  selected={selectedProducts.has(p.id)}
                  onPress={() => toggleProduct(p.id)}
                />
              ))}
            </View>
          )}

          <SectionTitle style={{ marginTop: S.sm }}>How did your hair turn out?</SectionTitle>
          <Card style={styles.ratingCard}>
            <RatingStars value={rating} onChange={setRating} size={34} />
            <Text style={styles.ratingHint}>
              {rating == null ? 'Optional — tap a star' : 'Tap it again to clear'}
            </Text>
          </Card>

          <SectionTitle style={{ marginTop: S.lg }}>Notes</SectionTitle>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder="Felt dry, loved the smell, lots of shedding…"
            multiline
          />

          <SectionTitle style={{ marginTop: S.lg }}>Photos</SectionTitle>
          <View style={styles.photoRow}>
            {allPhotos.map(({ uri, isNew }) => (
              <View key={uri}>
                <Image source={{ uri }} style={styles.photoThumb} />
                {isNew && (
                  <PressableScale
                    onPress={() => dropNewPhoto(uri)}
                    scaleTo={0.85}
                    style={styles.photoRemove}
                  >
                    <View style={styles.photoRemoveInner}>
                      <Icon name="close" size={14} color="#FFFFFF" />
                    </View>
                  </PressableScale>
                )}
              </View>
            ))}
            <PhotoAddTile icon="camera" label="Camera" onPress={() => addPhoto(true)} />
            <PhotoAddTile icon="image-multiple-outline" label="Gallery" onPress={() => addPhoto(false)} />
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: (keyboard > 0 ? 0 : insets.bottom) + S.md },
            shadow(theme, 3),
          ]}
        >
          <PrimaryButton
            label={
              types.length === 0
                ? 'Pick what you did'
                : entryId != null
                  ? 'Save changes'
                  : 'Save entry'
            }
            icon="check"
            size="lg"
            disabled={types.length === 0}
            onPress={save}
          />
        </View>
      </View>
    </View>
  );
}

function PhotoAddTile({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <PressableScale onPress={onPress} scaleTo={0.93}>
      <View style={styles.photoAdd}>
        <Icon name={icon} size={22} color={theme.accent} />
        <Text style={styles.photoAddLabel}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxl },

    dateCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: S.md,
    },
    dateBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.accentSofter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateText: { fontFamily: font.displayBold, fontSize: 18, color: theme.text },
    dateHint: { ...type.caption, color: theme.textFaint, marginTop: 1 },
    dateLink: { ...type.caption, color: theme.accent, marginTop: 1 },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    hintCard: { flexDirection: 'row', alignItems: 'center', gap: S.md },
    hintText: { ...type.small, color: theme.textMuted, flex: 1 },

    ratingCard: { alignItems: 'center', gap: S.sm, paddingVertical: S.lg },
    ratingHint: { ...type.caption, color: theme.textFaint, alignSelf: 'stretch', textAlign: 'center' },

    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
    photoThumb: { width: 78, height: 78, borderRadius: R.md, backgroundColor: theme.border },
    photoRemove: { position: 'absolute', top: -6, right: -6 },
    photoRemoveInner: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.background,
    },
    photoAdd: {
      width: 78,
      height: 78,
      borderRadius: R.md,
      borderWidth: 1.5,
      borderColor: theme.borderStrong,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      backgroundColor: theme.cardAlt,
    },
    photoAddLabel: { ...type.caption, color: theme.textMuted },

    footer: {
      paddingHorizontal: S.lg,
      paddingTop: S.md,
      backgroundColor: theme.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
  });
