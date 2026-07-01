import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { searchArtisans } from '../../api/discoveryApi';
import { ARTISAN_SKILLS } from '../../constants/skills';
import BackButton from '../../components/BackButton';
import DispatchSafetyModal from '../../components/DispatchSafetyModal';
import { useTheme } from '../../context/ThemeContext';

const PAGE_LIMIT = 20;

const BADGE_CONFIG = {
  new:      { label: 'New',      color: '#9CA3AF', icon: '🌱' },
  verified: { label: 'Verified', color: '#3B82F6', icon: '✓'  },
  trusted:  { label: 'Trusted',  color: '#F59E0B', icon: '⭐' },
};

const DISTANCE_OPTIONS = [5, 10, 20, 50];

// ── Animated skeleton cards ────────────────────────────────────────────────────
function SkeletonLoader() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const styles = makeStyles(colors);

  return (
    <View style={styles.list}>
      <View style={styles.skeletonHeader}>
        <ActivityIndicator color={colors.info} size="small" />
        <Text style={styles.skeletonHeaderText}>Finding artisans near you…</Text>
      </View>
      {[1, 2, 3, 4].map((k) => (
        <Animated.View key={k} style={[styles.skeletonCard, { opacity: pulse }]}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonBody}>
            <View style={[styles.skeletonLine, { width: '55%', marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: '80%', marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: '40%' }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

export default function SearchArtisansScreen({ navigation, embedded = false }) {
  const { colors } = useTheme();
  const [artisans, setArtisans]               = useState([]);
  const [skeletal, setSkeletal]               = useState(true);  // first-load skeleton
  const [refreshing, setRefreshing]           = useState(false);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [hasMore, setHasMore]                 = useState(false);
  const [page, setPage]                       = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDistance, setSelectedDistance] = useState(null);
  const [onlyTrusted, setOnlyTrusted]         = useState(false);
  const [minRating, setMinRating]             = useState(0);
  const [categorySearch, setCategorySearch]   = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [safetyModalArtisanId, setSafetyModalArtisanId] = useState(null);

  const locationRef    = useRef(null);
  const mountedRef     = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const filteredSkills = ARTISAN_SKILLS.filter((s) =>
    s.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // ── Location — uses Low accuracy (cell/WiFi) which resolves in ~200ms ────────
  const getLocation = async () => {
    if (locationRef.current) return locationRef.current;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,  // fast: ~200ms vs 2s for Balanced/High
      });
      locationRef.current = pos.coords;
      return pos.coords;
    } catch {
      return null;
    }
  };

  // ── Build query params ────────────────────────────────────────────────────────
  const buildParams = (coords, targetPage) => {
    const p = {
      page:      targetPage,
      limit:     PAGE_LIMIT,
      category:  selectedCategory  || undefined,
      minRating: minRating         || undefined,
      isPro:     onlyTrusted ? true : undefined,
    };
    if (selectedDistance)   p.maxDistance = selectedDistance;
    if (coords?.latitude)   p.latitude    = coords.latitude;
    if (coords?.longitude)  p.longitude   = coords.longitude;
    return p;
  };

  // ── Phase 1: fetch without location (fast, ~300ms) ──────────────────────────
  const fetchWithoutLocation = async (replace = true) => {
    try {
      const res  = await searchArtisans(buildParams(null, 1));
      if (!mountedRef.current) return;
      const data = res.data.data || [];
      if (replace) { setArtisans(data); setPage(1); }
      setHasMore(data.length === PAGE_LIMIT);
    } catch { /* silently ignore — Phase 2 may still succeed */ }
  };

  // ── Phase 2: refetch with location once GPS resolves ────────────────────────
  const fetchWithLocation = async (coords) => {
    try {
      const res  = await searchArtisans(buildParams(coords, 1));
      if (!mountedRef.current) return;
      const data = res.data.data || [];
      setArtisans(data);
      setPage(1);
      setHasMore(data.length === PAGE_LIMIT);
    } catch { /* keep Phase 1 results */ }
  };

  // ── Initial load: both phases run in parallel ────────────────────────────────
  const initialLoad = useCallback(async () => {
    setSkeletal(true);

    // Fire both simultaneously — no waiting
    const [, coords] = await Promise.all([
      fetchWithoutLocation(true),
      getLocation(),
    ]);

    if (!mountedRef.current) return;
    setSkeletal(false);

    // If we got location, silently upgrade the results
    if (coords) await fetchWithLocation(coords);
  }, []); // eslint-disable-line

  useEffect(() => { initialLoad(); }, []); // eslint-disable-line

  // ── Pull-to-refresh ───────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    const coords = locationRef.current || await getLocation();
    try {
      const res  = await searchArtisans(buildParams(coords, 1));
      if (!mountedRef.current) return;
      const data = res.data.data || [];
      setArtisans(data);
      setPage(1);
      setHasMore(data.length === PAGE_LIMIT);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Apply filters (manual re-search) ─────────────────────────────────────────
  const handleApplyFilters = async () => {
    setShowCategoryPicker(false);
    setSkeletal(true);
    const coords = locationRef.current || await getLocation();
    try {
      const res  = await searchArtisans(buildParams(coords, 1));
      if (!mountedRef.current) return;
      const data = res.data.data || [];
      setArtisans(data);
      setPage(1);
      setHasMore(data.length === PAGE_LIMIT);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Search failed.');
    } finally {
      setSkeletal(false);
    }
  };

  // ── Pagination ────────────────────────────────────────────────────────────────
  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || skeletal) return;
    setLoadingMore(true);
    const coords = locationRef.current;
    try {
      const nextPage = page + 1;
      const res  = await searchArtisans(buildParams(coords, nextPage));
      if (!mountedRef.current) return;
      const data = res.data.data || [];
      setArtisans((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PAGE_LIMIT);
    } catch { /* silently ignore */ }
    finally { setLoadingMore(false); }
  };

  // ── Artisan card ──────────────────────────────────────────────────────────────
  const renderArtisan = ({ item }) => {
    const badge     = BADGE_CONFIG[item.badgeLevel] || BADGE_CONFIG.new;
    const avgRating = item.stats?.averageRating;
    const styles = makeStyles(colors);

    return (
      <TouchableOpacity
        style={[styles.artisanCard, item.isPro && styles.artisanCardPro]}
        onPress={() => {
          if (item.skills?.includes('Dispatch Rider')) {
            setSafetyModalArtisanId(item.id);
          } else {
            navigation.navigate('ArtisanProfile', { artisanId: item.id });
          }
        }}
        activeOpacity={0.8}
      >
        <View style={styles.artisanRow}>
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

            <Text style={styles.skills} numberOfLines={1}>
              {(item.skills || []).join(' • ')}
            </Text>

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

  const renderFooter = () => {
    const styles = makeStyles(colors);
    if (loadingMore) return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={colors.info} size="small" />
        <Text style={styles.footerText}>Loading more…</Text>
      </View>
    );
    if (!hasMore && artisans.length > 0) return (
      <View style={styles.footerEnd}>
        <Text style={styles.footerEndText}>— All artisans shown —</Text>
      </View>
    );
    return null;
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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
        <TouchableOpacity
          style={[styles.filterChip, selectedCategory && styles.filterChipActive]}
          onPress={() => setShowCategoryPicker((v) => !v)}
        >
          <Text style={[styles.filterChipText, selectedCategory && styles.filterChipTextActive]}>
            {selectedCategory || 'All Skills'} {showCategoryPicker ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

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

        <TouchableOpacity
          style={[styles.filterChip, minRating > 0 && styles.filterChipActive]}
          onPress={() => setMinRating(minRating > 0 ? 0 : 4)}
        >
          <Text style={[styles.filterChipText, minRating > 0 && styles.filterChipTextActive]}>
            ⭐ 4+
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, onlyTrusted && styles.filterChipTrusted]}
          onPress={() => setOnlyTrusted((v) => !v)}
        >
          <Text style={[styles.filterChipText, onlyTrusted && styles.filterChipTextTrusted]}>
            ✓ Trusted
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category picker */}
      {showCategoryPicker && (
        <View style={styles.categoryDropdown}>
          <TextInput
            style={styles.categorySearch}
            placeholder="Search skill..."
            value={categorySearch}
            onChangeText={setCategorySearch}
            autoFocus
          />
          <FlatList
            data={[{ name: 'All Skills', value: '' }, ...filteredSkills.map((s) => ({ name: s, value: s }))]}
            keyExtractor={(item) => item.value || 'all'}
            style={{ maxHeight: 200 }}
            keyboardShouldPersistTaps="handled"
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

      {/* Apply filters button */}
      <TouchableOpacity
        style={styles.searchBtn}
        onPress={handleApplyFilters}
        disabled={skeletal}
        activeOpacity={0.85}
      >
        <Text style={styles.searchBtnText}>Apply Filters 🔍</Text>
      </TouchableOpacity>

      {/* Skeleton OR results */}
      {skeletal ? (
        <SkeletonLoader />
      ) : (
        <FlatList
          data={artisans}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderArtisan}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.info} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No artisans found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your filters or increasing the distance.
              </Text>
            </View>
          }
        />
      )}

      <DispatchSafetyModal
        visible={safetyModalArtisanId !== null}
        onConfirm={() => {
          const id = safetyModalArtisanId;
          setSafetyModalArtisanId(null);
          navigation.navigate('ArtisanProfile', { artisanId: id });
        }}
        onGoBack={() => setSafetyModalArtisanId(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  filters: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: 12, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  filterChip:           { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  filterChipActive:     { borderColor: colors.info, backgroundColor: colors.infoBg },
  filterChipTrusted:    { borderColor: '#B45309', backgroundColor: colors.warningBg },
  filterChipText:       { fontSize: 13, color: colors.textSub, fontWeight: '600' },
  filterChipTextActive: { color: colors.info },
  filterChipTextTrusted:{ color: '#B45309' },
  categoryDropdown: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    marginHorizontal: 16, borderRadius: 10, overflow: 'hidden',
    elevation: 6, zIndex: 20,
  },
  categorySearch:     { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight, fontSize: 14, color: colors.text },
  categoryItem:       { padding: 13, borderBottomWidth: 1, borderBottomColor: colors.bgAlt },
  categoryItemText:   { fontSize: 14, color: colors.textSub },
  categoryItemActive: { color: colors.info, fontWeight: '700' },
  searchBtn: {
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: colors.info, padding: 13,
    borderRadius: 12, alignItems: 'center',
  },
  searchBtnText: { color: colors.card, fontWeight: '700', fontSize: 14 },

  // ── Skeleton ──
  skeletonHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 16,
  },
  skeletonHeaderText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  skeletonCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.borderLight, marginBottom: 10,
  },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.borderLight },
  skeletonBody:   { flex: 1, justifyContent: 'center' },
  skeletonLine:   { height: 12, borderRadius: 6, backgroundColor: colors.borderLight },

  // ── List ──
  list: { padding: 16, gap: 10, paddingBottom: 30 },
  artisanCard:    { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.borderLight, elevation: 1 },
  artisanCardPro: { borderLeftWidth: 3, borderLeftColor: colors.star },
  artisanRow:     { flexDirection: 'row', gap: 12 },
  avatarContainer:{ justifyContent: 'flex-start' },
  avatar:         { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.info, justifyContent: 'center', alignItems: 'center' },
  avatarInitial:  { color: colors.card, fontSize: 22, fontWeight: '700' },
  artisanInfo:    { flex: 1 },
  nameRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  artisanName:    { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  badgeRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgePill:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: colors.borderLight },
  badgeText:      { fontSize: 11, fontWeight: '700' },
  proBadge:       { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12, backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.star },
  proBadgeText:   { fontSize: 11, fontWeight: '700', color: '#B45309' },
  skills:         { fontSize: 15, fontWeight: '700', color: colors.textSub, marginBottom: 6 },
  statsRow:       { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 4 },
  rating:         { fontSize: 13, color: colors.star, fontWeight: '700' },
  completedJobs:  { fontSize: 12, color: colors.textSub },
  responseTime:   { fontSize: 12, color: colors.info },
  address:        { fontSize: 11, color: colors.textHint },
  empty:          { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon:      { fontSize: 48, marginBottom: 16 },
  emptyTitle:     { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyText:      { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  footerLoader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  footerText:     { fontSize: 13, color: colors.textMuted },
  footerEnd:      { alignItems: 'center', paddingVertical: 20 },
  footerEndText:  { fontSize: 12, color: colors.textHint },
});
