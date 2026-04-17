import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getArtisanProfile, getArtisanReviews } from '../../api/discoveryApi';
import { getUser } from '../../utils/storage';
import BackButton from '../../components/BackButton';

// ── Design Tokens ──────────────────────────────────────────────────────────────
const COLORS = {
  primary:        '#2563EB',
  primaryLight:   '#EFF6FF',
  primaryMid:     '#BFDBFE',
  primaryDark:    '#1D4ED8',
  accent:         '#0EA5E9',
  surface:        '#FFFFFF',
  background:     '#F8FAFF',
  textPrimary:    '#0F172A',
  textSecondary:  '#64748B',
  textMuted:      '#94A3B8',
  divider:        '#F1F5F9',
  shadow:         '#1E40AF',
  green:          '#16A34A',
  greenLight:     '#F0FDF4',
  greenMid:       '#BBF7D0',
  amber:          '#D97706',
  amberLight:     '#FFFBEB',
  amberMid:       '#FDE68A',
  gold:           '#F59E0B',
  grey:           '#6B7280',
  greyLight:      '#F3F4F6',
};

const { width: SCREEN_W } = Dimensions.get('window');

// ── Skill Icons ────────────────────────────────────────────────────────────────
const SKILL_ICONS = {
  Electrician: '⚡', Plumber: '🔧', Carpenter: '🪚', Painter: '🎨',
  Welder: '🔥', Mason: '🧱', Tiler: '🟫', Roofer: '🏠', 'AC Technician': '❄️',
  'Generator Repair': '⚙️', Wiring: '🔌', 'AC Maintenance': '🌡️',
  'Solar Installation': '☀️', 'CCTV Installation': '📹', default: '🔨',
};
const skillIcon = (s) => SKILL_ICONS[s] || SKILL_ICONS.default;

