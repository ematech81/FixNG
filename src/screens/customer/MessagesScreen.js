import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMyJobs } from '../../api/jobApi';
import { getUser } from '../../utils/storage';

const PRIMARY = '#2563EB';

const STATUS_META = {
  pending:      { label: 'Pending',     color: '#D97706', bg: '#FFFBEB' },
  accepted:     { label: 'Accepted',    color: '#1D4ED8', bg: '#EFF6FF' },
  'in-progress':{ label: 'In Progress', color: '#7C3AED', bg: '#F5F3FF' },
  completed:    { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
  disputed:     { label: 'Disputed',    color: '#DC2626', bg: '#FEE2E2' },
  cancelled:    { label: 'Cancelled',   color: '#9CA3AF', bg: '#F9FAFB' },
};

// Statuses where a chat thread exists
const CHAT_STATUSES = ['accepted', 'in-progress', 'completed', 'disputed'];

export default function MessagesScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('customer');

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [])
  );

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const u = await getUser();
      const role = u?.role || 'customer';
      setUserRole(role);

      const res = await getMyJobs();
      const all = res.data.data || [];

      // For customers: jobs they posted that have an assigned artisan
      // For artisans:  jobs they accepted (assignedArtisanId = them), always have a customer
      const chatJobs = role === 'artisan'
        ? all.filter((j) => CHAT_STATUSES.includes(j.status))
        : all.filter((j) => j.assignedArtisanId && CHAT_STATUSES.includes(j.status));

      setJobs(chatJobs);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // The "other party" in the conversation depends on who is viewing
  const getOtherParty = (job) => {
    if (userRole === 'artisan') {
      return job.customerId?.name || 'Customer';
    }
    return job.assignedArtisanId?.name || 'Artisan';
  };

  const handleJobPress = (job) => {
    navigation.navigate('JobDetail', { jobId: job._id });
  };

  const handleChatPress = (job) => {
    navigation.navigate('Chat', {
      jobId: job._id,
      jobCategory: job.category,
      otherPartyName: getOtherParty(job),
    });
  };

  const renderJob = ({ item }) => {
    const meta = STATUS_META[item.status] || STATUS_META.pending;
    const otherParty = getOtherParty(item);
    const initial = otherParty[0].toUpperCase();
    const timeAgo = getTimeAgo(item.updatedAt || item.createdAt);
    const canChat = CHAT_STATUSES.includes(item.status);

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleJobPress(item)} activeOpacity={0.8}>
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.otherPartyName} numberOfLines={1}>{otherParty}</Text>
            <Text style={styles.timeAgo}>{timeAgo}</Text>
          </View>
          <Text style={styles.jobCategory} numberOfLines={1}>
            {item.category} · {item.location?.address || item.location?.state || 'Nigeria'}
          </Text>
          <View style={styles.cardBottom}>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {canChat && (
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={(e) => { e.stopPropagation?.(); handleChatPress(item); }}
              >
                <Text style={styles.chatBtnText}>💬 Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            {userRole === 'artisan'
              ? 'Accept a job to start chatting\nwith the customer.'
              : 'Once an artisan accepts your job,\nyour chat will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={renderJob}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchJobs}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },

  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEF0F5',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1E232C' },

  list: { paddingTop: 12, paddingBottom: 20, paddingHorizontal: 16 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    marginBottom: 10,
    borderWidth: 1, borderColor: '#EEF0F5',
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
  },

  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  avatarImg: { width: 52, height: 52 },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: PRIMARY },

  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 2,
  },
  otherPartyName: { fontSize: 15, fontWeight: '700', color: '#1E232C', flex: 1, marginRight: 6 },
  timeAgo: { fontSize: 11, color: '#9CA3AF' },
  jobCategory: { fontSize: 13, color: '#6B7280', marginBottom: 8 },

  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  chatBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#EFF6FF',
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  chatBtnText: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  centerBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E232C', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
