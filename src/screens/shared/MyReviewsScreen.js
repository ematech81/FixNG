import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackButton from '../../components/BackButton';
import { getMyReviews } from '../../api/reviewApi';
import { getUser } from '../../utils/storage';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  primary: '#2563EB',
  gold:    '#F59E0B',
  green:   '#16A34A',
  text:    '#0F172A',
  sub:     '#64748B',
  muted:   '#94A3B8',
  border:  '#E2E8F0',
  surface: '#FFFFFF',
  bg:      '#F8FAFF',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StarRow({ score, size = 16 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text key={n} style={{ fontSize: size, color: n <= Math.round(score) ? C.gold : '#E2E8F0' }}>
          ★
        </Text>
      ))}
    </View>
  );
}

function RatingPill({ label, value }) {
  return (
    <View style={styles.ratingPill}>
      <Text style={styles.ratingPillLabel}>{label}</Text>
      <Text style={styles.ratingPillValue}>{value}/5</Text>
    </View>
  );
}

export default function MyReviewsScreen({ navigation }) {
  const [role, setRole]         = useState(null);
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadInitial();
    }, [])
  );

  const loadInitial = async () => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    try {
      const u = await getUser();
      setRole(u?.role);
      const res = await getMyReviews({ page: 1, limit: 15 });
      const data = res.data.data || [];
      setReviews(data);
      setHasMore(data.length === 15);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await getMyReviews({ page: nextPage, limit: 15 });
      const data = res.data.data || [];
      setReviews((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === 15);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  const isArtisan = role === 'artisan';

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(isArtisan ? item.customerName : item.artisanName)[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.personName}>
            {isArtisan ? item.customerName : item.artisanName}
          </Text>
          <Text style={styles.jobCat}>{item.jobCategory}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{item.overallScore.toFixed(1)}</Text>
            <Text style={styles.scoreStar}>★</Text>
          </View>
          <Text style={styles.timeAgo}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>

      {/* Star row */}
      <StarRow score={item.overallScore} size={18} />

      {/* Sub-ratings */}
      <View style={styles.pillRow}>
        <RatingPill label="Quality"       value={item.ratings?.quality} />
        <RatingPill label="Timeliness"    value={item.ratings?.timeliness} />
        <RatingPill label="Communication" value={item.ratings?.communication} />
      </View>

      {/* Comment */}
      {item.comment ? (
        <View style={styles.commentBox}>
          <Text style={styles.commentText}>"{item.comment}"</Text>
        </View>
      ) : null}
    </View>
  );

  const EmptyState = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{isArtisan ? '⭐' : '📝'}</Text>
      <Text style={styles.emptyTitle}>
        {isArtisan ? 'No reviews yet' : 'No reviews given yet'}
      </Text>
      <Text style={styles.emptyBody}>
        {isArtisan
          ? 'When customers rate your completed jobs, their reviews will appear here.'
          : 'After completing a job, you can rate the artisan. Your reviews will appear here.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, reviews.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: 16, paddingBottom: 40 },
  listEmpty: { flex: 1 },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
  },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: C.primary },
  personName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 1 },
  jobCat:     { fontSize: 12, color: C.sub },

  scoreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FFFBEB', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  scoreText: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  scoreStar: { fontSize: 12, color: C.gold },
  timeAgo:   { fontSize: 11, color: C.muted, marginTop: 4 },

  pillRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  ratingPillLabel: { fontSize: 11, color: C.sub, fontWeight: '600' },
  ratingPillValue: { fontSize: 11, color: C.text, fontWeight: '800' },

  commentBox: {
    marginTop: 12, backgroundColor: '#F8FAFF', borderRadius: 10,
    padding: 12, borderLeftWidth: 3, borderLeftColor: C.primary,
  },
  commentText: { fontSize: 13, color: C.sub, lineHeight: 20, fontStyle: 'italic' },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8, textAlign: 'center' },
  emptyBody:  { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 22 },
});
