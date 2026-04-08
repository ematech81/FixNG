import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getUser } from '../../utils/storage';
import { getMyJobs } from '../../api/jobApi';

const PRIMARY = '#2563EB';

const MENU_ITEMS = [
  { icon: '📋', label: 'My Jobs', screen: 'MyJobs' },
  { icon: '⭐', label: 'My Reviews', screen: null },
  { icon: '🔔', label: 'Notifications', screen: null },
  { icon: '🔒', label: 'Privacy & Security', screen: null },
  { icon: '❓', label: 'Help & Support', screen: null },
  { icon: '⚖️', label: 'Terms of Service', screen: null },
];

export default function ProfileScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    const u = await getUser();
    setUser(u);
    fetchStats();
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await getMyJobs({ role: 'customer' });
      const jobs = res.data.data || [];
      const completed = jobs.filter((j) => j.status === 'completed').length;
      const active = jobs.filter(
        (j) => j.status === 'accepted' || j.status === 'arrived' || j.status === 'open'
      ).length;
      setStats({ total: jobs.length, completed, active });
    } catch {
      // silent
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  const initial = (user?.name || 'U')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar + Name */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initial}</Text>
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

        {/* Menu items */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                i < MENU_ITEMS.length - 1 && styles.menuItemBorder,
              ]}
              onPress={() => item.screen && navigation.navigate(item.screen)}
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

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, backgroundColor: '#FEE2E2',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16,
    marginBottom: 20,
  },
  logoutIcon: { fontSize: 20 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },

  version: { textAlign: 'center', fontSize: 12, color: '#C4C9D4' },
});
