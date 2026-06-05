



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
import { getMySubscription } from '../../api/subscriptionApi';

const PRIMARY   = '#2563EB';
const PRIMARY_L = '#EFF6FF';
const TOS_URL   = 'https://ematech81.github.io/FixNGTerms/';

const CUSTOMER_MENU_ITEMS = [
  { icon: '📋', label: 'My Jobs',            screen: 'MyJobs',          color: '#6366F1' },
  { icon: '🔔', label: 'Notifications',      screen: 'Notifications',   color: '#F59E0B' },
  { icon: '🔒', label: 'Privacy & Security', screen: 'PrivacySecurity', color: '#10B981' },
  { icon: '❓', label: 'Help & Support',     screen: 'HelpSupport',     color: '#3B82F6' },
  { icon: '⚖️', label: 'Terms of Service',  url:    TOS_URL,            color: '#8B5CF6' },
];

const ARTISAN_MENU_ITEMS = [
  { icon: '📋', label: 'My Jobs',            screen: 'MyJobs',          color: '#6366F1' },
  { icon: '⭐', label: 'My Reviews',         screen: 'MyReviews',       color: '#F59E0B' },
  { icon: '🔔', label: 'Notifications',      screen: 'Notifications',   color: '#EC4899' },
  { icon: '🔒', label: 'Privacy & Security', screen: 'PrivacySecurity', color: '#10B981' },
  { icon: '❓', label: 'Help & Support',     screen: 'HelpSupport',     color: '#3B82F6' },
  { icon: '⚖️', label: 'Terms of Service',  url:    TOS_URL,            color: '#8B5CF6' },
];

const ARTISAN_STATUS_CONFIG = {
  incomplete: {
    icon: '⚠️', label: 'Registration Incomplete',
    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
    note: 'Complete your profile to unlock full artisan access.',
  },
  pending: {
    icon: '⏳', label: 'Verification Pending',
    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
    note: 'Our team is reviewing your profile. This usually takes 24–48 hours.',
  },
  verified: {
    icon: '✅', label: 'Verified Artisan',
    color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0',
    note: 'Your account is fully verified. You can receive job requests.',
  },
  rejected: {
    icon: '❌', label: 'Verification Rejected',
    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
    note: 'Your application was not approved.',
    tap: 'Tap to view reason and resubmit →',
  },
};

