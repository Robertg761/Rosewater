import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Palette, S, type } from '../theme';
import { useThemedStyles } from '../ThemeContext';
import { haptic, IconBubble, PrimaryButton, Sheet, TextButton } from './ui';
import { UpdateInfo } from '../update';

function formatSize(bytes: number | null): string | null {
  if (bytes == null || bytes <= 0) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Bottom sheet offering a newer GitHub release. The download opens in the
 * browser; Android then prompts to install the APK over this build.
 */
export default function UpdateSheet({
  info,
  visible,
  onClose,
}: {
  info: UpdateInfo | null;
  visible: boolean;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  if (info == null) return null;

  const size = formatSize(info.apkSizeBytes);

  const download = () => {
    haptic.tap();
    Linking.openURL(info.apkUrl).catch(() => {});
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Update available">
      <View style={styles.headerRow}>
        <IconBubble name="rocket-launch-outline" size={44} />
        <View style={styles.headerBody}>
          <Text style={styles.version}>Rosewater v{info.latestVersion}</Text>
          <Text style={styles.meta}>{size != null ? `${size} · ` : ''}from GitHub releases</Text>
        </View>
      </View>

      {info.releaseNotes.length > 0 && (
        <ScrollView style={styles.notes} showsVerticalScrollIndicator={false}>
          <Text style={styles.notesText}>{info.releaseNotes}</Text>
        </ScrollView>
      )}

      <PrimaryButton
        label="Download update"
        icon="download"
        onPress={download}
        style={{ marginTop: S.lg }}
      />
      <TextButton
        label="View release on GitHub"
        icon="open-in-new"
        onPress={() => Linking.openURL(info.releaseUrl).catch(() => {})}
        style={{ marginTop: S.sm, alignSelf: 'center' }}
      />
    </Sheet>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
    headerBody: { flex: 1 },
    version: { ...type.cardTitle, color: theme.text },
    meta: { ...type.small, color: theme.textMuted, marginTop: 1 },
    notes: { maxHeight: 260, marginTop: S.lg },
    notesText: { ...type.small, color: theme.textMuted, lineHeight: 20 },
  });
