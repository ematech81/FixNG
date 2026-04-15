import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../../components/BackButton';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  primary: '#2563EB',
  red:     '#EF4444',
  text:    '#0F172A',
  sub:     '#64748B',
  muted:   '#94A3B8',
  border:  '#E2E8F0',
  surface: '#FFFFFF',
  bg:      '#F8FAFF',
};

// ── Section data ───────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    title: 'Account Security',
    icon: '🔐',
    items: [
      {
        icon: '📱',
        label: 'Phone Number',
        sub: 'Used for login & OTP verification',
        onPress: () =>
          Alert.alert(
            'Change Phone Number',
            'To update your phone number, please contact our support team at support@fixng.com with your account details.',
            [{ text: 'OK' }]
          ),
      },
      {
        icon: '🔑',
        label: 'Two-Factor Authentication',
        sub: 'OTP via SMS is active on your account',
        onPress: () =>
          Alert.alert(
            'Two-Factor Authentication',
            'Your account is already protected with SMS OTP verification on every login. This cannot be disabled for security reasons.',
            [{ text: 'Got it' }]
          ),
        badge: 'Active',
        badgeColor: '#16A34A',
        badgeBg: '#DCFCE7',
      },
      {
        icon: '🚪',
        label: 'Active Sessions',
        sub: 'Manage devices logged into your account',
        onPress: () =>
          Alert.alert(
            'Active Sessions',
            'Session management is coming in a future update. If you believe your account is compromised, log out and contact support immediately.',
            [{ text: 'OK' }]
          ),
      },
    ],
  },
  {
    title: 'Privacy',
    icon: '👁️',
    items: [
      {
        icon: '👤',
        label: 'Profile Visibility',
        sub: 'Your profile is visible to all app users',
        onPress: () =>
          Alert.alert(
            'Profile Visibility',
            'Your profile name and job history are visible to other users on FixNG. Artisan profiles are publicly visible to customers searching for services.',
            [{ text: 'OK' }]
          ),
      },
      {
        icon: '📍',
        label: 'Location Sharing',
        sub: 'Used for job matching and artisan search',
        onPress: () =>
          Alert.alert(
            'Location Sharing',
            'Your location is only shared during active job sessions and for artisan discovery. You can revoke location permissions at any time in your device settings.',
            [
              { text: 'Open Device Settings', onPress: () => Linking.openSettings() },
              { text: 'OK', style: 'cancel' },
            ]
          ),
      },
      {
        icon: '💬',
        label: 'Chat Privacy',
        sub: 'Messages are only visible to job participants',
        onPress: () =>
          Alert.alert(
            'Chat Privacy',
            'All chat messages are only visible to the customer and artisan involved in the job. FixNG staff may review messages to resolve disputes.',
            [{ text: 'OK' }]
          ),
      },
    ],
  },
  {
    title: 'Data & Account',
    icon: '🗂️',
    items: [
      {
        icon: '📦',
        label: 'Download My Data',
        sub: 'Request a copy of all your data',
        onPress: () =>
          Alert.alert(
            'Download My Data',
            'To request a copy of your personal data, send an email to privacy@fixng.com with the subject "Data Request". We will respond within 30 days as required by Nigerian data protection law.',
            [{ text: 'OK' }]
          ),
      },
      {
        icon: '🗑️',
        label: 'Delete Account',
        sub: 'Permanently remove your account and data',
        onPress: () =>
          Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. All your jobs, chats, and profile data will be erased.\n\nTo proceed, email support@fixng.com with the subject "Delete My Account".',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Email Support',
                style: 'destructive',
                onPress: () =>
                  Linking.openURL('mailto:support@fixng.com?subject=Delete%20My%20Account'),
              },
            ]
          ),
        danger: true,
      },
    ],
  },
  {
    title: 'Legal',
    icon: '⚖️',
    items: [
      {
        icon: '📄',
        label: 'Privacy Policy',
        sub: 'How we collect and use your data',
        onPress: () =>
          Alert.alert(
            'Privacy Policy',
            'Our Privacy Policy is available in the Terms of Service section. FixNG complies with the Nigeria Data Protection Regulation (NDPR).',
            [{ text: 'OK' }]
          ),
      },
      {
        icon: '🛡️',
        label: 'NDPR Compliance',
        sub: 'Nigeria Data Protection Regulation',
        onPress: () =>
          Alert.alert(
            'NDPR Compliance',
            'FixNG processes your personal data in compliance with the Nigeria Data Protection Regulation (NDPR) 2019. You have the right to access, correct, and delete your data.',
            [{ text: 'OK' }]
          ),
      },
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function PrivacySecurityScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Your privacy matters</Text>
            <Text style={styles.heroSub}>
              FixNG protects your data in line with the Nigeria Data Protection Regulation (NDPR).
            </Text>
          </View>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>{section.icon}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.row,
                    i < section.items.length - 1 && styles.rowBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowIconWrap}>
                    <Text style={styles.rowIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowLabel, item.danger && { color: C.red }]}>
                      {item.label}
                    </Text>
                    <Text style={styles.rowSub}>{item.sub}</Text>
                  </View>
                  {item.badge ? (
                    <View style={[styles.badge, { backgroundColor: item.badgeBg }]}>
                      <Text style={[styles.badgeText, { color: item.badgeColor }]}>
                        {item.badge}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.chevron, item.danger && { color: C.red }]}>›</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>FixNG v1.0  ·  © 2025 FixNG Technologies</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },

  scroll: { padding: 16, paddingBottom: 48 },

  heroBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#EFF6FF', borderRadius: 16,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  heroIcon:  { fontSize: 36 },
  heroTitle: { fontSize: 15, fontWeight: '800', color: C.primary, marginBottom: 4 },
  heroSub:   { fontSize: 13, color: C.sub, lineHeight: 19 },

  section:       { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon:   { fontSize: 18 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionCard: {
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  rowIcon:   { fontSize: 18 },
  rowBody:   { flex: 1 },
  rowLabel:  { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  rowSub:    { fontSize: 12, color: C.muted },

  badge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  chevron:   { fontSize: 20, color: '#CBD5E1' },

  footer: { textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 8 },
});
