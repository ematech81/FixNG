import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rateJob } from '../../api/reviewApi';

const RATING_DIMENSIONS = [
  { key: 'quality', label: 'Quality of Work', icon: '🔨' },
  { key: 'timeliness', label: 'Timeliness', icon: '⏱️' },
  { key: 'communication', label: 'Communication', icon: '💬' },
];

function StarPicker({ value, onChange }) {
  return (
    <View style={styles.starPicker}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} activeOpacity={0.7}>
          <Text style={[styles.star, value >= s && styles.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RateJobScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [ratings, setRatings] = useState({ quality: 0, timeliness: 0, communication: 0 });
  const [comment, setComment] = useState('');
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

    setSubmitting(true);
    try {
      await rateJob(jobId, {
        quality: ratings.quality,
        timeliness: ratings.timeliness,
        communication: ratings.communication,
        comment: comment.trim() || undefined,
      });

      Alert.alert(
        'Review Submitted!',
        'Thank you for rating your artisan. Your review helps build trust on FixNG.',
        [{ text: 'Done', onPress: () => navigation.navigate('CustomerDashboard') }]
      );
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit review.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Skip</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Artisan</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.subtitle}>
          Help future customers by sharing your experience.
        </Text>

        {/* Rating dimensions */}
        {RATING_DIMENSIONS.map((dim) => (
          <View key={dim.key} style={styles.dimensionCard}>
            <View style={styles.dimensionHeader}>
              <Text style={styles.dimensionIcon}>{dim.icon}</Text>
              <Text style={styles.dimensionLabel}>{dim.label}</Text>
            </View>
            <StarPicker
              value={ratings[dim.key]}
              onChange={(v) => setRating(dim.key, v)}
            />
            {ratings[dim.key] > 0 && (
              <Text style={styles.ratingHint}>
                {['', 'Very poor', 'Poor', 'Good', 'Very good', 'Excellent'][ratings[dim.key]]}
              </Text>
            )}
          </View>
        ))}

        {/* Overall preview */}
        {overallScore && (
          <View style={styles.overallCard}>
            <Text style={styles.overallLabel}>Overall Score</Text>
            <Text style={styles.overallScore}>{overallScore} / 5 ⭐</Text>
          </View>
        )}

        {/* Comment */}
        <Text style={styles.label}>Comment (optional)</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Share more about your experience..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.charCount}>{comment.length}/500</Text>

        {/* Submit */}
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

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.navigate('CustomerDashboard')}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { padding: 20, paddingBottom: 30 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  backBtn: { color: '#FF6B00', fontSize: 15, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  dimensionCard: {
    backgroundColor: '#FAFAFA', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0',
  },
  dimensionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dimensionIcon: { fontSize: 22 },
  dimensionLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  starPicker: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 36, color: '#E5E5E5' },
  starFilled: { color: '#F59E0B' },
  ratingHint: { fontSize: 12, color: '#888', marginTop: 6, fontStyle: 'italic' },
  overallCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF3EC', borderRadius: 12, padding: 16, marginBottom: 20,
  },
  overallLabel: { fontSize: 15, fontWeight: '700', color: '#FF6B00' },
  overallScore: { fontSize: 20, fontWeight: '800', color: '#FF6B00' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  commentInput: {
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    padding: 13, fontSize: 15, textAlignVertical: 'top', minHeight: 100,
    backgroundColor: '#FAFAFA',
  },
  charCount: { fontSize: 12, color: '#BBB', textAlign: 'right', marginTop: 4, marginBottom: 24 },
  submitBtn: {
    backgroundColor: '#FF6B00', padding: 16, borderRadius: 12, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#FFCBA4' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  skipBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  skipBtnText: { color: '#BBB', fontSize: 14 },
});