// ── Normalise dummy profile ────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function ArtisanProfileScreen({ route, navigation }) {
  const { artisanId, _dummyProfile } = route.params;

  const [profile, setProfile] = useState(
    _dummyProfile ? normaliseDummyProfile(_dummyProfile) : null
  );
  const [reviews, setReviews]               = useState([]);
  const [loading, setLoading]               = useState(!_dummyProfile);
  const [reviewPage, setReviewPage]         = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [currentUserId, setCurrentUserId]   = useState(null);

  // ── All original logic preserved exactly ────────────────────────────────────
  useEffect(() => {
    getUser().then((u) => setCurrentUserId(u?._id || u?.id || null));
    if (_dummyProfile) return;
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
  // ── End of original logic ───────────────────────────────────────────────────

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.loaderScreen}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  // ── Derived values (unchanged) ───────────────────────────────────────────────
  const stats        = profile.stats || {};
  const isVerified   = profile.badgeLevel === 'verified' || profile.badgeLevel === 'trusted';
  const isTrusted    = profile.badgeLevel === 'trusted';
  const primarySkill = profile.skills?.[0] || 'Artisan';
  const location     = profile.location?.state || profile.location?.address || 'Nigeria';
  const isDummy      = profile._isDummy === true;

  // ── Badge config ────────────────────────────────────────────────────────────
  const badgeColor = isTrusted ? COLORS.amber : COLORS.green;
  const badgeBg    = isTrusted ? COLORS.amberLight : COLORS.greenLight;
  const badgeLabel = isTrusted ? '⭐  Trusted' : '✓  Verified';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ════════════════════════════════════════
          TOP BAR
      ════════════════════════════════════════ */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.topBarBrand}>
          <View style={styles.brandDot} />
          <Text style={styles.topBarTitle}>FixNG</Text>
        </View>

        {/* Spacer to balance layout */}
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ════════════════════════════════════════
            HERO PROFILE CARD
        ════════════════════════════════════════ */}
        <View style={styles.heroCard}>

          {/* Coloured header strip — gold for Trusted artisans */}
          <View style={[styles.heroStrip, profile.isPro && styles.heroStripTrusted]} />

          {/* Avatar */}
          <View style={styles.avatarBlock}>
            <View style={styles.avatarRing}>
              {profile.profilePhoto ? (
                <Image
                  source={{ uri: profile.profilePhoto }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {(profile.name || 'A')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Badge overlapping bottom of avatar */}
            {isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.verifiedBadgeText}>{badgeLabel}</Text>
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={styles.heroName}>{profile.name}</Text>

          {/* Trusted Artisan banner — only for subscribed artisans */}
          {profile.isPro && (
            <View style={styles.trustedBanner}>
              <Text style={styles.trustedBannerIcon}>✓</Text>
              <View>
                <Text style={styles.trustedBannerTitle}>Trusted</Text>
                
              </View>
            </View>
          )}

          {/* Specialty + location */}
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaChip}>
              <Text style={styles.heroMetaIcon}>{skillIcon(primarySkill)}</Text>
              <Text style={styles.heroMetaText}>{primarySkill}</Text>
            </View>
            <View style={styles.heroMetaDot} />
            <View style={styles.heroMetaChip}>
              <Text style={styles.heroMetaIcon}>📍</Text>
              <Text style={styles.heroMetaText}>{location}, NG</Text>
            </View>
          </View>

          {/* Rating row */}
          {stats.averageRating > 0 && (
            <View style={styles.ratingRow}>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingValue}>
                  {stats.averageRating.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.ratingDivider}>·</Text>
              <Text style={styles.jobsText}>
                {stats.completedJobs ?? 0} jobs completed
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.heroDivider} />

          {/* Request / Book CTA */}
          <TouchableOpacity
            style={[
              styles.requestBtn,
              isDummy && styles.requestBtnDummy,
            ]}
            onPress={() => {
              if (isDummy) {
                Alert.alert(
                  'Preview Only',
                  'This is a sample profile for UI preview. Sign in to book real artisans.'
                );
              } else if (currentUserId && currentUserId === artisanId) {
                Alert.alert(
                  'Action Not Allowed',
                  'You cannot request a job from your own profile. Please select another artisan.'
                );
              } else {
                navigation.navigate('CreateJob', {
                  artisanId,
                  artisanName: profile.name,
                  artisanSkill: primarySkill,
                });
              }
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.requestBtnIcon}>⚡</Text>
            <Text style={styles.requestBtnText}>
              {isDummy ? 'Book Now (Preview)' : 'Request Job'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════
            RELIABILITY STATS
        ════════════════════════════════════════ */}
        <View style={styles.statsCard}>
          <View style={styles.statsCardHeader}>
            <View style={styles.statsAccentBar} />
            <Text style={styles.statsCardTitle}>Reliability Stats</Text>
          </View>

          <View style={styles.statsRow}>
            {/* Response Time */}
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={styles.statIcon}>⏱</Text>
              </View>
              <Text style={styles.statMain}>
                {stats.avgResponseTimeMinutes
                  ? `${stats.avgResponseTimeMinutes}m`
                  : '—'}
              </Text>
              <Text style={styles.statSub}>Response</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Completion Rate */}
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: COLORS.greenLight }]}>
                <Text style={styles.statIcon}>✅</Text>
              </View>
              <Text style={[styles.statMain, { color: COLORS.green }]}>
                {stats.acceptanceRate != null
                  ? `${Math.round(stats.acceptanceRate)}%`
                  : stats.completedJobs > 0 ? '100%' : '—'}
              </Text>
              <Text style={styles.statSub}>Completion</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Jobs Done */}
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: COLORS.amberLight }]}>
                <Text style={styles.statIcon}>🏆</Text>
              </View>
              <Text style={[styles.statMain, { color: COLORS.amber }]}>
                {stats.completedJobs ?? 0}
              </Text>
              <Text style={styles.statSub}>Jobs Done</Text>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════
            PROFESSIONAL BIO
        ════════════════════════════════════════ */}
        {profile.bio ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionCardTitle}>About</Text>
            </View>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* ════════════════════════════════════════
            SKILLS
        ════════════════════════════════════════ */}
        {profile.skills?.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionAccentBar, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.sectionCardTitle}>Expertise & Skills</Text>
            </View>
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

        {/* ════════════════════════════════════════
            PORTFOLIO / COMPLETED WORK
        ════════════════════════════════════════ */}
        {reviews.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionAccentBar, { backgroundColor: COLORS.amber }]} />
              <Text style={styles.sectionCardTitle}>Completed Work</Text>
            </View>

            <View style={styles.portfolioGrid}>
              {reviews.slice(0, 2).map((r, i) =>
                r.jobImages?.length > 0 ? (
                  <View key={i} style={styles.portfolioCard}>
                    <Image
                      source={{ uri: r.jobImages[0] }}
                      style={styles.portfolioImage}
                      resizeMode="cover"
                    />
                    <View style={styles.portfolioOverlay}>
                      <Text style={styles.portfolioCaption} numberOfLines={1}>
                        {r.category || 'Completed Job'} · {r.location || location}
                      </Text>
                    </View>
                  </View>
                ) : null
              )}
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════
            REVIEWS
        ════════════════════════════════════════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={[styles.sectionAccentBar, { backgroundColor: COLORS.gold }]} />
            <Text style={styles.sectionCardTitle}>
              Reviews
              {stats.totalRatings > 0 && (
                <Text style={styles.reviewCount}> ({stats.totalRatings})</Text>
              )}
            </Text>
          </View>

          {reviews.length === 0 && !loadingReviews ? (
            <View style={styles.noReviewsWrap}>
              <View style={styles.noReviewsIconWrap}>
                <Text style={styles.noReviewsIcon}>💬</Text>
              </View>
              <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
              <Text style={styles.noReviewsSub}>
                Be the first to work with {profile.name.split(' ')[0]} and
                leave a review.
              </Text>
            </View>
          ) : (
            <>
              {reviews.map((r, idx) => (
                <ReviewCard
                  key={r.id || idx}
                  review={r}
                  isLast={idx === reviews.length - 1}
                />
              ))}

              {hasMoreReviews && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => fetchReviews(reviewPage + 1)}
                  disabled={loadingReviews}
                  activeOpacity={0.8}
                >
                  {loadingReviews ? (
                    <ActivityIndicator color={COLORS.primary} size="small" />
                  ) : (
                    <View style={styles.loadMoreInner}>
                      <Text style={styles.loadMoreText}>Load More Reviews</Text>
                      <Text style={styles.loadMoreArrow}> ↓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ════════════════════════════════════════
          STICKY BOTTOM CTA  (mirrors the card button)
      ════════════════════════════════════════ */}
      <View style={styles.stickyBar}>
        <View style={styles.stickyLeft}>
          {stats.averageRating > 0 && (
            <>
              <Text style={styles.stickyRating}>
                ★ {stats.averageRating.toFixed(1)}
              </Text>
              <Text style={styles.stickyJobs}>
                {stats.completedJobs} jobs
              </Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={[styles.stickyBtn, isDummy && styles.stickyBtnDummy]}
          onPress={() => {
            if (isDummy) {
              Alert.alert(
                'Preview Only',
                'This is a sample profile for UI preview. Sign in to book real artisans.'
              );
            } else if (currentUserId && currentUserId === artisanId) {
              Alert.alert(
                'Action Not Allowed',
                'You cannot request a job from your own profile.'
              );
            } else {
              navigation.navigate('CreateJob', {
                artisanId,
                artisanName: profile.name,
                artisanSkill: primarySkill,
              });
            }
          }}
          activeOpacity={0.88}
        >
          <Text style={styles.stickyBtnIcon}>⚡</Text>
          <Text style={styles.stickyBtnText}>
            {isDummy ? 'Book Now (Preview)' : 'Request Job'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEW CARD
// ══════════════════════════════════════════════════════════════════════════════
function ReviewCard({ review, isLast }) {
  const overall = review.overallScore ?? 0;

  const renderStars = (score) => {
    const full  = Math.floor(score);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text
          key={i}
          style={[
            styles.starChar,
            { color: i <= full ? COLORS.gold : COLORS.divider },
          ]}
        >
          ★
        </Text>
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  return (
    <View style={[styles.reviewCard, isLast && styles.reviewCardLast]}>
      {/* Top row */}
      <View style={styles.reviewTop}>
        {/* Reviewer avatar */}
        <View style={styles.reviewerAvatar}>
          <Text style={styles.reviewerAvatarText}>
            {(review.customerName || 'C')[0].toUpperCase()}
          </Text>
        </View>

        {/* Name + date */}
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>
            {review.customerName || 'Customer'}
          </Text>
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>

        {/* Score badge */}
        <View style={styles.reviewScoreBadge}>
          <Text style={styles.reviewScoreText}>★ {overall.toFixed(1)}</Text>
        </View>
      </View>

      {/* Star row */}
      {renderStars(overall)}

      {/* Comment */}
      {review.comment ? (
        <View style={styles.reviewCommentWrap}>
          <Text style={styles.reviewQuote}>"</Text>
          <Text style={styles.reviewComment}>{review.comment}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Loader ───────────────────────────────────────────────────────────────────
  loaderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loaderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 56,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  loaderText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // ── Top Bar ──────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  backArrow: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: -1,
  },
  topBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.6,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scroll: {
    paddingBottom: 100,           // space for sticky bar
  },

  // ── Hero Card ────────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 20,
      },
      android: { elevation: 5 },
    }),
  },
  heroStrip: {
    width: '100%',
    height: 80,
    backgroundColor: COLORS.primary,
    marginBottom: 0,
  },
  heroStripTrusted: {
    backgroundColor: '#B45309', // warm gold for Trusted artisans
  },
  trustedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.amberLight,
    borderWidth: 1.5,
    borderColor: COLORS.amberMid,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  trustedBannerIcon: {
    fontSize: 20,
    color: COLORS.amber,
    fontWeight: '900',
  },
  trustedBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 1,
  },
  trustedBannerSub: {
    fontSize: 11,
    color: COLORS.amber,
    fontWeight: '500',
  },
  avatarBlock: {
    alignItems: 'center',
    marginTop: -44,
    marginBottom: 12,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary,
  },
  verifiedBadge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: 0.4,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  heroMetaIcon: {
    fontSize: 13,
  },
  heroMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  heroMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.amberMid,
  },
  ratingStar: {
    fontSize: 13,
    color: COLORS.gold,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  ratingDivider: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  jobsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  heroDivider: {
    width: SCREEN_W - 80,
    height: 1,
    backgroundColor: COLORS.divider,
    marginBottom: 20,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    width: SCREEN_W - 80,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  requestBtnDummy: {
    backgroundColor: COLORS.grey,
    ...Platform.select({
      ios: { shadowColor: COLORS.grey },
      android: {},
    }),
  },
  requestBtnIcon: {
    fontSize: 17,
    color: COLORS.surface,
  },
  requestBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: 0.2,
  },

  // ── Stats Card ────────────────────────────────────────────────────────────────
  statsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  statsAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statIcon: {
    fontSize: 20,
  },
  statMain: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  statSub: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: COLORS.divider,
  },

  // ── Generic Section Card ──────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.green,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  reviewCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },

  // ── Bio ───────────────────────────────────────────────────────────────────────
  bioText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 26,
    fontWeight: '400',
  },

  // ── Skills ───────────────────────────────────────────────────────────────────
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
  },
  skillTagIcon: {
    fontSize: 14,
  },
  skillTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ── Portfolio ─────────────────────────────────────────────────────────────────
  portfolioGrid: {
    gap: 12,
  },
  portfolioCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.textPrimary,
  },
  portfolioOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  portfolioCaption: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.surface,
  },

  // ── Reviews ──────────────────────────────────────────────────────────────────
  reviewCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 8,
  },
  reviewCardLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  reviewerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  reviewerInfo: {
    flex: 1,
    gap: 2,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  reviewScoreBadge: {
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.amberMid,
  },
  reviewScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  starChar: {
    fontSize: 14,
    fontWeight: '700',
  },
  reviewCommentWrap: {
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 2,
  },
  reviewQuote: {
    fontSize: 22,
    color: COLORS.primaryMid,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: -2,
  },
  reviewComment: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic',
    fontWeight: '400',
  },

  // ── No Reviews ───────────────────────────────────────────────────────────────
  noReviewsWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  noReviewsIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
    marginBottom: 4,
  },
  noReviewsIcon: {
    fontSize: 28,
  },
  noReviewsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  noReviewsSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // ── Load More ─────────────────────────────────────────────────────────────────
  loadMoreBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
    minHeight: 50,
    justifyContent: 'center',
  },
  loadMoreInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadMoreArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ── Sticky Bottom Bar ─────────────────────────────────────────────────────────
  stickyBar: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  stickyLeft: {
    flex: 1,
    gap: 2,
  },
  stickyRating: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: -0.2,
  },
  stickyJobs: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  stickyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  stickyBtnDummy: {
    backgroundColor: COLORS.grey,
    ...Platform.select({
      ios: { shadowColor: COLORS.grey },
      android: {},
    }),
  },
  stickyBtnIcon: {
    fontSize: 16,
    color: COLORS.surface,
  },
  stickyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: 0.2,
  },
});


