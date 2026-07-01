import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMe } from '../../api/authApi';
import { getMyJobs, getAvailableJobs, acceptJob, declineJob, markCompleted } from '../../api/jobApi';
import { getMySubscription } from '../../api/subscriptionApi';
import BackButton from '../../components/BackButton';
import VoiceNotePlayer from '../../components/VoiceNotePlayer';
import { useTheme } from '../../context/ThemeContext';

const ACTIVE_STATUSES = ['accepted', 'arrived', 'in-progress'];

const STATUS_META = {
  accepted:     { label: 'In Progress', color: '#1D4ED8', bg: '#DBEAFE' },
  arrived:      { label: 'On Site',     color: '#0F766E', bg: '#CCFBF1' },
  'in-progress':{ label: 'In Progress', color: '#1D4ED8', bg: '#DBEAFE' },
  completed:    { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
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
  const { colors } = useTheme();
  const [user, setUser] = useState(null);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => { fetchAll(); }, [])
  );

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [meRes, myJobsRes, availableRes, subRes] = await Promise.all([
        getMe(),
        getMyJobs({ role: 'artisan' }),
        getAvailableJobs(),
        getMySubscription().catch(() => null),
      ]);
      setUser(meRes.data.user);
      setArtisanProfile(meRes.data.artisanProfile);
      setSubscription(subRes?.data?.data || null);

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

  const removeNearbyJob = (jobId) =>
    setNearbyJobs((prev) => prev.filter((j) => j._id !== jobId));

  const handleAccept = async (jobId) => {
    try {
      await acceptJob(jobId, { estimatedArrivalMinutes: 15 });
      await fetchAll();
    } catch (err) {
      const data    = err?.response?.data;
      const message = data?.message || err?.message || '';

      if (data?.limitReached) {
        const isPro = data.currentPlan === 'pro';
        Alert.alert(
          isPro ? '10-Job Limit Reached' : '2-Job Limit Reached',
          message,
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Upgrade Plan',
              onPress: () => navigation.navigate('Subscription', {
                upgradeContext: { currentPlan: data.currentPlan, requiredPlan: data.requiredPlan },
              }),
            },
          ]
        );
      } else if (message.toLowerCase().includes('expired')) {
        Alert.alert(
          'Job No Longer Available',
          'This job has expired and is no longer accepting responses.',
          [{ text: 'OK', onPress: () => removeNearbyJob(jobId) }]
        );
      } else {
        Alert.alert('Error', message || 'Could not accept job.');
      }
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
            removeNearbyJob(jobId);
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
  const hasIncomplete = skippedId;

  const handleEditProfile = () => {
    navigation.navigate('Step4_VerificationID', { isEdit: true });
  };

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={colors.info} />
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
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={colors.info} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <BackButton onPress={() => navigation.goBack()} />
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
                <Text style={styles.verifiedText}>Verified {skill || 'Artisan'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.welcomeLabel}>WELCOME BACK, {firstName}</Text>
          <Text style={styles.pageTitle}>Job Dashboard</Text>
        </View>

        {/* Subscription banner */}
        {isVerified && (() => {
          const adminGranted = artisanProfile?.isPro === true;
          const status = (adminGranted && !['trial', 'active', 'grace'].includes(subscription?.status))
            ? 'active'
            : subscription?.status;
          const days   = subscription?.daysRemaining ?? 0;
          const fmtEnd = subscription?.endsAt
            ? new Date(subscription.endsAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;

          if (status === 'trial') return (
            <TouchableOpacity style={styles.subTrialWrap} onPress={() => navigation.navigate('Subscription')} activeOpacity={0.88}>
              <Text style={styles.subTrialIcon}>🎁</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.subTrialTitle}>Free Trial Active</Text>
                <Text style={styles.subTrialSub}>
                  {days > 0 ? `${days} day${days !== 1 ? 's' : ''} left` : 'Ends today'} · Subscribe to keep your access
                </Text>
              </View>
              <Text style={styles.subTrialArrow}>›</Text>
            </TouchableOpacity>
          );

          if (status === 'active') return (
            <View style={styles.subActiveWrap}>
              <View style={styles.subPlanRow}>
                <View style={styles.subProBadge}><Text style={styles.subBadgeText}>✓ PRO</Text></View>
                <Text style={styles.subActiveLabel}>● Active</Text>
              </View>
              <Text style={styles.subPlanHeadline}>FixNG Pro</Text>
              {fmtEnd && <Text style={styles.subExpiry}>Renews {fmtEnd}</Text>}
            </View>
          );

          if (status === 'grace') return (
            <TouchableOpacity style={styles.subGraceWrap} onPress={() => navigation.navigate('Subscription')} activeOpacity={0.88}>
              <Text style={styles.subGraceIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.subGraceTitle}>Subscription Expired — Renew Now</Text>
                <Text style={styles.subGraceSub}>Grace period ends in {days} day{days !== 1 ? 's' : ''}.</Text>
              </View>
              <Text style={styles.subGraceArrow}>›</Text>
            </TouchableOpacity>
          );

          return (
            <TouchableOpacity style={styles.subExpiredWrap} onPress={() => navigation.navigate('Subscription')} activeOpacity={0.88}>
              <Text style={styles.subExpiredIcon}>❌</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.subExpiredTitle}>Subscribe to Be Discoverable</Text>
                <Text style={styles.subExpiredSub}>Customers can't find you while your subscription is inactive.</Text>
              </View>
              <Text style={styles.subExpiredArrow}>›</Text>
            </TouchableOpacity>
          );
        })()}

        {/* Verification banners */}
        {isPending && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingIcon}>⏳</Text>
            <View style={styles.pendingBody}>
              <Text style={styles.pendingTitle}>Verification Pending</Text>
              <Text style={styles.pendingText}>Your profile is under review. You can browse jobs but cannot accept them until verified.</Text>
            </View>
          </View>
        )}
        {isRejected && (
          <View style={[styles.pendingBanner, styles.rejectedBanner]}>
            <Text style={styles.pendingIcon}>❌</Text>
            <View style={styles.pendingBody}>
              <Text style={[styles.pendingTitle, { color: '#991B1B' }]}>Verification Rejected</Text>
              <Text style={styles.pendingText}>Your application was not approved. Please contact support for assistance.</Text>
            </View>
          </View>
        )}

        {/* Incomplete registration banner */}
        {hasIncomplete && (
          <View style={styles.incompleteBanner}>
            <View style={styles.incompleteBannerLeft}>
              <Text style={styles.incompleteIcon}>⚠️</Text>
              <View style={styles.incompleteBody}>
                <Text style={styles.incompleteTitle}>Complete Your Registration</Text>
                <Text style={styles.incompleteText}>Missing: Verification ID / Professional Certificate</Text>
                <Text style={styles.incompleteSubText}>Upload your ID or certificate to become eligible for the Verified badge.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editProfileBtn} onPress={handleEditProfile}>
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active Jobs */}
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
              colors={colors}
              onViewDetails={() => navigation.navigate('JobDetail', { jobId: job._id })}
              onComplete={() => handleComplete(job._id)}
              onUpdateStatus={() => navigation.navigate('JobDetail', { jobId: job._id })}
            />
          ))
        )}

        {/* Nearby Requests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Requests</Text>
          <TouchableOpacity><Text style={styles.viewMapText}>View Map</Text></TouchableOpacity>
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
              colors={colors}
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

        {/* Safety Banner */}
        <View style={styles.safetyBanner}>
          <Text style={styles.safetyIcon}>🛡️</Text>
          <View style={styles.safetyBody}>
            <Text style={styles.safetyTitle}>Safety First!</Text>
            <Text style={styles.safetyText}>Always verify the customer's location before starting a journey late at night.</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveJobCard({ job, colors, onViewDetails, onComplete, onUpdateStatus }) {
  const meta = STATUS_META[job.status] || STATUS_META.accepted;
  const image = job.images?.[0]?.url;
  const address = job.location?.address || job.location?.lga || 'Lagos';
  const due = job.timeline?.acceptedAt ? getDueLabel(job.timeline.acceptedAt) : 'Scheduled';

  return (
    <View style={[activeCardStyles(colors).card, { borderLeftColor: colors.info }]}>
      <View style={activeCardStyles(colors).top}>
        {image ? (
          <Image source={{ uri: image }} style={activeCardStyles(colors).image} />
        ) : (
          <View style={[activeCardStyles(colors).image, activeCardStyles(colors).imagePlaceholder]}>
            <Text style={{ fontSize: 28 }}>🔧</Text>
          </View>
        )}
        <View style={[activeCardStyles(colors).statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[activeCardStyles(colors).statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={activeCardStyles(colors).title} numberOfLines={1}>{job.category}</Text>
      {job.voiceDescription?.url ? (
        <View style={activeCardStyles(colors).voiceCard}>
          <View style={activeCardStyles(colors).voiceHeader}>
            <View style={activeCardStyles(colors).voiceIconCircle}>
              <Text style={{ fontSize: 18 }}>🎤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={activeCardStyles(colors).voiceTitle}>Voice Description</Text>
              <Text style={activeCardStyles(colors).voiceHint}>Tap ▶ to listen</Text>
            </View>
          </View>
          <VoiceNotePlayer uri={job.voiceDescription.url} duration={job.voiceDescription.duration} isMine={false} />
        </View>
      ) : job.description ? (
        <Text style={activeCardStyles(colors).desc} numberOfLines={2}>{job.description}</Text>
      ) : null}

      <View style={activeCardStyles(colors).metaRow}>
        <Text style={{ fontSize: 13 }}>📍</Text>
        <Text style={activeCardStyles(colors).metaText}>{address}</Text>
        <Text style={{ color: colors.border }}> · </Text>
        <Text style={{ fontSize: 13 }}>🕐</Text>
        <Text style={activeCardStyles(colors).metaText}>{due}</Text>
      </View>

      {job.agreedPrice != null && (
        <Text style={activeCardStyles(colors).price}>₦{job.agreedPrice.toLocaleString()}</Text>
      )}

      <TouchableOpacity style={[activeCardStyles(colors).updateBtn, { backgroundColor: colors.info }]} onPress={onUpdateStatus}>
        <Text style={activeCardStyles(colors).updateBtnText}>Start Job</Text>
      </TouchableOpacity>
    </View>
  );
}

function NearbyJobCard({ job, colors, onAccept, onDecline, canAccept = true }) {
  const address = job.location?.address || job.location?.lga || 'Lagos';
  const distanceKm = job.distanceKm != null ? `${job.distanceKm}km away` : null;
  const timeAgo = getTimeAgo(job.createdAt);

  return (
    <View style={nearbyCardStyles(colors).card}>
      <View style={nearbyCardStyles(colors).top}>
        {distanceKm && (
          <View style={[nearbyCardStyles(colors).distanceBadge, { backgroundColor: colors.infoBg }]}>
            <Text style={[nearbyCardStyles(colors).distanceText, { color: colors.info }]}>{distanceKm}</Text>
          </View>
        )}
        <Text style={nearbyCardStyles(colors).timeAgo}>{timeAgo}</Text>
      </View>

      <Text style={nearbyCardStyles(colors).title} numberOfLines={1}>{job.category}</Text>
      {job.voiceDescription?.url ? (
        <View style={nearbyCardStyles(colors).voiceBadge}>
          <Text style={{ fontSize: 13 }}>🎤</Text>
          <Text style={nearbyCardStyles(colors).voiceText}>Voice description — tap to listen</Text>
        </View>
      ) : job.description ? (
        <Text style={nearbyCardStyles(colors).desc} numberOfLines={1}>{job.description}</Text>
      ) : null}
      <View style={nearbyCardStyles(colors).location}>
        <Text style={{ fontSize: 13 }}>📍</Text>
        <Text style={nearbyCardStyles(colors).locationText}>{address}</Text>
      </View>

      <View style={nearbyCardStyles(colors).buttons}>
        <TouchableOpacity style={[nearbyCardStyles(colors).declineBtn, { backgroundColor: colors.surface }]} onPress={onDecline}>
          <Text style={[nearbyCardStyles(colors).declineText, { color: colors.textSub }]}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[nearbyCardStyles(colors).acceptBtn, { backgroundColor: !canAccept ? colors.textHint : '#15803D' }]}
          onPress={onAccept}
        >
          <Text style={nearbyCardStyles(colors).acceptText}>{canAccept ? 'Accept' : 'Locked'}</Text>
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

const activeCardStyles = (colors) => StyleSheet.create({
  card: {
    marginHorizontal: 16, backgroundColor: colors.card,
    borderRadius: 16, overflow: 'hidden', marginBottom: 14,
    borderWidth: 1, borderColor: colors.borderLight,
    borderLeftWidth: 4,
    elevation: 2, shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    padding: 16,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  image: { width: 80, height: 70, borderRadius: 10 },
  imagePlaceholder: { backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '800' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  desc: { fontSize: 13, color: colors.textSub, marginBottom: 10, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  metaText: { fontSize: 12, color: colors.textSub },
  price: { fontSize: 17, fontWeight: '800', color: '#16A34A', marginBottom: 14, marginTop: 4 },
  updateBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  updateBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  voiceCard: {
    backgroundColor: colors.primaryLight, borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: colors.primaryFaint, marginBottom: 10,
  },
  voiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  voiceIconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  voiceTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  voiceHint: { fontSize: 11, color: colors.textSub, marginTop: 1 },
});

const nearbyCardStyles = (colors) => StyleSheet.create({
  card: {
    marginHorizontal: 16, backgroundColor: colors.card,
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.borderLight,
    elevation: 1, shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  distanceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  distanceText: { fontSize: 12, fontWeight: '700' },
  timeAgo: { fontSize: 12, color: colors.textHint },
  title: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
  desc: { fontSize: 13, color: colors.textSub, marginBottom: 6 },
  location: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  locationText: { fontSize: 13, color: colors.textSub },
  voiceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryLight, borderRadius: 8,
    paddingVertical: 5, paddingHorizontal: 9,
    marginBottom: 6, borderWidth: 1, borderColor: colors.primaryFaint,
    alignSelf: 'flex-start',
  },
  voiceText: { fontSize: 12, color: colors.primaryDark, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  declineText: { fontSize: 13, fontWeight: '700' },
  acceptBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  acceptText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
});

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgAlt },
  scroll: { paddingBottom: 12 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: 20, paddingVertical: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  welcomeLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 10 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  verifiedIcon: { fontSize: 14, color: '#16A34A', fontWeight: '900' },
  verifiedText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  pendingBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    marginHorizontal: 16, marginBottom: 4, marginTop: 8,
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  rejectedBanner: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  pendingIcon: { fontSize: 22, marginTop: 1 },
  pendingBody: { flex: 1 },
  pendingTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  pendingText: { fontSize: 12, color: '#78350F', lineHeight: 17 },

  incompleteBanner: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14,
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

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  countBadge: { backgroundColor: colors.infoBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countText: { fontSize: 12, fontWeight: '700', color: colors.info },
  viewMapText: { fontSize: 13, fontWeight: '700', color: colors.info },

  emptyCard: {
    marginHorizontal: 16, backgroundColor: colors.card,
    borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  safetyBanner: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    marginHorizontal: 16, marginTop: 8, marginBottom: 6,
    backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  safetyIcon: { fontSize: 24, marginTop: 2 },
  safetyBody: { flex: 1 },
  safetyTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  safetyText: { fontSize: 13, color: '#78350F', lineHeight: 18 },

  // Subscription banners (intentionally brand-specific colors)
  subTrialWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 14,
    backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE',
  },
  subTrialIcon: { fontSize: 22 },
  subTrialTitle: { fontSize: 13, fontWeight: '800', color: '#1D4ED8', marginBottom: 2 },
  subTrialSub: { fontSize: 11, color: '#3B82F6' },
  subTrialArrow: { fontSize: 22, color: '#2563EB', fontWeight: '700' },

  subActiveWrap: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 14,
    backgroundColor: '#DCFCE7', borderWidth: 1.5, borderColor: '#BBF7D0',
  },
  subPlanRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  subProBadge: { backgroundColor: '#16A34A', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  subBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  subActiveLabel: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  subPlanHeadline: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 3 },
  subExpiry: { fontSize: 11, color: colors.textMuted },

  subGraceWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 14,
    backgroundColor: '#FFF7ED', borderWidth: 2, borderColor: '#F59E0B',
  },
  subGraceIcon: { fontSize: 22 },
  subGraceTitle: { fontSize: 13, fontWeight: '800', color: '#C2410C', marginBottom: 2 },
  subGraceSub: { fontSize: 11, color: '#EA580C', lineHeight: 16 },
  subGraceArrow: { fontSize: 22, color: '#EA580C', fontWeight: '700' },

  subExpiredWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 14,
    backgroundColor: '#1E293B',
  },
  subExpiredIcon: { fontSize: 22 },
  subExpiredTitle: { fontSize: 13, fontWeight: '800', color: '#F8FAFC', marginBottom: 2 },
  subExpiredSub: { fontSize: 11, color: '#94A3B8', lineHeight: 16 },
  subExpiredArrow: { fontSize: 22, color: '#94A3B8', fontWeight: '700' },
});
