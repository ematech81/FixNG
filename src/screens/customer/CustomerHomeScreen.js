import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { searchArtisans } from '../../api/discoveryApi';
import { getMyJobs } from '../../api/jobApi';
import { getUnreadCount } from '../../api/notificationApi';
import { getUser } from '../../utils/storage';
import { DUMMY_NEARBY_ARTISANS } from '../../constants/dummyProfiles';

// ── Design Tokens ──────────────────────────────────────────────────────────────
const COLORS = {
  primary:       '#2563EB',
  primaryLight:  '#EFF6FF',
  primaryMid:    '#BFDBFE',
  accent:        '#0EA5E9',
  surface:       '#FFFFFF',
  background:    '#F8FAFF',
  cardBorder:    '#F1F5F9',
  textPrimary:   '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  gold:          '#F59E0B',
  goldLight:     '#FFFBEB',
  green:         '#16A34A',
  greenLight:    '#F0FDF4',
  amber:         '#D97706',
  amberLight:    '#FFFBEB',
  grey:          '#6B7280',
  greyLight:     '#F3F4F6',
  divider:       '#F1F5F9',
  shadow:        '#1E40AF',
};

const BADGE_CONFIG = {
  new:      { color: COLORS.grey,  label: 'New',      bg: COLORS.greyLight  },
  verified: { color: COLORS.green, label: 'Verified', bg: COLORS.greenLight  },
  trusted:  { color: COLORS.amber, label: 'Trusted',  bg: COLORS.amberLight  },
};

// ── Category Quick-Filters ────────────────────────────────────────────────────
// id must match the exact skill string stored in ArtisanProfile.skills (backend)
const CATEGORIES = [
  { id: 'all',                      label: 'All',          icon: '⚡' },
  { id: 'Plumber',                  label: 'Plumbing',     icon: '🔧' },
  { id: 'Electrician',              label: 'Electrical',   icon: '💡' },
  { id: 'Carpenter',                label: 'Carpentry',    icon: '🪚' },
  { id: 'Painter',                  label: 'Painting',     icon: '🖌️' },
  { id: 'Tiler',                    label: 'Tiling',       icon: '🏠' },
  { id: 'Bricklayer',               label: 'Bricklaying',  icon: '🧱' },
  { id: 'Welder',                   label: 'Welding',      icon: '⚙️' },
  { id: 'AC Technician',            label: 'AC Repair',    icon: '❄️' },
  { id: 'Generator Repair',         label: 'Generator',    icon: '🔌' },
  { id: 'Auto Mechanic',            label: 'Auto',         icon: '🚗' },
  { id: 'Phone / Laptop Repair',    label: 'Phone/Laptop', icon: '📱' },
  { id: 'Tailor',                   label: 'Tailoring',    icon: '✂️' },
  { id: 'Barber',                   label: 'Barbing',      icon: '💈' },
  { id: 'Hairdresser',              label: 'Hair',         icon: '💇' },
  { id: 'Makeup Artist',            label: 'Makeup',       icon: '💄' },
  { id: 'Chef / Cook',              label: 'Cooking',      icon: '🍳' },
  { id: 'Cleaner',                  label: 'Cleaning',     icon: '🧹' },
  { id: 'Laundry',                  label: 'Laundry',      icon: '👕' },
  { id: 'Security Guard',           label: 'Security',     icon: '🛡️' },
  { id: 'Driver',                   label: 'Driving',      icon: '🚘' },
  { id: 'Photographer',             label: 'Photography',  icon: '📷' },
  { id: 'Videographer',             label: 'Videography',  icon: '🎥' },
  { id: 'Graphic Designer',         label: 'Design',       icon: '🎨' },
  { id: 'Web Developer',            label: 'Web Dev',      icon: '💻' },
  { id: 'POP / Ceiling Work',       label: 'POP/Ceiling',  icon: '🏗️' },
  { id: 'Fumigation',               label: 'Fumigation',   icon: '🪲' },
  { id: 'Solar Installation',       label: 'Solar',        icon: '☀️' },
  { id: 'CCTV / Security Systems',  label: 'CCTV',         icon: '📹' },
  { id: 'Interior Decorator',       label: 'Interior',     icon: '🛋️' },
  { id: 'Event Planner',            label: 'Events',       icon: '🎉' },
];