// import React, { useState, useEffect } from 'react';
// import {
//   View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
//   ActivityIndicator, Alert, Dimensions,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { getArtisanProfile, getArtisanReviews } from '../../api/discoveryApi';
// import { getUser } from '../../utils/storage';
// import BackButton from '../../components/BackButton';

// const PRIMARY = '#2563EB';
// const GREEN = '#16A34A';
// const { width: SCREEN_W } = Dimensions.get('window');

// // Icon map for common skill categories
// const SKILL_ICONS = {
//   Electrician: '⚡', Plumber: '🔧', Carpenter: '🪚', Painter: '🎨',
//   Welder: '🔥', Mason: '🧱', Tiler: '🟫', Roofer: '🏠', 'AC Technician': '❄️',
//   'Generator Repair': '⚙️', Wiring: '🔌', 'AC Maintenance': '🌡️',
//   'Solar Installation': '☀️', 'CCTV Installation': '📹', default: '🔨',
// };
// const skillIcon = (s) => SKILL_ICONS[s] || SKILL_ICONS.default;

// // Maps dummy profile shape → the shape the screen renders
// function normaliseDummyProfile(d) {
//   return {
//     id: d.id,
//     name: d.name,
//     profilePhoto: d.profilePhoto || null,
//     skills: d.skills || [],
//     bio: d.bio || null,
//     badgeLevel: d.badgeLevel || 'verified',
//     location: d.location || { state: 'Lagos' },
//     stats: {
//       averageRating: d.stats?.averageRating || 0,
//       completedJobs: d.stats?.completedJobs || 0,
//       totalRatings: d.stats?.completedJobs || 0,
//       acceptanceRate: d.stats?.acceptanceRate || null,
//       avgResponseTimeMinutes: null,
//     },
//     _isDummy: true,
//   };
// }

