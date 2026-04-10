import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CustomerHomeScreen from './CustomerHomeScreen';
import SearchArtisansScreen from './SearchArtisansScreen';
import MessagesScreen from './MessagesScreen';
import ProfileScreen from './ProfileScreen';

const PRIMARY = '#2563EB';

const TABS = [
  { key: 'home',     label: 'Jobs',     icon: '🏠' },
  { key: 'search',   label: 'Search',   icon: '🔍' },
  { key: 'messages', label: 'Messages', icon: '💬' },
  { key: 'profile',  label: 'Profile',  icon: '👤' },
];

export default function CustomerTabScreen({ navigation, onLogout, onRefreshAuth, initialTab, onInitialTabConsumed }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'home');
  const insets = useSafeAreaInsets();

  // Tell AppNavigator the initialTab has been consumed so it won't re-apply on
  // the next navigation event (e.g. logout → re-login).
  useEffect(() => {
    if (initialTab) {
      onInitialTabConsumed?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <CustomerHomeScreen navigation={navigation} onSwitchTab={setActiveTab} />;
      case 'search':
        return <SearchArtisansScreen navigation={navigation} embedded />;
      case 'messages':
        return <MessagesScreen navigation={navigation} />;
      case 'profile':
        return <ProfileScreen navigation={navigation} onLogout={onLogout} onRefreshAuth={onRefreshAuth} onSwitchTab={setActiveTab} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.content}>{renderScreen()}</View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 10 }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              {isActive && <View style={styles.activeIndicator} />}
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
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
  root: { flex: 1, backgroundColor: '#F5F7FB' },
  content: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F5',
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    position: 'relative', paddingBottom: 2,
  },
  activeIndicator: {
    position: 'absolute', top: -10, width: 32, height: 3,
    backgroundColor: PRIMARY, borderRadius: 2,
  },
  tabIcon: { fontSize: 22, marginBottom: 2 },
  tabLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  tabLabelActive: { color: PRIMARY, fontWeight: '700' },
});