export default function CustomerHomeScreen({ navigation, onSwitchTab }) {
  const [user, setUser] = useState(null);

  // Trusted Professionals (isPro only) — horizontal scroll
  const [trustedArtisans, setTrustedArtisans]         = useState([]);
  const [trustedPage, setTrustedPage]                 = useState(1);
  const [hasMoreTrusted, setHasMoreTrusted]           = useState(false);
  const [loadingMoreTrusted, setLoadingMoreTrusted]   = useState(false);

  // Nearby artisans — vertical list
  const [nearbyArtisans, setNearbyArtisans] = useState([]);
  const [nearbyPage, setNearbyPage]         = useState(1);
  const [hasMoreNearby, setHasMoreNearby]   = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Your Area');
  const [activeCategory, setActiveCategory] = useState('all');
  const [pendingJobCount, setPendingJobCount]       = useState(0);
  const [showPendingBanner, setShowPendingBanner]   = useState(true);
  const [unreadNotifCount, setUnreadNotifCount]     = useState(0);

  const coordsRef = useRef(null);

  useEffect(() => {
    getUser().then(setUser);
    initLocation();
  }, []);

  useFocusEffect(useCallback(() => {
    loadAll();
    checkPendingRequests();
    getUnreadCount().then((res) => setUnreadNotifCount(res.data.count || 0)).catch(() => {});
  }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  const checkPendingRequests = async () => {
    try {
      const u = await getUser();
      if (u?.role !== 'artisan') return;
      const res = await getMyJobs();
      const jobs = res.data.data || [];
      const count = jobs.filter((j) => j.status === 'pending').length;
      setPendingJobCount(count);
      if (count > 0) setShowPendingBanner(true);
    } catch { /* silent */ }
  };

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

  const loadAll = async (isRefresh = false, categoryOverride) => {
    const cat = categoryOverride !== undefined ? categoryOverride : activeCategory;
    const categoryParam = cat !== 'all' ? { category: cat } : {};

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const coords = coordsRef.current;
    const geoParams = coords
      ? { latitude: coords.latitude, longitude: coords.longitude, maxDistance: 20 }
      : {};

    try {
      const [trustedRes, nearbyRes] = await Promise.all([
        // Trusted section: only subscribed (isPro) artisans
        searchArtisans({ isPro: true, limit: 20, page: 1, ...categoryParam }),
        searchArtisans({ ...geoParams, limit: 20, page: 1, ...categoryParam }),
      ]);
      const trustedData = trustedRes.data.data  || [];
      const nearData    = nearbyRes.data.data   || [];

      setTrustedArtisans(trustedData);
      setHasMoreTrusted(trustedData.length === 20);
      setTrustedPage(1);

      setNearbyArtisans(nearData.length > 0 ? nearData : (cat === 'all' ? DUMMY_NEARBY_ARTISANS : []));
      setHasMoreNearby(nearData.length === 20);
      setNearbyPage(1);
    } catch {
      setTrustedArtisans([]);
      setNearbyArtisans(cat === 'all' ? DUMMY_NEARBY_ARTISANS : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFilterLoading(false);
    }
  };

  const loadMoreTrusted = async () => {
    if (loadingMoreTrusted || !hasMoreTrusted) return;
    setLoadingMoreTrusted(true);
    const cat = activeCategory;
    const categoryParam = cat !== 'all' ? { category: cat } : {};
    try {
      const nextPage = trustedPage + 1;
      const res = await searchArtisans({ isPro: true, limit: 20, page: nextPage, ...categoryParam });
      const more = res.data.data || [];
      setTrustedArtisans((prev) => [...prev, ...more]);
      setHasMoreTrusted(more.length === 20);
      setTrustedPage(nextPage);
    } catch { /* silent */ }
    finally { setLoadingMoreTrusted(false); }
  };

  const loadMoreNearby = async () => {
    if (loadingMore || !hasMoreNearby) return;
    setLoadingMore(true);
    const coords = coordsRef.current;
    const geoParams = coords
      ? { latitude: coords.latitude, longitude: coords.longitude, maxDistance: 20 }
      : {};
    const categoryParam = activeCategory !== 'all' ? { category: activeCategory } : {};
    try {
      const nextPage = nearbyPage + 1;
      const res = await searchArtisans({ ...geoParams, limit: 20, page: nextPage, ...categoryParam });
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

  const handleCategorySelect = (catId) => {
    if (catId === activeCategory) return;
    setActiveCategory(catId);
    setFilterLoading(true);
    loadAll(false, catId);
  };

  const goToSearch = () => onSwitchTab?.('search');
  // ── End of original logic ─────────────────────────────────────────────────

  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const initials  = (user?.name || 'U')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ════════════════════════════════════════
          TOP BAR
      ════════════════════════════════════════ */}
      <View style={styles.topBar}>
        {/* Left: Brand */}
        <View style={styles.topBarLeft}>
          <View style={styles.brandDot} />
          <Text style={styles.appName}>FixNG</Text>
        </View>

        {/* Right: Bell + Avatar */}
        <View style={styles.topBarRight}>
          {/* Notification bell */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
            style={styles.bellBtn}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadNotifCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadNotifCount > 99 ? '99+' : String(unreadNotifCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Avatar */}
          <TouchableOpacity
            onPress={() => onSwitchTab?.('profile')}
            activeOpacity={0.8}
            style={styles.avatarBtn}
          >
            <View style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{initials}</Text>
              </View>
            </View>
            <View style={styles.onlineDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAll(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >

        {/* ════════════════════════════════════════
            HERO GREETING SECTION
        ════════════════════════════════════════ */}
        <View style={styles.heroSection}>
          {/* Greeting */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingSub}>Good day 👋</Text>
            <Text style={styles.greetingName}>Hello, {firstName}</Text>
            <Text style={styles.greetingTagline}>
              Find trusted artisans near you
            </Text>
          </View>

          {/* Location Pill */}
          <TouchableOpacity style={styles.locationPill} activeOpacity={0.7}>
            <View style={styles.locationPillIcon}>
              <Text style={{ fontSize: 12 }}>📍</Text>
            </View>
            <View style={styles.locationPillText}>
              <Text style={styles.locationMeta}>LOCATION</Text>
              <Text style={styles.locationName} numberOfLines={1}>
                {locationLabel}
              </Text>
            </View>
            <Text style={styles.locationChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════
            SEARCH BAR
        ════════════════════════════════════════ */}
        <View style={styles.searchWrapper}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={goToSearch}
            activeOpacity={0.9}
          >
            <View style={styles.searchIconWrap}>
              <Text style={{ fontSize: 15 }}>🔍</Text>
            </View>
            <Text style={styles.searchPlaceholder}>
              Find a plumber, electrician...
            </Text>
            <View style={styles.searchArrow}>
              <Text style={styles.searchArrowText}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════
            ARTISAN PENDING REQUEST BANNER
        ════════════════════════════════════════ */}
        {showPendingBanner && pendingJobCount > 0 && (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingBannerLeft}>
              <View style={styles.pendingBannerDot} />
              <View style={styles.pendingBannerBody}>
                <Text style={styles.pendingBannerTitle}>
                  {pendingJobCount === 1
                    ? 'You have a new job request!'
                    : `You have ${pendingJobCount} new job requests!`}
                </Text>
                <Text style={styles.pendingBannerSub}>
                  A customer is waiting for your response.
                </Text>
              </View>
            </View>
            <View style={styles.pendingBannerActions}>
              <TouchableOpacity
                style={styles.pendingViewBtn}
                onPress={() => navigation.navigate('JobScreen')}
              >
                <Text style={styles.pendingViewBtnText}>View Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pendingCloseBtn}
                onPress={() => setShowPendingBanner(false)}
              >
                <Text style={styles.pendingCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════
            CATEGORY QUICK FILTERS
        ════════════════════════════════════════ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => handleCategorySelect(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.categoryLabel,
                  isActive && styles.categoryLabelActive,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ════════════════════════════════════════
            SECTION A: TRUSTED PROFESSIONALS
        ════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Trusted Professionals</Text>
          </View>
          <TouchableOpacity onPress={goToSearch} style={styles.viewMoreBtn}>
            <Text style={styles.viewMoreText}>See All</Text>
            <Text style={styles.viewMoreArrow}> →</Text>
          </TouchableOpacity>
        </View>

        {loading || filterLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>
              {filterLoading ? `Filtering by ${activeCategory}…` : 'Finding professionals...'}
            </Text>
          </View>
        ) : trustedArtisans.length === 0 ? (
          <View style={styles.emptyHScroll}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyHScrollText}>
              {activeCategory === 'all'
                ? 'No Trusted artisans yet — check back soon'
                : `No Trusted ${activeCategory} artisans found`}
            </Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={trustedArtisans}
            keyExtractor={(item) => `trusted-${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScrollContent}
            onEndReached={loadMoreTrusted}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMoreTrusted
                ? <ActivityIndicator color={COLORS.primary} style={{ marginHorizontal: 16, alignSelf: 'center' }} />
                : null
            }
            renderItem={({ item }) => (
              <TrustedProfessionalsCard
                artisan={item}
                onPress={() => goToProfile(item)}
              />
            )}
          />
        )}

        {/* ════════════════════════════════════════
            SECTION B: NEARBY ARTISANS
        ════════════════════════════════════════ */}
        <View style={[styles.sectionHeader, styles.nearbySectionHeader]}>
          <View style={styles.sectionTitleGroup}>
            <View style={[styles.sectionAccentBar, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.sectionTitle}>Nearby Artisans</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={goToSearch}>
            <Text style={styles.filterIcon}>⚙</Text>
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {!loading && !filterLoading && nearbyArtisans.length === 0 ? (
          <View style={styles.emptyNearby}>
            <View style={styles.emptyNearbyIconWrap}>
              <Text style={styles.emptyNearbyIcon}>🔧</Text>
            </View>
            <Text style={styles.emptyNearbyTitle}>No Artisans Found</Text>
            <Text style={styles.emptyNearbyText}>
              {activeCategory === 'all'
                ? `We couldn't find artisans near you.\nTry expanding your search area.`
                : `No ${activeCategory} artisans found nearby.\nTry a different category.`}
            </Text>
            <TouchableOpacity style={styles.emptyNearbyBtn} onPress={goToSearch}>
              <Text style={styles.emptyNearbyBtnText}>Search Artisans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nearbyList}>
            {nearbyArtisans.map((artisan) => (
              <ArtisanCard
                key={artisan.id}
                artisan={artisan}
                onPress={() => goToProfile(artisan)}
              />
            ))}
          </View>
        )}

        {/* Load More */}
        {hasMoreNearby && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={loadMoreNearby}
            disabled={loadingMore}
            activeOpacity={0.8}
          >
            {loadingMore ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <View style={styles.loadMoreInner}>
                <Text style={styles.loadMoreText}>Load More Artisans</Text>
                <Text style={styles.loadMoreArrow}> ↓</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRUSTED PROFESSIONALS CARD  (horizontal scroll)
// ══════════════════════════════════════════════════════════════════════════════
function TrustedProfessionalsCard({ artisan, onPress }) {
  const badge  = BADGE_CONFIG[artisan.badgeLevel] || BADGE_CONFIG.new;
  const rating = artisan.stats?.averageRating;
  const jobs   = artisan.stats?.completedJobs || 0;

  return (
    <TouchableOpacity
      style={proCard.container}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Gradient-style header strip */}
      <View style={[proCard.headerStrip, artisan.isPro && proCard.headerStripPro]}>
        {/* Trusted badge (top-left) */}
        {artisan.isPro && (
          <View style={proCard.proLabel}>
            <Text style={proCard.proLabelText}>✓ TRUSTED</Text>
          </View>
        )}
        {/* Badge pill top-right */}
        <View style={[proCard.badgePill, { backgroundColor: badge.bg }]}>
          <Text style={[proCard.badgeLabel, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Avatar — overlapping the strip */}
      <View style={proCard.avatarBlock}>
        <View style={proCard.avatarRing}>
          {artisan.profilePhoto ? (
            <Image source={{ uri: artisan.profilePhoto }} style={proCard.avatar} />
          ) : (
            <View style={proCard.avatarFallback}>
              <Text style={proCard.avatarInitial}>
                {(artisan.name || 'A')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        {artisan.badgeLevel !== 'new' && (
          <View style={[
            proCard.verifiedDot,
            {
              backgroundColor:
                artisan.badgeLevel === 'trusted' ? COLORS.amber : COLORS.green,
            },
          ]}>
            <Text style={proCard.verifiedDotText}>
              {artisan.badgeLevel === 'trusted' ? '★' : '✓'}
            </Text>
          </View>
        )}
      </View>

      {/* Skills (primary) & name (secondary) */}
      <Text style={proCard.skills} numberOfLines={1}>
        {(artisan.skills || []).join(' · ')}
      </Text>
      <Text style={proCard.name} numberOfLines={1}>{artisan.name}</Text>

      {/* Stats row */}
      <View style={proCard.statsRow}>
        {rating > 0 && (
          <View style={proCard.statChip}>
            <Text style={proCard.statChipText}>⭐ {rating.toFixed(1)}</Text>
          </View>
        )}
        <View style={proCard.statChip}>
          <Text style={proCard.statChipText}>{jobs} jobs</Text>
        </View>
        {artisan.distanceKm != null && (
          <View style={proCard.statChip}>
            <Text style={[proCard.statChipText, { color: COLORS.primary }]}>
              📍 {artisan.distanceKm}km
            </Text>
          </View>
        )}
      </View>

      {/* Book Now CTA */}
      <TouchableOpacity style={proCard.bookBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={proCard.bookBtnText}>Book Now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NEARBY ARTISAN CARD  (vertical list)
// ══════════════════════════════════════════════════════════════════════════════
function ArtisanCard({ artisan, onPress }) {
  const badge  = BADGE_CONFIG[artisan.badgeLevel] || BADGE_CONFIG.new;
  const rating = artisan.stats?.averageRating;
  const jobs   = artisan.stats?.completedJobs || 0;

  return (

    <ScrollView
    showsHorizontalScrollIndicator={true}
    >
    <TouchableOpacity
      style={nearbyCard.container}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Left: Avatar */}
      <View style={nearbyCard.avatarWrap}>
        {artisan.profilePhoto ? (
          <Image source={{ uri: artisan.profilePhoto }} style={nearbyCard.avatar} />
        ) : (
          <View style={nearbyCard.avatarFallback}>
            <Text style={nearbyCard.avatarInitial}>
              {(artisan.name || 'A')[0].toUpperCase()}
            </Text>
          </View>
        )}
        {artisan.badgeLevel !== 'new' && (
          <View style={[
            nearbyCard.verifiedDot,
            {
              backgroundColor:
                artisan.badgeLevel === 'trusted' ? COLORS.amber : COLORS.green,
            },
          ]}>
            <Text style={nearbyCard.verifiedDotText}>
              {artisan.badgeLevel === 'trusted' ? '★' : '✓'}
            </Text>
          </View>
        )}
      </View>

      {/* Middle: Info */}
      <View style={nearbyCard.info}>
        {/* Skills (primary) */}
        <Text style={nearbyCard.skills} numberOfLines={1}>
          {(artisan.skills || []).join(' · ')}
        </Text>

        {/* Name + Badges (secondary) */}
        <View style={nearbyCard.nameRow}>
          <Text style={nearbyCard.name} numberOfLines={1}>{artisan.name}</Text>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {artisan.isPro && (
              <View style={nearbyCard.proBadge}>
                <Text style={nearbyCard.proBadgeText}>✓ Trusted</Text>
              </View>
            )}
            <View style={[nearbyCard.badgePill, { backgroundColor: badge.bg }]}>
              <Text style={[nearbyCard.badgeLabel, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={nearbyCard.statsRow}>
          {rating > 0 && (
            <Text style={nearbyCard.rating}>⭐ {rating.toFixed(1)}</Text>
          )}
          <Text style={nearbyCard.dividerDot}>·</Text>
          <Text style={nearbyCard.jobs}>{jobs} jobs</Text>
          {artisan.distanceKm != null && (
            <>
              <Text style={nearbyCard.dividerDot}>·</Text>
              <Text style={nearbyCard.dist}>📍 {artisan.distanceKm}km</Text>
            </>
          )}
        </View>
      </View>

      {/* Right: Book button */}
      <TouchableOpacity
        style={nearbyCard.bookBtn}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={nearbyCard.bookBtnText}>Book</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({

  // ── Screen ──────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingBottom: 16,
  },

  // ── Top Bar ─────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 22 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#EF4444', borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: COLORS.surface,
  },
  bellBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.8,
  },
  avatarBtn: {
    position: 'relative',
  },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: COLORS.primaryMid,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },

  // ── Hero Section ─────────────────────────────────────────────────────────────
  heroSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  greetingBlock: {
    marginBottom: 16,
  },
  greetingSub: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  greetingName: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  greetingTagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  locationPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryMid,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPillText: {
    flex: 1,
  },
  locationMeta: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  locationChevron: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: -2,
  },

  // ── Search Bar ───────────────────────────────────────────────────────────────
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 12,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  searchArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  searchArrowText: {
    fontSize: 20,
    color: COLORS.surface,
    fontWeight: '700',
    marginTop: -2,
  },

  // ── Artisan Pending Request Banner ───────────────────────────────────────────
  pendingBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.greenLight,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.green,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  pendingBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  pendingBannerDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.green, flexShrink: 0,
  },
  pendingBannerBody: { flex: 1 },
  pendingBannerTitle: { fontSize: 14, fontWeight: '800', color: '#14532D', marginBottom: 2 },
  pendingBannerSub: { fontSize: 12, color: '#166534', lineHeight: 17 },
  pendingBannerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  pendingViewBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pendingViewBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.surface },
  pendingCloseBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#86EFAC',
  },
  pendingCloseBtnText: { fontSize: 12, fontWeight: '800', color: '#15803D' },

  // ── Category Chips ───────────────────────────────────────────────────────────
  categoryScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryLabelActive: {
    color: COLORS.surface,
  },

  // ── Section Headers ──────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  nearbySectionHeader: {
    marginTop: 28,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAccentBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  viewMoreArrow: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  filterIcon: {
    fontSize: 12,
    color: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ── Loading State ────────────────────────────────────────────────────────────
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // ── Horizontal Scroll ────────────────────────────────────────────────────────
  hScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 14,
  },

  // ── Empty States ─────────────────────────────────────────────────────────────
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyHScroll: {
    marginHorizontal: 20,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
    borderStyle: 'dashed',
  },
  emptyHScrollText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyNearby: {
    marginHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  emptyNearbyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyNearbyIcon: {
    fontSize: 32,
  },
  emptyNearbyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyNearbyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  emptyNearbyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  emptyNearbyBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Nearby List ──────────────────────────────────────────────────────────────
  nearbyList: {
    paddingHorizontal: 20,
    gap: 12,
  },

  // ── Load More ────────────────────────────────────────────────────────────────
  loadMoreBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
    minHeight: 52,
  },
  loadMoreInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadMoreArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

// ── Trusted Professionals Card Styles ─────────────────────────────────────────
const proCard = StyleSheet.create({
  container: {
    width: 220,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
      },
      android: { elevation: 5 },
    }),
  },
  headerStrip: {
    height: 72,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  headerStripPro: {
    backgroundColor: '#B45309', // warm gold for Pro artisans
  },
  proLabel: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  proLabelText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.4 },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  avatarBlock: {
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 10,
    position: 'relative',
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  avatarFallback: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: '50%',
    marginRight: -38,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  verifiedDotText: {
    fontSize: 9,
    color: COLORS.surface,
    fontWeight: '900',
  },
  skills: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  statChip: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bookBtn: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  bookBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.surface,
    letterSpacing: 0.2,
  },
});

// ── Nearby Artisan Card Styles ─────────────────────────────────────────────────
const nearbyCard = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },

  // Avatar
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  verifiedDotText: {
    fontSize: 9,
    color: COLORS.surface,
    fontWeight: '900',
  },

  // Info
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skills: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    // color: COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  proBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#F59E0B', flexShrink: 0,
  },
  proBadgeText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  rating: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '700',
  },
  dividerDot: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  jobs: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dist: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Book button
  bookBtn: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
    flexShrink: 0,
  },
  bookBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
