import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getArtisanProfile, getArtisanReviews } from '../../api/discoveryApi';

const BADGE_CONFIG = {
  new: { label: 'New', color: '#9CA3AF', bg: '#F3F4F6', icon: '🌱' },
  verified: { label: 'Verified', color: '#3B82F6', bg: '#EFF6FF', icon: '✓' },
  trusted: { label: 'Trusted', color: '#F59E0B', bg: '#FFFBEB', icon: '⭐' },
};

function StarRow({ label, value }) {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Text key={s} style={[styles.star, s <= Math.round(value) && styles.starFilled]}>★</Text>
        ))}
      </View>
      <Text style={styles.starValue}>{value.toFixed(1)}</Text>
    </View>
  );
}

export default function ArtisanProfileScreen({ route, navigation }) {
  const { artisanId } = route.params;
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchReviews(1);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getArtisanProfile(artisanId);
      setProfile(res.data.data);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not load profile.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (page) => {
    setLoadingReviews(true);
    try {
      const res = await getArtisanReviews(artisanId, { page, limit: 5 });
      const newReviews = res.data.data || [];
      if (page === 1) {
        setReviews(newReviews);
      } else {
        setReviews((prev) => [...prev, ...newReviews]);
      }
      setHasMoreReviews(newReviews.length === 5);
      setReviewPage(page);
    } catch {
      // silent
    } finally {
      setLoadingReviews(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  const badge = BADGE_CONFIG[profile.badgeLevel] || BADGE_CONFIG.new;
  const stats = profile.stats || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.hireBtn}
            onPress={() => navigation.navigate('CreateJob')}
          >
            <Text style={styles.hireBtnText}>Post a Job</Text>
          </TouchableOpacity>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          {profile.profilePhoto ? (
            <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{(profile.name || 'A')[0].toUpperCase()}</Text>
            </View>
          )}

          <Text style={styles.profileName}>{profile.name}</Text>

          <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.icon} {badge.label}
            </Text>
          </View>

          {profile.location?.address && (
            <Text style={styles.location}>📍 {profile.location.address}</Text>
          )}

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* Skills */}
          <View style={styles.skillsContainer}>
            {(profile.skills || []).map((skill) => (
              <View key={skill} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Reliability Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.completedJobs ?? 0}</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {stats.averageRating ? `${stats.averageRating.toFixed(1)} ⭐` : '–'}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {stats.avgResponseTimeMinutes ? `${stats.avgResponseTimeMinutes}m` : '–'}
            </Text>
            <Text style={styles.statLabel}>Response</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {stats.acceptanceRate != null ? `${Math.round(stats.acceptanceRate)}%` : '–'}
            </Text>
            <Text style={styles.statLabel}>Acceptance</Text>
          </View>
        </View>

        {stats.disputeCount > 0 && (
          <Text style={styles.disputeNote}>
            ⚠ {stats.disputeCount} complaint{stats.disputeCount > 1 ? 's' : ''} on file
          </Text>
        )}

        {/* Reviews */}
        <Text style={styles.sectionTitle}>
          Reviews ({stats.totalRatings ?? 0})
        </Text>

        {reviews.length === 0 && !loadingReviews && (
          <Text style={styles.noReviews}>No reviews yet.</Text>
        )}

        {reviews.map((r) => (
          <View key={r.id} style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <Text style={styles.reviewerName}>{r.customerName}</Text>
              <Text style={styles.reviewDate}>
                {new Date(r.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {/* Dimension ratings */}
            {r.ratings && (
              <View style={styles.ratingDimensions}>
                <StarRow label="Quality" value={r.ratings.quality} />
                <StarRow label="Timeliness" value={r.ratings.timeliness} />
                <StarRow label="Communication" value={r.ratings.communication} />
              </View>
            )}

            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>Overall</Text>
              <Text style={styles.overallScore}>{r.overallScore.toFixed(1)} / 5</Text>
            </View>

            {r.comment && (
              <Text style={styles.reviewComment}>"{r.comment}"</Text>
            )}
          </View>
        ))}

        {hasMoreReviews && reviews.length > 0 && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => fetchReviews(reviewPage + 1)}
            disabled={loadingReviews}
          >
            {loadingReviews ? (
              <ActivityIndicator color="#FF6B00" />
            ) : (
              <Text style={styles.loadMoreText}>Load More Reviews</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 30 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  backBtn: { color: '#FF6B00', fontSize: 15, fontWeight: '600' },
  hireBtn: {
    backgroundColor: '#FF6B00', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
  },
  hireBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  profileCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 16, elevation: 2,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarInitial: { color: '#FFF', fontSize: 36, fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  badgePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 8 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  location: { fontSize: 13, color: '#888', marginBottom: 10 },
  bio: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  skillTag: {
    backgroundColor: '#FFF3EC', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  skillTagText: { fontSize: 12, color: '#FF6B00', fontWeight: '600' },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#999', marginBottom: 12, marginTop: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: '#FF6B00', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#999', fontWeight: '600' },
  disputeNote: { fontSize: 12, color: '#EF4444', marginBottom: 16, textAlign: 'center' },
  noReviews: { color: '#AAA', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  reviewCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0',
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  reviewDate: { fontSize: 12, color: '#BBB' },
  ratingDimensions: { marginBottom: 10, gap: 6 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starLabel: { fontSize: 12, color: '#666', width: 100 },
  stars: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 14, color: '#E5E5E5' },
  starFilled: { color: '#F59E0B' },
  starValue: { fontSize: 12, color: '#666', width: 28 },
  overallRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8, marginBottom: 8,
  },
  overallLabel: { fontSize: 13, fontWeight: '700', color: '#555' },
  overallScore: { fontSize: 13, fontWeight: '800', color: '#FF6B00' },
  reviewComment: { fontSize: 13, color: '#666', fontStyle: 'italic', lineHeight: 18 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { color: '#FF6B00', fontWeight: '700', fontSize: 14 },
});