// export default function ArtisanProfileScreen({ route, navigation }) {
//   const { artisanId, _dummyProfile } = route.params;

//   // If a dummy profile was passed directly, skip the API call entirely
//   const [profile, setProfile] = useState(_dummyProfile
//     ? normaliseDummyProfile(_dummyProfile)
//     : null
//   );
//   const [reviews, setReviews] = useState([]);
//   const [loading, setLoading] = useState(!_dummyProfile);
//   const [reviewPage, setReviewPage] = useState(1);
//   const [hasMoreReviews, setHasMoreReviews] = useState(false);
//   const [loadingReviews, setLoadingReviews] = useState(false);
//   const [currentUserId, setCurrentUserId] = useState(null);

//   useEffect(() => {
//     getUser().then((u) => setCurrentUserId(u?._id || u?.id || null));
//     if (_dummyProfile) return; // skip API for dummy profiles
//     fetchProfile();
//     fetchReviews(1);
//   }, []);

//   const fetchProfile = async () => {
//     try {
//       const res = await getArtisanProfile(artisanId);
//       setProfile(res.data.data);
//     } catch {
//       Alert.alert('Error', 'Could not load profile.');
//       navigation.goBack();
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchReviews = async (page) => {
//     setLoadingReviews(true);
//     try {
//       const res = await getArtisanReviews(artisanId, { page, limit: 5 });
//       const next = res.data.data || [];
//       setReviews((prev) => (page === 1 ? next : [...prev, ...next]));
//       setHasMoreReviews(next.length === 5);
//       setReviewPage(page);
//     } catch {
//       // silent
//     } finally {
//       setLoadingReviews(false);
//     }
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.loaderScreen}>
//         <ActivityIndicator size="large" color={PRIMARY} />
//       </SafeAreaView>
//     );
//   }

