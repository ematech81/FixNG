import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackButton from '../../components/BackButton';
import {
  getNotifications, markRead, markAllRead,
  deleteNotification, clearAll,
} from '../../api/notificationApi';
import { connectSocket } from '../../hooks/useSocket';
import { getUser } from '../../utils/storage';
import { useTheme } from '../../context/ThemeContext';

// ── Icon + accent colour per notification type ─────────────────────────────────
const TYPE_CONFIG = {
  new_job:            { icon: '⚡', color: '#2563EB', label: 'Job Request'        },
  job_broadcast:      { icon: '📢', color: '#0EA5E9', label: 'New Job Nearby'     },
  job_accepted:       { icon: '✅', color: '#16A34A', label: 'Job Accepted'       },
  job_declined:       { icon: '❌', color: '#EF4444', label: 'Job Declined'       },
  artisan_arrived:    { icon: '📍', color: '#8B5CF6', label: 'Artisan Arrived'    },
  job_completed:      { icon: '🏆', color: '#F59E0B', label: 'Job Completed'      },
  job_cancelled:      { icon: '🚫', color: '#EF4444', label: 'Job Cancelled'      },
  dispute_raised:     { icon: '⚠️', color: '#D97706', label: 'Dispute Raised'     },
  dispute_resolved:   { icon: '🛡️', color: '#16A34A', label: 'Dispute Resolved'   },
  new_message:        { icon: '💬', color: '#2563EB', label: 'New Message'        },
  profile_verified:   { icon: '🎉', color: '#16A34A', label: 'Profile Verified'   },
  profile_rejected:   { icon: '❌', color: '#EF4444', label: 'Verification Issue' },
  account_warning:    { icon: '⚠️', color: '#D97706', label: 'Account Warning'    },
  account_suspended:  { icon: '🔒', color: '#EF4444', label: 'Account Suspended'  },
  account_unsuspended:{ icon: '🔓', color: '#16A34A', label: 'Account Restored'   },
};

const cfg = (type, colors) => TYPE_CONFIG[type] || { icon: '🔔', color: colors.info, label: 'Notification' };