export default function ProfileScreen({ navigation, onLogout, onRefreshAuth }) {
  const [user, setUser]                         = useState(null);
  const [stats, setStats]                       = useState({ total: 0, completed: 0, active: 0 });
  const [activeJob, setActiveJob]               = useState(null);
  const [loadingStats, setLoadingStats]         = useState(true);
  const [becomingArtisan, setBecomingArtisan]   = useState(false);
  const [artisanStatus, setArtisanStatus]       = useState(null);
  const [artisanIsPro, setArtisanIsPro]         = useState(false);
  const [loadingArtisanStatus, setLoadingArtisanStatus] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl]   = useState(null);
  const [subscription, setSubscription]         = useState(null);

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const loadProfile = async () => {
    const u = await getUser();
    setUser(u);
    fetchStats(u);
    if (u?.role === 'artisan') fetchArtisanStatus();
  };

  const ACTIVE_STATUSES = ['pending', 'accepted', 'in-progress', 'disputed'];

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res  = await getMyJobs();
      const jobs = res.data.data || [];
      const completed = jobs.filter(j => j.status === 'completed').length;
      const active    = jobs.filter(j => ACTIVE_STATUSES.includes(j.status)).length;
      setStats({ total: jobs.length, completed, active });
      setActiveJob(jobs.find(j => ACTIVE_STATUSES.includes(j.status)) || null);
    } catch { /* silent */ }
    finally { setLoadingStats(false); }
  };

  const fetchArtisanStatus = async () => {
    setLoadingArtisanStatus(true);
    try {
      const [onboardRes, subRes] = await Promise.all([
        getOnboardingStatus(),
        getMySubscription().catch(() => null),
      ]);
      const data   = onboardRes.data.data;
      const status = data?.verificationStatus || 'incomplete';
      setArtisanStatus(status);
      setArtisanIsPro(data?.isPro || false);
      if (data?.profilePhoto?.url) setProfilePhotoUrl(data.profilePhoto.url);
      setSubscription(subRes?.data?.data || null);
    } catch { /* silent */ }
    finally { setLoadingArtisanStatus(false); }
  };

  const handleBecomeArtisan = () => {
    Alert.alert(
      'Become an Artisan',
      "List your skills and start receiving job requests from customers near you. You'll complete a quick 5-step profile setup.",
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Get Started', onPress: async () => {
            setBecomingArtisan(true);
            try { await becomeArtisan(); onRefreshAuth?.(); }
            catch (err) { Alert.alert('Error', err?.message || 'Could not start artisan onboarding. Please try again.'); }
            finally { setBecomingArtisan(false); }
        }},
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const initial          = (user?.name || 'U')[0].toUpperCase();
  const isArtisan        = user?.role === 'artisan';
  const isArtisanPending = isArtisan && artisanStatus === 'pending';
  const isArtisanVerified= isArtisan && artisanStatus === 'verified';
  const statusConfig     = isArtisan && artisanStatus ? ARTISAN_STATUS_CONFIG[artisanStatus] : null;
  const menuItems        = isArtisan ? ARTISAN_MENU_ITEMS : CUSTOMER_MENU_ITEMS;

  /* ─── Subscription banner ─────────────────────────────────────────────── */
  const SubscriptionBanner = () => {
    if (!isArtisan || !isArtisanVerified) return null;

    // Admin-granted Pro (artisanIsPro=true) is identical to a paid subscription.
    // Check both paths so admin-granted artisans never see the subscribe prompt.
    const adminGranted = artisanIsPro === true;
    const subStatus    = (adminGranted && !['trial', 'active', 'grace'].includes(subscription?.status))
      ? 'active'
      : subscription?.status;
    const subExpiry    = subscription?.endsAt
      ? new Date(subscription.endsAt).toLocaleDateString('en-NG',
          { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    if (subStatus === 'trial') return (
      <TouchableOpacity
        style={subStyles.freeWrap}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.88}
      >
        <View style={subStyles.freeLeft}>
          <Text style={subStyles.freeHeadline}>🎁 Free Trial Active</Text>
          <Text style={subStyles.freeSub}>
            Subscribe before your trial ends to keep full access and stay discoverable.
          </Text>
        </View>
        <View style={subStyles.freeRight}>
          <View style={subStyles.freeBtn}>
            <Text style={subStyles.freeBtnText}>Subscribe →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );

    if (subStatus === 'active') return (
      <View style={subStyles.basicWrap}>
        <View style={subStyles.accentBar} />
        <View style={subStyles.inner}>
          <View style={subStyles.planRow}>
            <View style={[subStyles.badge, { backgroundColor: PRIMARY }]}>
              <Text style={subStyles.badgeText}>✓ PRO</Text>
            </View>
            <View style={subStyles.activePill}>
              <View style={subStyles.activeDot} />
              <Text style={subStyles.activePillText}>Active</Text>
            </View>
          </View>
          <Text style={subStyles.planHeadline}>FixNG Pro</Text>
          <Text style={subStyles.planSub}>Unlimited jobs · Priority placement · Pro badge</Text>
          {subExpiry && <Text style={subStyles.expiry}>Renews {subExpiry}</Text>}
        </View>
      </View>
    );

    if (subStatus === 'grace') return (
      <TouchableOpacity
        style={[subStyles.basicWrap, { borderColor: '#EA580C' }]}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.88}
      >
        <View style={[subStyles.accentBar, { backgroundColor: '#EA580C' }]} />
        <View style={subStyles.inner}>
          <View style={subStyles.planRow}>
            <View style={[subStyles.badge, { backgroundColor: '#EA580C' }]}>
              <Text style={subStyles.badgeText}>⚠️ GRACE</Text>
            </View>
            <View style={subStyles.activePill}>
              <View style={[subStyles.activeDot, { backgroundColor: '#EA580C' }]} />
              <Text style={[subStyles.activePillText, { color: '#EA580C' }]}>Renew Soon</Text>
            </View>
          </View>
          <Text style={subStyles.planHeadline}>FixNG Pro</Text>
          <Text style={subStyles.planSub}>Renew now to stay discoverable and keep your Pro badge.</Text>
          {subExpiry && <Text style={subStyles.expiry}>Grace ends {subExpiry}</Text>}
        </View>
      </TouchableOpacity>
    );

    /* Not subscribed / expired / cancelled → upsell */
    return (
      <TouchableOpacity
        style={subStyles.freeWrap}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.88}
      >
        <View style={subStyles.freeLeft}>
          <View style={subStyles.verifiedRow}>
            <Text style={subStyles.verifiedTick}>✓</Text>
            <Text style={subStyles.verifiedLabel}>Verified Artisan</Text>
          </View>
          <Text style={subStyles.freeHeadline}>Subscribe to be discoverable</Text>
          <Text style={subStyles.freeSub}>
            Unlock priority placement, unlimited jobs & a Pro badge.
          </Text>
        </View>
        <View style={subStyles.freeRight}>
          <Text style={subStyles.freePrice}>from{'\n'}₦5,000</Text>
          <View style={subStyles.freeBtn}>
            <Text style={subStyles.freeBtnText}>Subscribe →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero band ──────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>My Profile</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditProfile')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.heroEditBtn}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar — overlaps the hero band */}
          <View style={styles.avatarWrapper}>
            <View style={[
              styles.avatarRing,
              isArtisan && statusConfig && { borderColor: statusConfig.color },
            ]}>
              {profilePhotoUrl
                ? <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
                : <Text style={styles.avatarInitial}>{initial}</Text>}
            </View>
            {isArtisanVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Name / phone / role pill ───────────────────────────────────── */}
        <View style={styles.nameBlock}>
          <Text style={styles.userName}>{user?.name || '—'}</Text>
          <Text style={styles.userPhone}>{user?.phone || ''}</Text>
          {isArtisan && (
            <View style={[
              styles.rolePill,
              { backgroundColor: isArtisanVerified ? '#DCFCE7' : '#FEF9C3' },
            ]}>
              <Text style={[
                styles.rolePillText,
                { color: isArtisanVerified ? '#16A34A' : '#92400E' },
              ]}>
                {isArtisanVerified ? '✅  Verified Artisan' : '⏳  Artisan'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatBox label="Total Jobs"  value={loadingStats ? '—' : stats.total}     accent="#6366F1" />
          <StatBox label="Completed"   value={loadingStats ? '—' : stats.completed}  accent="#10B981" />
          <StatBox label="Active"      value={loadingStats ? '—' : stats.active}     accent="#F59E0B" />
        </View>

        {/* ── Subscription banner ────────────────────────────────────────── */}
        <SubscriptionBanner />

        {/* ── Artisan status card ────────────────────────────────────────── */}
        {isArtisan && (
          loadingArtisanStatus
            ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={PRIMARY} size="small" />
                <Text style={styles.loadingText}>Loading artisan status…</Text>
              </View>
            )
            : statusConfig
              ? (artisanStatus === 'incomplete' || artisanStatus === 'rejected')
                ? (
                  <TouchableOpacity
                    style={[styles.statusCard, { borderLeftColor: statusConfig.color, backgroundColor: statusConfig.bg }]}
                    onPress={() => artisanStatus === 'incomplete'
                      ? navigation.navigate('Step4_VerificationID', { isEdit: true })
                      : navigation.navigate('AccountStatus', { type: 'rejected' })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statusTop}>
                      <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
                      <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                    <Text style={styles.statusNote}>{statusConfig.note}</Text>
                    <Text style={[styles.statusTap, { color: statusConfig.color }]}>
                      {artisanStatus === 'incomplete'
                        ? 'Tap to upload your ID and complete registration →'
                        : statusConfig.tap}
                    </Text>
                  </TouchableOpacity>
                )
                : (
                  <View style={[styles.statusCard, { borderLeftColor: statusConfig.color, backgroundColor: statusConfig.bg }]}>
                    <View style={styles.statusTop}>
                      <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
                      <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                    <Text style={styles.statusNote}>{statusConfig.note}</Text>
                  </View>
                )
              : null
        )}

        {/* ── Action CTAs ────────────────────────────────────────────────── */}
        {isArtisanVerified ? (
          <>
            <ActionCard
              icon="👁️" title="View Public Profile"
              subtitle="See what customers see when they find you"
              accentColor="#16A34A" bgColor="#F0FDF4" borderColor="#BBF7D0"
              onPress={() => navigation.navigate('ArtisanProfile', { artisanId: user._id || user.id })}
            />
            <ActionCard
              icon="🔧" title="Job Dashboard"
              subtitle="View and manage available job requests"
              accentColor={PRIMARY} bgColor={PRIMARY_L} borderColor="#BFDBFE"
              onPress={() => navigation.navigate('JobScreen')}
            />
          </>
        ) : isArtisanPending ? (
          <ActionCard
            icon="⏳" title="Verification Pending"
            subtitle="Tap to return to the job dashboard"
            accentColor="#D97706" bgColor="#FFFBEB" borderColor="#FDE68A"
            onPress={() => navigation.navigate('JobScreen')}
          />
        ) : !isArtisan ? (
          <ActionCard
            icon="🔧" title="Become an Artisan"
            subtitle="List your skills & earn money"
            accentColor={PRIMARY} bgColor={PRIMARY_L} borderColor="#BFDBFE"
            onPress={handleBecomeArtisan}
            loading={becomingArtisan}
          />
        ) : null}

        {/* ── Track active job ───────────────────────────────────────────── */}
        {activeJob && (
          <ActionCard
            icon="📍" title="Track Your Job"
            subtitle={`${activeJob.category} · ${activeJob.status.replace('-', ' ')}`}
            accentColor="#C2410C" bgColor="#FFF7ED" borderColor="#FED7AA"
            onPress={() => navigation.navigate('JobDetail', { jobId: activeJob._id })}
          />
        )}

        {/* ── Section label ──────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        {/* ── Menu ───────────────────────────────────────────────────────── */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={() => item.url ? Linking.openURL(item.url) : navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: item.color + '18' }]}>
                <Text style={styles.menuIconEmoji}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logout ─────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FixNG v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Reusable sub-components ──────────────────────────────────────────────── */

function StatBox({ label, value, accent }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statAccentDot, { backgroundColor: accent }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, title, subtitle, accentColor, bgColor, borderColor, onPress, loading }) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: bgColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.82}
      disabled={loading}
    >
      {/* Left colour stripe */}
      <View style={[styles.actionStripe, { backgroundColor: accentColor }]} />
      <View style={styles.actionIconWrap}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionTitle, { color: accentColor }]}>{title}</Text>
        <Text style={styles.actionSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      {loading
        ? <ActivityIndicator color={accentColor} />
        : <Text style={[styles.actionArrow, { color: accentColor }]}>›</Text>}
    </TouchableOpacity>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { paddingBottom: 40 },

  /* Hero */
  hero: {
    backgroundColor: PRIMARY,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 52,          // extra space so avatar overlaps nicely
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.3,
  },
  heroEditBtn: {
    fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },

  /* Avatar */
  avatarWrapper: {
    alignSelf: 'center',
    marginTop: 16,
    position: 'relative',
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: '#fff',
    backgroundColor: '#C7D2FE',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  avatarImage:   { width: 90, height: 90, borderRadius: 45 },
  avatarInitial: { fontSize: 36, fontWeight: '900', color: PRIMARY },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#16A34A',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  verifiedBadgeText: { fontSize: 11, color: '#fff', fontWeight: '900' },

  /* Name block — sits below hero, centred */
  nameBlock: {
    alignItems: 'center',
    marginTop: -46,             // pulls up into the hero overlap
    paddingTop: 52,             // clears the avatar
    backgroundColor: '#F1F5F9',
    paddingBottom: 8,
  },
  userName:  { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 3 },
  userPhone: { fontSize: 14, color: '#64748B', marginBottom: 10 },
  rolePill: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20,
  },
  rolePillText: { fontSize: 12, fontWeight: '700' },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: 18, marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  statBox:       { flex: 1, alignItems: 'center' },
  statAccentDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 6 },
  statValue:     { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  statLabel:     { fontSize: 11, color: '#94A3B8', fontWeight: '600', letterSpacing: 0.3 },

  /* Loading state */
  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, backgroundColor: '#fff',
    borderRadius: 14,
  },
  loadingText: { fontSize: 13, color: '#64748B' },

  /* Status card — left-border style */
  statusCard: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statusTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusIcon:  { fontSize: 20 },
  statusLabel: { fontSize: 14, fontWeight: '800' },
  statusNote:  { fontSize: 12, color: '#374151', lineHeight: 17 },
  statusTap:   { fontSize: 12, fontWeight: '700', marginTop: 6 },

  /* Action cards */
  actionCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  actionStripe:  { width: 4, alignSelf: 'stretch' },
  actionIconWrap:{ paddingLeft: 14, paddingRight: 4, paddingVertical: 18 },
  actionIcon:    { fontSize: 26 },
  actionText:    { flex: 1, paddingHorizontal: 10, paddingVertical: 18 },
  actionTitle:   { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  actionSubtitle:{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' },
  actionArrow:   { fontSize: 26, fontWeight: '700', paddingRight: 16 },

  /* Section label */
  sectionLabel: {
    marginHorizontal: 20, marginBottom: 8, marginTop: 8,
    fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.2,
  },

  /* Menu */
  menuCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIconBox: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  menuIconEmoji: { fontSize: 18 },
  menuLabel:     { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B' },
  menuChevron:   { fontSize: 20, color: '#CBD5E1' },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 20,
    borderRadius: 16, paddingVertical: 15,
    borderWidth: 1.5, borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  version: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', letterSpacing: 0.5 },
});

/* ─── Subscription styles ───────────────────────────────────────────────────── */
const subStyles = StyleSheet.create({
  /* Shared card shell */
  basicWrap: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5, borderColor: '#BFDBFE',
    overflow: 'hidden',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 6, elevation: 2,
  },
  premiumWrap: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  accentBar: {
    height: 4, backgroundColor: PRIMARY,
  },
  inner: { padding: 16 },

  /* Badge + active pill */
  planRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  badge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText:  { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  activeDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  activePillText:{ fontSize: 12, fontWeight: '700', color: '#16A34A' },

  planHeadline: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  planSub:      { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 8 },
  expiry:       { fontSize: 12, color: '#94A3B8', marginBottom: 12 },

  upgradeBtn: {
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  /* Free / upsell card */
  freeWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 4,
  },
  freeLeft:  { flex: 1, paddingRight: 12 },
  freeRight: { alignItems: 'center', gap: 10 },

  verifiedRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  verifiedTick:  { fontSize: 13, fontWeight: '900', color: '#34D399' },
  verifiedLabel: { fontSize: 12, fontWeight: '700', color: '#34D399' },

  freeHeadline: { fontSize: 15, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  freeSub:      { fontSize: 12, color: '#94A3B8', lineHeight: 17 },

  freePrice: {
    fontSize: 13, fontWeight: '800',
    color: '#F8FAFC', textAlign: 'center', lineHeight: 18,
  },
  freeBtn: {
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  freeBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});