//   if (!profile) return null;

//   const stats = profile.stats || {};
//   const isVerified = profile.badgeLevel === 'verified' || profile.badgeLevel === 'trusted';
//   const isTrusted = profile.badgeLevel === 'trusted';
//   const primarySkill = profile.skills?.[0] || 'Artisan';
//   const location = profile.location?.state || profile.location?.address || 'Nigeria';
//   const isDummy = profile._isDummy === true;

//   return (
//     <SafeAreaView style={styles.container} edges={['top']}>
//       {/* Top bar */}
//       <View style={styles.topBar}>
//         <BackButton onPress={() => navigation.goBack()} />
//         <Text style={styles.topBarTitle}>FixNG</Text>
//         <View style={{ width: 28 }} />
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.scroll}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* ── Profile Card ── */}
//         <View style={styles.profileCard}>
//           {/* Photo + badge */}
//           <View style={styles.photoWrap}>
//             {profile.profilePhoto ? (
//               <Image source={{ uri: profile.profilePhoto }} style={styles.photo} />
//             ) : (
//               <View style={styles.photoFallback}>
//                 <Text style={styles.photoInitial}>
//                   {(profile.name || 'A')[0].toUpperCase()}
//                 </Text>
//               </View>
//             )}
//             {isVerified && (
//               <View style={[styles.verifiedBadge, isTrusted && styles.trustedBadge]}>
//                 <Text style={styles.verifiedBadgeText}>
//                   {isTrusted ? '⭐ TRUSTED' : '✓ VERIFIED'}
//                 </Text>
//               </View>
//             )}
//           </View>

