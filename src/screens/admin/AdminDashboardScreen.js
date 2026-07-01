import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Modal, Pressable, Dimensions,
  ActivityIndicator, RefreshControl, TextInput, Image, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getUser } from '../../utils/storage';
import BottomModal from '../../components/BottomModal';
import {
  getDashboardStats,
  getVerificationQueue,
  getArtisanDetail,
  verifyArtisan,
  rejectArtisan,
  warnArtisan,
  suspendArtisan,
  getComplaints,
  listUsers,
  toggleUserActive,
  grantPro,
  revokePro,
  warnCustomer,
  suspendCustomer,
  unsuspendCustomer,
  broadcastAnnouncement,
} from '../../api/adminApi';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

export default function AdminDashboardScreen({ onLogout }) {
  const { colors } = useTheme();
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [activePage, setActivePage]   = useState('dashboard');
  const [adminUser, setAdminUser]     = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  const insets = useSafeAreaInsets();

  const [stats, setStats]               = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [queue, setQueue]               = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [complaints, setComplaints]     = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);

  const [actionModal, setActionModal]     = useState(null);
  const [actionReason, setActionReason]   = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [viewFormData, setViewFormData]     = useState(null);
  const [viewFormLoading, setViewFormLoading] = useState(false);
  const [idFullScreen, setIdFullScreen]     = useState(null);

  const [usersTab, setUsersTab]                 = useState('artisans');
  const [users, setUsers]                       = useState([]);
  const [usersLoading, setUsersLoading]         = useState(false);
  const [usersPage, setUsersPage]               = useState(1);
  const [usersHasMore, setUsersHasMore]         = useState(false);
  const [usersLoadingMore, setUsersLoadingMore] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(null);

  const [announceModal, setAnnounceModal]     = useState(false);
  const [announceTitle, setAnnounceTitle]     = useState('');
  const [announceBody, setAnnounceBody]       = useState('');
  const [announceRole, setAnnounceRole]       = useState('all');
  const [announceLoading, setAnnounceLoading] = useState(false);

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
      if (type === 'reject')           await rejectArtisan(userId, actionReason.trim());
      if (type === 'warn')             await warnArtisan(userId, actionReason.trim());
      if (type === 'suspend')          await suspendArtisan(userId, actionReason.trim());
      if (type === 'warn_customer')    await warnCustomer(userId, actionReason.trim());
      if (type === 'suspend_customer') await suspendCustomer(userId, actionReason.trim());

      setActionModal(null);
      onDone?.();
      const labels = { reject: 'rejected', warn: 'warned', suspend: 'suspended', warn_customer: 'warned', suspend_customer: 'suspended' };
      Alert.alert('Done', `${name} has been ${labels[type]}.`);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

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

  const loadUsers = useCallback(async (tab, page = 1, append = false) => {
    if (page === 1) setUsersLoading(true);
    else setUsersLoadingMore(true);
    try {
      const roleMap = { artisans: 'artisan', pro: 'artisan', customers: 'customer' };
      const params = { role: roleMap[tab], page, limit: 20 };
      if (tab === 'pro') params.isPro = true;
      const res = await listUsers(params);
      const data  = res.data.data  || [];
      const total = res.data.total || 0;
      setUsers((prev) => (append ? [...prev, ...data] : data));
      setUsersPage(page);
      setUsersHasMore(page * 20 < total);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not load users.');
    } finally {
      setUsersLoading(false);
      setUsersLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (activePage === 'users') {
      setUsers([]);
      loadUsers(usersTab, 1);
    }
  }, [activePage, usersTab]);

  const handleToggleActive = async (userId, currentState) => {
    setUserActionLoading(userId + '_toggle');
    try {
      await toggleUserActive(userId);
      setUsers((prev) =>
        prev.map((u) => u._id === userId ? { ...u, isActive: !currentState } : u)
      );
    } catch (err) {
      Alert.alert('Error', err?.message || 'Action failed.');
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleGrantPro = async (userId, name) => {
    Alert.alert('Grant Trusted Status', `Make ${name} a Trusted artisan?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Grant Trusted',
        onPress: async () => {
          setUserActionLoading(userId + '_pro');
          try {
            await grantPro(userId);
            setUsers((prev) =>
              prev.map((u) => u._id === userId ? { ...u, isPro: true } : u)
            );
            Alert.alert('Done', `${name} is now a Trusted artisan.`);
          } catch (err) {
            Alert.alert('Error', err?.message || 'Action failed.');
          } finally {
            setUserActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleRevokePro = async (userId, name) => {
    Alert.alert('Revoke Trusted Status', `Remove Trusted status from ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          setUserActionLoading(userId + '_pro');
          try {
            await revokePro(userId);
            setUsers((prev) =>
              prev.map((u) => u._id === userId ? { ...u, isPro: false } : u)
            );
            Alert.alert('Done', `Trusted status removed from ${name}.`);
          } catch (err) {
            Alert.alert('Error', err?.message || 'Action failed.');
          } finally {
            setUserActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleUnsuspendCustomer = (userId, name) => {
    Alert.alert('Unsuspend Customer', `Reinstate ${name}'s account?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsuspend',
        onPress: async () => {
          setUserActionLoading(userId + '_suspend');
          try {
            await unsuspendCustomer(userId);
            setUsers((prev) =>
              prev.map((u) => u._id === userId ? { ...u, isSuspended: false, suspensionReason: null } : u)
            );
            Alert.alert('Done', `${name}'s account has been reinstated.`);
          } catch (err) {
            Alert.alert('Error', err?.message || 'Action failed.');
          } finally {
            setUserActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleAnnounce = async () => {
    if (!announceTitle.trim() || !announceBody.trim()) {
      Alert.alert('Required', 'Please enter both a title and message.');
      return;
    }
    setAnnounceLoading(true);
    try {
      const res = await broadcastAnnouncement(announceTitle.trim(), announceBody.trim(), announceRole);
      const count = res.data.data?.count || 0;
      setAnnounceModal(false);
      setAnnounceTitle('');
      setAnnounceBody('');
      setAnnounceRole('all');
      Alert.alert('Sent', `Announcement delivered to ${count} user${count !== 1 ? 's' : ''}.`);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to send announcement.');
    } finally {
      setAnnounceLoading(false);
    }
  };

  const STAT_CARDS = stats ? [
    {
      id: 'verifications',
      icon: 'shield-checkmark',
      iconColor: colors.info,
      value: String(stats.pendingVerifications),
      label: 'Pending Verifications',
      badge: stats.pendingVerifications > 0 ? 'HIGH PRIORITY' : null,
      badgeColor: colors.info, badgeBg: colors.infoBg, borderColor: colors.info,
      onPress: null,
    },
    {
      id: 'artisans',
      icon: 'people',
      iconColor: colors.info,
      value: stats.totalVerifiedArtisans?.toLocaleString() || '0',
      label: 'Verified Artisans',
      badge: 'TAP TO MANAGE', badgeColor: colors.info, badgeBg: colors.infoBg,
      borderColor: colors.info,
      onPress: () => navigate('users'),
    },
    {
      id: 'jobs',
      icon: 'briefcase',
      iconColor: colors.textMuted,
      value: String(stats.activeJobs),
      label: 'Active Jobs',
      badge: null, borderColor: colors.border,
      onPress: null,
    },
    {
      id: 'complaints',
      icon: 'alert-circle',
      iconColor: colors.error,
      value: String(stats.openComplaints),
      label: 'Open Complaints',
      badge: stats.openComplaints > 0 ? 'ACTION REQUIRED' : null,
      badgeColor: colors.error, badgeBg: colors.errorBg, borderColor: colors.error,
      onPress: null,
    },
  ] : [];

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle={colors.statusBar === 'dark' ? 'dark-content' : 'light-content'} backgroundColor={colors.bgAlt} />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.hamburger} onPress={() => setDrawerOpen(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.appName}>FixNG</Text>
        <View style={styles.adminAvatar}>
          <Text style={styles.adminInitial}>{adminUser?.name?.[0]?.toUpperCase() || 'A'}</Text>
        </View>
      </View>

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
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>

      ) : activePage === 'users' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>User Management</Text>
          </View>

          <View style={styles.tabRow}>
            {[
              { key: 'artisans',  label: 'Artisans' },
              { key: 'pro',       label: 'Trusted Artisans' },
              { key: 'customers', label: 'Customers' },
            ].map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, usersTab === t.key && styles.tabActive]}
                onPress={() => setUsersTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, usersTab === t.key && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {usersLoading ? (
            <View style={styles.loadingBox2}>
              <ActivityIndicator color={colors.info} size="large" />
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.loadingBox2}>
              <Ionicons name="people-outline" size={40} color={colors.textHint} />
              <Text style={[styles.loadingText, { marginTop: 8 }]}>No users found</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(u) => u._id}
              contentContainerStyle={styles.userListContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <UserCard
                  user={item}
                  tab={usersTab}
                  colors={colors}
                  styles={styles}
                  actionLoading={userActionLoading}
                  onToggleActive={() => handleToggleActive(item._id, item.isActive)}
                  onGrantPro={() => handleGrantPro(item._id, item.name)}
                  onRevokePro={() => handleRevokePro(item._id, item.name)}
                  onWarnCustomer={() =>
                    openActionModal('warn_customer', item._id, item.name, () =>
                      setUsers((prev) => prev.map((u) => u._id === item._id ? { ...u, warningCount: (u.warningCount || 0) + 1 } : u))
                    )
                  }
                  onSuspendCustomer={() =>
                    openActionModal('suspend_customer', item._id, item.name, () =>
                      setUsers((prev) => prev.map((u) => u._id === item._id ? { ...u, isSuspended: true } : u))
                    )
                  }
                  onUnsuspendCustomer={() => handleUnsuspendCustomer(item._id, item.name)}
                />
              )}
              ListFooterComponent={
                usersHasMore ? (
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    onPress={() => loadUsers(usersTab, usersPage + 1, true)}
                    disabled={usersLoadingMore}
                    activeOpacity={0.8}
                  >
                    {usersLoadingMore
                      ? <ActivityIndicator color={colors.info} size="small" />
                      : <Text style={styles.loadMoreText}>Load More</Text>
                    }
                  </TouchableOpacity>
                ) : null
              }
            />
          )}
        </View>

      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={colors.info} />
          }
        >
          <View style={styles.greeting}>
            <Text style={styles.greetingTitle}>{getGreeting()}, {adminName}</Text>
            <Text style={styles.greetingSubtitle}>
              System oversight for Lagos, NG. All services operational.
            </Text>
          </View>

          {statsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.info} />
              <Text style={styles.loadingText}>Loading stats…</Text>
            </View>
          ) : (
            STAT_CARDS.map((stat) => <StatCard key={stat.id} stat={stat} styles={styles} />)
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Complaints</Text>
            <Text style={styles.sectionCount}>
              {complaintsLoading ? '…' : `${complaints.length} open`}
            </Text>
          </View>

          {complaintsLoading ? (
            <ActivityIndicator color={colors.info} style={{ marginBottom: 16 }} />
          ) : complaints.length === 0 ? (
            <EmptyCard icon="checkmark-circle-outline" text="No open complaints" styles={styles} colors={colors} />
          ) : (
            complaints.map((item) => (
              <ComplaintCard
                key={item._id}
                item={item}
                colors={colors}
                styles={styles}
                onWarn={() =>
                  openActionModal('warn', item.againstUserId?._id, item.againstUserId?.name, () => loadAll())
                }
                onSuspend={() =>
                  openActionModal('suspend', item.againstUserId?._id, item.againstUserId?.name, () => loadAll())
                }
              />
            ))
          )}

          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Verification Queue</Text>
            <Text style={styles.sectionCount}>
              {queueLoading ? '…' : `${queue.length} pending`}
            </Text>
          </View>

          {queueLoading ? (
            <ActivityIndicator color={colors.info} style={{ marginBottom: 16 }} />
          ) : queue.length === 0 ? (
            <EmptyCard icon="shield-checkmark-outline" text="Verification queue is clear" styles={styles} colors={colors} />
          ) : (
            queue.map((item) => (
              <VerificationCard
                key={item.artisanProfileId}
                item={item}
                styles={styles}
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

      {/* Side drawer */}
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
            <DrawerItem icon="grid-outline"       label="Dashboard"       active={activePage === 'dashboard'} colors={colors} styles={styles} onPress={() => navigate('dashboard')} />
            <DrawerItem icon="people-outline"     label="User Management" active={activePage === 'users'}     colors={colors} styles={styles} onPress={() => navigate('users')} />
            <DrawerItem icon="megaphone-outline"  label="Announce"        active={false}                      colors={colors} styles={styles} onPress={() => { setDrawerOpen(false); setAnnounceModal(true); }} />
            <DrawerItem icon="person-outline"     label="Profile"         active={activePage === 'profile'}   colors={colors} styles={styles} onPress={() => navigate('profile')} />
            <View style={styles.drawerDivider} />
            <DrawerItem icon="log-out-outline" label="Log Out" danger colors={colors} styles={styles} onPress={handleLogout} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reason modal */}
      <BottomModal
        visible={!!actionModal}
        onClose={() => !actionLoading && setActionModal(null)}
        title={
          !actionModal ? ''
          : actionModal.type === 'warn'            ? `Warn ${actionModal.name}`
          : actionModal.type === 'suspend'         ? `Suspend ${actionModal.name}`
          : actionModal.type === 'reject'          ? `Reject ${actionModal.name}`
          : actionModal.type === 'warn_customer'   ? `Warn Customer: ${actionModal.name}`
          :                                          `Suspend Customer: ${actionModal.name}`
        }
        subtitle="This reason will be sent to the user."
        confirmLabel={
          (actionModal?.type === 'warn' || actionModal?.type === 'warn_customer') ? 'Send Warning'
          : (actionModal?.type === 'suspend' || actionModal?.type === 'suspend_customer') ? 'Suspend'
          : 'Reject'
        }
        confirmColor={
          (actionModal?.type === 'warn' || actionModal?.type === 'warn_customer') ? colors.warningDark : colors.error
        }
        onConfirm={submitAction}
        confirmLoading={actionLoading}
      >
        <TextInput
          style={styles.reasonInput}
          placeholder="Enter reason…"
          placeholderTextColor={colors.textHint}
          multiline
          numberOfLines={3}
          value={actionReason}
          onChangeText={setActionReason}
          editable={!actionLoading}
        />
      </BottomModal>

      {/* Announce modal */}
      <BottomModal
        visible={announceModal}
        onClose={() => !announceLoading && setAnnounceModal(false)}
        title="Send Announcement"
        subtitle="Delivers a pinned banner to selected users immediately."
        confirmLabel="Send"
        confirmColor={colors.primary}
        onConfirm={handleAnnounce}
        confirmLoading={announceLoading}
      >
        <TextInput
          style={styles.reasonInput}
          placeholder="Title (e.g. Platform Update)"
          placeholderTextColor={colors.textHint}
          value={announceTitle}
          onChangeText={setAnnounceTitle}
          editable={!announceLoading}
        />
        <TextInput
          style={[styles.reasonInput, { marginTop: 10, minHeight: 72 }]}
          placeholder="Message body…"
          placeholderTextColor={colors.textHint}
          multiline
          numberOfLines={3}
          value={announceBody}
          onChangeText={setAnnounceBody}
          editable={!announceLoading}
        />
        <View style={styles.roleRow}>
          {[
            { key: 'all',      label: 'Everyone' },
            { key: 'artisan',  label: 'Artisans' },
            { key: 'customer', label: 'Customers' },
          ].map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleChip, announceRole === r.key && styles.roleChipActive]}
              onPress={() => setAnnounceRole(r.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.roleChipText, announceRole === r.key && styles.roleChipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomModal>

      {/* ID Full-Screen */}
      <Modal
        visible={idFullScreen !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setIdFullScreen(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.idFsOverlay} onPress={() => setIdFullScreen(null)}>
          <Image
            source={{ uri: idFullScreen }}
            style={styles.idFsImage}
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.idFsClose} onPress={() => setIdFullScreen(null)}>
            <Ionicons name="close-circle" size={36} color="#FFF" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* View Form modal */}
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
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {viewFormLoading ? (
              <View style={styles.viewFormLoading}>
                <ActivityIndicator color={colors.info} size="large" />
                <Text style={styles.loadingText}>Loading profile…</Text>
              </View>
            ) : viewFormData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {viewFormData.profilePhoto?.url ? (
                  <Image source={{ uri: viewFormData.profilePhoto.url }} style={styles.vfPhoto} />
                ) : (
                  <View style={styles.vfPhotoPlaceholder}>
                    <Ionicons name="person" size={40} color={colors.textHint} />
                  </View>
                )}

                <FormRow label="Name"    value={viewFormData.userId?.name} styles={styles} colors={colors} />
                <FormRow label="Phone"   value={viewFormData.userId?.phone} styles={styles} colors={colors} />
                <FormRow label="Skills"  value={viewFormData.skills?.join(', ') || '—'} styles={styles} colors={colors} />
                <FormRow label="Location" value={viewFormData.location?.address || viewFormData.location?.lga || '—'} styles={styles} colors={colors} />
                <FormRow label="Status"  value={viewFormData.verificationStatus} highlight styles={styles} colors={colors} />

                <Text style={styles.vfSectionLabel}>Verification ID</Text>
                {viewFormData.verificationId?.url ? (
                  <TouchableOpacity onPress={() => setIdFullScreen(viewFormData.verificationId.url)} activeOpacity={0.85}>
                    <Image source={{ uri: viewFormData.verificationId.url }} style={styles.vfIdImage} resizeMode="contain" />
                    <Text style={styles.vfTapHint}>Tap to view full screen</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.vfMissing}>Not submitted</Text>
                )}

                <Text style={styles.vfSectionLabel}>Skill Video</Text>
                {viewFormData.skillVideo?.url ? (
                  <View style={styles.vfVideoBox}>
                    <Ionicons name="videocam" size={28} color={colors.info} />
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

function DrawerItem({ icon, label, active, danger, onPress, colors, styles }) {
  return (
    <TouchableOpacity style={[styles.drawerItem, active && styles.drawerItemActive]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={danger ? colors.error : active ? colors.info : colors.textSub} />
      <Text style={[styles.drawerItemLabel, active && styles.drawerItemLabelActive, danger && styles.drawerItemLabelDanger]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({ stat, styles }) {
  const Wrapper = stat.onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.statCard, { borderLeftColor: stat.borderColor }]}
      onPress={stat.onPress}
      activeOpacity={0.75}
    >
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
    </Wrapper>
  );
}

function ComplaintCard({ item, onWarn, onSuspend, colors, styles }) {
  const against  = item.againstUserId;
  const reporter = item.submittedBy;
  const timeAgo  = item.createdAt ? getTimeAgo(item.createdAt) : '';

  return (
    <View style={styles.complaintCard}>
      <View style={styles.complaintTop}>
        <View style={styles.complaintAvatar}>
          <Ionicons name="person" size={18} color={colors.textMuted} />
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

function VerificationCard({ item, onApprove, onReject, onViewForm, styles }) {
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

function EmptyCard({ icon, text, styles, colors }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={32} color={colors.textHint} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function UserCard({ user, tab, actionLoading, onToggleActive, onGrantPro, onRevokePro, onWarnCustomer, onSuspendCustomer, onUnsuspendCustomer, colors, styles }) {
  const isCustomer  = tab === 'customers';
  const profession  = user.skills?.length ? user.skills.slice(0, 2).join(' · ') : null;
  const statusLabel = user.isSuspended ? 'Suspended'
                    : !user.isActive   ? 'Disabled'
                    : user.verificationStatus === 'verified' ? 'Verified'
                    : user.verificationStatus === 'pending'  ? 'Pending'
                    : 'Active';
  const statusColor = user.isSuspended ? colors.error
                    : !user.isActive   ? colors.textMuted
                    : user.verificationStatus === 'verified' ? colors.success
                    : user.verificationStatus === 'pending'  ? colors.warningDark
                    : colors.textMuted;

  const toggleLoading  = actionLoading === user._id + '_toggle';
  const proLoading     = actionLoading === user._id + '_pro';
  const suspendLoading = actionLoading === user._id + '_suspend';

  const canGrantPro  = tab === 'artisans' && user.verificationStatus === 'verified' && !user.isPro;
  const canRevokePro = tab === 'pro' && user.isPro;

  return (
    <View style={styles.userCard}>
      <View style={styles.userCardTop}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{user.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>{user.name || '—'}</Text>
            {user.isPro && (
              <View style={styles.proChip}>
                <Text style={styles.proChipText}>TRUSTED</Text>
              </View>
            )}
            {isCustomer && (user.warningCount || 0) > 0 && (
              <View style={[styles.proChip, { backgroundColor: colors.warningBg }]}>
                <Text style={[styles.proChipText, { color: colors.warningDark }]}>{user.warningCount}W</Text>
              </View>
            )}
          </View>
          <Text style={styles.userProfession} numberOfLines={1}>
            {profession || user.phone || ''}
          </Text>
          <View style={[styles.userStatusChip, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.userStatusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.userCardActions}>
        {isCustomer ? (
          user.isSuspended ? (
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={onUnsuspendCustomer}
              disabled={!!suspendLoading}
              activeOpacity={0.8}
            >
              {suspendLoading
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.approveBtnText}>Unsuspend</Text>
              }
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.warnBtn} onPress={onWarnCustomer} activeOpacity={0.8}>
                <Text style={styles.warnBtnText}>Warn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suspendBtn} onPress={onSuspendCustomer} activeOpacity={0.8}>
                <Text style={styles.suspendBtnText}>Suspend</Text>
              </TouchableOpacity>
            </>
          )
        ) : (
          <>
            {canGrantPro && (
              <TouchableOpacity
                style={styles.makeProBtn}
                onPress={onGrantPro}
                disabled={!!proLoading}
                activeOpacity={0.8}
              >
                {proLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.makeProBtnText}>Make Trusted</Text>
                }
              </TouchableOpacity>
            )}
            {canRevokePro && (
              <TouchableOpacity
                style={styles.revokeProBtn}
                onPress={onRevokePro}
                disabled={!!proLoading}
                activeOpacity={0.8}
              >
                {proLoading
                  ? <ActivityIndicator color={colors.warningDark} size="small" />
                  : <Text style={styles.revokeProBtnText}>Revoke Trusted</Text>
                }
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.toggleActiveBtn, user.isActive && styles.toggleActiveBtnOn]}
              onPress={onToggleActive}
              disabled={!!toggleLoading}
              activeOpacity={0.8}
            >
              {toggleLoading
                ? <ActivityIndicator color={user.isActive ? colors.error : colors.success} size="small" />
                : <Text style={[styles.toggleActiveBtnText, user.isActive && styles.toggleActiveBtnTextOn]}>
                    {user.isActive ? 'Disable' : 'Enable'}
                  </Text>
              }
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function FormRow({ label, value, highlight, styles, colors }) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>{label}</Text>
      <Text style={[styles.formValue, highlight && { color: colors.info, fontWeight: '700', textTransform: 'capitalize' }]}>
        {value || '—'}
      </Text>
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

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgAlt },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.bgAlt,
  },
  hamburger: { padding: 4, marginRight: 12 },
  appName: { flex: 1, fontSize: 20, fontWeight: '900', color: colors.info, letterSpacing: -0.5 },
  adminAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.text,
    justifyContent: 'center', alignItems: 'center',
  },
  adminInitial: { fontSize: 18, fontWeight: '800', color: colors.textInverse },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },

  greeting: { marginBottom: 20 },
  greetingTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  greetingSubtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  loadingText: { fontSize: 13, color: colors.textMuted },

  statCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderWidth: 1, borderColor: colors.borderLight, elevation: 1,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  statValue: { fontSize: 32, fontWeight: '900', color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sectionCount: { fontSize: 13, fontWeight: '600', color: colors.textHint },

  emptyCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 24, alignItems: 'center',
    gap: 8, marginBottom: 16, borderWidth: 1, borderColor: colors.borderLight,
  },
  emptyText: { fontSize: 13, color: colors.textMuted },

  complaintCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.borderLight, elevation: 1,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  complaintTop: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  complaintAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  complaintInfo: { flex: 1 },
  complaintName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  complaintType: { fontSize: 13, fontWeight: '600', color: colors.error, marginBottom: 3 },
  complaintReporter: { fontSize: 12, color: colors.textMuted },
  complaintActions: { flexDirection: 'row', gap: 10 },
  warnBtn: {
    paddingVertical: 9, paddingHorizontal: 24, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  warnBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  suspendBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center' },
  suspendBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  verificationCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.borderLight, elevation: 1,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  verificationTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  artId: { fontSize: 13, fontWeight: '800', color: colors.info },
  verificationTime: { fontSize: 12, color: colors.textMuted },
  verificationName: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 2 },
  verificationSkills: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  verificationActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center' },
  approveBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  viewFormBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center',
  },
  viewFormBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  rejectBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.error, backgroundColor: colors.errorBg, alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '800', color: colors.error },

  profileCard: {
    backgroundColor: colors.card, borderRadius: 20, padding: 28, alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: colors.borderLight, elevation: 1,
  },
  profileAvatarBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.text,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  profileName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  profileRole: { fontSize: 13, fontWeight: '700', color: colors.info, marginBottom: 4 },
  profilePhone: { fontSize: 13, color: colors.textMuted },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.errorBg,
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.error },

  drawerOverlay: { flex: 1, backgroundColor: colors.overlay, flexDirection: 'row' },
  drawer: {
    width: SCREEN_W * 0.72, backgroundColor: colors.card,
    elevation: 16, shadowColor: colors.shadow, shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 16,
  },
  drawerHeader: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  drawerAvatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.text,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  drawerInitial: { fontSize: 26, fontWeight: '800', color: colors.textInverse },
  drawerName: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
  drawerRole: { fontSize: 12, fontWeight: '600', color: colors.info },
  drawerDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14 },
  drawerItemActive: { backgroundColor: colors.infoBg },
  drawerItemLabel: { fontSize: 15, fontWeight: '600', color: colors.textSub },
  drawerItemLabelActive: { color: colors.info, fontWeight: '700' },
  drawerItemLabelDanger: { color: colors.error },

  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  reasonInput: {
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 12,
    padding: 14, fontSize: 14, color: colors.text,
    backgroundColor: colors.inputBg,
    minHeight: 90, textAlignVertical: 'top', marginBottom: 20,
  },
  viewFormModal: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  viewFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewFormTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  viewFormLoading: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  vfPhoto: { width: '100%', height: 180, borderRadius: 14, marginBottom: 16 },
  vfPhotoPlaceholder: {
    width: '100%', height: 180, borderRadius: 14, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  formLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  formValue: { fontSize: 13, color: colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },
  vfSectionLabel: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 8 },
  vfIdImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: colors.surface },
  vfTapHint: { fontSize: 11, color: colors.info, textAlign: 'center', marginTop: 4, marginBottom: 4 },
  vfMissing: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  idFsOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  idFsImage: { width: SCREEN_W, height: SCREEN_W * 1.4 },
  idFsClose: { position: 'absolute', top: 50, right: 20 },
  vfVideoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.infoBg, borderRadius: 10, padding: 14,
  },
  vfVideoText: { fontSize: 14, fontWeight: '600', color: colors.info },

  pageHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  pageTitle:  { fontSize: 22, fontWeight: '900', color: colors.text },

  tabRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.info, borderColor: colors.info },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: '#FFF' },

  loadingBox2: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },

  userListContent: { paddingHorizontal: 16, paddingBottom: 24 },

  userCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.borderLight, elevation: 1,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  userCardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  userAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.text,
    justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { fontSize: 18, fontWeight: '800', color: colors.textInverse },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userName: { fontSize: 15, fontWeight: '800', color: colors.text, flexShrink: 1 },
  proChip: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
    backgroundColor: colors.warningBg,
  },
  proChipText: { fontSize: 10, fontWeight: '900', color: colors.warningDark, letterSpacing: 0.5 },
  userProfession: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  userStatusChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  userStatusText: { fontSize: 11, fontWeight: '700' },

  userCardActions: { flexDirection: 'row', gap: 8 },
  makeProBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: colors.warningDark, alignItems: 'center',
  },
  makeProBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  revokeProBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.warningDark, alignItems: 'center',
  },
  revokeProBtnText: { fontSize: 12, fontWeight: '800', color: colors.warningDark },
  toggleActiveBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center',
  },
  toggleActiveBtnOn: { borderColor: colors.error, backgroundColor: colors.errorBg },
  toggleActiveBtnText: { fontSize: 12, fontWeight: '700', color: colors.success },
  toggleActiveBtnTextOn: { color: colors.error },

  loadMoreBtn: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 8,
    paddingVertical: 14, borderRadius: 12, backgroundColor: colors.infoBg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.info,
  },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: colors.info },

  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  roleChipActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  roleChipText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  roleChipTextActive: { color: colors.primary },
});
