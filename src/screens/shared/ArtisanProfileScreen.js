import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getArtisanProfile, getArtisanReviews } from '../../api/discoveryApi';
import BackButton from '../../components/BackButton';

const PRIMARY = '#2563EB';
const GREEN = '#16A34A';
const { width: SCREEN_W } = Dimensions.get('window');

// Icon map for common skill categories
const SKILL_ICONS = {
  Electrician: '⚡', Plumber: '🔧', Carpenter: '🪚', Painter: '🎨',
  Welder: '🔥', Mason: '🧱', Tiler: '🟫', Roofer: '🏠', 'AC Technician': '❄️',
  'Generator Repair': '⚙️', Wiring: '🔌', 'AC Maintenance': '🌡️',
  'Solar Installation': '☀️', 'CCTV Installation': '📹', default: '🔨',
};
const skillIcon = (s) => SKILL_ICONS[s] || SKILL_ICONS.default;

// Maps dummy profile shape → the shape the screen renders
function normaliseDummyProfile(d) {
  return {
    id: d.id,
    name: d.name,
    profilePhoto: d.profilePhoto || null,
    skills: d.skills || [],
    bio: d.bio || null,
    badgeLevel: d.badgeLevel || 'verified',
    location: d.location || { state: 'Lagos' },
    stats: {
      averageRating: d.stats?.averageRating || 0,
      completedJobs: d.stats?.completedJobs || 0,
      totalRatings: d.stats?.completedJobs || 0,
      acceptanceRate: d.stats?.acceptanceRate || null,
      avgResponseTimeMinutes: null,
    },
    _isDummy: true,
  };
}

