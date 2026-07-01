import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rateJob } from '../../api/reviewApi';
import BackButton from '../../components/BackButton';
import { useTheme } from '../../context/ThemeContext';

const RATING_DIMENSIONS = [
  { key: 'quality', label: 'Quality of Work', icon: '🔨' },
  { key: 'timeliness', label: 'Timeliness', icon: '⏱️' },
  { key: 'communication', label: 'Communication', icon: '💬' },
];

function StarPicker({ value, onChange, colors }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} activeOpacity={0.7}>
          <Text style={{ fontSize: 36, color: value >= s ? colors.star : colors.starEmpty }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RateJobScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { jobId, artisanCode: prefilledCode } = route.params;
  const [ratings, setRatings]     = useState({ quality: 0, timeliness: 0, communication: 0 });
  const [comment, setComment]     = useState('');
  const [artisanCode, setArtisanCode] = useState(prefilledCode || '');
  const [submitting, setSubmitting] = useState(false);

  const setRating = (key, value) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const overallScore = ratings.quality && ratings.timeliness && ratings.communication
    ? ((ratings.quality + ratings.timeliness + ratings.communication) / 3).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!ratings.quality || !ratings.timeliness || !ratings.communication) {
      Alert.alert('Rate All Areas', 'Please rate quality, timeliness, and communication.');
      return;
    }

    const trimmedCode = artisanCode.trim().toUpperCase();
    if (trimmedCode && !/^FNG-[A-Z0-9]{5}$/.test(trimmedCode)) {
      Alert.alert('Invalid ID', 'Artisan ID must be in the format FNG-XXXXX (e.g. FNG-AB23K).');
      return;
    }

    setSubmitting(true);
    try {
      await rateJob(jobId, {
        quality: ratings.quality,
        timeliness: ratings.timeliness,
        communication: ratings.communication,
        comment: comment.trim() || undefined,
        artisanCode: trimmedCode || undefined,
      });

      Alert.alert(
        'Review Submitted!',
        'Thank you for rating your artisan. Your review helps build trust on FixNG.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={styles.headerTitle}>Rate Artisan</Text>
            <View style={{ width: 28 }} />
          </View>

          <Text style={styles.subtitle}>
            Help future customers by sharing your experience.
          </Text>

          {RATING_DIMENSIONS.map((dim) => (
            <View key={dim.key} style={styles.dimensionCard}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionIcon}>{dim.icon}</Text>
                <Text style={styles.dimensionLabel}>{dim.label}</Text>
              </View>
              <StarPicker
                value={ratings[dim.key]}
                onChange={(v) => setRating(dim.key, v)}
                colors={colors}
              />
              {ratings[dim.key] > 0 && (
                <Text style={styles.ratingHint}>
                  {['', 'Very poor', 'Poor', 'Good', 'Very good', 'Excellent'][ratings[dim.key]]}
                </Text>
              )}
            </View>
          ))}

          {overallScore && (
            <View style={styles.overallCard}>
              <Text style={styles.overallLabel}>Overall Score</Text>
              <Text style={styles.overallScore}>{overallScore} / 5 ⭐</Text>
            </View>
          )}

          <Text style={styles.label}>Comment (optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Share more about your experience..."
            placeholderTextColor={colors.textHint}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            maxLength={500}
            color={colors.text}
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>

          <Text style={styles.label}>Artisan ID (optional)</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="FNG-XXXXX"
            placeholderTextColor={colors.textHint}
            value={artisanCode}
            onChangeText={(t) => setArtisanCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={9}
            color={colors.text}
          />
          <Text style={styles.codeHint}>
            Confirm the artisan who served you. Copy from the job detail screen.
          </Text>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Review</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 60 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  dimensionCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight,
  },
  dimensionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dimensionIcon: { fontSize: 22 },
  dimensionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  ratingHint: { fontSize: 12, color: colors.textMuted, marginTop: 6, fontStyle: 'italic' },
  overallCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, marginBottom: 20,
  },
  overallLabel: { fontSize: 15, fontWeight: '700', color: colors.primary },
  overallScore: { fontSize: 20, fontWeight: '800', color: colors.primary },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSub, marginBottom: 8 },
  commentInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 10,
    padding: 13, fontSize: 15, textAlignVertical: 'top', minHeight: 100,
    backgroundColor: colors.surface,
  },
  charCount: { fontSize: 12, color: colors.textHint, textAlign: 'right', marginTop: 4, marginBottom: 20 },
  codeInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 10,
    padding: 13, fontSize: 16, letterSpacing: 2,
    backgroundColor: colors.surface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeHint: { fontSize: 11, color: colors.textHint, marginTop: 4, marginBottom: 24 },
  submitBtn: {
    backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: colors.primaryDisabled },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  skipBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  skipBtnText: { color: colors.textHint, fontSize: 14 },
});
