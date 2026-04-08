import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { searchArtisans } from '../../api/discoveryApi';
import { getUser } from '../../utils/storage';

const PRIMARY = '#2563EB';

// Preview artisans — shown when no real artisans are returned from the API yet
const PREVIEW_ARTISANS = [
  {
    id: 'preview-1',
    name: 'Emeka Okafor',
    profilePhoto: null,
    skills: ['Electrician'],
    badgeLevel: 'verified',
    distanceKm: '2.4',
    stats: { averageRating: 4.8, completedJobs: 47 },
    _isPreview: true,
  },
  {
    id: 'preview-2',
    name: 'Bola Adewale',
    profilePhoto: null,
    skills: ['Plumber'],
    badgeLevel: 'trusted',
    distanceKm: '3.1',
    stats: { averageRating: 4.6, completedJobs: 31 },
    _isPreview: true,
  },
  {
    id: 'preview-3',
    name: 'Chinaza Eze',
    profilePhoto: null,
    skills: ['Carpenter'],
    badgeLevel: 'verified',
    distanceKm: '1.8',
    stats: { averageRating: 4.9, completedJobs: 62 },
    _isPreview: true,
  },
];

// Featured services shown in the Browse section
const FEATURED_CATEGORIES = [
  {
    skill: 'Plumber',
    label: 'Plumber',
    count: '120+',
    icon: '🔧',
    featured: true,
    bg: PRIMARY,
    iconBg: 'rgba(255,255,255,0.2)',
  },
  {
    skill: 'Electrician',
    label: 'Electrician',
    count: '85',
    icon: '⚡',
    featured: false,
    bg: '#FFF',
    iconBg: '#FFF8E1',
  },
  {
    skill: 'Carpenter',
    label: 'Carpenter',
    count: '42',
    icon: '🪚',
    featured: false,
    bg: '#FFF',
    iconBg: '#FFF3E0',
  },
];

const BADGE_CONFIG = {
  new: { color: '#6B7280' },
  verified: { color: '#16A34A' },
  trusted: { color: '#D97706' },
};

