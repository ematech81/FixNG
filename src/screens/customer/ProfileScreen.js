import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getUser } from '../../utils/storage';
import { getMyJobs } from '../../api/jobApi';
import { becomeArtisan, getOnboardingStatus } from '../../api/artisanApi';

const PRIMARY = '#2563EB';

const TOS_URL = 'https://ematech81.github.io/FixNGTerms/';

const CUSTOMER_MENU_ITEMS = [
  { icon: '📋', label: 'My Jobs',            screen: 'MyJobs'          },
  { icon: '🔔', label: 'Notifications',      screen: 'Notifications'   },
  { icon: '🔒', label: 'Privacy & Security', screen: 'PrivacySecurity' },
  { icon: '❓', label: 'Help & Support',     screen: 'HelpSupport'     },
  { icon: '⚖️', label: 'Terms of Service',  url:    TOS_URL           },
];

const ARTISAN_MENU_ITEMS = [
  { icon: '📋', label: 'My Jobs',            screen: 'MyJobs'          },
  { icon: '⭐', label: 'My Reviews',         screen: 'MyReviews'       },
  { icon: '🔔', label: 'Notifications',      screen: 'Notifications'   },
  { icon: '🔒', label: 'Privacy & Security', screen: 'PrivacySecurity' },
  { icon: '❓', label: 'Help & Support',     screen: 'HelpSupport'     },
  { icon: '⚖️', label: 'Terms of Service',  url:    TOS_URL           },
];

// Maps artisan verificationStatus → badge config for the profile card
const ARTISAN_STATUS_CONFIG = {
  incomplete: {
    icon: '⚠️',
    label: 'Registration Incomplete',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    note: 'Complete your profile to unlock full artisan access.',
  },
  pending: {
    icon: '⏳',
    label: 'Verification Pending',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    note: 'Our team is reviewing your profile. This usually takes 24–48 hours.',
  },
  verified: {
    icon: '✅',
    label: 'Verified Artisan',
    color: '#16A34A',
    bg: '#DCFCE7',
    border: '#BBF7D0',
    note: 'Your account is fully verified. You can receive job requests.',
  },
  rejected: {
    icon: '❌',
    label: 'Verification Rejected',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    note: 'Your application was not approved. Go to your artisan dashboard for details.',
  },
};

