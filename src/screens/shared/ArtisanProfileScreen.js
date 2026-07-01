import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { getArtisanProfile, getArtisanReviews } from '../../api/discoveryApi';
import { getUser } from '../../utils/storage';
import BackButton from '../../components/BackButton';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Skill Icons ────────────────────────────────────────────────────────────────
const SKILL_ICONS = {
  Electrician: '⚡', Plumber: '🔧', Carpenter: '🪚', Painter: '🎨',
  Welder: '🔥', Mason: '🧱', Tiler: '🟫', Roofer: '🏠', 'AC Technician': '❄️',
  'Generator Repair': '⚙️', Wiring: '🔌', 'AC Maintenance': '🌡️',
  'Solar Installation': '☀️', 'CCTV Installation': '📹',
  'Dispatch Rider': '🏍️', Driver: '🚗', 'Security Guard': '🛡️',
  'Logistics / Courier Service': '📦',
  default: '🔨',
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
  const { colors } = useTheme();
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
  const [codeCopied, setCodeCopied]         = useState(false);

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

  const handleCopyCode = async (code) => {
    await Clipboard.setStringAsync(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };
  // ── End of original logic ───────────────────────────────────────────────────

  const styles = makeStyles(colors);

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.loaderScreen}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color={colors.info} />
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
  const isSelf       = !isDummy && !!currentUserId && currentUserId === artisanId;

  // ── Badge config ────────────────────────────────────────────────────────────
  const badgeColor = isTrusted ? colors.warning : colors.success;
  const badgeBg    = isTrusted ? colors.warningBg : colors.successBg;
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

            {isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.verifiedBadgeText}>{badgeLabel}</Text>
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={styles.heroName}>{profile.name}</Text>

          {/* Artisan ID — styled copy button */}
          {profile.artisanCode && !isDummy && (
            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>Artisan Code: </Text>
              <Text style={styles.codeValue}>{profile.artisanCode}</Text>
              <TouchableOpacity
                style={[styles.copyBtn, codeCopied && styles.copyBtnDone]}
                onPress={() => handleCopyCode(profile.artisanCode)}
                activeOpacity={0.7}
              >
                <Text style={[styles.copyBtnText, codeCopied && styles.copyBtnDoneText]}>
                  {codeCopied ? 'Copied ✓' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Trusted Artisan banner */}
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

          <View style={styles.heroDivider} />

          {/* Request / Book CTA */}
          {!isSelf && (
            <TouchableOpacity
              style={[styles.requestBtn, isDummy && styles.requestBtnDummy]}
              onPress={() => {
                if (isDummy) {
                  Alert.alert(
                    'Preview Only',
                    'This is a sample profile for UI preview. Sign in to book real artisans.'
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
          )}
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
              <View style={[styles.statIconWrap, { backgroundColor: colors.infoBg }]}>
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
              <View style={[styles.statIconWrap, { backgroundColor: colors.successBg }]}>
                <Text style={styles.statIcon}>✅</Text>
              </View>
              <Text style={[styles.statMain, { color: colors.success }]}>
                {stats.acceptanceRate != null
                  ? `${Math.round(stats.acceptanceRate)}%`
                  : stats.completedJobs > 0 ? '100%' : '—'}
              </Text>
              <Text style={styles.statSub}>Completion</Text>
            </View>

            <View style={styles.statDivider} />

            {/* Jobs Done */}
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: colors.warningBg }]}>
                <Text style={styles.statIcon}>🏆</Text>
              </View>
              <Text style={[styles.statMain, { color: colors.warning }]}>
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
              <View style={[styles.sectionAccentBar, { backgroundColor: colors.info }]} />
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
            DISPATCH RIDER VEHICLE INFO
        ════════════════════════════════════════ */}
        {profile.skills?.includes('Dispatch Rider') && profile.dispatchInfo?.plateNumber ? (
          <View style={[styles.sectionCard, { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
            <View style={styles.sectionCardHeader}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>🏍️</Text>
              <Text style={styles.sectionCardTitle}>Vehicle Info</Text>
            </View>
            <View style={styles.dispatchRow}>
              <View style={styles.dispatchItem}>
                <Text style={styles.dispatchItemLabel}>Vehicle</Text>
                <Text style={styles.dispatchItemValue}>{profile.dispatchInfo.vehicleType || '—'}</Text>
              </View>
              <View style={styles.dispatchItem}>
                <Text style={styles.dispatchItemLabel}>Plate No.</Text>
                <Text style={[styles.dispatchItemValue, styles.plateValue]}>
                  {profile.dispatchInfo.plateNumber}
                </Text>
              </View>
            </View>
            <View style={styles.dispatchBadgeRow}>
              {profile.dispatchInfo.hasHelmet && (
                <View style={styles.dispatchBadge}>
                  <Text style={styles.dispatchBadgeText}>⛑️ Provides Helmet</Text>
                </View>
              )}
              {profile.dispatchInfo.providesPackaging && (
                <View style={styles.dispatchBadge}>
                  <Text style={styles.dispatchBadgeText}>📦 Provides Packaging</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* ════════════════════════════════════════
            PORTFOLIO / COMPLETED WORK
        ════════════════════════════════════════ */}
        {reviews.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionAccentBar, { backgroundColor: colors.warning }]} />
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
            <View style={[styles.sectionAccentBar, { backgroundColor: colors.star }]} />
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
                Be the first to work with {profile.name?.split(' ')[0] ?? 'this artisan'} and
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
                  colors={colors}
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
                    <ActivityIndicator color={colors.info} size="small" />
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
          STICKY BOTTOM CTA
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
        {!isSelf && (
          <TouchableOpacity
            style={[styles.stickyBtn, isDummy && styles.stickyBtnDummy]}
            onPress={() => {
              if (isDummy) {
                Alert.alert(
                  'Preview Only',
                  'This is a sample profile for UI preview. Sign in to book real artisans.'
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
        )}
      </View>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEW CARD
// ══════════════════════════════════════════════════════════════════════════════
function ReviewCard({ review, isLast, colors }) {
  const overall = review.overallScore ?? 0;
  const styles = makeStyles(colors);

  const renderStars = (score) => {
    const full  = Math.floor(score);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text
          key={i}
          style={[
            styles.starChar,
            { color: i <= full ? colors.star : colors.border },
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
const makeStyles = (colors) => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // ── Loader ───────────────────────────────────────────────────────────────────
  loaderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loaderCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 56,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  loaderText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // ── Top Bar ──────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backArrow: {
    fontSize: 20,
    color: colors.text,
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
    backgroundColor: colors.info,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.info,
    letterSpacing: -0.6,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scroll: {
    paddingBottom: 100,
  },

  // ── Hero Card ────────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    backgroundColor: colors.info,
    marginBottom: 0,
  },
  heroStripTrusted: {
    backgroundColor: '#B45309',
  },
  trustedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderWidth: 1.5,
    borderColor: colors.warning,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  trustedBannerIcon: {
    fontSize: 20,
    color: colors.warning,
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
    color: colors.warning,
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
    borderColor: colors.card,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    backgroundColor: colors.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.info,
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
    color: colors.card,
    letterSpacing: 0.4,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // ── Artisan Code row ──────────────────────────────────────────────────────────
  codeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10, justifyContent: 'center', paddingHorizontal: 16 },
  codeLabel: { fontSize: 13, color: colors.textSub },
  codeValue: { fontSize: 13, fontWeight: '700', color: colors.info, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1.5, borderColor: colors.info },
  copyBtnDone: { borderColor: colors.success },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: colors.info },
  copyBtnDoneText: { color: colors.success },

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
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroMetaIcon: {
    fontSize: 13,
  },
  heroMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSub,
  },
  heroMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
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
    backgroundColor: colors.warningBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  ratingStar: {
    fontSize: 13,
    color: colors.star,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  ratingDivider: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  jobsText: {
    fontSize: 13,
    color: colors.textSub,
    fontWeight: '500',
  },
  heroDivider: {
    width: SCREEN_W - 80,
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.info,
    width: SCREEN_W - 80,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.info,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  requestBtnDummy: {
    backgroundColor: colors.textSub,
    ...Platform.select({
      ios: { shadowColor: colors.textSub },
      android: {},
    }),
  },
  requestBtnIcon: {
    fontSize: 17,
    color: colors.card,
  },
  requestBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.card,
    letterSpacing: 0.2,
  },

  // ── Stats Card ────────────────────────────────────────────────────────────────
  statsCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    backgroundColor: colors.info,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
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
    color: colors.info,
    letterSpacing: -0.5,
  },
  statSub: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
  },

  // ── Generic Section Card ──────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    backgroundColor: colors.success,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  reviewCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // ── Bio ───────────────────────────────────────────────────────────────────────
  bioText: {
    fontSize: 15,
    color: colors.textSub,
    lineHeight: 26,
    fontWeight: '400',
  },

  // ── Dispatch vehicle info ─────────────────────────────────────────────────────
  dispatchRow:       { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dispatchItem:      { flex: 1 },
  dispatchItemLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  dispatchItemValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  plateValue:        { letterSpacing: 1.5, color: colors.primary },
  dispatchBadgeRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dispatchBadge:     { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.primary },
  dispatchBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },

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
    backgroundColor: colors.infoBg,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: colors.info,
  },
  skillTagIcon: {
    fontSize: 14,
  },
  skillTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.info,
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
    borderColor: colors.border,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.text,
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
    color: colors.card,
  },

  // ── Reviews ──────────────────────────────────────────────────────────────────
  reviewCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.info,
  },
  reviewerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.info,
  },
  reviewerInfo: {
    flex: 1,
    gap: 2,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  reviewDate: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  reviewScoreBadge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning,
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
    color: colors.info,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: -2,
  },
  reviewComment: {
    flex: 1,
    fontSize: 14,
    color: colors.textSub,
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
    backgroundColor: colors.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.info,
    marginBottom: 4,
  },
  noReviewsIcon: {
    fontSize: 28,
  },
  noReviewsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  noReviewsSub: {
    fontSize: 13,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // ── Load More ─────────────────────────────────────────────────────────────────
  loadMoreBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.info,
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
    color: colors.info,
  },
  loadMoreArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.info,
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
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    color: colors.star,
    letterSpacing: -0.2,
  },
  stickyJobs: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  stickyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.info,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.info,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  stickyBtnDummy: {
    backgroundColor: colors.textSub,
    ...Platform.select({
      ios: { shadowColor: colors.textSub },
      android: {},
    }),
  },
  stickyBtnIcon: {
    fontSize: 16,
    color: colors.card,
  },
  stickyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.card,
    letterSpacing: 0.2,
  },
});
