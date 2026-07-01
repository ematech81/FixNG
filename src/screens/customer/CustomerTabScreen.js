import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CustomerHomeScreen   from './CustomerHomeScreen';
import SearchArtisansScreen from './SearchArtisansScreen';
import MessagesScreen       from './MessagesScreen';
import ProfileScreen        from './ProfileScreen';
import { getUser }              from '../../utils/storage';
import { connectSocket, getSocket } from '../../hooks/useSocket';
import usePushNotifications     from '../../hooks/usePushNotifications';
import { getUnreadMsgCount }    from '../../api/notificationApi';
import { useTheme }             from '../../context/ThemeContext';

const TOAST_ICON = {
  new_job:            '⚡',
  job_broadcast:      '📢',
  job_accepted:       '✅',
  job_declined:       '❌',
  artisan_arrived:    '📍',
  job_completed:      '🏆',
  job_cancelled:      '🚫',
  dispute_raised:     '⚠️',
  dispute_resolved:   '🛡️',
  new_message:        '💬',
  profile_verified:   '🎉',
  profile_rejected:   '❌',
  account_warning:    '⚠️',
  account_suspended:  '🔒',
  account_unsuspended:'🔓',
};

const TABS = [
  { key: 'home',     label: 'Jobs',     icon: '🏠' },
  { key: 'search',   label: 'Search',   icon: '🔍' },
  { key: 'messages', label: 'Messages', icon: '💬' },
  { key: 'profile',  label: 'Profile',  icon: '👤' },
];

export default function CustomerTabScreen({
  navigation, onLogout, onRefreshAuth, initialTab, onInitialTabConsumed,
}) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab]         = useState(initialTab || 'home');
  const [userId, setUserId]               = useState(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const activeTabRef                      = useRef(initialTab || 'home');

  const [toast, setToast]         = useState(null);
  const toastY                    = useRef(new Animated.Value(-100)).current;
  const toastTimer                = useRef(null);
  const insets                    = useSafeAreaInsets();

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    getUser().then((u) => {
      if (!u?._id && !u?.id) return;
      const uid = u._id || u.id;
      setUserId(uid);

      connectSocket(uid).then((socket) => {
        socket.on('notification', handleIncomingNotification);
      });

      getUnreadMsgCount()
        .then((res) => { if (res?.data?.count > 0) setUnreadMsgCount(res.data.count); })
        .catch(() => {});
    });

    return () => {
      getSocket()?.off('notification', handleIncomingNotification);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePushTap = useCallback((data) => {
    const { type, jobId } = data || {};
    if (type === 'new_message' && jobId) {
      navigation.navigate('Chat', { jobId });
    } else if (jobId) {
      navigation.navigate('JobDetail', { jobId });
    } else {
      navigation.navigate('Notifications');
    }
  }, [navigation]);

  usePushNotifications(userId, handlePushTap);

  useEffect(() => {
    if (initialTab) onInitialTabConsumed?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIncomingNotification = useCallback((notif) => {
    showToast(notif);
    if (notif.type === 'new_message' && activeTabRef.current !== 'messages') {
      setUnreadMsgCount((c) => c + 1);
    }
  }, []);

  const showToast = (notif) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(notif);
    Animated.spring(toastY, {
      toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4,
    }).start();
    toastTimer.current = setTimeout(() => dismissToast(), 4500);
  };

  const dismissToast = () => {
    Animated.timing(toastY, {
      toValue: -100, duration: 260,
      easing: Easing.in(Easing.ease), useNativeDriver: true,
    }).start(() => setToast(null));
  };

  const handleToastPress = () => {
    if (!toast) return;
    dismissToast();
    if (toast.type === 'new_message') {
      setActiveTab('messages');
      setUnreadMsgCount(0);
    } else if (toast.data?.jobId) {
      navigation.navigate('JobDetail', { jobId: toast.data.jobId });
    } else {
      setActiveTab('profile');
    }
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <CustomerHomeScreen navigation={navigation} onSwitchTab={setActiveTab} />;
      case 'search':
        return <SearchArtisansScreen navigation={navigation} embedded />;
      case 'messages':
        return <MessagesScreen navigation={navigation} />;
      case 'profile':
        return (
          <ProfileScreen
            navigation={navigation}
            onLogout={onLogout}
            onRefreshAuth={onRefreshAuth}
            onSwitchTab={setActiveTab}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgAlt }}>
      <View style={{ flex: 1 }}>{renderScreen()}</View>

      {/* In-app notification toast */}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            { top: insets.top + 8, transform: [{ translateY: toastY }] },
          ]}
        >
          <TouchableOpacity
            style={styles.toastInner}
            onPress={handleToastPress}
            activeOpacity={0.9}
          >
            <Text style={styles.toastIcon}>{TOAST_ICON[toast.type] || '🔔'}</Text>
            <View style={styles.toastText}>
              <Text style={styles.toastTitle} numberOfLines={1}>{toast.title}</Text>
              <Text style={styles.toastBody}  numberOfLines={2}>{toast.body}</Text>
            </View>
            <TouchableOpacity onPress={dismissToast} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Text style={styles.toastClose}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Tab bar */}
      <View style={[
        styles.tabBar,
        { backgroundColor: colors.tabBar, borderTopColor: colors.tabBorder, paddingBottom: insets.bottom || 10 },
      ]}>
        {TABS.map((tab) => {
          const isActive   = activeTab === tab.key;
          const showBadge  = tab.key === 'messages' && unreadMsgCount > 0;
          const badgeLabel = unreadMsgCount > 99 ? '99+' : String(unreadMsgCount);

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => {
                setActiveTab(tab.key);
                if (tab.key === 'messages') setUnreadMsgCount(0);
              }}
              activeOpacity={0.75}
            >
              {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.info }]} />}
              <View style={styles.iconWrap}>
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                {showBadge && (
                  <View style={[styles.badge, { borderColor: colors.tabBar }]}>
                    <Text style={styles.badgeText}>{badgeLabel}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, { color: isActive ? colors.info : colors.tabInactive }, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 12, right: 12, zIndex: 999,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 12,
  },
  toastInner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12, paddingHorizontal: 14, gap: 10,
  },
  toastIcon:  { fontSize: 22, flexShrink: 0 },
  toastText:  { flex: 1 },
  toastTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', marginBottom: 1 },
  toastBody:  { color: '#94A3B8', fontSize: 12, lineHeight: 16 },
  toastClose: { color: '#64748B', fontSize: 14, paddingLeft: 4 },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06, shadowRadius: 8,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    position: 'relative', paddingBottom: 2,
  },
  activeIndicator: {
    position: 'absolute', top: -10, width: 32, height: 3, borderRadius: 2,
  },
  iconWrap: { position: 'relative' },
  tabIcon:  { fontSize: 22, marginBottom: 2 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },

  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#EF4444', borderRadius: 9,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5,
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
});