export default function ProfileScreen({ navigation, onLogout, onRefreshAuth, onSwitchToJobs, onSwitchTab }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 });
  const [activeJob, setActiveJob] = useState(null); // most recent active job for "Track" button
  const [loadingStats, setLoadingStats] = useState(true);
  const [becomingArtisan, setBecomingArtisan] = useState(false);
  // Artisan-specific state (only fetched when user.role === 'artisan')
  const [artisanStatus, setArtisanStatus] = useState(null); // verificationStatus string
  const [loadingArtisanStatus, setLoadingArtisanStatus] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    const u = await getUser();
    setUser(u);
    fetchStats(u);
    if (u?.role === 'artisan') {
      fetchArtisanStatus();
    }
  };

  const ACTIVE_STATUSES = ['pending', 'accepted', 'in-progress', 'disputed'];

  const fetchStats = async (u) => {
    setLoadingStats(true);
    try {
      const res = await getMyJobs();
      const jobs = res.data.data || [];
      const completed = jobs.filter((j) => j.status === 'completed').length;
      const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
      setStats({ total: jobs.length, completed, active });

      // Most recent active job — drives the "Track Your Job" button
      const mostRecent = jobs.find((j) => ACTIVE_STATUSES.includes(j.status));
      setActiveJob(mostRecent || null);
    } catch {
      // silent
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchArtisanStatus = async () => {
    setLoadingArtisanStatus(true);
    try {
      const res = await getOnboardingStatus();
      const data = res.data.data;
      const status = data?.verificationStatus || 'incomplete';
      setArtisanStatus(status);
      if (data?.profilePhoto?.url) setProfilePhotoUrl(data.profilePhoto.url);
    } catch {
      // silent — keep null
    } finally {
      setLoadingArtisanStatus(false);
    }
  };

  const handleBecomeArtisan = () => {
    Alert.alert(
      'Become an Artisan',
      'List your skills and start receiving job requests from customers near you. You\'ll complete a quick 5-step profile setup.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Get Started',
          onPress: async () => {
            setBecomingArtisan(true);
            try {
              await becomeArtisan();
              onRefreshAuth?.();
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not start artisan onboarding. Please try again.');
            } finally {
              setBecomingArtisan(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const initial = (user?.name || 'U')[0].toUpperCase();
  const isArtisan = user?.role === 'artisan';
  const isArtisanPending = isArtisan && artisanStatus === 'pending';
  const isArtisanVerified = isArtisan && artisanStatus === 'verified';
  const statusConfig = isArtisan && artisanStatus ? ARTISAN_STATUS_CONFIG[artisanStatus] : null;
  const menuItems = isArtisan ? ARTISAN_MENU_ITEMS : CUSTOMER_MENU_ITEMS;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar + Name */}
        <View style={styles.profileCard}>
          <View style={[styles.avatarCircle, isArtisan && statusConfig && { borderWidth: 3, borderColor: statusConfig.color }]}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
          </View>
          <Text style={styles.userName}>{user?.name || '—'}</Text>
          <Text style={styles.userPhone}>{user?.phone || ''}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatBox label="Total Jobs" value={loadingStats ? '—' : stats.total} />
            <View style={styles.statDivider} />
            <StatBox label="Completed" value={loadingStats ? '—' : stats.completed} />
            <View style={styles.statDivider} />
            <StatBox label="Active" value={loadingStats ? '—' : stats.active} />
          </View>
        </View>

        {/* ── Artisan status card (shown when user is an artisan) ── */}
        {isArtisan && (
          loadingArtisanStatus ? (
            <View style={styles.artisanStatusLoading}>
              <ActivityIndicator color={PRIMARY} size="small" />
              <Text style={styles.artisanStatusLoadingText}>Loading artisan status…</Text>
            </View>
          ) : statusConfig ? (
            <View style={[styles.artisanStatusCard, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
              <View style={styles.artisanStatusTop}>
                <Text style={styles.artisanStatusIcon}>{statusConfig.icon}</Text>
                <Text style={[styles.artisanStatusLabel, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
              <Text style={styles.artisanStatusNote}>{statusConfig.note}</Text>
            </View>
          ) : null
        )}

        {/* ── Dynamic artisan CTA — state-driven ── */}
        {isArtisanVerified ? (
          // Verified → View Public Profile + Go to Job Dashboard
          <>
            <TouchableOpacity
              style={styles.publicProfileBtn}
              onPress={() => navigation.navigate('ArtisanProfile', { artisanId: user._id || user.id })}
              activeOpacity={0.85}
            >
              <View style={styles.publicProfileLeft}>
                <Text style={styles.publicProfileIcon}>👁️</Text>
                <View>
                  <Text style={styles.publicProfileTitle}>View Your Public Profile</Text>
                  <Text style={styles.publicProfileSubtitle}>See what customers see when they find you</Text>
                </View>
              </View>
              <Text style={styles.publicProfileArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.jobDashboardBtn}
              onPress={() => navigation.navigate('JobScreen')}
              activeOpacity={0.85}
            >
              <View style={styles.jobDashboardLeft}>
                <Text style={styles.jobDashboardIcon}>🔧</Text>
                <View>
                  <Text style={styles.jobDashboardTitle}>Go to Job Dashboard</Text>
                  <Text style={styles.jobDashboardSubtitle}>View and manage available job requests</Text>
                </View>
              </View>
              <Text style={styles.jobDashboardArrow}>›</Text>
            </TouchableOpacity>
          </>
        ) : isArtisanPending ? (
          // Pending → Verification Pending (switches to home/marketplace tab)
          <TouchableOpacity
            style={styles.pendingBtn}
            onPress={() => navigation.navigate('JobScreen')}
            activeOpacity={0.85}
          >
            <View style={styles.pendingBtnLeft}>
              <Text style={styles.pendingBtnIcon}>⏳</Text>
              <View>
                <Text style={styles.pendingBtnTitle}>Verification Pending</Text>
                <Text style={styles.pendingBtnSubtitle}>Tap to return to the job dashboard</Text>
              </View>
            </View>
            <Text style={styles.pendingBtnArrow}>›</Text>
          </TouchableOpacity>
        ) : !isArtisan ? (
          // Customer → Become an Artisan
          <TouchableOpacity
            style={styles.artisanCta}
            onPress={handleBecomeArtisan}
            activeOpacity={0.85}
            disabled={becomingArtisan}
          >
            <View style={styles.artisanCtaLeft}>
              <Text style={styles.artisanCtaIcon}>🔧</Text>
              <View>
                <Text style={styles.artisanCtaTitle}>Become an Artisan</Text>
                <Text style={styles.artisanCtaSubtitle}>List your skills & earn money</Text>
              </View>
            </View>
            {becomingArtisan
              ? <ActivityIndicator color={PRIMARY} />
              : <Text style={styles.artisanCtaArrow}>›</Text>}
          </TouchableOpacity>
        ) : null}

        {/* ── Track Your Job — visible only when there is an active job ── */}
        {activeJob && (
          <TouchableOpacity
            style={styles.trackJobBtn}
            onPress={() => navigation.navigate('JobDetail', { jobId: activeJob._id })}
            activeOpacity={0.85}
          >
            <View style={styles.trackJobLeft}>
              <Text style={styles.trackJobIcon}>📍</Text>
              <View>
                <Text style={styles.trackJobTitle}>Track Your Job</Text>
                <Text style={styles.trackJobSubtitle} numberOfLines={1}>
                  {activeJob.category} · {activeJob.status.replace('-', ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.trackJobArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Subscription upgrade banner — artisans only ── */}
        {isArtisan && (
          <TouchableOpacity
            style={styles.subBanner}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.88}
          >
            <View style={styles.subBannerLeft}>
              <Text style={styles.subBannerIcon}>⚡</Text>
              <View>
                <Text style={styles.subBannerTitle}>Upgrade Your Plan</Text>
                <Text style={styles.subBannerSub}>Pro & Elite plans from ₦3,500/mo</Text>
              </View>
            </View>
            <Text style={styles.subBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Menu items */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={() => {
                if (item.url)    Linking.openURL(item.url);
                else if (item.screen) navigation.navigate(item.screen);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FixNG v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  scroll: { paddingBottom: 30 },

  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEF0F5',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1E232C' },

  profileCard: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#EEF0F5',
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { fontSize: 34, fontWeight: '800', color: PRIMARY },
  userName: { fontSize: 20, fontWeight: '800', color: '#1E232C', marginBottom: 4 },
  userPhone: { fontSize: 14, color: '#6B7280', marginBottom: 20 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', backgroundColor: '#F5F7FB',
    borderRadius: 14, paddingVertical: 16,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1E232C', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB' },

  // Artisan status card
  artisanStatusCard: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, padding: 16,
    borderWidth: 1.5,
  },
  artisanStatusTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  artisanStatusIcon: { fontSize: 22 },
  artisanStatusLabel: { fontSize: 15, fontWeight: '800' },
  artisanStatusNote: { fontSize: 13, color: '#374151', lineHeight: 18 },
  artisanStatusLoading: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 16, padding: 14,
    backgroundColor: '#F9FAFB', borderRadius: 12,
  },
  artisanStatusLoadingText: { fontSize: 13, color: '#6B7280' },

  menuCard: {
    backgroundColor: '#FFF', marginHorizontal: 16,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EEF0F5',
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E232C' },
  menuChevron: { fontSize: 20, color: '#9CA3AF' },

  // View Public Profile button
  publicProfileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#F0FDF4', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#BBF7D0',
  },
  publicProfileLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  publicProfileIcon: { fontSize: 26 },
  publicProfileTitle: { fontSize: 15, fontWeight: '800', color: '#16A34A', marginBottom: 2 },
  publicProfileSubtitle: { fontSize: 12, color: '#6B7280' },
  publicProfileArrow: { fontSize: 24, color: '#16A34A', fontWeight: '700' },

  // Track Your Job button (visible when there is an active job)
  trackJobBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#FFF7ED', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#FED7AA',
  },
  trackJobLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  trackJobIcon: { fontSize: 26 },
  trackJobTitle: { fontSize: 15, fontWeight: '800', color: '#C2410C', marginBottom: 2 },
  trackJobSubtitle: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  trackJobArrow: { fontSize: 24, color: '#C2410C', fontWeight: '700' },

  // Go to Job Dashboard button (verified artisans)
  jobDashboardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#EFF6FF', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#BFDBFE',
  },
  jobDashboardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  jobDashboardIcon: { fontSize: 26 },
  jobDashboardTitle: { fontSize: 15, fontWeight: '800', color: '#2563EB', marginBottom: 2 },
  jobDashboardSubtitle: { fontSize: 12, color: '#6B7280' },
  jobDashboardArrow: { fontSize: 24, color: '#2563EB', fontWeight: '700' },

  // Verification Pending button
  pendingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#FFFBEB', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#FDE68A',
  },
  pendingBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  pendingBtnIcon: { fontSize: 26 },
  pendingBtnTitle: { fontSize: 15, fontWeight: '800', color: '#D97706', marginBottom: 2 },
  pendingBtnSubtitle: { fontSize: 12, color: '#6B7280' },
  pendingBtnArrow: { fontSize: 24, color: '#D97706', fontWeight: '700' },

  artisanCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#EFF6FF', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#BFDBFE',
  },
  artisanCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  artisanCtaIcon: { fontSize: 28 },
  artisanCtaTitle: { fontSize: 15, fontWeight: '800', color: PRIMARY, marginBottom: 2 },
  artisanCtaSubtitle: { fontSize: 12, color: '#6B7280' },
  artisanCtaArrow: { fontSize: 24, color: PRIMARY, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, backgroundColor: '#FEE2E2',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16,
    marginBottom: 20,
  },
  logoutIcon: { fontSize: 20 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },

  version: { textAlign: 'center', fontSize: 12, color: '#C4C9D4' },

  // Subscription banner
  subBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1E293B', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 14,
  },
  subBannerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subBannerIcon:   { fontSize: 22 },
  subBannerTitle:  { fontSize: 14, fontWeight: '800', color: '#F8FAFC', marginBottom: 2 },
  subBannerSub:    { fontSize: 12, color: '#94A3B8' },
  subBannerArrow:  { color: '#94A3B8', fontSize: 20 },
});
