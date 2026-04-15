import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Modal, Pressable, Dimensions,
  ActivityIndicator, RefreshControl, TextInput, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getUser } from '../../utils/storage';
import {
  getDashboardStats,
  getVerificationQueue,
  getArtisanDetail,
  verifyArtisan,
  rejectArtisan,
  warnArtisan,
  suspendArtisan,
  getComplaints,
} from '../../api/adminApi';

const PRIMARY = '#2563EB';
const GREEN   = '#16A34A';
const RED     = '#DC2626';
const AMBER   = '#D97706';
const { width: SCREEN_W } = Dimensions.get('window');

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AdminDashboardScreen({ onLogout }) {
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [activePage, setActivePage]   = useState('dashboard');
  const [adminUser, setAdminUser]     = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  const insets = useSafeAreaInsets();

  // Stats
  const [stats, setStats]             = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Verification queue
  const [queue, setQueue]             = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);

  // Complaints
  const [complaints, setComplaints]   = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);

  // Action modal
  const [actionModal, setActionModal] = useState(null);
  // { type: 'warn'|'suspend'|'reject', userId, name, onDone }
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // View Form modal
  const [viewFormData, setViewFormData] = useState(null);
  const [viewFormLoading, setViewFormLoading] = useState(false);

  useEffect(() => {
    getUser().then(setAdminUser);
    loadAll();
  }, []);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [statsRes, queueRes, complaintsRes] = await Promise.all([
        getDashboardStats(),
        getVerificationQueue(),
        getComplaints({ status: 'open', limit: 10 }),
      ]);
      setStats(statsRes.data.data);
      setQueue(queueRes.data.data || []);
      setComplaints(complaintsRes.data.data || []);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to load dashboard data.');
    } finally {
      setStatsLoading(false);
      setQueueLoading(false);
      setComplaintsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const adminName   = adminUser?.name?.split(' ')[0] || 'Admin';
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const navigate = (page) => { setActivePage(page); setDrawerOpen(false); };

  // ── Approve artisan ──────────────────────────────────────────────────────────
  const handleApprove = (userId, name) => {
    Alert.alert(
      'Approve Artisan',
      `Verify ${name} as a trusted artisan on FixNG?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await verifyArtisan(userId);
              setQueue((q) => q.filter((a) => a.userId !== userId));
              setStats((s) => s ? { ...s, pendingVerifications: Math.max(0, s.pendingVerifications - 1) } : s);
              Alert.alert('Done', `${name} has been verified.`);
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not approve artisan.');
            }
          },
        },
      ]
    );
  };

  // ── Open reason modal (reject / warn / suspend) ──────────────────────────────
  const openActionModal = (type, userId, name, onDone) => {
    setActionReason('');
    setActionModal({ type, userId, name, onDone });
  };

  const submitAction = async () => {
    if (!actionReason.trim()) {
      Alert.alert('Required', 'Please enter a reason.');
      return;
    }
    setActionLoading(true);
    try {
      const { type, userId, name, onDone } = actionModal;
      if (type === 'reject')  await rejectArtisan(userId, actionReason.trim());
      if (type === 'warn')    await warnArtisan(userId, actionReason.trim());
      if (type === 'suspend') await suspendArtisan(userId, actionReason.trim());

      setActionModal(null);
      onDone?.();
      const labels = { reject: 'rejected', warn: 'warned', suspend: 'suspended' };
      Alert.alert('Done', `${name} has been ${labels[type]}.`);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── View Form ────────────────────────────────────────────────────────────────
  const handleViewForm = async (userId) => {
    setViewFormData(null);
    setViewFormLoading(true);
    try {
      const res = await getArtisanDetail(userId);
      setViewFormData(res.data.data);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not load artisan details.');
      return;
    } finally {
      setViewFormLoading(false);
    }
  };

  // ── STAT CARDS config (driven by live data) ──────────────────────────────────
  const STAT_CARDS = stats ? [
    {
      id: 'verifications',
      icon: 'shield-checkmark',
      iconColor: PRIMARY,
      value: String(stats.pendingVerifications),
      label: 'Pending Verifications',
      badge: stats.pendingVerifications > 0 ? 'HIGH PRIORITY' : null,
      badgeColor: PRIMARY, badgeBg: '#DBEAFE', borderColor: PRIMARY,
    },
    {
      id: 'artisans',
      icon: 'people',
      iconColor: '#6B7280',
      value: stats.totalVerifiedArtisans?.toLocaleString() || '0',
      label: 'Verified Artisans',
      badge: null, borderColor: '#E5E7EB',
    },
    {
      id: 'jobs',
      icon: 'briefcase',
      iconColor: '#6B7280',
      value: String(stats.activeJobs),
      label: 'Active Jobs',
      badge: null, borderColor: '#E5E7EB',
    },
    {
      id: 'complaints',
      icon: 'alert-circle',
      iconColor: RED,
      value: String(stats.openComplaints),
      label: 'Open Complaints',
      badge: stats.openComplaints > 0 ? 'ACTION REQUIRED' : null,
      badgeColor: RED, badgeBg: '#FEE2E2', borderColor: RED,
    },
  ] : [];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.hamburger} onPress={() => setDrawerOpen(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={26} color="#1E232C" />
        </TouchableOpacity>
        <Text style={styles.appName}>FixNG</Text>
        <View style={styles.adminAvatar}>
          <Text style={styles.adminInitial}>{adminUser?.name?.[0]?.toUpperCase() || 'A'}</Text>
        </View>
      </View>

      {/* ── Page content ── */}
      {activePage === 'profile' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatarBox}>
              <Ionicons name="person" size={36} color="#FFF" />
            </View>
            <Text style={styles.profileName}>{adminUser?.name || '—'}</Text>
            <Text style={styles.profileRole}>Administrator</Text>
            <Text style={styles.profilePhone}>{adminUser?.phone || ''}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={22} color={RED} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={PRIMARY} />
          }
        >
          {/* Greeting */}
          <View style={styles.greeting}>
            <Text style={styles.greetingTitle}>{getGreeting()}, {adminName}</Text>
            <Text style={styles.greetingSubtitle}>
              System oversight for Lagos, NG. All services operational.
            </Text>
          </View>

          {/* Stats */}
          {statsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.loadingText}>Loading stats…</Text>
            </View>
          ) : (
            STAT_CARDS.map((stat) => <StatCard key={stat.id} stat={stat} />)
          )}

          {/* Recent Complaints */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Complaints</Text>
            <Text style={styles.sectionCount}>
              {complaintsLoading ? '…' : `${complaints.length} open`}
            </Text>
          </View>

          {complaintsLoading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginBottom: 16 }} />
          ) : complaints.length === 0 ? (
            <EmptyCard icon="checkmark-circle-outline" text="No open complaints" />
          ) : (
            complaints.map((item) => (
              <ComplaintCard
                key={item._id}
                item={item}
                onWarn={() =>
                  openActionModal('warn', item.againstUserId?._id, item.againstUserId?.name, () => loadAll())
                }
                onSuspend={() =>
                  openActionModal('suspend', item.againstUserId?._id, item.againstUserId?.name, () => loadAll())
                }
              />
            ))
          )}

          {/* Verification Queue */}
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Verification Queue</Text>
            <Text style={styles.sectionCount}>
              {queueLoading ? '…' : `${queue.length} pending`}
            </Text>
          </View>

          {queueLoading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginBottom: 16 }} />
          ) : queue.length === 0 ? (
            <EmptyCard icon="shield-checkmark-outline" text="Verification queue is clear" />
          ) : (
            queue.map((item) => (
              <VerificationCard
                key={item.artisanProfileId}
                item={item}
                onApprove={() => handleApprove(item.userId, item.name)}
                onReject={() =>
                  openActionModal('reject', item.userId, item.name, () =>
                    setQueue((q) => q.filter((a) => a.userId !== item.userId))
                  )
                }
                onViewForm={() => handleViewForm(item.userId)}
              />
            ))
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ── Side drawer ── */}
      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <Pressable style={styles.drawerOverlay} onPress={() => setDrawerOpen(false)}>
          <Pressable
            style={[styles.drawer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerInitial}>{adminUser?.name?.[0]?.toUpperCase() || 'A'}</Text>
              </View>
              <Text style={styles.drawerName}>{adminUser?.name || 'Admin'}</Text>
              <Text style={styles.drawerRole}>Administrator</Text>
            </View>
            <View style={styles.drawerDivider} />
            <DrawerItem icon="grid-outline"   label="Dashboard" active={activePage === 'dashboard'} onPress={() => navigate('dashboard')} />
            <DrawerItem icon="person-outline" label="Profile"   active={activePage === 'profile'}   onPress={() => navigate('profile')} />
            <View style={styles.drawerDivider} />
            <DrawerItem icon="log-out-outline" label="Log Out" danger onPress={handleLogout} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Reason input modal (warn / suspend / reject) ── */}
      <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => setActionModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => !actionLoading && setActionModal(null)}>
          <Pressable style={styles.reasonModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.reasonTitle}>
              {actionModal?.type === 'warn'    && `Warn ${actionModal.name}`}
              {actionModal?.type === 'suspend' && `Suspend ${actionModal.name}`}
              {actionModal?.type === 'reject'  && `Reject ${actionModal.name}`}
            </Text>
            <Text style={styles.reasonSubtitle}>
              This reason will be sent to the user.
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={actionReason}
              onChangeText={setActionReason}
              editable={!actionLoading}
            />
            <View style={styles.reasonActions}>
              <TouchableOpacity
                style={styles.reasonCancelBtn}
                onPress={() => setActionModal(null)}
                disabled={actionLoading}
              >
                <Text style={styles.reasonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reasonSubmitBtn,
                  actionModal?.type === 'warn'    && { backgroundColor: AMBER },
                  actionModal?.type === 'suspend' && { backgroundColor: RED },
                  actionModal?.type === 'reject'  && { backgroundColor: RED },
                ]}
                onPress={submitAction}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.reasonSubmitText}>
                      {actionModal?.type === 'warn' ? 'Send Warning' : actionModal?.type === 'suspend' ? 'Suspend' : 'Reject'}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── View Form modal ── */}
      <Modal
        visible={viewFormData !== null || viewFormLoading}
        transparent
        animationType="slide"
        onRequestClose={() => { setViewFormData(null); setViewFormLoading(false); }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => { setViewFormData(null); setViewFormLoading(false); }}
        >
          <Pressable style={styles.viewFormModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.viewFormHeader}>
              <Text style={styles.viewFormTitle}>Artisan Profile</Text>
              <TouchableOpacity onPress={() => { setViewFormData(null); setViewFormLoading(false); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {viewFormLoading ? (
              <View style={styles.viewFormLoading}>
                <ActivityIndicator color={PRIMARY} size="large" />
                <Text style={styles.loadingText}>Loading profile…</Text>
              </View>
            ) : viewFormData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Photo */}
                {viewFormData.profilePhoto?.url ? (
                  <Image source={{ uri: viewFormData.profilePhoto.url }} style={styles.vfPhoto} />
                ) : (
                  <View style={styles.vfPhotoPlaceholder}>
                    <Ionicons name="person" size={40} color="#D1D5DB" />
                  </View>
                )}

                <FormRow label="Name"    value={viewFormData.userId?.name} />
                <FormRow label="Phone"   value={viewFormData.userId?.phone} />
                <FormRow label="Skills"  value={viewFormData.skills?.join(', ') || '—'} />
                <FormRow label="Location" value={viewFormData.location?.address || viewFormData.location?.lga || '—'} />
                <FormRow label="Status"  value={viewFormData.verificationStatus} highlight />

                {/* Verification ID */}
                <Text style={styles.vfSectionLabel}>Verification ID</Text>
                {viewFormData.verificationId?.url ? (
                  <Image source={{ uri: viewFormData.verificationId.url }} style={styles.vfIdImage} resizeMode="contain" />
                ) : (
                  <Text style={styles.vfMissing}>Not submitted</Text>
                )}

                {/* Skill Video */}
                <Text style={styles.vfSectionLabel}>Skill Video</Text>
                {viewFormData.skillVideo?.url ? (
                  <View style={styles.vfVideoBox}>
                    <Ionicons name="videocam" size={28} color={PRIMARY} />
                    <Text style={styles.vfVideoText}>Video submitted</Text>
                  </View>
                ) : (
                  <Text style={styles.vfMissing}>Not submitted</Text>
                )}

                <View style={{ height: 20 }} />
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DrawerItem({ icon, label, active, danger, onPress }) {
  return (
    <TouchableOpacity style={[styles.drawerItem, active && styles.drawerItemActive]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={danger ? RED : active ? PRIMARY : '#374151'} />
      <Text style={[styles.drawerItemLabel, active && styles.drawerItemLabelActive, danger && styles.drawerItemLabelDanger]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({ stat }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: stat.borderColor }]}>
      <View style={styles.statCardTop}>
        <Ionicons name={stat.icon} size={28} color={stat.iconColor} />
        {stat.badge && (
          <View style={[styles.badge, { backgroundColor: stat.badgeBg }]}>
            <Text style={[styles.badgeText, { color: stat.badgeColor }]}>{stat.badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </View>
  );
}

function ComplaintCard({ item, onWarn, onSuspend }) {
  const against = item.againstUserId;
  const reporter = item.submittedBy;
  const timeAgo = item.createdAt ? getTimeAgo(item.createdAt) : '';

  return (
    <View style={styles.complaintCard}>
      <View style={styles.complaintTop}>
        <View style={styles.complaintAvatar}>
          <Ionicons name="person" size={18} color="#9CA3AF" />
        </View>
        <View style={styles.complaintInfo}>
          <Text style={styles.complaintName}>{against?.name || 'Unknown'}</Text>
          <Text style={styles.complaintType}>{item.reason || item.description || 'Complaint'}</Text>
          <Text style={styles.complaintReporter}>
            Reported by: {reporter?.name || 'Anonymous'} · {timeAgo}
          </Text>
        </View>
      </View>
      <View style={styles.complaintActions}>
        <TouchableOpacity style={styles.warnBtn} onPress={onWarn} activeOpacity={0.8}>
          <Text style={styles.warnBtnText}>Warn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.suspendBtn} onPress={onSuspend} activeOpacity={0.8}>
          <Text style={styles.suspendBtnText}>Suspend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function VerificationCard({ item, onApprove, onReject, onViewForm }) {
  return (
    <View style={styles.verificationCard}>
      <View style={styles.verificationTop}>
        <Text style={styles.artId}>ART-ID: {String(item.artisanProfileId).slice(-6).toUpperCase()}</Text>
        <Text style={styles.verificationTime}>{getTimeAgo(item.joinedAt)}</Text>
      </View>
      <Text style={styles.verificationName}>{item.name}</Text>
      {item.skills?.length > 0 && (
        <Text style={styles.verificationSkills}>{item.skills.slice(0, 3).join(' · ')}</Text>
      )}

      <View style={styles.verificationActions}>
        <TouchableOpacity style={styles.approveBtn} onPress={onApprove} activeOpacity={0.8}>
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewFormBtn} onPress={onViewForm} activeOpacity={0.8}>
          <Text style={styles.viewFormBtnText}>View Form</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.8}>
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyCard({ icon, text }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={32} color="#D1D5DB" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function FormRow({ label, value, highlight }) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>{label}</Text>
      <Text style={[styles.formValue, highlight && styles.formValueHighlight]}>{value || '—'}</Text>
    </View>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FB' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#F5F7FB',
  },
  hamburger: { padding: 4, marginRight: 12 },
  appName: { flex: 1, fontSize: 20, fontWeight: '900', color: PRIMARY, letterSpacing: -0.5 },
  adminAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E232C',
    justifyContent: 'center', alignItems: 'center',
  },
  adminInitial: { fontSize: 18, fontWeight: '800', color: '#FFF' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },

  greeting: { marginBottom: 20 },
  greetingTitle: { fontSize: 26, fontWeight: '800', color: '#1E232C', marginBottom: 4 },
  greetingSubtitle: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  loadingText: { fontSize: 13, color: '#6B7280' },

  statCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderWidth: 1, borderColor: '#EEF0F5', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  statValue: { fontSize: 32, fontWeight: '900', color: '#1E232C', marginBottom: 2 },
  statLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E232C' },
  sectionCount: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },

  emptyCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 24, alignItems: 'center',
    gap: 8, marginBottom: 16, borderWidth: 1, borderColor: '#EEF0F5',
  },
  emptyText: { fontSize: 13, color: '#9CA3AF' },

  complaintCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#EEF0F5', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  complaintTop: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  complaintAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  complaintInfo: { flex: 1 },
  complaintName: { fontSize: 15, fontWeight: '700', color: '#1E232C', marginBottom: 2 },
  complaintType: { fontSize: 13, fontWeight: '600', color: RED, marginBottom: 3 },
  complaintReporter: { fontSize: 12, color: '#9CA3AF' },
  complaintActions: { flexDirection: 'row', gap: 10 },
  warnBtn: {
    paddingVertical: 9, paddingHorizontal: 24, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center',
  },
  warnBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  suspendBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: RED, alignItems: 'center' },
  suspendBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  verificationCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EEF0F5', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  verificationTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  artId: { fontSize: 13, fontWeight: '800', color: PRIMARY },
  verificationTime: { fontSize: 12, color: '#9CA3AF' },
  verificationName: { fontSize: 17, fontWeight: '800', color: '#1E232C', marginBottom: 2 },
  verificationSkills: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  verificationActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: GREEN, alignItems: 'center' },
  approveBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  viewFormBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', alignItems: 'center',
  },
  viewFormBtnText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  rejectBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '800', color: RED },

  profileCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 28, alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#EEF0F5', elevation: 1,
  },
  profileAvatarBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E232C',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  profileName: { fontSize: 20, fontWeight: '800', color: '#1E232C', marginBottom: 4 },
  profileRole: { fontSize: 13, fontWeight: '700', color: PRIMARY, marginBottom: 4 },
  profilePhone: { fontSize: 13, color: '#6B7280' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEE2E2',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: RED },

  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', flexDirection: 'row' },
  drawer: {
    width: SCREEN_W * 0.72, backgroundColor: '#FFF',
    elevation: 16, shadowColor: '#000', shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 16,
  },
  drawerHeader: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  drawerAvatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#1E232C',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  drawerInitial: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  drawerName: { fontSize: 16, fontWeight: '800', color: '#1E232C', marginBottom: 2 },
  drawerRole: { fontSize: 12, fontWeight: '600', color: PRIMARY },
  drawerDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14 },
  drawerItemActive: { backgroundColor: '#EFF6FF' },
  drawerItemLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  drawerItemLabelActive: { color: PRIMARY, fontWeight: '700' },
  drawerItemLabelDanger: { color: RED },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reasonModal: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  reasonTitle: { fontSize: 18, fontWeight: '800', color: '#1E232C', marginBottom: 4 },
  reasonSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  reasonInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#1E232C',
    minHeight: 90, textAlignVertical: 'top', marginBottom: 20,
  },
  reasonActions: { flexDirection: 'row', gap: 12 },
  reasonCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  reasonCancelText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  reasonSubmitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: PRIMARY, alignItems: 'center',
  },
  reasonSubmitText: { fontSize: 14, fontWeight: '800', color: '#FFF' },

  viewFormModal: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  viewFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewFormTitle: { fontSize: 18, fontWeight: '800', color: '#1E232C' },
  viewFormLoading: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  vfPhoto: { width: '100%', height: 180, borderRadius: 14, marginBottom: 16 },
  vfPhotoPlaceholder: {
    width: '100%', height: 180, borderRadius: 14, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  formLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  formValue: { fontSize: 13, color: '#1E232C', fontWeight: '500', flex: 1, textAlign: 'right' },
  formValueHighlight: { color: PRIMARY, fontWeight: '700', textTransform: 'capitalize' },
  vfSectionLabel: { fontSize: 14, fontWeight: '800', color: '#1E232C', marginTop: 16, marginBottom: 8 },
  vfIdImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F3F4F6' },
  vfMissing: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  vfVideoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14,
  },
  vfVideoText: { fontSize: 14, fontWeight: '600', color: PRIMARY },
});
