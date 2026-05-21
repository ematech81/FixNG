import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import BackButton from '../../components/BackButton';
import {
  getMySubscription,
  initializeSubscription,
  verifySubscription,
  cancelSubscription,
} from '../../api/subscriptionApi';

// ── Constants ──────────────────────────────────────────────────────────────────
const C = {
  primary: '#2563EB',
  gold:    '#F59E0B',
  green:   '#16A34A',
  red:     '#EF4444',
  orange:  '#EA580C',
  surface: '#FFFFFF',
  bg:      '#F8FAFF',
  border:  '#E2E8F0',
  text:    '#0F172A',
  sub:     '#64748B',
  muted:   '#94A3B8',
};

const CYCLES = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: 5000,
    billing: 'Billed monthly',
    savings: null,
    accent: C.primary,
  },
  {
    id: 'quarterly',
    label: 'Quarterly',
    price: 13500,
    billing: 'Billed every 3 months',
    savings: 'Save 10%',
    accent: C.green,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: 48000,
    billing: 'Billed annually',
    savings: 'Save 20%',
    accent: C.gold,
    badge: 'Best Value',
  },
];

const STATUS_CONFIG = {
  trial: {
    label: 'FREE TRIAL',
    color: C.primary,
    bg:    '#EFF6FF',
    border:'#BFDBFE',
    icon:  '🎁',
  },
  active: {
    label: 'ACTIVE',
    color: C.green,
    bg:    '#DCFCE7',
    border:'#BBF7D0',
    icon:  '✅',
  },
  grace: {
    label: 'GRACE PERIOD',
    color: C.orange,
    bg:    '#FFF7ED',
    border:'#FED7AA',
    icon:  '⚠️',
  },
  expired: {
    label: 'EXPIRED',
    color: C.red,
    bg:    '#FEF2F2',
    border:'#FECACA',
    icon:  '❌',
  },
  cancelled: {
    label: 'CANCELLED',
    color: C.muted,
    bg:    '#F8FAFC',
    border:'#E2E8F0',
    icon:  '⛔',
  },
};

