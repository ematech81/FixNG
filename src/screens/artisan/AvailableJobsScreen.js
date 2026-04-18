import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAvailableJobs } from '../../api/jobApi';
import useSocket from '../../hooks/useSocket';
import { getUser } from '../../utils/storage';

const URGENCY_COLOR = { normal: '#3B82F6', emergency: '#EF4444' };

export default function AvailableJobsScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  // Load userId once for socket
  React.useEffect(() => {
    getUser().then((u) => u && setUserId(u.id));
  }, []);

  // Real-time: new job posted near this artisan
  useSocket(userId, {
    new_job: (data) => {
      setJobs((prev) => {
        const exists = prev.find((j) => j._id === data.jobId);
        if (exists) return prev;
        return [{ ...data, _id: data.jobId, isNew: true }, ...prev];
      });
    },
    job_taken: ({ jobId }) => {
      // Remove job from list if another artisan accepted it
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    },
  });

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [])
  );

  const fetchJobs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getAvailableJobs();
      setJobs(res.data.data);
    } catch (err) {
      if (!isRefresh) {
        Alert.alert('Error', err?.message || 'Could not load jobs.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderJob = ({ item }) => {
    const urgencyColor = URGENCY_COLOR[item.urgency] || '#3B82F6';
    const isExpiringSoon =
      item.expiresAt && new Date(item.expiresAt) - Date.now() < 30 * 60 * 1000;

    return (
      <TouchableOpacity
        style={[styles.jobCard, item.isNew && styles.jobCardNew]}
        onPress={() => navigation.navigate('JobDetail', { jobId: item._id || item.jobId })}
        activeOpacity={0.8}
      >
        {item.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

        <View style={styles.jobCardTop}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '18' }]}>
            <Text style={[styles.urgencyText, { color: urgencyColor }]}>
              {item.urgency === 'emergency' ? '🚨 Emergency' : '🔧 Normal'}
            </Text>
          </View>
          <Text style={styles.timeAgo}>{formatTime(item.createdAt)}</Text>
        </View>

        <Text style={styles.jobCategory}>{item.category}</Text>
        {item.voiceDescription?.url ? (
          <View style={styles.voiceBadge}>
            <Text style={styles.voiceBadgeIcon}>🎤</Text>
            <Text style={styles.voiceBadgeText}>Voice description — tap to listen</Text>
          </View>
        ) : (
          <Text style={styles.jobDesc} numberOfLines={2}>{item.description}</Text>
        )}

        {item.address && (
          <Text style={styles.jobLocation}>📍 {item.address}</Text>
        )}

        {isExpiringSoon && (
          <Text style={styles.expiring}>⚠ Expires soon</Text>
        )}

        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => navigation.navigate('JobDetail', { jobId: item._id || item.jobId })}
        >
          <Text style={styles.viewBtnText}>View & Accept →</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Jobs</Text>
        <Text style={styles.headerCount}>{jobs.length} near you</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => (item._id || item.jobId || '').toString()}
        renderItem={renderJob}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchJobs(true)}
            tintColor="#FF6B00"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No jobs near you right now</Text>
            <Text style={styles.emptyText}>Pull down to refresh. Jobs appear as customers post them.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  headerCount: { fontSize: 13, color: '#FF6B00', fontWeight: '600' },
  list: { padding: 16, gap: 12, paddingBottom: 30 },
  jobCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#F0F0F0', elevation: 2,
  },
  jobCardNew: { borderColor: '#FF6B00', borderWidth: 1.5 },
  newBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FF6B00',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  newBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  jobCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  urgencyText: { fontSize: 12, fontWeight: '700' },
  timeAgo: { fontSize: 12, color: '#BBB' },
  jobCategory: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  jobDesc: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  voiceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF3EC', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#FDBA74', alignSelf: 'flex-start',
  },
  voiceBadgeIcon: { fontSize: 15 },
  voiceBadgeText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
  jobLocation: { fontSize: 13, color: '#888', marginBottom: 6 },
  expiring: { fontSize: 12, color: '#F59E0B', fontWeight: '600', marginBottom: 8 },
  viewBtn: {
    marginTop: 8, padding: 12, borderRadius: 10,
    backgroundColor: '#FFF3EC', alignItems: 'center',
  },
  viewBtnText: { color: '#FF6B00', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
});
