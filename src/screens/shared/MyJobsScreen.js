import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMyJobs } from '../../api/jobApi';
import BackButton from '../../components/BackButton';

const STATUS_TABS = ['all', 'pending', 'accepted', 'in-progress', 'completed', 'disputed'];

const STATUS_COLOR = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  'in-progress': '#8B5CF6',
  completed: '#22C55E',
  disputed: '#EF4444',
  cancelled: '#9CA3AF',
};

export default function MyJobsScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [activeTab])
  );

  const fetchJobs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const res = await getMyJobs(params);
      setJobs(res.data.data);
    } catch {
      // fail silently on refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderJob = ({ item }) => {
    const color = STATUS_COLOR[item.status] || '#999';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('JobDetail', { jobId: item._id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardCategory}>{item.category}</Text>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.cardStatus, { color }]}>{item.status}</Text>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardBottom}>
          {item.urgency === 'emergency' && (
            <Text style={styles.emergencyTag}>🚨 Emergency</Text>
          )}
          <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>My Jobs</Text>
      </View>

      {/* Status filter tabs */}
      <FlatList
        data={STATUS_TABS}
        horizontal
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        renderItem={({ item: tab }) => (
          <TouchableOpacity
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#FF6B00" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={renderJob}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} tintColor="#FF6B00" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No {activeTab !== 'all' ? activeTab : ''} jobs yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#F5F5F5',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E5E5E5',
  },
  tabActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  tabText: { fontSize: 13, color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  list: { padding: 16, gap: 10, paddingBottom: 30 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardCategory: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  cardStatus: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  cardDesc: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emergencyTag: { fontSize: 11, color: '#EF4444', fontWeight: '700' },
  cardDate: { fontSize: 12, color: '#BBB' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#999' },
});
