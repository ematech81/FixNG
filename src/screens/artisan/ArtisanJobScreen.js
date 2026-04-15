import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMe } from '../../api/authApi';
import { getMyJobs, getAvailableJobs, acceptJob, declineJob, markCompleted } from '../../api/jobApi';
import BackButton from '../../components/BackButton';

const PRIMARY = '#2563EB'; 
const GREEN = '#16A34A';
const ACCEPT_GREEN = '#15803D';

const ACTIVE_STATUSES = ['accepted', 'arrived', 'in-progress'];

// Maps job status → display badge label + colors
const STATUS_META = {
  accepted:     { label: 'In Progress', color: '#1D4ED8', bg: '#DBEAFE' },
  arrived:      { label: 'On Site',     color: '#0F766E', bg: '#CCFBF1' },
  'in-progress':{ label: 'In Progress', color: '#1D4ED8', bg: '#DBEAFE' },
  completed:    { label: 'Completed',   color: GREEN,     bg: '#DCFCE7' },
  disputed:     { label: 'Disputed',    color: '#DC2626', bg: '#FEE2E2' },
};

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ArtisanJobScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [meRes, myJobsRes, availableRes] = await Promise.all([
        getMe(),
        getMyJobs({ role: 'artisan' }),
        getAvailableJobs(),
      ]);
      setUser(meRes.data.user);
      setArtisanProfile(meRes.data.artisanProfile);

      const myJobs = myJobsRes.data.data || [];
      setActiveJobs(myJobs.filter((j) => ACTIVE_STATUSES.includes(j.status)));
      setNearbyJobs(availableRes.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (jobId) => {
    try {
      await acceptJob(jobId, { estimatedArrivalMinutes: 15 });
      await fetchAll();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not accept job.');
    }
  };

  const handleDecline = (jobId) => {
    Alert.alert('Decline Job', 'Are you sure you want to decline this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive',
        onPress: async () => {
          try {
            await declineJob(jobId);
            await fetchAll();
          } catch (err) {
            Alert.alert('Error', err?.message || 'Could not decline job.');
          }
        },
      },
    ]);
  };

  const handleComplete = (jobId) => {
    Alert.alert('Complete Job', 'Mark this job as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await markCompleted(jobId);
            await fetchAll();
          } catch (err) {
            Alert.alert('Error', err?.message || 'Could not complete job.');
          }
        },
      },
    ]);
  };

  const firstName = user?.name?.split(' ')[0]?.toUpperCase() || 'THERE';
  const skill = artisanProfile?.skills?.[0] || '';
  const badge = artisanProfile?.badgeLevel || 'new';
  const isVerified = badge === 'verified' || badge === 'trusted';
  const verificationStatus = artisanProfile?.verificationStatus || 'pending';
  const isPending = verificationStatus === 'pending';
  const isRejected = verificationStatus === 'rejected';

  const skippedId = artisanProfile?.skippedSteps?.verificationId === true;
  const skippedVideo = artisanProfile?.skippedSteps?.skillVideo === true;
  const hasIncomplete = skippedId || skippedVideo;

  const handleEditProfile = () => {
    if (skippedId) {
      navigation.navigate('Step4_VerificationID', { isEdit: true });
    } else if (skippedVideo) {
      navigation.navigate('Step5_SkillVideo', { isEdit: true });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={PRIMARY} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <BackButton onPress={() => navigation.goBack()} />
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
                <Text style={styles.verifiedText}>
                  Verified {skill || 'Artisan'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.welcomeLabel}>WELCOME BACK, {firstName}</Text>
          <Text style={styles.pageTitle}>Job Dashboard</Text>
        </View>

        {/* ── Subscription upgrade banner ── */}
        {isVerified && (
          <TouchableOpacity
            style={styles.subPromo}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.88}
          >
            <Text style={styles.subPromoEmoji}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.subPromoTitle}>Unlock Pro & Elite Plans</Text>
              <Text style={styles.subPromoSub}>Get priority placement & unlimited requests — from ₦3,500/mo</Text>
            </View>
            <Text style={styles.subPromoArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Verification status banner ── */}
        {isPending && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingIcon}>⏳</Text>
            <View style={styles.pendingBody}>
              <Text style={styles.pendingTitle}>Verification Pending</Text>
              <Text style={styles.pendingText}>
                Your profile is under review. You can browse jobs but cannot accept them until verified.
              </Text>
            </View>
          </View>
        )}
        {isRejected && (
          <View style={[styles.pendingBanner, styles.rejectedBanner]}>
            <Text style={styles.pendingIcon}>❌</Text>
            <View style={styles.pendingBody}>
              <Text style={[styles.pendingTitle, { color: '#991B1B' }]}>Verification Rejected</Text>
              <Text style={styles.pendingText}>
                Your application was not approved. Please contact support for assistance.
              </Text>
            </View>
          </View>
        )}

        {/* ── Incomplete registration banner ── */}
        {hasIncomplete && (
          <View style={styles.incompleteBanner}>
            <View style={styles.incompleteBannerLeft}>
              <Text style={styles.incompleteIcon}>⚠️</Text>
              <View style={styles.incompleteBody}>
                <Text style={styles.incompleteTitle}>Complete Your Registration</Text>
                <Text style={styles.incompleteText}>
                  {skippedId && skippedVideo
                    ? 'Missing: Verification ID & Skill Video'
                    : skippedId
                    ? 'Missing: Verification ID'
                    : 'Missing: Skill Video'}
                </Text>
                <Text style={styles.incompleteSubText}>
                  Upload the missing items to become eligible for the Verified badge and full platform access.
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editProfileBtn} onPress={handleEditProfile}>
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Active Jobs ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Jobs</Text>
          {activeJobs.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{activeJobs.length} ongoing</Text>
            </View>
          )}
        </View>

        {activeJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No active jobs yet.{'\n'}Accept a nearby request below.</Text>
          </View>
        ) : (
          activeJobs.map((job) => (
            <ActiveJobCard
              key={job._id}
              job={job}
              onViewDetails={() => navigation.navigate('JobDetail', { jobId: job._id })}
              onComplete={() => handleComplete(job._id)}
              onUpdateStatus={() => navigation.navigate('JobDetail', { jobId: job._id })}
            />
          ))
        )}

        {/* ── Nearby Requests ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Requests</Text>
          <TouchableOpacity>
            <Text style={styles.viewMapText}>View Map</Text>
          </TouchableOpacity>
        </View>

        {nearbyJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>No new requests nearby right now.{'\n'}Pull down to refresh.</Text>
          </View>
        ) : (
          nearbyJobs.map((job) => (
            <NearbyJobCard
              key={job._id}
              job={job}
              canAccept={isVerified}
              onAccept={() => {
                if (!isVerified) {
                  Alert.alert('Not Verified', 'Your account must be verified before accepting jobs.');
                  return;
                }
                handleAccept(job._id);
              }}
              onDecline={() => handleDecline(job._id)}
            />
          ))
        )}

        {/* ── Safety Banner ── */}
        <View style={styles.safetyBanner}>
          <Text style={styles.safetyIcon}>🛡️</Text>
          <View style={styles.safetyBody}>
            <Text style={styles.safetyTitle}>Safety First!</Text>
            <Text style={styles.safetyText}>
              Always verify the customer's location before starting a journey late at night.
            </Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Active Job Card ────────────────────────────────────────────────────────────
