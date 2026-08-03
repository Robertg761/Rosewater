import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as db from '../db';
import { categoryIcons, Palette, S, type } from '../theme';
import { useTheme, useThemedStyles } from '../ThemeContext';
import {
  AnimatedIn,
  Badge,
  Card,
  Chip,
  EmptyState,
  Fab,
  haptic,
  Icon,
  IconBubble,
  Input,
  PrimaryButton,
  RatingStars,
  ScreenHeader,
  SectionTitle,
  Sheet,
  StarRow,
  TextButton,
} from '../components/ui';
import { appAlert } from '../components/dialog';
import { Product } from '../types';

const CATEGORIES = [
  'Shampoo',
  'Conditioner',
  'Deep conditioner',
  'Leave-in',
  'Oil',
  'Styler',
  'Treatment',
  'Other',
];

export default function ProductsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const reload = useCallback(() => {
    setProducts(db.listProducts(true));
  }, []);

  useFocusEffect(reload);

  const active = products.filter((p) => p.archived === 0);
  const archived = products.filter((p) => p.archived === 1);

  // Group the shelf by product type, in the same order the editor offers them,
  // so a growing shelf still reads like a shelf rather than one long list.
  const groups = useMemo(() => {
    const byCategory = new Map<string, Product[]>();
    for (const p of active) {
      const key = p.category === '' ? 'Uncategorised' : p.category;
      byCategory.set(key, [...(byCategory.get(key) ?? []), p]);
    }
    const ordered = [...CATEGORIES, 'Uncategorised'].filter((c) => byCategory.has(c));
    const extra = [...byCategory.keys()].filter((c) => !ordered.includes(c));
    return [...ordered, ...extra].map((c) => ({ category: c, items: byCategory.get(c)! }));
  }, [active]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Product Shelf"
        subtitle={
          active.length === 0
            ? 'What you use, and what actually works'
            : `${active.length} product${active.length === 1 ? '' : 's'}${archived.length > 0 ? ` · ${archived.length} archived` : ''}`
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {products.length === 0 ? (
          <EmptyState
            icon="bottle-tonic-outline"
            title="Your shelf is empty"
            body="Add the products you use so you can tag them on wash days and remember which ones actually work."
            action="Add your first product"
            onAction={() => setEditing('new')}
          />
        ) : (
          <>
            {groups.map((g, gi) => (
              <AnimatedIn key={g.category} delay={gi * 40}>
                <SectionTitle style={gi > 0 ? { marginTop: S.lg } : undefined}>
                  {g.category}
                </SectionTitle>
                {g.items.map((p) => (
                  <ProductRow key={p.id} product={p} onPress={() => setEditing(p)} />
                ))}
              </AnimatedIn>
            ))}

            {archived.length > 0 && (
              <AnimatedIn delay={groups.length * 40}>
                <SectionTitle style={{ marginTop: S.lg }}>Archived</SectionTitle>
                {archived.map((p) => (
                  <ProductRow key={p.id} product={p} onPress={() => setEditing(p)} />
                ))}
              </AnimatedIn>
            )}
          </>
        )}
      </ScrollView>

      <Fab
        icon="plus"
        label="Add product"
        onPress={() => setEditing('new')}
        style={[styles.fab, { bottom: Math.max(S.lg, insets.bottom) }]}
      />

      <ProductEditor
        product={editing === 'new' || editing === null ? null : editing}
        visible={editing !== null}
        onClose={() => {
          setEditing(null);
          reload();
        }}
      />
    </View>
  );
}

