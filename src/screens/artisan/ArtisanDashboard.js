import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMyJobs } from '../../api/jobApi';
import { getUser, clearSession } from '../../utils/storage';
import { getMe } from '../../api/authApi';
import useSocket from '../../hooks/useSocket';

const BADGE_CONFIG = {
  new: { label: 'New', color: '#9CA3AF', bg: '#F3F4F6', icon: '🌱' },
  verified: { label: 'Verified', color: '#3B82F6', bg: '#EFF6FF', icon: '✓' },
  trusted: { label: 'Trusted', color: '#F59E0B', bg: '#FFFBEB', icon: '⭐' },
};

export default function ArtisanDashboard({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh when screen focuses (e.g. coming back from JobDetail)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Real-time: new jobs pushed to this artisan
  useSocket(user?.id, {
    new_job: () => {
      // Badge on the "Available Jobs" tab
      setRecentJobs((prev) => prev); // triggers re-render prompt
    },
    job_cancelled: () => loadData(),
    profile_verified: () => loadData(),
    account_warning: (data) => {
      Alert.alert('Account Warning', data.message);
    },
    account_suspended: (data) => {
      Alert.alert('Account Suspended', data.message);
      onLogout(); // force logout on suspension
    },
  });

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [userRes, jobsRes] = await Promise.all([
        getMe(),
        getMyJobs({ limit: 5 }),
      ]);

      setUser(userRes.data.user);
      setArtisanProfile(userRes.data.artisanProfile);
      setRecentJobs(jobsRes.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure?', [
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

  const badge = BADGE_CONFIG[artisanProfile?.badgeLevel || 'new'];
  const stats = artisanProfile?.stats || {};

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
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#2563EB" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 🔧</Text>
            <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>
                {badge.icon} {badge.label}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutBtn}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedJobs ?? 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.averageRating ? stats.averageRating.toFixed(1) : '–'}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.avgResponseTimeMinutes ? `${stats.avgResponseTimeMinutes}m` : '–'}
            </Text>
            <Text style={styles.statLabel}>Response</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.acceptanceRate != null ? `${Math.round(stats.acceptanceRate)}%` : '–'}
            </Text>
            <Text style={styles.statLabel}>Acceptance</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AvailableJobs')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>Browse Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('MyJobs')}
          >
            <Text style={styles.actionIcon}>🗂️</Text>
            <Text style={styles.actionLabel}>My Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Jobs */}
        <Text style={styles.sectionTitle}>Recent Jobs</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : recentJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No jobs yet. Check for available jobs near you.</Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.navigate('AvailableJobs')}
            >
              <Text style={styles.browseBtnText}>Browse Available Jobs</Text>
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
              <Text style={styles.jobLocation}>
                📍 {job.location?.address || job.location?.state || 'Location on file'}
              </Text>
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
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  badgePill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  logoutBtn: { color: '#999', fontSize: 13, fontWeight: '600', marginTop: 4 },
  statsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 24,
  },
  statCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#2563EB', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#999', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0', elevation: 1,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  loadingText: { color: '#AAA', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  browseBtn: {
    backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  browseBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  jobCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0',
  },
  jobCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  jobCategory: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 4 },
  jobStatus: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  jobDesc: { fontSize: 13, color: '#666', marginBottom: 4 },
  jobLocation: { fontSize: 11, color: '#BBB' },
  viewAllBtn: { alignItems: 'center', marginTop: 8, paddingVertical: 12 },
  viewAllBtnText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
});