function ActiveJobCard({ job, onViewDetails, onComplete, onUpdateStatus }) {
  const meta = STATUS_META[job.status] || STATUS_META.accepted;
  const isArrived = job.status === 'arrived';
  const image = job.images?.[0]?.url;
  const address = job.location?.address || job.location?.lga || 'Lagos';
  const due = job.timeline?.acceptedAt
    ? getDueLabel(job.timeline.acceptedAt)
    : 'Scheduled';

  return (
    <View style={styles.activeCard}>
      {/* Image + status badge */}
      <View style={styles.activeCardTop}>
        {image ? (
          <Image source={{ uri: image }} style={styles.activeCardImage} />
        ) : (
          <View style={[styles.activeCardImage, styles.activeCardImagePlaceholder]}>
            <Text style={styles.activeCardImageIcon}>🔧</Text>
          </View>
        )}
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Details */}
      <Text style={styles.activeCardTitle} numberOfLines={2}>
        {job.category}{job.description ? ` — ${job.description.slice(0, 40)}` : ''}
      </Text>
      {job.description && (
        <Text style={styles.activeCardDesc} numberOfLines={2}>{job.description}</Text>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.metaIcon}>📍</Text>
        <Text style={styles.metaText}>{address}</Text>
        <Text style={styles.metaSep}> · </Text>
        <Text style={styles.metaIcon}>🕐</Text>
        <Text style={styles.metaText}>{due}</Text>
      </View>

      {job.agreedPrice != null && (
        <Text style={styles.priceText}>₦{job.agreedPrice.toLocaleString()}</Text>
      )}

      {/* Action buttons */}
      <View style={styles.activeCardButtons}>
        <TouchableOpacity style={styles.viewDetailsBtn} onPress={onViewDetails}>
          <Text style={styles.viewDetailsBtnText}>View Details</Text>
        </TouchableOpacity>
        {isArrived ? (
          <TouchableOpacity style={styles.completeBtn} onPress={onComplete}>
            <Text style={styles.completeBtnText}>Complete Job</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.updateBtn} onPress={onUpdateStatus}>
            <Text style={styles.updateBtnText}>Update Status</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Nearby Job Card ────────────────────────────────────────────────────────────
function NearbyJobCard({ job, onAccept, onDecline, canAccept = true }) {
  const address = job.location?.address || job.location?.lga || 'Lagos';
  const distanceKm = job.distanceKm != null ? `${job.distanceKm}km away` : null;
  const timeAgo = getTimeAgo(job.createdAt);

  return (
    <View style={styles.nearbyCard}>
      <View style={styles.nearbyCardTop}>
        {distanceKm && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{distanceKm}</Text>
          </View>
        )}
        <Text style={styles.nearbyTimeAgo}>{timeAgo}</Text>
      </View>

      <Text style={styles.nearbyTitle} numberOfLines={1}>{job.category}</Text>
      {job.description && (
        <Text style={styles.nearbyDesc} numberOfLines={1}>{job.description}</Text>
      )}
      <View style={styles.nearbyLocation}>
        <Text style={styles.nearbyLocIcon}>📍</Text>
        <Text style={styles.nearbyLocText}>{address}</Text>
      </View>

      <View style={styles.nearbyButtons}>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
          <Text style={styles.declineBtnText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptBtn, !canAccept && styles.acceptBtnDisabled]}
          onPress={onAccept}
        >
          <Text style={styles.acceptBtnText}>{canAccept ? 'Accept' : 'Locked'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getDueLabel(acceptedAt) {
  const diff = Date.now() - new Date(acceptedAt).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `Today, ${new Date(acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const days = Math.floor(hrs / 24);
  return `Due in ${days} day${days !== 1 ? 's' : ''}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  scroll: { paddingBottom: 12 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──
  header: {
    paddingHorizontal: 20, paddingVertical: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEF0F5',
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  welcomeLabel: {
    fontSize: 12, fontWeight: '700', color: '#8391A1',
    letterSpacing: 0.8, marginBottom: 4,
  },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1E232C', marginBottom: 10 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  verifiedIcon: { fontSize: 14, color: GREEN, fontWeight: '900' },
  verifiedText: { fontSize: 13, fontWeight: '700', color: GREEN },

  // ── Verification banners ──
  pendingBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    marginHorizontal: 16, marginBottom: 4, marginTop: 8,
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  rejectedBanner: {
    backgroundColor: '#FEF2F2', borderColor: '#FECACA',
  },
  pendingIcon: { fontSize: 22, marginTop: 1 },
  pendingBody: { flex: 1 },
  pendingTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  pendingText: { fontSize: 12, color: '#78350F', lineHeight: 17 },

  // ── Incomplete registration banner ──
  incompleteBanner: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FECACA',
  },
  incompleteBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  incompleteIcon: { fontSize: 20, marginTop: 1 },
  incompleteBody: { flex: 1 },
  incompleteTitle: { fontSize: 14, fontWeight: '800', color: '#991B1B', marginBottom: 2 },
  incompleteText: { fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
  incompleteSubText: { fontSize: 12, color: '#7F1D1D', lineHeight: 16 },
  editProfileBtn: {
    backgroundColor: '#DC2626', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'stretch', alignItems: 'center',
  },
  editProfileBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  // ── Sections ──
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1E232C' },
  countBadge: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  countText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  viewMapText: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  emptyCard: {
    marginHorizontal: 16, backgroundColor: '#FFF',
    borderRadius: 16, padding: 24, alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: '#EEF0F5',
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  // ── Active Job Card ──
  activeCard: {
    marginHorizontal: 16, backgroundColor: '#FFF',
    borderRadius: 16, overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1, borderColor: '#EEF0F5',
    borderLeftWidth: 4, borderLeftColor: PRIMARY,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6,
    padding: 16,
  },
  activeCardTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 12,
  },
  activeCardImage: {
    width: 80, height: 70, borderRadius: 10,
  },
  activeCardImagePlaceholder: {
    backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center',
  },
  activeCardImageIcon: { fontSize: 28 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },

  activeCardTitle: {
    fontSize: 17, fontWeight: '800', color: '#1E232C', marginBottom: 4,
  },
  activeCardDesc: {
    fontSize: 13, color: '#6B7280', marginBottom: 10, lineHeight: 18,
  },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
  },
  metaIcon: { fontSize: 13, marginRight: 3 },
  metaText: { fontSize: 12, color: '#6B7280' },
  metaSep: { color: '#D1D5DB' },

  priceText: {
    fontSize: 17, fontWeight: '800', color: GREEN,
    marginBottom: 14, marginTop: 4,
  },

  activeCardButtons: { flexDirection: 'row', gap: 10 },
  viewDetailsBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center',
  },
  viewDetailsBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  updateBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: PRIMARY, alignItems: 'center',
  },
  updateBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  completeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: GREEN, alignItems: 'center',
  },
  completeBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },

  // ── Nearby Job Card ──
  nearbyCard: {
    marginHorizontal: 16, backgroundColor: '#FFF',
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#EEF0F5',
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
  },
  nearbyCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  distanceBadge: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  distanceText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  nearbyTimeAgo: { fontSize: 12, color: '#9CA3AF' },
  nearbyTitle: { fontSize: 16, fontWeight: '800', color: '#1E232C', marginBottom: 2 },
  nearbyDesc: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  nearbyLocation: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  nearbyLocIcon: { fontSize: 13, marginRight: 4 },
  nearbyLocText: { fontSize: 13, color: '#6B7280' },

  nearbyButtons: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  declineBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  acceptBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: ACCEPT_GREEN, alignItems: 'center',
  },
  acceptBtnDisabled: { backgroundColor: '#9CA3AF' },
  acceptBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },

  // ── Safety banner ──
  safetyBanner: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    marginHorizontal: 16, marginTop: 8, marginBottom: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  safetyIcon: { fontSize: 24, marginTop: 2 },
  safetyBody: { flex: 1 },
  safetyTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  safetyText: { fontSize: 13, color: '#78350F', lineHeight: 18 },

  // Subscription promo banner
  subPromo: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1E293B', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    marginHorizontal: 16, marginBottom: 12,
  },
  subPromoEmoji: { fontSize: 22 },
  subPromoTitle: { fontSize: 13, fontWeight: '800', color: '#F8FAFC', marginBottom: 2 },
  subPromoSub:   { fontSize: 11, color: '#94A3B8' },
  subPromoArrow: { color: '#94A3B8', fontSize: 20 },
});