export default function ArtisanProfileScreen({ route, navigation }) {
  const { artisanId, _dummyProfile } = route.params;

  // If a dummy profile was passed directly, skip the API call entirely
  const [profile, setProfile] = useState(_dummyProfile
    ? normaliseDummyProfile(_dummyProfile)
    : null
  );
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(!_dummyProfile);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (_dummyProfile) return; // skip API for dummy profiles
    fetchProfile();
    fetchReviews(1);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getArtisanProfile(artisanId);
      setProfile(res.data.data);
    } catch {
      Alert.alert('Error', 'Could not load profile.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (page) => {
    setLoadingReviews(true);
    try {
      const res = await getArtisanReviews(artisanId, { page, limit: 5 });
      const next = res.data.data || [];
      setReviews((prev) => (page === 1 ? next : [...prev, ...next]));
      setHasMoreReviews(next.length === 5);
      setReviewPage(page);
    } catch {
      // silent
    } finally {
      setLoadingReviews(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderScreen}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  const stats = profile.stats || {};
  const isVerified = profile.badgeLevel === 'verified' || profile.badgeLevel === 'trusted';
  const isTrusted = profile.badgeLevel === 'trusted';
  const primarySkill = profile.skills?.[0] || 'Artisan';
  const location = profile.location?.state || profile.location?.address || 'Nigeria';
  const isDummy = profile._isDummy === true;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.topBarTitle}>FixNG</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          {/* Photo + badge */}
          <View style={styles.photoWrap}>
            {profile.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.photo} />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.photoInitial}>
                  {(profile.name || 'A')[0].toUpperCase()}
                </Text>
              </View>
            )}
            {isVerified && (
              <View style={[styles.verifiedBadge, isTrusted && styles.trustedBadge]}>
                <Text style={styles.verifiedBadgeText}>
                  {isTrusted ? '⭐ TRUSTED' : '✓ VERIFIED'}
                </Text>
              </View>
            )}
          </View>

          {/* Name + specialty */}
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.specialty}>
            {isVerified ? `Verified ${primarySkill}` : primarySkill} • {location}, NG
          </Text>

          {/* Rating + jobs */}
          {stats.averageRating > 0 && (
            <View style={styles.ratingRow}>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingValue}>{stats.averageRating.toFixed(1)}</Text>
              </View>
              <Text style={styles.jobsText}>{stats.completedJobs ?? 0} Completed Jobs</Text>
            </View>
          )}

          {/* Request Job / Book Now button */}
          <TouchableOpacity
            style={[styles.requestBtn, isDummy && styles.requestBtnDummy]}
            onPress={() => {
              if (isDummy) {
                Alert.alert('Preview Only', 'This is a sample profile for UI preview. Sign in to book real artisans.');
              } else {
                navigation.navigate('CreateJob', { artisanId });
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.requestBtnIcon}>⚡</Text>
            <Text style={styles.requestBtnText}>{isDummy ? 'Book Now (Preview)' : 'Request Job'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Reliability Stats ── */}
        <View style={styles.statsCard}>
          <Text style={styles.statsCardLabel}>Reliability Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statMain} numberOfLines={1}>
                {stats.avgResponseTimeMinutes ? `${stats.avgResponseTimeMinutes} min` : '—'}
              </Text>
              <Text style={styles.statSub}>RESPONSE TIME</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statMain, styles.statMainGreen]}>
                {stats.acceptanceRate != null
                  ? `${Math.round(stats.acceptanceRate)}%`
                  : stats.completedJobs > 0 ? '100%' : '—'}
              </Text>
              <Text style={styles.statSub}>COMPLETION</Text>
            </View>
          </View>
        </View>

        {/* ── Professional Bio ── */}
        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.bioTitle}>Professional Bio</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* ── Skills ── */}
        {profile.skills?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EXPERTISE & SKILLS</Text>
            <View style={styles.skillsWrap}>
              {profile.skills.map((skill) => (
                <View key={skill} style={styles.skillTag}>
                  <Text style={styles.skillTagIcon}>{skillIcon(skill)}</Text>
                  <Text style={styles.skillTagText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Portfolio / Completed Work ── */}
        {/* Show most recent job images as portfolio */}
        {reviews.length > 0 && (
          <View style={styles.portfolioSection}>
            <Text style={styles.sectionLabel}>COMPLETED WORK</Text>
            {reviews.slice(0, 2).map((r, i) => r.jobImages?.length > 0 ? (
              <View key={i} style={styles.portfolioCard}>
                <Image
                  source={{ uri: r.jobImages[0] }}
                  style={styles.portfolioImage}
                  resizeMode="cover"
                />
                <View style={styles.portfolioOverlay}>
                  <Text style={styles.portfolioCaption} numberOfLines={1}>
                    {r.category || 'Completed Job'} • {r.location || location}
                  </Text>
                </View>
              </View>
            ) : null)}
          </View>
        )}

        {/* ── Reviews ── */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              REVIEWS ({stats.totalRatings ?? 0})
            </Text>
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
            {hasMoreReviews && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => fetchReviews(reviewPage + 1)}
                disabled={loadingReviews}
              >
                {loadingReviews
                  ? <ActivityIndicator color={PRIMARY} />
                  : <Text style={styles.loadMoreText}>Load More Reviews</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {reviews.length === 0 && !loadingReviews && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>REVIEWS</Text>
            <Text style={styles.noReviews}>No reviews yet.</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewCard({ review }) {
  const overall = review.overallScore ?? 0;
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <Text style={styles.reviewerName}>{review.customerName || 'Customer'}</Text>
        <View style={styles.reviewRatingBadge}>
          <Text style={styles.reviewRatingText}>★ {overall.toFixed(1)}</Text>
        </View>
      </View>
      {review.comment ? (
        <Text style={styles.reviewComment}>"{review.comment}"</Text>
      ) : null}
      <Text style={styles.reviewDate}>
        {new Date(review.createdAt).toLocaleDateString('en-NG', {
          day: 'numeric', month: 'short', year: 'numeric',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  loaderScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEF0F5',
  },
  topBarTitle: { fontSize: 20, fontWeight: '900', color: PRIMARY, letterSpacing: -0.5 },

  scroll: { paddingBottom: 20 },

  // ── Profile Card ──
  profileCard: {
    backgroundColor: '#FFF', margin: 16,
    borderRadius: 20, padding: 24, alignItems: 'center',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
  },
  photoWrap: { position: 'relative', marginBottom: 16 },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoFallback: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center',
  },
  photoInitial: { fontSize: 40, fontWeight: '800', color: PRIMARY },
  verifiedBadge: {
    position: 'absolute', top: 0, right: -10,
    backgroundColor: '#16A34A', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
    elevation: 2,
  },
  trustedBadge: { backgroundColor: '#D97706' },
  verifiedBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  name: { fontSize: 24, fontWeight: '800', color: '#1E232C', marginBottom: 6 },
  specialty: { fontSize: 14, color: '#6B7280', marginBottom: 14, textAlign: 'center' },

  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A',
  },
  ratingStar: { fontSize: 14, color: '#F59E0B' },
  ratingValue: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  jobsText: { fontSize: 13, color: '#6B7280' },

  requestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PRIMARY, width: '100%',
    paddingVertical: 16, borderRadius: 14, justifyContent: 'center',
  },
  requestBtnDummy: { backgroundColor: '#6B7280' },
  requestBtnIcon: { fontSize: 18, color: '#FFF' },
  requestBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  // ── Stats Card ──
  statsCard: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, padding: 20,
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  statsCardLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 14 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statMain: { fontSize: 26, fontWeight: '800', color: PRIMARY, marginBottom: 4 },
  statMainGreen: { color: GREEN },
  statSub: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },

  // ── Sections ──
  section: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 8,
    borderRadius: 16, padding: 20,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#9CA3AF',
    letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase',
  },
  bioTitle: { fontSize: 24, fontWeight: '800', color: '#1E232C', marginBottom: 12 },
  bioText: { fontSize: 15, color: '#4B5563', lineHeight: 26 },

  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skillTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE',
  },
  skillTagIcon: { fontSize: 14 },
  skillTagText: { fontSize: 13, fontWeight: '600', color: PRIMARY },

  // ── Portfolio ──
  portfolioSection: { marginTop: 8 },
  portfolioCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
    overflow: 'hidden', height: 200,
    position: 'relative',
  },
  portfolioImage: { width: '100%', height: '100%', backgroundColor: '#1E232C' },
  portfolioOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 12,
  },
  portfolioCaption: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  // ── Reviews ──
  reviewCard: {
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingTop: 14, marginTop: 10,
  },
  reviewTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#1E232C' },
  reviewRatingBadge: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  reviewRatingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  reviewComment: { fontSize: 14, color: '#4B5563', lineHeight: 21, fontStyle: 'italic', marginBottom: 6 },
  reviewDate: { fontSize: 11, color: '#9CA3AF' },
  noReviews: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 10 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
});