//           {/* Name + specialty */}
//           <Text style={styles.name}>{profile.name}</Text>
//           <Text style={styles.specialty}>
//             {isVerified ? `Verified ${primarySkill}` : primarySkill} • {location}, NG
//           </Text>

//           {/* Rating + jobs */}
//           {stats.averageRating > 0 && (
//             <View style={styles.ratingRow}>
//               <View style={styles.ratingPill}>
//                 <Text style={styles.ratingStar}>★</Text>
//                 <Text style={styles.ratingValue}>{stats.averageRating.toFixed(1)}</Text>
//               </View>
//               <Text style={styles.jobsText}>{stats.completedJobs ?? 0} Completed Jobs</Text>
//             </View>
//           )}

//           {/* Request Job / Book Now button */}
//           <TouchableOpacity
//             style={[styles.requestBtn, isDummy && styles.requestBtnDummy]}
//             onPress={() => {
//               if (isDummy) {
//                 Alert.alert('Preview Only', 'This is a sample profile for UI preview. Sign in to book real artisans.');
//               } else if (currentUserId && currentUserId === artisanId) {
//                 Alert.alert(
//                   'Action Not Allowed',
//                   'You cannot request a job from your own profile. Please select another artisan.'
//                 );
//               } else {
//                 navigation.navigate('CreateJob', { artisanId, artisanName: profile.name, artisanSkill: primarySkill });
//               }
//             }}
//             activeOpacity={0.85}
//           >
//             <Text style={styles.requestBtnIcon}>⚡</Text>
//             <Text style={styles.requestBtnText}>{isDummy ? 'Book Now (Preview)' : 'Request Job'}</Text>
//           </TouchableOpacity>
//         </View>

//         {/* ── Reliability Stats ── */}
//         <View style={styles.statsCard}>
//           <Text style={styles.statsCardLabel}>Reliability Stats</Text>
//           <View style={styles.statsRow}>
//             <View style={styles.statItem}>
//               <Text style={styles.statMain} numberOfLines={1}>
//                 {stats.avgResponseTimeMinutes ? `${stats.avgResponseTimeMinutes} min` : '—'}
//               </Text>
//               <Text style={styles.statSub}>RESPONSE TIME</Text>
//             </View>
//             <View style={styles.statDivider} />
//             <View style={styles.statItem}>
//               <Text style={[styles.statMain, styles.statMainGreen]}>
//                 {stats.acceptanceRate != null
//                   ? `${Math.round(stats.acceptanceRate)}%`
//                   : stats.completedJobs > 0 ? '100%' : '—'}
//               </Text>
//               <Text style={styles.statSub}>COMPLETION</Text>
//             </View>
//           </View>
//         </View>

