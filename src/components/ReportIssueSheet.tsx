import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_TITLE_MAX_LENGTH,
  submitIssueReport,
} from '../reportIssue';
import { Palette, R, S, type } from '../theme';
import { useThemedStyles } from '../ThemeContext';
import { appAlert } from './dialog';
import { haptic, Icon, Input, PrimaryButton, Sheet } from './ui';

export default function ReportIssueSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setError(null);
  }, [visible]);

  const close = () => {
    if (!submitting) onClose();
  };

  const submit = async () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (cleanTitle.length < 4) {
      setError('Add a short title with at least 4 characters.');
      return;
    }
    if (cleanDescription.length < 10) {
      setError('Describe what happened using at least 10 characters.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const issue = await submitIssueReport({
        title: cleanTitle,
        description: cleanDescription,
      });
      setTitle('');
      setDescription('');
      haptic.success();
      onClose();
      appAlert('Report sent', `GitHub issue #${issue.number} was created.`, [
        { text: 'Done', style: 'cancel' },
        {
          text: 'View issue',
          onPress: () => Linking.openURL(issue.url).catch(() => {}),
        },
      ]);
    } catch (submitError) {
      haptic.warn();
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Rosewater could not send the report.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close} title="Report an issue">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <Icon name="github" size={20} />
          <Text style={styles.noticeText}>
            Your report, app version, platform, and OS version will be public on GitHub. Rosewater
            will not send your hair care data or photos.
          </Text>
        </View>

        <Text style={styles.label}>What went wrong?</Text>
        <Input
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setError(null);
          }}
          placeholder="Short summary"
          maxLength={REPORT_TITLE_MAX_LENGTH}
        />
        <Text style={styles.count}>
          {title.length}/{REPORT_TITLE_MAX_LENGTH}
        </Text>

        <Text style={styles.label}>What happened?</Text>
        <Input
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            setError(null);
          }}
          placeholder="Tell us what you expected and what happened instead."
          multiline
          minHeight={132}
          maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
        />
        <Text style={styles.count}>
          {description.length}/{REPORT_DESCRIPTION_MAX_LENGTH}
        </Text>

        {error != null && (
          <View style={styles.errorRow}>
            <Icon name="alert-circle-outline" size={18} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <PrimaryButton
          label={submitting ? 'Sending report…' : 'Send report'}
          icon="send"
          disabled={submitting}
          onPress={submit}
          style={{ marginTop: S.md }}
        />
      </ScrollView>
    </Sheet>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: S.sm,
      borderRadius: R.md,
      backgroundColor: theme.cardAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      padding: S.md,
      marginBottom: S.lg,
    },
    noticeText: { ...type.small, color: theme.textMuted, flex: 1 },
    label: { ...type.smallStrong, color: theme.text, marginBottom: S.xs },
    count: {
      ...type.caption,
      color: theme.textFaint,
      textAlign: 'right',
      marginTop: S.xs,
      marginBottom: S.md,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: S.sm,
      backgroundColor: theme.dangerSoft,
      borderRadius: R.md,
      padding: S.md,
    },
    errorText: { ...type.small, color: theme.danger, flex: 1 },
  });
