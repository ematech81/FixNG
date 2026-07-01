


import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { searchArtisans } from '../../api/discoveryApi';
import { getMyJobs } from '../../api/jobApi';
import { getUnreadCount, getBanners, dismissBanner } from '../../api/notificationApi';
import { getUser } from '../../utils/storage';
import { DUMMY_NEARBY_ARTISANS } from '../../constants/dummyProfiles';
import DispatchSafetyModal from '../../components/DispatchSafetyModal';
import HomeBannerList from '../../components/HomeBanner';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BADGE_CONFIG = {
  new:      { color: '#6B7280', label: 'New',      bg: '#F3F4F6' },
  verified: { color: '#16A34A', label: 'Verified', bg: '#F0FDF4' },
  trusted:  { color: '#D97706', label: 'Trusted',  bg: '#FFFBEB' },
};

const CATEGORIES = [
  { id: 'all',                      label: 'All',          icon: '⚡' },
  { id: 'Dispatch Rider',           label: 'Dispatch',     icon: '🏍️' },
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
  const { colors } = useTheme();
  const [user, setUser] = useState(null);

  const [trustedArtisans, setTrustedArtisans]       = useState([]);
  const [trustedPage, setTrustedPage]               = useState(1);
  const [hasMoreTrusted, setHasMoreTrusted]         = useState(false);
  const [loadingMoreTrusted, setLoadingMoreTrusted] = useState(false);

  const [nearbyArtisans, setNearbyArtisans] = useState([]);
  const [nearbyPage, setNearbyPage]         = useState(1);
  const [hasMoreNearby, setHasMoreNearby]   = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);

  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [filterLoading, setFilterLoading]       = useState(false);
  const [safetyModalArtisanId, setSafetyModalArtisanId] = useState(null);
  const [locationLabel, setLocationLabel]       = useState('Your Area');
  const [activeCategory, setActiveCategory]     = useState('all');
  const [pendingJobCount, setPendingJobCount]   = useState(0);
  const [showPendingBanner, setShowPendingBanner] = useState(true);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [banners, setBanners] = useState([]);

  const coordsRef = useRef(null);

  useEffect(() => {
    getUser().then(setUser);
    initLocation();
  }, []);

  useFocusEffect(useCallback(() => {
    loadAll();
    checkPendingRequests();
    getUnreadCount()
      .then((res) => setUnreadNotifCount(res.data.count || 0))
      .catch(() => {});
    getBanners()
      .then((res) => setBanners(res.data.data || []))
      .catch(() => {});
  }, [])); // eslint-disable-line

  const handleDismissBanner = async (id) => {
    setBanners((prev) => prev.filter((b) => b._id !== id));
    try { await dismissBanner(id); } catch { /* silent */ }
  };

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
        searchArtisans({ isPro: true, limit: 20, page: 1, ...categoryParam }),
        searchArtisans({ ...geoParams, limit: 20, page: 1, ...categoryParam }),
      ]);
      const trustedData = trustedRes.data.data || [];
      const nearData    = nearbyRes.data.data  || [];
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
    const categoryParam = activeCategory !== 'all' ? { category: activeCategory } : {};
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
    if (artisan.skills?.includes('Dispatch Rider')) {
      setSafetyModalArtisanId({ id: artisan.id, isDummy: artisan._isDummy, artisan });
      return;
    }
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

  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const initials  = (user?.name || 'U')[0].toUpperCase();
  const styles    = makeStyles(colors);

  // ── Greeting helper ────────────────────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning ☀️';
    if (h < 17) return 'Good afternoon 👋';
    return 'Good evening 🌙';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>F</Text>
          </View>
          <Text style={styles.appName}>FixNG</Text>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
            style={styles.iconBtn}
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

      {/* Sticky banners — always visible above scroll content */}
      <HomeBannerList banners={banners} onDismiss={handleDismissBanner} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAll(true)}
            tintColor={colors.info}
            colors={[colors.info]}
          />
        }
      >
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          {/* Decorative circles */}
          <View style={styles.heroBubble1} />
          <View style={styles.heroBubble2} />

          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <Text style={styles.greetingSub}>{getGreeting()}</Text>
              <Text style={styles.greetingName}>Hello, {firstName} 👋</Text>
              <Text style={styles.greetingTagline}>
                Find skilled artisans near you
              </Text>

              {/* Location pill */}
              <TouchableOpacity style={styles.locationPill} activeOpacity={0.7}>
                <Text style={styles.locationPillIcon}>📍</Text>
                <Text style={styles.locationName} numberOfLines={1}>
                  {locationLabel}
                </Text>
                <Text style={styles.locationChevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Stats badge cluster */}
            <View style={styles.heroStatsCluster}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatNumber}>500+</Text>
                <Text style={styles.heroStatLabel}>Artisans</Text>
              </View>
              <View style={[styles.heroStatCard, styles.heroStatCardAlt]}>
                <Text style={[styles.heroStatNumber, { color: colors.info }]}>4.8★</Text>
                <Text style={styles.heroStatLabel}>Rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── SEARCH BAR ────────────────────────────────────────────────── */}
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
              Search plumber, electrician...
            </Text>
            <View style={styles.searchArrow}>
              <Text style={styles.searchArrowText}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── PENDING BANNER ────────────────────────────────────────────── */}
        {showPendingBanner && pendingJobCount > 0 && (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingBannerLeft}>
              <View style={styles.pendingPulse} />
              <View style={styles.pendingBannerBody}>
                <Text style={styles.pendingBannerTitle}>
                  {pendingJobCount === 1
                    ? '🎉 New job request!'
                    : `🎉 ${pendingJobCount} new job requests!`}
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
                <Text style={styles.pendingViewBtnText}>View</Text>
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

        {/* ── CATEGORY CHIPS ────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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

        {/* ── TRUSTED PROFESSIONALS ─────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Trusted Professionals</Text>
          </View>
          <TouchableOpacity onPress={goToSearch} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        {loading || filterLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.info} size="large" />
            <Text style={styles.loadingText}>
              {filterLoading ? `Filtering…` : 'Finding professionals...'}
            </Text>
          </View>
        ) : trustedArtisans.length === 0 ? (
          <View style={styles.emptyHScroll}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyHScrollText}>No trusted artisans yet</Text>
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
                ? <ActivityIndicator color={colors.info} style={{ marginHorizontal: 12, alignSelf: 'center' }} />
                : null
            }
            renderItem={({ item }) => (
              <TrustedCard
                artisan={item}
                onPress={() => goToProfile(item)}
                colors={colors}
              />
            )}
          />
        )}

        {/* ── NEARBY ARTISANS ───────────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <View style={styles.sectionTitleGroup}>
            <View style={[styles.sectionAccentBar, { backgroundColor: '#0EA5E9' }]} />
            <Text style={styles.sectionTitle}>Nearby Artisans</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={goToSearch}>
            <Text style={styles.filterBtnText}>⚙ Filter</Text>
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
                colors={colors}
              />
            ))}
          </View>
        )}

        {hasMoreNearby && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={loadMoreNearby}
            disabled={loadingMore}
            activeOpacity={0.8}
          >
            {loadingMore ? (
              <ActivityIndicator color={colors.info} size="small" />
            ) : (
              <Text style={styles.loadMoreText}>Load More Artisans ↓</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <DispatchSafetyModal
        visible={safetyModalArtisanId !== null}
        onConfirm={() => {
          const target = safetyModalArtisanId;
          setSafetyModalArtisanId(null);
          if (target.isDummy) {
            navigation.navigate('ArtisanProfile', { artisanId: target.id, _dummyProfile: target.artisan });
          } else {
            navigation.navigate('ArtisanProfile', { artisanId: target.id });
          }
        }}
        onGoBack={() => setSafetyModalArtisanId(null)}
      />
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRUSTED CARD — compact horizontal card
// ══════════════════════════════════════════════════════════════════════════════
function TrustedCard({ artisan, onPress, colors }) {
  const badge  = BADGE_CONFIG[artisan.badgeLevel] || BADGE_CONFIG.new;
  const rating = artisan.stats?.averageRating;
  const jobs   = artisan.stats?.completedJobs || 0;
  const s      = trustedCardStyles(colors);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.92}>
      {/* Top row: avatar + name/skill + badge */}
      <View style={s.topRow}>
        {/* Avatar */}
        <View style={s.avatarWrap}>
          {artisan.profilePhoto ? (
            <Image source={{ uri: artisan.profilePhoto }} style={s.avatar} />
          ) : (
            <View style={s.avatarFallback}>
              <Text style={s.avatarInitial}>{(artisan.name || 'A')[0].toUpperCase()}</Text>
            </View>
          )}
          {artisan.isPro && (
            <View style={s.proSticker}>
              <Text style={s.proStickerText}>✓</Text>
            </View>
          )}
        </View>

        {/* Name + skill */}
        <View style={s.nameBlock}>
          <Text style={s.skillText} numberOfLines={1}>
            {(artisan.skills || []).slice(0, 2).join(' · ')}
          </Text>
          <Text style={s.nameText} numberOfLines={1}>{artisan.name}</Text>
        </View>

        {/* Badge pill */}
        <View style={[s.badgePill, { backgroundColor: badge.bg }]}>
          <Text style={[s.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Bottom row: stats + CTA */}
      <View style={s.bottomRow}>
        <View style={s.statsGroup}>
          {rating > 0 && (
            <View style={s.stat}>
              <Text style={s.statIcon}>⭐</Text>
              <Text style={s.statVal}>{rating.toFixed(1)}</Text>
            </View>
          )}
          <View style={s.stat}>
            <Text style={s.statIcon}>💼</Text>
            <Text style={s.statVal}>{jobs}</Text>
          </View>
          {artisan.distanceKm != null && (
            <View style={s.stat}>
              <Text style={s.statIcon}>📍</Text>
              <Text style={[s.statVal, { color: colors.info }]}>{artisan.distanceKm}km</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={s.bookBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={s.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NEARBY ARTISAN CARD
// ══════════════════════════════════════════════════════════════════════════════
function ArtisanCard({ artisan, onPress, colors }) {
  const badge     = BADGE_CONFIG[artisan.badgeLevel] || BADGE_CONFIG.new;
  const rating    = artisan.stats?.averageRating;
  const jobs      = artisan.stats?.completedJobs || 0;
  const placeName = artisan.address || artisan.state || null;
  const distText  = artisan.distanceKm != null ? `${artisan.distanceKm}km` : null;
  const s         = nearbyCardStyles(colors);

  return (
    <TouchableOpacity style={s.container} onPress={onPress} activeOpacity={0.92}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        {artisan.profilePhoto ? (
          <Image source={{ uri: artisan.profilePhoto }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitial}>{(artisan.name || 'A')[0].toUpperCase()}</Text>
          </View>
        )}
        {artisan.badgeLevel !== 'new' && (
          <View style={[
            s.verifiedDot,
            { backgroundColor: artisan.badgeLevel === 'trusted' ? '#D97706' : '#16A34A' },
          ]}>
            <Text style={s.verifiedDotText}>
              {artisan.badgeLevel === 'trusted' ? '★' : '✓'}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.skills} numberOfLines={1}>
          {(artisan.skills || []).join(' · ')}
        </Text>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>{artisan.name}</Text>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {artisan.isPro && (
              <View style={s.proBadge}>
                <Text style={s.proBadgeText}>✓ Pro</Text>
              </View>
            )}
            <View style={[s.badgePill, { backgroundColor: badge.bg }]}>
              <Text style={[s.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
        </View>

        <View style={s.statsRow}>
          {rating > 0 && <Text style={s.rating}>⭐ {rating.toFixed(1)}</Text>}
          {rating > 0 && <Text style={s.dot}>·</Text>}
          <Text style={s.jobs}>{jobs} jobs</Text>
          {distText && <Text style={s.dot}>·</Text>}
          {distText && <Text style={s.dist}>📍 {distText}{placeName ? `, ${placeName}` : ''}</Text>}
        </View>
      </View>

      {/* Book */}
      <TouchableOpacity style={s.bookBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={s.bookBtnText}>Book</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN STYLES
// ══════════════════════════════════════════════════════════════════════════════
const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgAlt,
  },
  scroll: {
    paddingBottom: 16,
  },

  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...Platform.select({
      ios:     { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  brandMark: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: colors.info,
    justifyContent: 'center', alignItems: 'center',
  },
  brandMarkText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  appName: { fontSize: 20, fontWeight: '900', color: colors.info, letterSpacing: -0.5 },

  iconBtn: { position: 'relative', padding: 6 },
  bellIcon: { fontSize: 20 },
  bellBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: colors.error, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.card,
  },
  bellBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },

  avatarBtn: { position: 'relative' },
  avatarRing: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: '#BFDBFE',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.infoBg,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 14, fontWeight: '800', color: colors.info },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.success, borderWidth: 2, borderColor: colors.card,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  heroSection: {
    backgroundColor: colors.info,
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    marginBottom: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBubble1: {
    position: 'absolute', width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)',
    top: -40, right: -30,
  },
  heroBubble2: {
    position: 'absolute', width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20, right: 80,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroLeft: { flex: 1 },
  greetingSub: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4, letterSpacing: 0.3,
  },
  greetingName: {
    fontSize: 24, fontWeight: '900',
    color: '#fff', letterSpacing: -0.5, marginBottom: 4,
  },
  greetingTagline: {
    fontSize: 13, color: 'rgba(255,255,255,0.80)',
    fontWeight: '400', marginBottom: 16,
  },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24, paddingVertical: 7, paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  locationPillIcon: { fontSize: 13 },
  locationName: { fontSize: 13, fontWeight: '700', color: '#fff', maxWidth: 160 },
  locationChevron: { fontSize: 18, color: 'rgba(255,255,255,0.7)', marginTop: -1 },

  heroStatsCluster: { gap: 8, alignItems: 'flex-end', paddingTop: 4 },
  heroStatCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', minWidth: 72,
  },
  heroStatCardAlt: { backgroundColor: 'rgba(255,255,255,0.22)' },
  heroStatNumber: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 1 },
  heroStatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },

  // ── Search ────────────────────────────────────────────────────────────────
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    ...Platform.select({
      ios:     { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgAlt,
    borderRadius: 16, paddingHorizontal: 6, paddingVertical: 6,
    gap: 10, borderWidth: 1.5, borderColor: colors.borderLight,
  },
  searchIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.infoBg,
    justifyContent: 'center', alignItems: 'center',
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  searchArrow: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: colors.info,
    justifyContent: 'center', alignItems: 'center', marginRight: 2,
  },
  searchArrowText: { fontSize: 20, color: '#fff', fontWeight: '700', marginTop: -2 },

  // ── Pending Banner ────────────────────────────────────────────────────────
  pendingBanner: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: colors.successBg,
    borderRadius: 16, padding: 12,
    borderWidth: 1.5, borderColor: '#86EFAC',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10,
  },
  pendingBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  pendingPulse: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.success, flexShrink: 0,
  },
  pendingBannerBody: { flex: 1 },
  pendingBannerTitle: { fontSize: 13, fontWeight: '800', color: '#14532D', marginBottom: 1 },
  pendingBannerSub:   { fontSize: 12, color: '#166534', lineHeight: 16 },
  pendingBannerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  pendingViewBtn: {
    backgroundColor: colors.success, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  pendingViewBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  pendingCloseBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.successBg,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#86EFAC',
  },
  pendingCloseBtnText: { fontSize: 11, fontWeight: '800', color: colors.success },

  // ── Category Chips ────────────────────────────────────────────────────────
  categoryScroll: {
    paddingHorizontal: 20, paddingBottom: 20, gap: 8,
  },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: colors.card,
    borderWidth: 1.5, borderColor: colors.borderLight,
    marginRight: 6,
  },
  categoryChipActive: { backgroundColor: colors.info, borderColor: colors.info },
  categoryIcon: { fontSize: 13 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: colors.textSub },
  categoryLabelActive: { color: '#fff' },

  // ── Section Headers ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccentBar: {
    width: 4, height: 20, borderRadius: 2, backgroundColor: colors.info,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.3,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { fontSize: 13, fontWeight: '700', color: colors.info },

  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, backgroundColor: colors.infoBg,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  filterBtnText: { fontSize: 12, fontWeight: '700', color: colors.info },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingBox: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  // ── Horizontal scroll ─────────────────────────────────────────────────────
  hScrollContent: {
    paddingHorizontal: 20, paddingBottom: 6, gap: 12,
  },

  // ── Empty states ──────────────────────────────────────────────────────────
  emptyIcon: { fontSize: 28, marginBottom: 6 },
  emptyHScroll: {
    marginHorizontal: 20, backgroundColor: colors.infoBg,
    borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed',
  },
  emptyHScrollText: {
    fontSize: 13, color: colors.info, fontWeight: '600',
    textAlign: 'center', lineHeight: 18,
  },
  emptyNearby: {
    marginHorizontal: 20, marginBottom: 16, alignItems: 'center',
    paddingVertical: 36, backgroundColor: colors.card,
    borderRadius: 24, borderWidth: 1, borderColor: colors.borderLight,
  },
  emptyNearbyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.infoBg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  emptyNearbyIcon: { fontSize: 30 },
  emptyNearbyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyNearbyText: {
    fontSize: 13, color: colors.textSub, textAlign: 'center',
    lineHeight: 20, marginBottom: 18, paddingHorizontal: 24,
  },
  emptyNearbyBtn: {
    backgroundColor: colors.info, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
  },
  emptyNearbyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Nearby List ───────────────────────────────────────────────────────────
  nearbyList: { paddingHorizontal: 20, gap: 10 },

  // ── Load More ─────────────────────────────────────────────────────────────
  loadMoreBtn: {
    marginHorizontal: 20, marginTop: 14,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#BFDBFE', minHeight: 50,
  },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: colors.info },
});

// ══════════════════════════════════════════════════════════════════════════════
// TRUSTED CARD STYLES  — compact, wide horizontal pill
// ══════════════════════════════════════════════════════════════════════════════
const trustedCardStyles = (colors) => StyleSheet.create({
  card: {
    width: 240,
    backgroundColor: colors.card,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 14,
    ...Platform.select({
      ios:     { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },

  // Top row
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 48, height: 48, borderRadius: 14 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.infoBg,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '900', color: colors.info },
  proSticker: {
    position: 'absolute', bottom: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#D97706',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.card,
  },
  proStickerText: { fontSize: 8, fontWeight: '900', color: '#fff' },

  nameBlock: { flex: 1 },
  skillText: { fontSize: 13, fontWeight: '800', color: colors.info, marginBottom: 2, letterSpacing: -0.1 },
  nameText:  { fontSize: 12, fontWeight: '500', color: colors.textSub },

  badgePill: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, flexShrink: 0,
  },
  badgeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  // Divider
  divider: { height: 1, backgroundColor: colors.borderLight, marginBottom: 12 },

  // Bottom row
  bottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  statsGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statIcon: { fontSize: 11 },
  statVal:  { fontSize: 12, fontWeight: '700', color: colors.textSub },

  bookBtn: {
    backgroundColor: colors.info, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  bookBtnText: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
});

// ══════════════════════════════════════════════════════════════════════════════
// NEARBY CARD STYLES
// ══════════════════════════════════════════════════════════════════════════════
const nearbyCardStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18, padding: 12, gap: 12,
    borderWidth: 1.5, borderColor: colors.borderLight,
    ...Platform.select({
      ios:     { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: { width: 54, height: 54, borderRadius: 14 },
  avatarFallback: {
    width: 54, height: 54, borderRadius: 14,
    backgroundColor: colors.infoBg,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '900', color: colors.info },
  verifiedDot: {
    position: 'absolute', bottom: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.card,
  },
  verifiedDotText: { fontSize: 8, color: '#fff', fontWeight: '900' },

  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skills: { fontSize: 14, fontWeight: '800', color: colors.info, letterSpacing: -0.2, lineHeight: 19 },
  name:   { fontSize: 12, fontWeight: '500', color: colors.textSub, flex: 1 },
  badgePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  badgeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  proBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#D97706', flexShrink: 0,
  },
  proBadgeText: { fontSize: 10, fontWeight: '800', color: '#B45309' },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 2 },
  rating: { fontSize: 12, color: '#F59E0B', fontWeight: '700' },
  dot:    { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  jobs:   { fontSize: 12, color: colors.textSub, fontWeight: '500' },
  dist:   { fontSize: 11, color: colors.info, fontWeight: '600' },

  bookBtn: {
    backgroundColor: colors.infoBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1.5, borderColor: '#BFDBFE', flexShrink: 0,
  },
  bookBtnText: { fontSize: 13, fontWeight: '800', color: colors.info },
});