// ── Time format ────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(false);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [detailModal, setDetailModal]     = useState(null);

  const styles = makeStyles(colors);

  useFocusEffect(useCallback(() => { fetchNotifications(1, false); }, []));

  // Real-time: prepend incoming notifications without requiring a manual refresh
  useEffect(() => {
    let detach = null;

    getUser().then((u) => {
      const uid = u?._id || u?.id;
      if (!uid) return;

      connectSocket(uid).then((socket) => {
        const handleNotification = (notif) => {
          const normalized = { ...notif, _id: notif.id || notif._id, read: false };
          setNotifications((prev) => {
            const exists = prev.find((n) => n._id?.toString() === normalized._id?.toString());
            if (exists) return prev;
            return [normalized, ...prev];
          });
          setUnreadCount((c) => c + 1);
        };

        socket.on('notification', handleNotification);
        detach = () => socket.off('notification', handleNotification);
      });
    });

    return () => detach?.();
  }, []);

  const fetchNotifications = async (p = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (p === 1) setLoading(true);
    try {
      const res = await getNotifications({ page: p, limit: 30 });
      const data = res.data.data || [];
      setNotifications(p === 1 ? data : (prev) => [...prev, ...data]);
      setUnreadCount(res.data.unreadCount || 0);
      setHasMore(data.length === 30);
      setPage(p);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchNotifications(page + 1);
  };

  const handleTap = async (item) => {
    if (!item.read) {
      markRead(item._id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => n._id === item._id ? { ...n, read: true } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (item.type === 'profile_rejected') {
      navigation.navigate('AccountStatus', { type: 'rejected' });
      return;
    }
    if (item.type === 'account_suspended') {
      navigation.navigate('AccountStatus', { type: 'suspended' });
      return;
    }
    const jobId = item.data?.jobId;
    if (jobId) {
      if (item.type === 'new_message') {
        navigation.navigate('Chat', { jobId });
      } else {
        navigation.navigate('JobDetail', { jobId });
      }
      return;
    }
    setDetailModal(item);
  };

  const handleDelete = (id) => {
    deleteNotification(id).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  const handleMarkAllRead = () => {
    markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'This will permanently remove all your notifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearAll().catch(() => {});
            setNotifications([]);
            setUnreadCount(0);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const { icon, color } = cfg(item.type, colors);
    const unread = !item.read;
    return (
      <TouchableOpacity
        style={[styles.item, unread && styles.itemUnread]}
        onPress={() => handleTap(item)}
        activeOpacity={0.8}
      >
        {/* Unread dot */}
        {unread && <View style={styles.unreadDot} />}

        {/* Icon bubble */}
        <View style={[styles.iconBubble, { backgroundColor: color + '18' }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, unread && styles.itemTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item._id)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Read all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.info} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centred}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyBody}>You have no notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(1, true)}
              tintColor={colors.info}
              colors={[colors.info]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={colors.info} style={{ marginVertical: 16 }} />
              : null
          }
          ListHeaderComponent={
            notifications.length > 0
              ? (
                <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
                  <Text style={styles.clearAllText}>Clear all</Text>
                </TouchableOpacity>
              )
              : null
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      {/* ── Notification detail modal ── */}
      {detailModal && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setDetailModal(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDetailModal(null)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              {/* Icon + type label */}
              <View style={styles.modalIconRow}>
                <View style={[styles.modalIconBubble, { backgroundColor: cfg(detailModal.type, colors).color + '18' }]}>
                  <Text style={styles.modalIconText}>{cfg(detailModal.type, colors).icon}</Text>
                </View>
                <Text style={[styles.modalTypeLabel, { color: cfg(detailModal.type, colors).color }]}>
                  {cfg(detailModal.type, colors).label}
                </Text>
              </View>

              <Text style={styles.modalTitle}>{detailModal.title}</Text>
              <Text style={styles.modalBody}>{detailModal.body}</Text>
              <Text style={styles.modalTime}>{timeAgo(detailModal.createdAt)}</Text>

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailModal(null)}>
                <Text style={styles.modalCloseBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: colors.text },
  headerBadge:  {
    backgroundColor: colors.error, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center',
  },
  headerBadgeText: { color: colors.card, fontSize: 11, fontWeight: '700' },
  headerActions:   { minWidth: 70, alignItems: 'flex-end' },
  actionBtn:       { paddingVertical: 4, paddingHorizontal: 8 },
  actionBtnText:   { color: colors.info, fontSize: 13, fontWeight: '600' },

  // List
  list: { paddingBottom: 32 },
  clearAllBtn: {
    alignSelf: 'flex-end', marginRight: 16, marginTop: 8, marginBottom: 4,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  clearAllText: { color: colors.textSub, fontSize: 12, fontWeight: '500' },

  // Item
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.card, marginHorizontal: 12, marginTop: 8,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  itemUnread: {
    backgroundColor: colors.infoBg, borderColor: colors.info,
  },
  unreadDot: {
    position: 'absolute', top: 14, left: 4,
    width: 7, height: 7, borderRadius: 4, backgroundColor: colors.info,
  },
  iconBubble: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
  },
  iconText: { fontSize: 20 },
  itemContent: { flex: 1, paddingRight: 8 },
  itemTitle:       { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  itemTitleUnread: { fontWeight: '700' },
  itemBody:  { fontSize: 13, color: colors.textSub, lineHeight: 18, marginBottom: 4 },
  itemTime:  { fontSize: 11, color: colors.textMuted },
  deleteBtn: { paddingLeft: 4, paddingTop: 2 },
  deleteBtnText: { fontSize: 13, color: colors.textMuted },

  // Empty / loading
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emptyIcon:  { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptyBody:  { fontSize: 14, color: colors.textSub, textAlign: 'center' },

  // Detail modal
  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalSheet: {
    backgroundColor: colors.card, borderRadius: 20,
    padding: 24, width: '100%',
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
  },
  modalIconRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modalIconBubble: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalIconText:   { fontSize: 22 },
  modalTypeLabel:  { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  modalTitle:  { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  modalBody:   { fontSize: 14, color: colors.textSub, lineHeight: 21, marginBottom: 12 },
  modalTime:   { fontSize: 11, color: colors.textMuted, marginBottom: 20 },
  modalCloseBtn: {
    backgroundColor: colors.info, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  modalCloseBtnText: { color: colors.card, fontWeight: '700', fontSize: 15 },
});