//         {/* ── Professional Bio ── */}
//         {profile.bio ? (
//           <View style={styles.section}>
//             <Text style={styles.bioTitle}>Professional Bio</Text>
//             <Text style={styles.bioText}>{profile.bio}</Text>
//           </View>
//         ) : null}

//         {/* ── Skills ── */}
//         {profile.skills?.length > 0 && (
//           <View style={styles.section}>
//             <Text style={styles.sectionLabel}>EXPERTISE & SKILLS</Text>
//             <View style={styles.skillsWrap}>
//               {profile.skills.map((skill) => (
//                 <View key={skill} style={styles.skillTag}>
//                   <Text style={styles.skillTagIcon}>{skillIcon(skill)}</Text>
//                   <Text style={styles.skillTagText}>{skill}</Text>
//                 </View>
//               ))}
//             </View>
//           </View>
//         )}

//         {/* ── Portfolio / Completed Work ── */}
//         {/* Show most recent job images as portfolio */}
//         {reviews.length > 0 && (
//           <View style={styles.portfolioSection}>
//             <Text style={styles.sectionLabel}>COMPLETED WORK</Text>
//             {reviews.slice(0, 2).map((r, i) => r.jobImages?.length > 0 ? (
//               <View key={i} style={styles.portfolioCard}>
//                 <Image
//                   source={{ uri: r.jobImages[0] }}
//                   style={styles.portfolioImage}
//                   resizeMode="cover"
//                 />
//                 <View style={styles.portfolioOverlay}>
//                   <Text style={styles.portfolioCaption} numberOfLines={1}>
//                     {r.category || 'Completed Job'} • {r.location || location}
//                   </Text>
//                 </View>
//               </View>
//             ) : null)}
//           </View>
//         )}