export default function CustomerHomeScreen({ navigation, onSwitchTab }) {
  const [user, setUser] = useState(null);
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Lagos');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getUser().then(setUser);
    initLocation();
  }, []);

  useFocusEffect(useCallback(() => {
    fetchNearbyArtisans();
  }, [location]));

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        fetchNearbyArtisans();
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(pos.coords);

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (place) {
          const area = place.district || place.city || place.subregion || 'Your Area';
          const state = place.region || 'Nigeria';
          setLocationLabel(`${area}, ${state}`);
        }
      } catch {
        // keep default
      }
    } catch {
      fetchNearbyArtisans();
    }
  };

  const fetchNearbyArtisans = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = { limit: 10 };
      if (location) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
        params.maxDistance = 20;
      }
      const res = await searchArtisans(params);
      setArtisans(res.data.data || []);
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    navigation.navigate('SearchArtisans', { initialQuery: searchQuery });
  };

  const handleCategoryPress = (skill) => {
    navigation.navigate('SearchArtisans', { initialCategory: skill });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.appName}>FixNG</Text>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => onSwitchTab?.('profile')}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(user?.name || 'U')[0].toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNearbyArtisans(true)}
            tintColor={PRIMARY}
          />
        }
      >
        {/* Location row */}
        <TouchableOpacity style={styles.locationRow} activeOpacity={0.7}>
          <Text style={styles.locationPin}>📍</Text>
          <View>
            <Text style={styles.locationLabel}>YOUR LOCATION</Text>
            <View style={styles.locationNameRow}>
              <Text style={styles.locationName}>{locationLabel}</Text>
              <Text style={styles.locationChevron}> ˅</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Search bar */}
        <TouchableOpacity style={styles.searchBar} onPress={handleSearch} activeOpacity={0.8}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>
            {searchQuery || 'Find a plumber, electrician...'}
          </Text>
        </TouchableOpacity>

        {/* Browse Services */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse Services</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SearchArtisans')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Featured card */}
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={() => handleCategoryPress(FEATURED_CATEGORIES[0].skill)}
          activeOpacity={0.85}
        >
          <View style={styles.featuredIconBox}>
            <Text style={styles.featuredIcon}>{FEATURED_CATEGORIES[0].icon}</Text>
          </View>
          <Text style={styles.featuredLabel}>{FEATURED_CATEGORIES[0].label}</Text>
          <Text style={styles.featuredCount}>
            {FEATURED_CATEGORIES[0].count} Verified Experts
          </Text>
          {/* Watermark icon */}
          <Text style={styles.watermark}>{FEATURED_CATEGORIES[0].icon}</Text>
        </TouchableOpacity>

        {/* Small category cards */}
        <View style={styles.categoryGrid}>
          {FEATURED_CATEGORIES.slice(1).map((cat) => (
            <TouchableOpacity
              key={cat.skill}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(cat.skill)}
              activeOpacity={0.8}
            >
              <View style={[styles.categoryIconBox, { backgroundColor: cat.iconBg }]}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              <Text style={styles.categoryCount}>{cat.count} Experts</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nearby Verified */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Verified</Text>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => navigation.navigate('SearchArtisans')}
          >
            <Text style={styles.filterBtnText}>≡ Filter</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : (
          <>
            {(artisans.length === 0 ? PREVIEW_ARTISANS : artisans).map((artisan) => (
              <ArtisanCard
                key={artisan.id}
                artisan={artisan}
                onPress={() =>
                  artisan._isPreview
                    ? navigation.navigate('SearchArtisans')
                    : navigation.navigate('ArtisanProfile', { artisanId: artisan.id })
                }
              />
            ))}
            {artisans.length === 0 && (
              <TouchableOpacity
                style={styles.searchMoreBtn}
                onPress={() => navigation.navigate('SearchArtisans')}
              >
                <Text style={styles.searchMoreText}>Find artisans near you →</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ArtisanCard({ artisan, onPress }) {
  const rating = artisan.stats?.averageRating;
  const jobs = artisan.stats?.completedJobs || 0;
  const skill = artisan.skills?.[0] || 'Artisan';
  const distance = artisan.distanceKm;

  return (
    <View style={card.container}>
      {/* Left: avatar */}
      <View style={card.avatarWrapper}>
        {artisan.profilePhoto ? (
          <Image source={{ uri: artisan.profilePhoto }} style={card.avatar} />
        ) : (
          <View style={card.avatarFallback}>
            <Text style={card.avatarInitial}>
              {(artisan.name || 'A')[0].toUpperCase()}
            </Text>
          </View>
        )}
        {/* Verified badge */}
        {artisan.badgeLevel !== 'new' && (
          <View style={card.verifiedBadge}>
            <Text style={card.verifiedText}>✅ VERIFIED</Text>
          </View>
        )}
      </View>

      {/* Right: info */}
      <View style={card.info}>
        <View style={card.nameRow}>
          <Text style={card.name} numberOfLines={1}>{artisan.name}</Text>
          {rating > 0 && (
            <View style={card.ratingBadge}>
              <Text style={card.ratingText}>★ {rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <Text style={card.specialty}>
          {skill}
          {distance !== null && (
            <Text style={card.distance}> • {distance}km away</Text>
          )}
        </Text>

        <View style={card.bottomRow}>
          <Text style={card.jobsText}>{jobs} Jobs Completed</Text>
          <TouchableOpacity style={card.bookBtn} onPress={onPress}>
            <Text style={card.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  scroll: { paddingBottom: 10 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEF0F5',
  },
  menuBtn: { padding: 4 },
  menuIcon: { fontSize: 22, color: '#1E232C' },
  appName: { fontSize: 18, fontWeight: '800', color: PRIMARY },
  avatarBtn: {},
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: PRIMARY },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  locationPin: { fontSize: 20 },
  locationLabel: { fontSize: 10, fontWeight: '700', color: '#8391A1', letterSpacing: 0.5 },
  locationNameRow: { flexDirection: 'row', alignItems: 'center' },
  locationName: { fontSize: 15, fontWeight: '700', color: '#1E232C' },
  locationChevron: { fontSize: 13, color: '#8391A1', fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, backgroundColor: '#EEF0F5',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 24,
  },
  searchIcon: { fontSize: 16 },
  searchPlaceholder: { fontSize: 14, color: '#8391A1', flex: 1 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1E232C' },
  viewAll: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#F0F4FF',
  },
  filterBtnText: { fontSize: 13, color: PRIMARY, fontWeight: '700' },

  // Featured card
  featuredCard: {
    marginHorizontal: 20, backgroundColor: PRIMARY,
    borderRadius: 18, padding: 24, marginBottom: 12,
    overflow: 'hidden', minHeight: 130,
    justifyContent: 'flex-end',
  },
  featuredIconBox: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  featuredIcon: { fontSize: 26 },
  featuredLabel: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  featuredCount: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  watermark: {
    position: 'absolute', right: -10, bottom: -10,
    fontSize: 100, opacity: 0.12,
  },

  // Small category grid
  categoryGrid: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, marginBottom: 28,
  },
  categoryCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 16,
    padding: 16, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#EEF0F5',
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  categoryIconBox: {
    width: 44, height: 44, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  categoryIcon: { fontSize: 22 },
  categoryLabel: { fontSize: 14, fontWeight: '700', color: '#1E232C', marginBottom: 3 },
  categoryCount: { fontSize: 12, color: '#8391A1' },

  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: { paddingVertical: 40, alignItems: 'center', paddingHorizontal: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#8391A1', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  emptyBtn: {
    backgroundColor: PRIMARY, paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: 10,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  searchMoreBtn: {
    marginHorizontal: 20, marginTop: 4, padding: 14,
    backgroundColor: '#F0F4FF', borderRadius: 12,
    alignItems: 'center',
  },
  searchMoreText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
});

// Artisan card styles
const card = StyleSheet.create({
  container: {
    flexDirection: 'row', backgroundColor: '#FFF',
    marginHorizontal: 20, borderRadius: 16, padding: 14,
    marginBottom: 12, gap: 14,
    borderWidth: 1, borderColor: '#EEF0F5',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6,
  },
  avatarWrapper: { alignItems: 'center', gap: 6 },
  avatar: { width: 80, height: 80, borderRadius: 12 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 12,
    backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 30, fontWeight: '800', color: PRIMARY },
  verifiedBadge: {
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  verifiedText: { fontSize: 9, fontWeight: '800', color: '#166534' },

  info: { flex: 1, justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '800', color: '#1E232C', flex: 1, marginRight: 6 },
  ratingBadge: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 20,
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: '#92400E' },

  specialty: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  distance: { color: PRIMARY, fontWeight: '700' },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jobsText: { fontSize: 12, color: '#6B7280' },
  bookBtn: {
    borderWidth: 1.5, borderColor: PRIMARY,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  bookBtnText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
});