const PRO_FEATURES = [
  'Appear in customer search results',
  'Accept unlimited job requests',
  'Priority placement in search',
  '"Verified Pro" badge on your profile',
  'In-app chat with customers',
  'Real-time job notifications',
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

// ── Component ─────────────────────────────────────────────────────────────────
export default function SubscriptionScreen({ navigation }) {
  const [sub,         setSub]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [verifying,   setVerifying]   = useState(false);
  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const pendingRef = useRef(null);  // reference waiting to be verified after deep link return

  useFocusEffect(useCallback(() => { load(); }, []));

  // Listen for deep link return from Kora Pay hosted checkout
  useEffect(() => {
    const handler = ({ url }) => handleDeepLink(url);
    const sub = Linking.addEventListener('url', handler);
    return () => sub.remove();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMySubscription();
      setSub(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleDeepLink = async (url) => {
    if (!url?.includes('subscription/callback')) return;
    try {
      const ref = new URL(url).searchParams.get('reference');
      if (!ref) return;
      pendingRef.current = ref;
      await runVerify(ref);
    } catch (e) {
      console.warn('[SubscriptionScreen] deep link parse error:', e.message);
    }
  };

  const runVerify = async (reference) => {
    setVerifying(true);
    try {
      const res = await verifySubscription(reference);
      if (res.data.success) {
        setSub(res.data.data);
        pendingRef.current = null;
        Alert.alert('Subscription Activated! 🎉', res.data.message || 'Your Pro subscription is now active.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Verification failed. Tap "Verify Payment" to try again.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubscribe = async () => {
    if (subscribing || verifying) return;

    const cycle = CYCLES.find(c => c.id === selectedCycle);
    Alert.alert(
      'Confirm Subscription',
      `Subscribe to FixNG Pro — ${cycle.label}\n₦${cycle.price.toLocaleString('en-NG')} ${cycle.billing.toLowerCase()}.\n\nYou will be taken to a secure Kora Pay checkout page.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue →', onPress: () => openCheckout(selectedCycle) },
      ]
    );
  };

  const openCheckout = async (cycle) => {
    setSubscribing(true);
    try {
      const res = await initializeSubscription(cycle);
      const { checkout_url, reference } = res.data.data;
      pendingRef.current = reference;

      await WebBrowser.openBrowserAsync(checkout_url, {
        dismissButtonStyle:    'cancel',
        presentationStyle:     WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        showInRecents:         false,
      });

      // Browser closed — try to verify (user may have completed payment)
      if (pendingRef.current) {
        await runVerify(pendingRef.current);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not open payment page. Please try again.';
      Alert.alert('Payment Error', msg);
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Your access continues until the end of your current period. You can request a pro-rated refund within 48 hours.\n\nCancel anyway?',
      [
        { text: 'Keep My Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription();
              Alert.alert('Cancelled', 'Auto-renewal disabled. You can still request a refund within 48 hours.');
              load();
            } catch {
              Alert.alert('Error', 'Could not cancel. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const status  = sub?.status || 'expired';
  const cfg     = STATUS_CONFIG[status] || STATUS_CONFIG.expired;
  const isAllow = sub?.isAllowed;
  const showCTA = !isAllow || status === 'grace' || status === 'trial';
  const showRenew = status === 'grace' || status === 'expired' || status === 'cancelled';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>FixNG Pro</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centred}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Status card ───────────────────────────────────────────────── */}
          {sub && (
            <View style={[styles.statusCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <View style={styles.statusRow}>
                <Text style={styles.statusIcon}>{cfg.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.statusLabelRow}>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color }]}>
                      <Text style={styles.statusBadgeText}>{cfg.label}</Text>
                    </View>
                  </View>
                  {status === 'trial' && (
                    <Text style={[styles.statusLine, { color: cfg.color }]}>
                      Trial ends {fmtDate(sub.endsAt)}
                      {sub.daysRemaining > 0 ? ` · ${sub.daysRemaining} day${sub.daysRemaining !== 1 ? 's' : ''} left` : ''}
                    </Text>
                  )}
                  {status === 'active' && (
                    <Text style={[styles.statusLine, { color: C.sub }]}>
                      Active until {fmtDate(sub.endsAt)}
                      {sub.daysRemaining > 0 ? ` · ${sub.daysRemaining} day${sub.daysRemaining !== 1 ? 's' : ''} left` : ''}
                    </Text>
                  )}
                  {status === 'grace' && (
                    <Text style={[styles.statusLine, { color: cfg.color }]}>
                      Grace period ends {fmtDate(sub.graceEndsAt)} — renew now to stay visible
                    </Text>
                  )}
                  {(status === 'expired' || status === 'cancelled') && (
                    <Text style={[styles.statusLine, { color: C.sub }]}>
                      Subscribe to appear in search and receive jobs
                    </Text>
                  )}
                </View>
                {status === 'active' && (
                  <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* ── Pending verification banner ───────────────────────────────── */}
          {pendingRef.current && !verifying && (
            <TouchableOpacity
              style={styles.pendingBanner}
              onPress={() => runVerify(pendingRef.current)}
              activeOpacity={0.85}
            >
              <Text style={styles.pendingIcon}>⏳</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Payment Pending Confirmation</Text>
                <Text style={styles.pendingSub}>Tap to verify your payment and activate your subscription.</Text>
              </View>
            </TouchableOpacity>
          )}
          {verifying && (
            <View style={styles.verifyingRow}>
              <ActivityIndicator color={C.primary} size="small" />
              <Text style={styles.verifyingText}>Verifying payment…</Text>
            </View>
          )}

          {/* ── Cycle selector ────────────────────────────────────────────── */}
          {(showCTA || showRenew) && (
            <>
              <Text style={styles.sectionLabel}>CHOOSE A PLAN</Text>
              <View style={styles.cycleWrap}>
                {CYCLES.map((c) => {
                  const sel = selectedCycle === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.cycleCard, sel && { borderColor: c.accent, borderWidth: 2, backgroundColor: '#FAFEFF' }]}
                      onPress={() => setSelectedCycle(c.id)}
                      activeOpacity={0.8}
                    >
                      {c.badge && (
                        <View style={[styles.cycleBadge, { backgroundColor: c.accent }]}>
                          <Text style={styles.cycleBadgeText}>{c.badge}</Text>
                        </View>
                      )}
                      <Text style={[styles.cycleLabel, sel && { color: c.accent }]}>{c.label}</Text>
                      <View style={styles.cyclePriceRow}>
                        <Text style={[styles.cycleCurrency, sel && { color: c.accent }]}>₦</Text>
                        <Text style={[styles.cyclePrice, sel && { color: c.accent }]}>
                          {c.price.toLocaleString('en-NG')}
                        </Text>
                      </View>
                      <Text style={styles.cycleBilling}>{c.billing}</Text>
                      {c.savings && (
                        <View style={[styles.savingsPill, { backgroundColor: c.accent + '18' }]}>
                          <Text style={[styles.savingsText, { color: c.accent }]}>{c.savings}</Text>
                        </View>
                      )}
                      {sel && (
                        <View style={[styles.selectedDot, { backgroundColor: c.accent }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subscribe / Renew CTA */}
              <TouchableOpacity
                style={[styles.subBtn, (subscribing || verifying) && { opacity: 0.6 }]}
                onPress={handleSubscribe}
                disabled={subscribing || verifying}
                activeOpacity={0.85}
              >
                {subscribing
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.subBtnText}>
                      {showRenew ? 'Renew Subscription →' : 'Subscribe Now →'}
                    </Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* ── Pro features ──────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>WHAT YOU GET</Text>
          <View style={styles.featuresCard}>
            {PRO_FEATURES.map((f, i) => (
              <View key={i} style={[styles.featureRow, i < PRO_FEATURES.length - 1 && styles.featureBorder]}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* ── Trial info ────────────────────────────────────────────────── */}
          {status === 'trial' && (
            <View style={styles.trialInfo}>
              <Text style={styles.trialInfoText}>
                🎁 You are on a free 7-day trial with full Pro access. Subscribe before your trial ends to keep your visibility.
              </Text>
            </View>
          )}

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              🔒 Payments processed securely via Kora Pay. Cancel anytime from this screen.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  centred:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 48 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },

  /* Status card */
  statusCard: {
    borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1.5,
  },
  statusRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusIcon:     { fontSize: 24, marginTop: 2 },
  statusLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  statusLine:      { fontSize: 13, lineHeight: 18 },
  cancelBtn: {
    backgroundColor: '#FEE2E2', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 2,
  },
  cancelBtnText: { color: C.red, fontSize: 12, fontWeight: '700' },

  /* Pending / verifying */
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    marginBottom: 14, borderWidth: 1.5, borderColor: '#FCD34D',
  },
  pendingIcon:  { fontSize: 24 },
  pendingTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  pendingSub:   { fontSize: 12, color: '#78350F', lineHeight: 17 },
  verifyingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  verifyingText: { fontSize: 13, color: C.sub },

  /* Section label */
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: C.muted,
    letterSpacing: 1.1, marginBottom: 10, marginTop: 4,
  },

  /* Cycle selector */
  cycleWrap: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  cycleCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cycleBadge: {
    position: 'absolute', top: -8, alignSelf: 'center',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  cycleBadgeText:  { color: '#fff', fontSize: 9, fontWeight: '800' },
  cycleLabel:      { fontSize: 12, fontWeight: '700', color: C.sub, marginBottom: 6, marginTop: 6 },
  cyclePriceRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  cycleCurrency:   { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  cyclePrice:      { fontSize: 20, fontWeight: '900', color: C.text, lineHeight: 24 },
  cycleBilling:    { fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 4 },
  savingsPill: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6,
  },
  savingsText:  { fontSize: 10, fontWeight: '800' },
  selectedDot: {
    position: 'absolute', bottom: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
  },

  /* Subscribe button */
  subBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 24,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  subBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  /* Features */
  featuresCard: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  featureBorder:{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  featureCheck: { fontSize: 14, fontWeight: '800', color: C.green },
  featureText:  { flex: 1, fontSize: 14, color: C.sub, lineHeight: 19 },

  /* Trial info */
  trialInfo: {
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE',
  },
  trialInfoText: { fontSize: 13, color: '#1D4ED8', lineHeight: 19 },

  /* Disclaimer */
  disclaimer: {
    backgroundColor: C.surface, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  disclaimerText: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
