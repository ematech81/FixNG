import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Platform, LayoutAnimation, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIMARY  = '#2563EB';
const GREEN    = '#16A34A';
const AMBER    = '#D97706';
const SURFACE  = '#FFFFFF';
const BG       = '#F5F7FB';
const TEXT     = '#1E232C';
const MUTED    = '#6B7280';
const DIVIDER  = '#EEF0F5';

// ── FAQ data ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'How do I book an artisan?',
    a: 'Go to the Home tab and browse Nearby Artisans, or use the Search tab to filter by skill and location. Tap an artisan card, then tap "Request Job" to send a booking request.',
  },
  {
    q: 'How does payment work?',
    a: 'FixNG does not process payments directly. Once an artisan accepts your request, agree on payment with them directly. We recommend confirming the price before work begins.',
  },
  {
    q: 'What does "Trusted Artisan" mean?',
    a: '"Trusted" artisans are subscribed members who have been verified by FixNG and maintain an active subscription. They receive priority placement in search results.',
  },
  {
    q: 'How do I become a verified artisan?',
    a: 'Go to your Profile tab, tap "Become an Artisan", and complete the 5-step onboarding process including uploading a verification ID and a skill video. Our team reviews submissions within 24–48 hours.',
  },
  {
    q: 'What happens if an artisan does not show up?',
    a: 'After a job is marked complete, you can leave a review. If you have a dispute, open the Job Detail screen and use the "Raise Dispute" option. Our team reviews all disputes within 24 hours.',
  },
  {
    q: 'How do I cancel a job request?',
    a: 'Go to My Jobs, open the job, and tap "Cancel Request" — available as long as the artisan has not yet accepted. Once accepted, reach out to the artisan directly to cancel.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. Please email us at support@fixng.com with the subject "Account Deletion Request" and include your registered phone number. We process requests within 3 business days.',
  },
  {
    q: 'How do I upgrade to a Pro/Elite plan?',
    a: 'Go to Profile → Upgrade Your Plan. Choose from Basic, Pro, or Elite plans. Payment is via Paystack and your Trusted badge activates immediately after verification.',
  },
];

// ── Contact channels ──────────────────────────────────────────────────────────
const CONTACTS = [
  {
    icon: '✉️',
    label: 'Email Support',
    value: 'support@fixng.com',
    action: () => Linking.openURL('mailto:support@fixng.com'),
    color: PRIMARY,
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    icon: '💬',
    label: 'WhatsApp',
    value: '+234 901 149 5230',
    action: () => Linking.openURL('https://wa.me/2349011495230'),
    color: GREEN,
    bg: '#F0FDF4',
    border: '#BBF7D0',
  },
  {
    icon: '🐦',
    label: 'Twitter / X',
    value: '@FixNG_official',
    action: () => Linking.openURL('https://twitter.com/FixNG_official'),
    color: '#0EA5E9',
    bg: '#F0F9FF',
    border: '#BAE6FD',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
export default function HelpSupportScreen({ navigation }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((prev) => (prev === i ? null : i));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🛠️</Text>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>
            Browse common questions below or reach us directly. We typically respond within a few hours.
          </Text>
        </View>

        {/* Contact channels */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        {CONTACTS.map((c) => (
          <TouchableOpacity
            key={c.label}
            style={[styles.contactCard, { backgroundColor: c.bg, borderColor: c.border }]}
            onPress={c.action}
            activeOpacity={0.8}
          >
            <View style={styles.contactLeft}>
              <Text style={styles.contactIcon}>{c.icon}</Text>
              <View>
                <Text style={[styles.contactLabel, { color: c.color }]}>{c.label}</Text>
                <Text style={styles.contactValue}>{c.value}</Text>
              </View>
            </View>
            <Text style={[styles.contactArrow, { color: c.color }]}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Support hours */}
        <View style={styles.hoursCard}>
          <Text style={styles.hoursIcon}>🕐</Text>
          <View>
            <Text style={styles.hoursTitle}>Support Hours</Text>
            <Text style={styles.hoursSub}>Monday – Saturday · 8 AM – 8 PM WAT</Text>
          </View>
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Frequently Asked Questions</Text>
        <View style={styles.faqCard}>
          {FAQS.map((faq, i) => (
            <View key={i} style={[styles.faqItem, i < FAQS.length - 1 && styles.faqItemBorder]}>
              <TouchableOpacity style={styles.faqQuestion} onPress={() => toggle(i)} activeOpacity={0.75}>
                <Text style={styles.faqQ}>{faq.q}</Text>
                <Text style={[styles.faqChevron, openIndex === i && styles.faqChevronOpen]}>›</Text>
              </TouchableOpacity>
              {openIndex === i && (
                <Text style={styles.faqA}>{faq.a}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Footer note */}
        <Text style={styles.footer}>
          FixNG v1.0 · Made with ❤️ in Nigeria
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: SURFACE,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  backArrow: { fontSize: 20, color: TEXT, fontWeight: '700', marginTop: -1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT },

  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },

  // Hero
  hero: {
    backgroundColor: SURFACE, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: DIVIDER,
  },
  heroIcon: { fontSize: 40, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: TEXT, marginBottom: 8 },
  heroSub: {
    fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 21,
  },

  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 12,
  },

  // Contact cards
  contactCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1.5,
  },
  contactLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contactIcon: { fontSize: 24 },
  contactLabel: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  contactValue: { fontSize: 12, color: MUTED },
  contactArrow: { fontSize: 24, fontWeight: '700' },

  // Hours
  hoursCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFBEB', borderRadius: 14,
    padding: 14, marginBottom: 24,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  hoursIcon: { fontSize: 22 },
  hoursTitle: { fontSize: 13, fontWeight: '800', color: AMBER, marginBottom: 2 },
  hoursSub: { fontSize: 12, color: MUTED },

  // FAQ
  faqCard: {
    backgroundColor: SURFACE, borderRadius: 20,
    borderWidth: 1, borderColor: DIVIDER,
    overflow: 'hidden', marginBottom: 20,
  },
  faqItem: { paddingHorizontal: 18, paddingVertical: 4 },
  faqItemBorder: { borderBottomWidth: 1, borderBottomColor: DIVIDER },
  faqQuestion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16,
  },
  faqQ: { fontSize: 14, fontWeight: '700', color: TEXT, flex: 1, paddingRight: 12, lineHeight: 20 },
  faqChevron: { fontSize: 22, color: MUTED, fontWeight: '700', transform: [{ rotate: '0deg' }] },
  faqChevronOpen: { transform: [{ rotate: '90deg' }] },
  faqA: {
    fontSize: 13, color: MUTED, lineHeight: 20,
    paddingBottom: 16, paddingRight: 8,
  },

  footer: {
    textAlign: 'center', fontSize: 12, color: '#C4C9D4',
  },
});
