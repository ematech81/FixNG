import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getOnboardingStatus } from '../../api/artisanApi';
import { clearSession } from '../../utils/storage';

const WHATSAPP_NUMBER = '2349011495230';
const SUPPORT_EMAIL   = 'support@fixng.com';

// type: 'rejected' | 'suspended' | 'disabled'
// Passed as route.params.type
// Optional: route.params.reason (pre-supplied reason to skip fetch)

export default function AccountStatusScreen({ route, navigation }) {
  const { type, reason: preReason } = route?.params || {};
  const [loading, setLoading]   = useState(!preReason);
  const [reason, setReason]     = useState(preReason || null);

  useEffect(() => {
    if (preReason) return;
    (async () => {
      try {
        const res = await getOnboardingStatus();
        const data = res.data.data;
        if (type === 'rejected')  setReason(data.rejectionReason  || null);
        if (type === 'suspended') setReason(data.suspensionReason || null);
        if (type === 'disabled')  setReason(data.banReason        || null);
      } catch {
        // silent — reason may simply not be set
      } finally {
        setLoading(false);
      }
    })();
  }, [type, preReason]);

  const handleResubmit = () => {
    navigation.navigate('Step4_VerificationID', { fromResubmit: true });
  };

  const handleContactWhatsApp = () => {
    Linking.openURL(
      `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20need%20help%20with%20my%20FixNG%20account`
    );
  };

  const handleContactEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Account%20Issue%20%E2%80%93%20FixNG`);
  };

  const handleLogout = async () => {
    await clearSession();
    // Navigate to root — AppNavigator will boot to Auth stack on next render
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Rejected ──────────────────────────────────────────────────────────────
  if (type === 'rejected') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.iconBubble}>
            <Text style={styles.iconEmoji}>❌</Text>
          </View>

          <Text style={styles.title}>Verification Rejected</Text>
          <Text style={styles.subtitle}>
            Your identity verification was reviewed and could not be approved at this time.
          </Text>

          {reason ? (
            <View style={styles.reasonCard}>
              <Text style={styles.reasonLabel}>Reason from FixNG:</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ) : (
            <View style={styles.reasonCard}>
              <Text style={styles.reasonText}>
                No specific reason was provided. Please re-upload a clear, valid ID or professional
                certificate and ensure your name matches your FixNG account.
              </Text>
            </View>
          )}

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>How to fix this:</Text>
            {[
              '1. Ensure your ID or certificate is not expired',
              '2. Make sure all text is clearly readable — no blurry or dark photos',
              '3. Confirm your registered name matches the name on the document',
              '4. Re-upload and resubmit for review',
            ].map((s, i) => (
              <Text key={i} style={styles.stepItem}>{s}</Text>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleResubmit} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Fix & Resubmit →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleContactWhatsApp} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>💬  Contact Support on WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Suspended ─────────────────────────────────────────────────────────────
  if (type === 'suspended') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.iconBubble, styles.iconBubbleAmber]}>
            <Text style={styles.iconEmoji}>🔒</Text>
          </View>

          <Text style={styles.title}>Account Suspended</Text>
          <Text style={styles.subtitle}>
            Your account has been temporarily suspended by the FixNG team.
          </Text>

          {reason && (
            <View style={[styles.reasonCard, styles.reasonCardAmber]}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          )}

          <View style={[styles.stepsCard, styles.stepsCardAmber]}>
            <Text style={styles.stepsTitle}>What to do next:</Text>
            <Text style={styles.stepItem}>• Contact our support team for clarification</Text>
            <Text style={styles.stepItem}>• Provide your registered phone number for faster resolution</Text>
            <Text style={styles.stepItem}>• Suspensions are reviewed and can be lifted by admins</Text>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnAmber]} onPress={handleContactWhatsApp} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>💬  Contact Support on WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleContactEmail} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>✉️  Email support@fixng.com</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Disabled / Banned ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, styles.containerGray]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconBubble, styles.iconBubbleGray]}>
          <Text style={styles.iconEmoji}>🚫</Text>
        </View>

        <Text style={styles.title}>Account Disabled</Text>
        <Text style={styles.subtitle}>
          Your account has been permanently disabled and you are no longer allowed to use FixNG.
        </Text>

        {reason && (
          <View style={[styles.reasonCard, styles.reasonCardGray]}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        <View style={[styles.stepsCard, styles.stepsCardGray]}>
          <Text style={styles.stepItem}>
            If you believe this is a mistake, you can reach us by email. Note that disabled
            accounts cannot be reinstated without a formal review by our team.
          </Text>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnGray]} onPress={handleContactEmail} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>✉️  Contact support@fixng.com</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondaryBtn, styles.logoutBtn]} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={[styles.secondaryBtnText, styles.logoutBtnText]}>OK — Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#FFF9F9' },
  containerGray: { backgroundColor: '#F9FAFB' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:        { padding: 24, paddingBottom: 48, alignItems: 'center' },

  iconBubble: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
    marginBottom: 24, marginTop: 16,
  },
  iconBubbleAmber: { backgroundColor: '#FEF3C7' },
  iconBubbleGray:  { backgroundColor: '#F3F4F6' },
  iconEmoji: { fontSize: 44 },

  title: {
    fontSize: 24, fontWeight: '800', color: '#1E232C',
    textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    fontSize: 15, color: '#6B7280', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 8,
  },

  reasonCard: {
    width: '100%', backgroundColor: '#FEF2F2', borderRadius: 14,
    padding: 16, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#FECACA',
  },
  reasonCardAmber: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  reasonCardGray:  { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  reasonLabel: { fontSize: 12, fontWeight: '800', color: '#DC2626', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonText:  { fontSize: 14, color: '#374151', lineHeight: 21 },

  stepsCard: {
    width: '100%', backgroundColor: '#FFF5F5', borderRadius: 14,
    padding: 16, marginBottom: 28,
    borderLeftWidth: 4, borderLeftColor: '#DC2626',
  },
  stepsCardAmber: { backgroundColor: '#FFFBEB', borderLeftColor: '#D97706' },
  stepsCardGray:  { backgroundColor: '#F9FAFB', borderLeftColor: '#6B7280' },
  stepsTitle: { fontSize: 13, fontWeight: '800', color: '#DC2626', marginBottom: 10 },
  stepItem:   { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 5 },

  primaryBtn: {
    width: '100%', backgroundColor: '#DC2626',
    paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 12,
  },
  primaryBtnAmber: { backgroundColor: '#D97706' },
  primaryBtnGray:  { backgroundColor: '#374151' },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  secondaryBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 12,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },

  logoutBtn:     { borderColor: '#FECACA' },
  logoutBtnText: { color: '#DC2626' },

  backLink: { marginTop: 8, paddingVertical: 10 },
  backLinkText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
});
