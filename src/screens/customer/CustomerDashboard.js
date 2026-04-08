import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyJobs } from '../../api/jobApi';
import { getUser, clearSession } from '../../utils/storage';
import useSocket from '../../hooks/useSocket';

export default function CustomerDashboard({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeJobsCount, setActiveJobsCount] = useState(0);

  useEffect(() => {
    getUser().then(setUser);
    fetchJobs();
  }, []);

  // Live updates for job status changes
  useSocket(user?.id, {
    job_accepted: () => fetchJobs(),
    artisan_arrived: () => fetchJobs(),
    job_completed: () => fetchJobs(),
  });

  const fetchJobs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getMyJobs({ limit: 5 });
      const jobs = res.data.data || [];
      setRecentJobs(jobs);
      const active = jobs.filter((j) =>
        ['pending', 'accepted', 'in-progress'].includes(j.status)
      ).length;
      setActiveJobsCount(active);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          onLogout();
        },
      },
    ]);
  };

  const STATUS_COLOR = {
    pending: '#F59E0B', accepted: '#3B82F6',
    'in-progress': '#8B5CF6', completed: '#22C55E',
    disputed: '#EF4444', cancelled: '#9CA3AF',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} tintColor="#FF6B00" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.subGreeting}>What do you need fixed today?</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutBtn}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Active jobs banner */}
        {activeJobsCount > 0 && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => navigation.navigate('MyJobs')}
          >
            <Text style={styles.activeBannerText}>
              🔄 {activeJobsCount} active job{activeJobsCount > 1 ? 's' : ''} in progress
            </Text>
            <Text style={styles.activeBannerLink}>View →</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SearchArtisans')}
          >
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>Find Artisan</Text>
            <Text style={styles.actionDesc}>Browse by skill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateJob')}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionLabel}>Post a Job</Text>
            <Text style={styles.actionDesc}>Get artisans notified</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('MyJobs')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>My Jobs</Text>
            <Text style={styles.actionDesc}>Track all your jobs</Text>
          </TouchableOpacity>
        </View>

        {/* Recent jobs */}
        <Text style={styles.sectionTitle}>Recent Jobs</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : recentJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No jobs yet. Post your first job!</Text>
            <TouchableOpacity
              style={styles.postFirstBtn}
              onPress={() => navigation.navigate('CreateJob')}
            >
              <Text style={styles.postFirstBtnText}>Post a Job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentJobs.map((job) => (
            <TouchableOpacity
              key={job._id}
              style={styles.jobCard}
              onPress={() => navigation.navigate('JobDetail', { jobId: job._id })}
              activeOpacity={0.8}
            >
              <View style={styles.jobCardTop}>
                <Text style={styles.jobCategory}>{job.category}</Text>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[job.status] || '#999' }]} />
                <Text style={[styles.jobStatus, { color: STATUS_COLOR[job.status] || '#999' }]}>
                  {job.status}
                </Text>
              </View>
              <Text style={styles.jobDesc} numberOfLines={1}>{job.description}</Text>
              <Text style={styles.jobDate}>{new Date(job.createdAt).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))
        )}

        {recentJobs.length > 0 && (
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => navigation.navigate('MyJobs')}
          >
            <Text style={styles.viewAllBtnText}>View All Jobs →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 20, paddingBottom: 30 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  subGreeting: { fontSize: 14, color: '#888', marginTop: 2 },
  logoutBtn: { color: '#999', fontSize: 13, fontWeight: '600', marginTop: 4 },
  activeBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF3EC', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FF6B00', marginBottom: 20,
  },
  activeBannerText: { fontSize: 14, color: '#FF6B00', fontWeight: '600' },
  activeBannerLink: { color: '#FF6B00', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, marginTop: 4 },
  actionsGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0', elevation: 1,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  actionDesc: { fontSize: 10, color: '#AAA', textAlign: 'center' },
  loadingText: { color: '#AAA', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#999', fontSize: 14, marginBottom: 16 },
  postFirstBtn: {
    backgroundColor: '#FF6B00', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10,
  },
  postFirstBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  jobCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0',
  },
  jobCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  jobCategory: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 4 },
  jobStatus: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  jobDesc: { fontSize: 13, color: '#666', marginBottom: 4 },
  jobDate: { fontSize: 11, color: '#BBB' },
  viewAllBtn: { alignItems: 'center', marginTop: 8, paddingVertical: 12 },
  viewAllBtnText: { color: '#FF6B00', fontWeight: '700', fontSize: 14 },
});
