import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const BANNER_CONFIG = {
  profile_verified: { icon: '✅', accent: '#16A34A', label: 'Verified' },
  badge_upgraded:   { icon: '⭐', accent: '#D97706', label: 'Pro Status' },
  new_job:          { icon: '📋', accent: '#2563EB', label: 'New Job' },
  job_broadcast:    { icon: '📢', accent: '#7C3AED', label: 'Job Alert' },
  announcement:     { icon: '📣', accent: '#FF6B00', label: 'Announcement' },
};

function HomeBanner({ banner, onDismiss }) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      Animated.timing(opacity,    { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const config = BANNER_CONFIG[banner.type] || BANNER_CONFIG.announcement;

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss(banner._id));
  };

  const styles = makeStyles(colors, config.accent);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }], opacity }]}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{config.icon}</Text>
      </View>
      <View style={styles.textBox}>
        <Text style={styles.title} numberOfLines={1}>{banner.title}</Text>
        <Text style={styles.body}  numberOfLines={2}>{banner.body}</Text>
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.closeIcon}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeBannerList({ banners, onDismiss }) {
  if (!banners || banners.length === 0) return null;
  return (
    <View>
      {banners.map((b) => (
        <HomeBanner key={b._id} banner={b} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const makeStyles = (colors, accent) =>
  StyleSheet.create({
    banner: {
      flexDirection:  'row',
      alignItems:     'center',
      backgroundColor: colors.surface,
      borderLeftWidth: 4,
      borderLeftColor: accent,
      borderRadius:    10,
      marginHorizontal: 16,
      marginTop:       8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: accent + '22',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    icon: { fontSize: 18 },
    textBox: { flex: 1, marginRight: 8 },
    title: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    body: {
      fontSize: 12,
      color: colors.subtext,
      lineHeight: 16,
    },
    closeBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeIcon: {
      fontSize: 11,
      color: colors.subtext,
      fontWeight: '700',
    },
  });
