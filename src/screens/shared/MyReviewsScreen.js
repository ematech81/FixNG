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
import { useTheme } from '../../context/ThemeContext';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StarRow({ score, size = 16 }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text key={n} style={{ fontSize: size, color: n <= Math.round(score) ? colors.star : colors.starEmpty }}>
          ★
        </Text>
      ))}
    </View>
  );
}

function RatingPill({ label, value }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.ratingPill}>
      <Text style={styles.ratingPillLabel}>{label}</Text>
      <Text style={styles.ratingPillValue}>{value}/5</Text>
    </View>
  );
}

export default function MyReviewsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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

      <StarRow score={item.overallScore} size={18} />

      <View style={styles.pillRow}>
        <RatingPill label="Quality"       value={item.ratings?.quality} />
        <RatingPill label="Timeliness"    value={item.ratings?.timeliness} />
        <RatingPill label="Communication" value={item.ratings?.communication} />
      </View>

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
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.info} />
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
              <ActivityIndicator size="small" color={colors.info} style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:    { padding: 16, paddingBottom: 40 },
  listEmpty: { flex: 1 },

  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
  },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.infoBg, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.info },
  personName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 1 },
  jobCat:     { fontSize: 12, color: colors.textSub },

  scoreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.warningBg, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  scoreText: { fontSize: 14, fontWeight: '800', color: colors.textSub },
  scoreStar: { fontSize: 12, color: colors.star },
  timeAgo:   { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  pillRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  ratingPillLabel: { fontSize: 11, color: colors.textSub, fontWeight: '600' },
  ratingPillValue: { fontSize: 11, color: colors.text, fontWeight: '800' },

  commentBox: {
    marginTop: 12, backgroundColor: colors.surface, borderRadius: 10,
    padding: 12, borderLeftWidth: 3, borderLeftColor: colors.info,
  },
  commentText: { fontSize: 13, color: colors.textSub, lineHeight: 20, fontStyle: 'italic' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' },
  emptyBody:  { fontSize: 14, color: colors.textSub, textAlign: 'center', lineHeight: 22 },
});
