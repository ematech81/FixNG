import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { searchArtisans } from '../../api/discoveryApi';
import { ARTISAN_SKILLS } from '../../constants/skills';
import BackButton from '../../components/BackButton';

const BADGE_CONFIG = {
  new: { label: 'New', color: '#9CA3AF', icon: '🌱' },
  verified: { label: 'Verified', color: '#3B82F6', icon: '✓' },
  trusted: { label: 'Trusted', color: '#F59E0B', icon: '⭐' },
};

const DISTANCE_OPTIONS = [5, 10, 20, 50];

export default function SearchArtisansScreen({ navigation, embedded = false }) {
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDistance, setSelectedDistance] = useState(null); // null = no distance filter
  const [onlyTrusted, setOnlyTrusted] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const filteredSkills = ARTISAN_SKILLS.filter((s) =>
    s.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const detectLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Required', 'Enable location to find artisans near you.');
      return null;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return pos.coords;
  };

  const handleSearch = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setHasSearched(true);

    try {
      let coords = userLocation;
      if (!coords) {
        coords = await detectLocation();
        if (coords) setUserLocation(coords);
      }

      const params = {
        category: selectedCategory || undefined,
        minRating: minRating || undefined,
      };

      if (selectedDistance) params.maxDistance = selectedDistance;
      if (onlyTrusted) params.isPro = true;

      if (coords) {
        params.latitude = coords.latitude;
        params.longitude = coords.longitude;
      }

      const res = await searchArtisans(params);
      setArtisans(res.data.data || []);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Search failed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderArtisan = ({ item }) => {
    const badge = BADGE_CONFIG[item.badgeLevel] || BADGE_CONFIG.new;
    const avgRating = item.stats?.averageRating;

    return (
      <TouchableOpacity
        style={[styles.artisanCard, item.isPro && styles.artisanCardPro]}
        onPress={() => navigation.navigate('ArtisanProfile', { artisanId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.artisanRow}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.profilePhoto ? (
              <Image source={{ uri: item.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{(item.name || 'A')[0].toUpperCase()}</Text>
              </View>
            )}
          </View>

          <View style={styles.artisanInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.artisanName}>{item.name}</Text>
              <View style={styles.badgeRow}>
                {item.isPro && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>✓ Trusted</Text>
                  </View>
                )}
                <View style={styles.badgePill}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>
                    {badge.icon} {badge.label}
                  </Text>
                </View>
              </View>
            </View>

            {/* Skills */}
            <Text style={styles.skills} numberOfLines={1}>
              {(item.skills || []).join(' • ')}
            </Text>

            {/* Rating + jobs */}
            <View style={styles.statsRow}>
              {avgRating > 0 && (
                <Text style={styles.rating}>⭐ {avgRating.toFixed(1)}</Text>
              )}
              <Text style={styles.completedJobs}>
                {item.stats?.completedJobs || 0} jobs done
              </Text>
              {item.stats?.avgResponseTimeMinutes && (
                <Text style={styles.responseTime}>
                  ⚡ {item.stats.avgResponseTimeMinutes}m response
                </Text>
              )}
            </View>

            {item.address && (
              <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {!embedded ? (
          <BackButton onPress={() => navigation.goBack()} />
        ) : (
          <View style={{ width: 28 }} />
        )}
        <Text style={styles.headerTitle}>Find Artisans</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {/* Category */}
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => setShowCategoryPicker((v) => !v)}
        >
          <Text style={styles.filterChipText}>
            {selectedCategory || 'All Categories'} {showCategoryPicker ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {/* Distance (optional — tap again to deselect) */}
        {DISTANCE_OPTIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.filterChip, selectedDistance === d && styles.filterChipActive]}
            onPress={() => setSelectedDistance(selectedDistance === d ? null : d)}
          >
            <Text style={[styles.filterChipText, selectedDistance === d && styles.filterChipTextActive]}>
              {d}km
            </Text>
          </TouchableOpacity>
        ))}

        {/* Rating filter */}
        <TouchableOpacity
          style={[styles.filterChip, minRating > 0 && styles.filterChipActive]}
          onPress={() => setMinRating(minRating > 0 ? 0 : 4)}
        >
          <Text style={[styles.filterChipText, minRating > 0 && styles.filterChipTextActive]}>
            ⭐ 4+
          </Text>
        </TouchableOpacity>

        {/* Trusted filter */}
        <TouchableOpacity
          style={[styles.filterChip, onlyTrusted && styles.filterChipTrusted]}
          onPress={() => setOnlyTrusted((v) => !v)}
        >
          <Text style={[styles.filterChipText, onlyTrusted && styles.filterChipTextTrusted]}>
            ✓ Trusted
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category picker dropdown */}
      {showCategoryPicker && (
        <View style={styles.categoryDropdown}>
          <TextInput
            style={styles.categorySearch}
            placeholder="Search skill..."
            value={categorySearch}
            onChangeText={setCategorySearch}
          />
          <FlatList
            data={[{ name: 'All Categories', value: '' }, ...filteredSkills.map((s) => ({ name: s, value: s }))]}
            keyExtractor={(item) => item.value || 'all'}
            style={{ maxHeight: 180 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => {
                  setSelectedCategory(item.value);
                  setShowCategoryPicker(false);
                  setCategorySearch('');
                }}
              >
                <Text style={[styles.categoryItemText, selectedCategory === item.value && styles.categoryItemActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Search Button */}
      <TouchableOpacity
        style={styles.searchBtn}
        onPress={() => handleSearch()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.searchBtnText}>Search Artisans Near Me 📍</Text>
        )}
      </TouchableOpacity>

      {/* Results */}
      <FlatList
        data={artisans}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderArtisan}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => handleSearch(true)} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          hasSearched && !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No artisans found</Text>
              <Text style={styles.emptyText}>
                Try increasing the distance or changing the category.
              </Text>
            </View>
          ) : !hasSearched ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔧</Text>
              <Text style={styles.emptyTitle}>Find skilled artisans</Text>
              <Text style={styles.emptyText}>
                Set your filters and tap Search to find verified artisans near you.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  filters: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  filterChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  filterChipTrusted: { borderColor: '#B45309', backgroundColor: '#FFFBEB' },
  filterChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  filterChipTextActive: { color: '#2563EB' },
  filterChipTextTrusted: { color: '#B45309' },
  categoryDropdown: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E5E5',
    marginHorizontal: 16, borderRadius: 10, overflow: 'hidden',
    elevation: 4, zIndex: 10,
  },
  categorySearch: {
    padding: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', fontSize: 14,
  },
  categoryItem: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  categoryItemText: { fontSize: 14, color: '#444' },
  categoryItemActive: { color: '#2563EB', fontWeight: '700' },
  searchBtn: {
    margin: 16, backgroundColor: '#2563EB',
    padding: 14, borderRadius: 12, alignItems: 'center',
  },
  searchBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  list: { padding: 16, gap: 10, paddingBottom: 30 },
  artisanCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F0F0F0', elevation: 1,
  },
  artisanRow: { flexDirection: 'row', gap: 12 },
  avatarContainer: { justifyContent: 'flex-start' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  artisanInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  artisanName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  artisanCardPro: { borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  proBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#F59E0B' },
  proBadgeText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  skills: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6 },
  statsRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 4 },
  rating: { fontSize: 13, color: '#F59E0B', fontWeight: '700' },
  completedJobs: { fontSize: 12, color: '#666' },
  responseTime: { fontSize: 12, color: '#3B82F6' },
  address: { fontSize: 11, color: '#BBB' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
});