function ProductRow({ product, onPress }: { product: Product; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isArchived = product.archived === 1;
  return (
    <Card
      onPress={onPress}
      style={[styles.productCard, isArchived && { opacity: 0.6 }]}
    >
      <IconBubble
        name={categoryIcons[product.category] ?? 'bottle-tonic'}
        size={44}
        color={isArchived ? theme.textMuted : theme.accent}
      />
      <View style={styles.productBody}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.name}
        </Text>
        {product.rating != null ? (
          <StarRow value={product.rating} size={14} />
        ) : (
          <Text style={styles.productHint}>Not rated yet</Text>
        )}
        {product.notes !== '' && (
          <Text style={styles.productNotes} numberOfLines={2}>
            {product.notes}
          </Text>
        )}
      </View>
      {isArchived ? (
        <Badge label="Archived" color={theme.textMuted} />
      ) : (
        <Icon name="chevron-right" size={20} color={theme.textFaint} />
      )}
    </Card>
  );
}

function ProductEditor({
  product,
  visible,
  onClose,
}: {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  // The sheet stays mounted so it can animate out, so the fields are reloaded
  // each time it opens rather than on mount.
  useEffect(() => {
    if (!visible) return;
    setName(product?.name ?? '');
    setCategory(product?.category ?? '');
    setRating(product?.rating ?? null);
    setNotes(product?.notes ?? '');
  }, [visible, product?.id]);

  const save = () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      haptic.warn();
      appAlert('Name needed', 'Give the product a name so you can find it later.');
      return;
    }
    const data = { name: trimmed, category, rating, notes: notes.trim() };
    if (product) db.updateProduct(product.id, data);
    else db.insertProduct(data);
    haptic.success();
    onClose();
  };

  const archive = () => {
    if (!product) return;
    db.setProductArchived(product.id, product.archived === 0);
    onClose();
  };

  const remove = () => {
    if (!product) return;
    appAlert(
      'Delete product?',
      'It will also disappear from past entries. Archiving keeps your history intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            db.deleteProduct(product.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={product ? 'Edit product' : 'New product'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SectionTitle>Name</SectionTitle>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Shea Moisture shampoo"
          returnKeyType="done"
        />

        <SectionTitle style={{ marginTop: S.lg }}>Type</SectionTitle>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              icon={categoryIcons[c]}
              selected={category === c}
              onPress={() => setCategory(category === c ? '' : c)}
            />
          ))}
        </View>

        <SectionTitle style={{ marginTop: S.sm }}>Rating</SectionTitle>
        <Card style={styles.ratingCard}>
          <RatingStars value={rating} onChange={setRating} size={32} />
          <Text style={styles.ratingHint}>
            {rating == null ? 'Tap a star to rate' : 'Tap it again to clear'}
          </Text>
        </Card>

        <SectionTitle style={{ marginTop: S.lg }}>Notes</SectionTitle>
        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Love it? Hate it? Makes hair soft but greasy?"
          multiline
        />

        <PrimaryButton
          label={product ? 'Save changes' : 'Add to shelf'}
          icon="check"
          onPress={save}
          size="lg"
          style={{ marginTop: S.xl }}
        />

        {product && (
          <View style={styles.editorActions}>
            <TextButton
              label={product.archived === 1 ? 'Unarchive' : 'Archive'}
              icon={product.archived === 1 ? 'archive-arrow-up-outline' : 'archive-arrow-down-outline'}
              onPress={archive}
            />
            <TextButton
              label="Delete"
              icon="trash-can-outline"
              color={theme.danger}
              onPress={remove}
            />
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: S.lg, paddingTop: S.sm, paddingBottom: 96 },
    fab: { position: 'absolute', right: S.lg },

    productCard: { flexDirection: 'row', alignItems: 'center', marginBottom: S.sm },
    productBody: { flex: 1, marginLeft: S.md, marginRight: S.sm, gap: 3 },
    productName: { ...type.cardTitle, color: theme.text },
    productHint: { ...type.caption, color: theme.textFaint },
    productNotes: { ...type.small, color: theme.textMuted },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    ratingCard: { alignItems: 'center', gap: S.sm, paddingVertical: S.lg },
    ratingHint: { ...type.caption, color: theme.textFaint, alignSelf: 'stretch', textAlign: 'center' },
    editorActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: S.xxl,
      marginTop: S.lg,
      marginBottom: S.sm,
    },
  });