//         {/* ── Reviews ── */}
//         {reviews.length > 0 && (
//           <View style={styles.section}>
//             <Text style={styles.sectionLabel}>
//               REVIEWS ({stats.totalRatings ?? 0})
//             </Text>
//             {reviews.map((r) => (
//               <ReviewCard key={r.id} review={r} />
//             ))}
//             {hasMoreReviews && (
//               <TouchableOpacity
//                 style={styles.loadMoreBtn}
//                 onPress={() => fetchReviews(reviewPage + 1)}
//                 disabled={loadingReviews}
//               >
//                 {loadingReviews
//                   ? <ActivityIndicator color={PRIMARY} />
//                   : <Text style={styles.loadMoreText}>Load More Reviews</Text>}
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {reviews.length === 0 && !loadingReviews && (
//           <View style={styles.section}>
//             <Text style={styles.sectionLabel}>REVIEWS</Text>
//             <Text style={styles.noReviews}>No reviews yet.</Text>
//           </View>
//         )}

//         <View style={{ height: 30 }} />
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// function ReviewCard({ review }) {
//   const overall = review.overallScore ?? 0;
//   return (
//     <View style={styles.reviewCard}>
//       <View style={styles.reviewTop}>
//         <Text style={styles.reviewerName}>{review.customerName || 'Customer'}</Text>
//         <View style={styles.reviewRatingBadge}>
//           <Text style={styles.reviewRatingText}>★ {overall.toFixed(1)}</Text>
//         </View>
//       </View>
//       {review.comment ? (
//         <Text style={styles.reviewComment}>"{review.comment}"</Text>
//       ) : null}
//       <Text style={styles.reviewDate}>
//         {new Date(review.createdAt).toLocaleDateString('en-NG', {
//           day: 'numeric', month: 'short', year: 'numeric',
//         })}
//       </Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F5F7FB' },
//   loaderScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },

//   topBar: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     paddingHorizontal: 16, paddingVertical: 12,
//     backgroundColor: '#FFF',
//     borderBottomWidth: 1, borderBottomColor: '#EEF0F5',
//   },
//   topBarTitle: { fontSize: 20, fontWeight: '900', color: PRIMARY, letterSpacing: -0.5 },

//   scroll: { paddingBottom: 20 },

//   // ── Profile Card ──
//   profileCard: {
//     backgroundColor: '#FFF', margin: 16,
//     borderRadius: 20, padding: 24, alignItems: 'center',
//     elevation: 2,
//     shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.07, shadowRadius: 8,
//   },
//   photoWrap: { position: 'relative', marginBottom: 16 },
//   photo: { width: 100, height: 100, borderRadius: 50 },
//   photoFallback: {
//     width: 100, height: 100, borderRadius: 50,
//     backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center',
//   },
//   photoInitial: { fontSize: 40, fontWeight: '800', color: PRIMARY },
//   verifiedBadge: {
//     position: 'absolute', top: 0, right: -10,
//     backgroundColor: '#16A34A', borderRadius: 20,
//     paddingHorizontal: 8, paddingVertical: 4,
//     elevation: 2,
//   },
//   trustedBadge: { backgroundColor: '#D97706' },
//   verifiedBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

//   name: { fontSize: 24, fontWeight: '800', color: '#1E232C', marginBottom: 6 },
//   specialty: { fontSize: 14, color: '#6B7280', marginBottom: 14, textAlign: 'center' },

//   ratingRow: {
//     flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
//   },
//   ratingPill: {
//     flexDirection: 'row', alignItems: 'center', gap: 4,
//     backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 6,
//     borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A',
//   },
//   ratingStar: { fontSize: 14, color: '#F59E0B' },
//   ratingValue: { fontSize: 14, fontWeight: '800', color: '#92400E' },
//   jobsText: { fontSize: 13, color: '#6B7280' },

//   requestBtn: {
//     flexDirection: 'row', alignItems: 'center', gap: 8,
//     backgroundColor: PRIMARY, width: '100%',
//     paddingVertical: 16, borderRadius: 14, justifyContent: 'center',
//   },
//   requestBtnDummy: { backgroundColor: '#6B7280' },
//   requestBtnIcon: { fontSize: 18, color: '#FFF' },
//   requestBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

//   // ── Stats Card ──
//   statsCard: {
//     backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 8,
//     borderRadius: 16, padding: 20,
//     elevation: 1,
//     shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05, shadowRadius: 4,
//   },
//   statsCardLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 14 },
//   statsRow: { flexDirection: 'row', alignItems: 'center' },
//   statItem: { flex: 1, alignItems: 'center' },
//   statMain: { fontSize: 26, fontWeight: '800', color: PRIMARY, marginBottom: 4 },
//   statMainGreen: { color: GREEN },
//   statSub: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
//   statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },

//   // ── Sections ──
//   section: {
//     backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 8,
//     borderRadius: 16, padding: 20,
//   },
//   sectionLabel: {
//     fontSize: 11, fontWeight: '800', color: '#9CA3AF',
//     letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase',
//   },
//   bioTitle: { fontSize: 24, fontWeight: '800', color: '#1E232C', marginBottom: 12 },
//   bioText: { fontSize: 15, color: '#4B5563', lineHeight: 26 },

//   skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
//   skillTag: {
//     flexDirection: 'row', alignItems: 'center', gap: 6,
//     backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 8,
//     borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE',
//   },
//   skillTagIcon: { fontSize: 14 },
//   skillTagText: { fontSize: 13, fontWeight: '600', color: PRIMARY },

//   // ── Portfolio ──
//   portfolioSection: { marginTop: 8 },
//   portfolioCard: {
//     marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
//     overflow: 'hidden', height: 200,
//     position: 'relative',
//   },
//   portfolioImage: { width: '100%', height: '100%', backgroundColor: '#1E232C' },
//   portfolioOverlay: {
//     position: 'absolute', bottom: 0, left: 0, right: 0,
//     backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 12,
//   },
//   portfolioCaption: { fontSize: 13, fontWeight: '600', color: '#FFF' },

//   // ── Reviews ──
//   reviewCard: {
//     borderTopWidth: 1, borderTopColor: '#F3F4F6',
//     paddingTop: 14, marginTop: 10,
//   },
//   reviewTop: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
//   },
//   reviewerName: { fontSize: 14, fontWeight: '700', color: '#1E232C' },
//   reviewRatingBadge: {
//     backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
//   },
//   reviewRatingText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
//   reviewComment: { fontSize: 14, color: '#4B5563', lineHeight: 21, fontStyle: 'italic', marginBottom: 6 },
//   reviewDate: { fontSize: 11, color: '#9CA3AF' },
//   noReviews: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 10 },
//   loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
//   loadMoreText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
// });
