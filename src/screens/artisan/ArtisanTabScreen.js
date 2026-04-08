import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ArtisanDashboard from './ArtisanDashboard';
import ArtisanJobScreen from './ArtisanJobScreen';
import MessagesScreen from '../customer/MessagesScreen';
import ProfileScreen from '../customer/ProfileScreen';

const PRIMARY = '#2563EB';

const TABS = [
  { key: 'home',     label: 'Home',     icon: '🏠' },
  { key: 'jobs',     label: 'Jobs',     icon: '🔧' },
  { key: 'messages', label: 'Messages', icon: '💬' },
  { key: 'profile',  label: 'Profile',  icon: '👤' },
];

export default function ArtisanTabScreen({ navigation, onLogout }) {
  // Start on 'jobs' tab — that's the main work screen for artisans
  const [activeTab, setActiveTab] = useState('jobs');
  const insets = useSafeAreaInsets();

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <ArtisanDashboard navigation={navigation} onLogout={onLogout} />;
      case 'jobs':
        return <ArtisanJobScreen navigation={navigation} />;
      case 'messages':
        return <MessagesScreen navigation={navigation} />;
      case 'profile':
        return <ProfileScreen navigation={navigation} onLogout={onLogout} />;
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
