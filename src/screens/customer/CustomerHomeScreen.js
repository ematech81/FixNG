import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { searchArtisans } from '../../api/discoveryApi';
import { getUser } from '../../utils/storage';
import { DUMMY_PRO_ARTISANS, DUMMY_NEARBY_ARTISANS } from '../../constants/dummyProfiles';

const PRIMARY = '#2563EB';

const BADGE_CONFIG = {
  new:      { color: '#6B7280', label: 'New',      bg: '#F3F4F6' },
  verified: { color: '#16A34A', label: 'Verified', bg: '#F0FDF4' },
  trusted:  { color: '#D97706', label: 'Trusted',  bg: '#FFFBEB' },
};

export default function CustomerHomeScreen({ navigation, onSwitchTab }) {
  const [user, setUser] = useState(null);
  const [topArtisans, setTopArtisans] = useState([]);
  const [nearbyArtisans, setNearbyArtisans] = useState([]);
  const [nearbyPage, setNearbyPage] = useState(1);
  const [hasMoreNearby, setHasMoreNearby] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Your Area');

  const coordsRef = useRef(null);

  useEffect(() => {
    getUser().then(setUser);
    initLocation();
  }, []);

  useFocusEffect(useCallback(() => {
    loadAll();
  }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      coordsRef.current = pos.coords;
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
      } catch { /* keep default */ }
      loadAll();
    } catch { /* keep default */ }
  };

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const coords = coordsRef.current;
    const geoParams = coords
      ? { latitude: coords.latitude, longitude: coords.longitude, maxDistance: 20 }
      : {};

    try {
      const [topRes, nearbyRes] = await Promise.all([
        searchArtisans({ limit: 20 }),
        searchArtisans({ ...geoParams, limit: 20, page: 1 }),
      ]);
      const topData  = topRes.data.data   || [];
      const nearData = nearbyRes.data.data || [];
      setTopArtisans(topData.length   > 0 ? topData   : DUMMY_PRO_ARTISANS);
      setNearbyArtisans(nearData.length > 0 ? nearData : DUMMY_NEARBY_ARTISANS);
      setHasMoreNearby(nearData.length === 20);
      setNearbyPage(1);
    } catch {
      setTopArtisans(DUMMY_PRO_ARTISANS);
      setNearbyArtisans(DUMMY_NEARBY_ARTISANS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreNearby = async () => {
    if (loadingMore || !hasMoreNearby) return;
    setLoadingMore(true);
    const coords = coordsRef.current;
    const geoParams = coords
      ? { latitude: coords.latitude, longitude: coords.longitude, maxDistance: 20 }
      : {};
    try {
      const nextPage = nearbyPage + 1;
      const res = await searchArtisans({ ...geoParams, limit: 20, page: nextPage });
      const more = res.data.data || [];
      setNearbyArtisans((prev) => [...prev, ...more]);
      setHasMoreNearby(more.length === 20);
      setNearbyPage(nextPage);
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  };

  const goToProfile = (artisan) => {
    if (artisan._isDummy) {
      navigation.navigate('ArtisanProfile', { artisanId: artisan.id, _dummyProfile: artisan });
    } else {
      navigation.navigate('ArtisanProfile', { artisanId: artisan.id });
    }
  };

  const goToSearch = () => onSwitchTab?.('search');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.appName}>FixNG</Text>
        <TouchableOpacity onPress={() => onSwitchTab?.('profile')} activeOpacity={0.8}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(user?.name || 'U')[0].toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={PRIMARY} />
        }
        // style={{ backgroundColor: '#aeeff4' }}
      >
        {/* ── Location row ── */}
        <TouchableOpacity style={styles.locationRow} activeOpacity={0.7}>
          <Text style={styles.locationPin}>📍</Text>
          <View>
            <Text style={styles.locationMeta}>YOUR LOCATION</Text>
            <View style={styles.locationNameRow}>
              <Text style={styles.locationName}>{locationLabel}</Text>
              <Text style={styles.locationChevron}> ˅</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Search bar ── */}
        <TouchableOpacity style={styles.searchBar} onPress={goToSearch} activeOpacity={0.8}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Find a plumber, electrician...</Text>
        </TouchableOpacity>

        {/* ── Section A: Trusted Professionals — horizontal scroll ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trusted Professionals</Text>
          <TouchableOpacity onPress={goToSearch}>
            <Text style={styles.viewMore}>View More</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : topArtisans.length === 0 ? (
          <TouchableOpacity style={styles.emptyHScroll} onPress={goToSearch}>
            <Text style={styles.emptyHScrollText}>No verified artisans yet — tap to search →</Text>
          </TouchableOpacity>
        ) : (
          <FlatList
            horizontal
            data={topArtisans}
            keyExtractor={(item) => `top-${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScrollContent}
            renderItem={({ item }) => (
              <TrustedProfessionalsCard
                artisan={item}
                onPress={() => goToProfile(item)}
                cardStyle={styles.hCard}
              />
            )}
          />
        )}

        {/* ── Section B: Nearby Artisans ── */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>Nearby Artisans</Text>
          <TouchableOpacity style={styles.filterBtnWrap} onPress={goToSearch}>
            <Text style={styles.filterBtnText}>≡ Filter</Text>
          </TouchableOpacity>
        </View>

        {!loading && nearbyArtisans.length === 0 ? (
          <View style={styles.emptyNearby}>
            <Text style={styles.emptyNearbyIcon}>🔧</Text>
            <Text style={styles.emptyNearbyText}>
              No artisans found nearby.{'\n'}Try expanding your search area.
            </Text>
            <TouchableOpacity style={styles.emptyNearbyBtn} onPress={goToSearch}>
              <Text style={styles.emptyNearbyBtnText}>Search Artisans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          nearbyArtisans.map((artisan) => (
            <ArtisanCard
              key={artisan.id}
              artisan={artisan}
              onPress={() => goToProfile(artisan)}
            />
          ))
        )}

        {/* Load More */}
        {hasMoreNearby && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={loadMoreNearby}
            disabled={loadingMore}
          >
            {loadingMore
              ? <ActivityIndicator color={PRIMARY} size="small" />
              : <Text style={styles.loadMoreText}>Load More</Text>}
          </TouchableOpacity>
        )}

        <View style={{ height: 24}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Shared Artisan Card ────────────────────────────────────────────────────────
// Used in BOTH the horizontal (Trusted Professionals) and vertical (Nearby Artisans) sections.
function TrustedProfessionalsCard({ artisan, onPress, cardStyle }) {
  const badge  = BADGE_CONFIG[artisan.badgeLevel] || BADGE_CONFIG.new;
  const rating = artisan.stats?.averageRating;
  const jobs   = artisan.stats?.completedJobs || 0;

  return (
    <TouchableOpacity
      style={[card.container, cardStyle, card.containerProf]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* ── Top row: avatar + info + badge ── */}
      <View style={card.topRow}>
        {/* Avatar */}
        <View style={card.avatarWrap}>
          {artisan.profilePhoto ? (
            <Image source={{ uri: artisan.profilePhoto }} style={card.avatar} />
          ) : (
            <View style={card.avatarFallback}>
              <Text style={card.avatarInitial}>
                {(artisan.name || 'A')[0].toUpperCase()}
              </Text>
            </View>
          )}
          {artisan.badgeLevel !== 'new' && (
            <View style={[
              card.verifiedDot,
              { backgroundColor: artisan.badgeLevel === 'trusted' ? '#D97706' : '#16A34A' },
            ]}>
              <Text style={card.verifiedDotText}>
                {artisan.badgeLevel === 'trusted' ? '★' : '✓'}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={card.info}>
          <View style={card.nameRow}>
            <Text style={card.name} numberOfLines={1}>{artisan.name}</Text>
            <View style={[card.badgePill, { backgroundColor: badge.bg }]}>
              <Text style={[card.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>

          <Text style={card.skills} numberOfLines={1}>
            {(artisan.skills || []).join(' • ')}
          </Text>

          <View style={card.statsRow}>
            {rating > 0 && <Text style={card.rating}>⭐ {rating.toFixed(1)}</Text>}
            <Text style={card.jobs}>{jobs} jobs done</Text>
            {artisan.distanceKm != null && (
              <Text style={card.dist}>📍 {artisan.distanceKm}km</Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Bottom row: Book Now button (full width) ── */}
      <TouchableOpacity style={card.ProfessionalbookBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={card.bookBtnText}>Book Now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}




function ArtisanCard({ artisan, onPress, cardStyle }) {
  const badge  = BADGE_CONFIG[artisan.badgeLevel] || BADGE_CONFIG.new;
  const rating = artisan.stats?.averageRating;
  const jobs   = artisan.stats?.completedJobs || 0;

  return (
    <TouchableOpacity
      style={[card.container, cardStyle]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* ── Top row: avatar + info + badge ── */}
      <View style={card.topRow}>
        {/* Avatar */}
        <View style={card.avatarWrap}>
          {artisan.profilePhoto ? (
            <Image source={{ uri: artisan.profilePhoto }} style={card.avatar} />
          ) : (
            <View style={card.avatarFallback}>
              <Text style={card.avatarInitial}>
                {(artisan.name || 'A')[0].toUpperCase()}
              </Text>
            </View>
          )}
          {artisan.badgeLevel !== 'new' && (
            <View style={[
              card.verifiedDot,
              { backgroundColor: artisan.badgeLevel === 'trusted' ? '#D97706' : '#16A34A' },
            ]}>
              <Text style={card.verifiedDotText}>
                {artisan.badgeLevel === 'trusted' ? '★' : '✓'}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={card.info}>
          <View style={card.nameRow}>
            <Text style={card.name} numberOfLines={1}>{artisan.name}</Text>
            <View style={[card.badgePill, { backgroundColor: badge.bg }]}>
              <Text style={[card.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>

          <Text style={card.skills} numberOfLines={1}>
            {(artisan.skills || []).join(' • ')}
          </Text>

          <View style={card.statsRow}>
            {rating > 0 && <Text style={card.rating}>⭐ {rating.toFixed(1)}</Text>}
            <Text style={card.jobs}>{jobs} jobs done</Text>
            {artisan.distanceKm != null && (
              <Text style={card.dist}>📍 {artisan.distanceKm}km</Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Bottom row: Book Now button (full width) ── */}
      <TouchableOpacity style={card.bookBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={card.ArtisanBookBtnText}>Book Now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  scroll: { paddingBottom: 10 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEF0F5',
  },
  appName: { fontSize: 20, fontWeight: '900', color: PRIMARY, letterSpacing: -0.5 },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: PRIMARY },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  locationPin: { fontSize: 20 },
  locationMeta: { fontSize: 12, fontWeight: '700', color: '#8391A1', letterSpacing: 0.5 },
  locationNameRow: { flexDirection: 'row', alignItems: 'center' },
  locationName: { fontSize: 17, fontWeight: '700', color: '#1E232C' },
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
    paddingHorizontal: 10, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1E232C' },
  viewMore: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  filterBtnWrap: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#F0F4FF',
  },
  filterBtnText: { fontSize: 13, color: PRIMARY, fontWeight: '700' },

  loadingBox: { paddingVertical: 40, alignItems: 'center' },

  // Horizontal scroll
  hScrollContent: { paddingHorizontal: 20, paddingBottom: 4 },
  // Each card in the horizontal scroll is fixed-width with a right margin
  hCard: { width: 300, marginRight: 14, marginHorizontal: 0 },

  emptyHScroll: {
    marginHorizontal: 20, backgroundColor: '#F0F4FF',
    borderRadius: 14, padding: 20, alignItems: 'center',
  },
  emptyHScrollText: { fontSize: 14, color: PRIMARY, fontWeight: '600', textAlign: 'center' },

  emptyNearby: {
    marginHorizontal: 20, marginBottom: 16,
    alignItems: 'center', paddingVertical: 30,
  },
  emptyNearbyIcon: { fontSize: 40, marginBottom: 12 },
  emptyNearbyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  emptyNearbyBtn: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyNearbyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  loadMoreBtn: {
    margin: 16, padding: 14, borderRadius: 12,
    backgroundColor: '#F0F4FF', alignItems: 'center', minHeight: 48,
    justifyContent: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
});

// ── Shared card styles (identical for both sections) ──────────────────────────
const card = StyleSheet.create({
  container: {
    // marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#FFF',
    // borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4706f8',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    padding: 20,
    gap: 18,
    width: '100%',
    // height: 200,
  },
  containerProf: {
    borderRadius: 20,
  },

  // ── Top row ──
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },

  // Avatar
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 20 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 32, fontWeight: '800', color: PRIMARY },
  verifiedDot: {
    position: 'absolute', bottom: -4, right: -4,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  verifiedDotText: { fontSize: 10, color: '#FFF', fontWeight: '800' },

  // Info
  info: { flex: 1, paddingTop: 2 },
  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 5,
  },
  name: { fontSize: 16, fontWeight: '800', color: '#1E232C', flex: 1, marginRight: 8 },
  badgePill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  badgeLabel: { fontSize: 11, fontWeight: '700' },

  skills: { fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 18 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  rating: { fontSize: 13, color: '#F59E0B', fontWeight: '700' },
  jobs:   { fontSize: 13, color: '#6B7280' },
  dist:   { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  // ── Book Now button — full width at bottom ──
  bookBtn: {
    // backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ArtisanBookBtnText: { fontSize: 17, fontWeight: '800', color: PRIMARY },

  ProfessionalbookBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: { fontSize: 15, fontWeight: '800', color: "#ffffff" },
});
