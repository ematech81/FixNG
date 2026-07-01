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
import { useTheme } from '../../context/ThemeContext';

const CYCLES = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: 5000,
    billing: 'Billed monthly',
    savings: null,
    accentKey: 'info',
  },
  {
    id: 'quarterly',
    label: 'Quarterly',
    price: 13500,
    billing: 'Billed every 3 months',
    savings: 'Save 10%',
    accentKey: 'success',
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: 48000,
    billing: 'Billed annually',
    savings: 'Save 20%',
    accentKey: 'warning',
    badge: 'Best Value',
  },
];

const STATUS_CONFIG_KEYS = {
  trial: {
    label: 'FREE TRIAL',
    colorKey:  'info',
    bgKey:     'infoBg',
    borderKey: 'info',
    icon:  '🎁',
  },
  active: {
    label: 'ACTIVE',
    colorKey:  'success',
    bgKey:     'successBg',
    borderKey: 'success',
    icon:  '✅',
  },
  grace: {
    label: 'GRACE PERIOD',
    colorKey:  'primaryDark',
    bgKey:     'primaryLight',
    borderKey: 'primaryDark',
    icon:  '⚠️',
  },
  expired: {
    label: 'EXPIRED',
    colorKey:  'error',
    bgKey:     'errorBg',
    borderKey: 'error',
    icon:  '❌',
  },
  cancelled: {
    label: 'CANCELLED',
    colorKey:  'textMuted',
    bgKey:     'surface',
    borderKey: 'border',
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

export default function SubscriptionScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [sub,         setSub]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [verifying,   setVerifying]   = useState(false);
  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const pendingRef = useRef(null);

  useFocusEffect(useCallback(() => { load(); }, []));

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

      if (pendingRef.current) {
        await runVerify(pendingRef.current);
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg    = err?.response?.data?.message;
      if (status === 409) {
        Alert.alert('Payment In Progress', msg || 'A payment is already in progress. Please wait a moment and try again.');
      } else if (status === 403) {
        Alert.alert('Not Eligible', msg || 'Your account must be verified before subscribing.');
      } else {
        Alert.alert('Payment Error', msg || 'Could not open payment page. Please try again.');
      }
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

  const status  = sub?.status || 'expired';
  const cfgKeys = STATUS_CONFIG_KEYS[status] || STATUS_CONFIG_KEYS.expired;
  const cfg = {
    label:  cfgKeys.label,
    icon:   cfgKeys.icon,
    color:  colors[cfgKeys.colorKey],
    bg:     colors[cfgKeys.bgKey],
    border: colors[cfgKeys.borderKey],
  };
  const isAllow = sub?.isAllowed;
  const showCTA = !isAllow || status === 'grace' || status === 'trial';
  const showRenew = status === 'grace' || status === 'expired' || status === 'cancelled';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>FixNG Pro</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centred}><ActivityIndicator size="large" color={colors.info} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

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
                    <Text style={[styles.statusLine, { color: colors.textSub }]}>
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
                    <Text style={[styles.statusLine, { color: colors.textSub }]}>
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
              <ActivityIndicator color={colors.info} size="small" />
              <Text style={styles.verifyingText}>Verifying payment…</Text>
            </View>
          )}

          {(showCTA || showRenew) && (
            <>
              <Text style={styles.sectionLabel}>CHOOSE A PLAN</Text>
              <View style={styles.cycleWrap}>
                {CYCLES.map((c) => {
                  const sel = selectedCycle === c.id;
                  const accent = colors[c.accentKey];
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.cycleCard, sel && { borderColor: accent, borderWidth: 2, backgroundColor: colors.surface }]}
                      onPress={() => setSelectedCycle(c.id)}
                      activeOpacity={0.8}
                    >
                      {c.badge && (
                        <View style={[styles.cycleBadge, { backgroundColor: accent }]}>
                          <Text style={styles.cycleBadgeText}>{c.badge}</Text>
                        </View>
                      )}
                      <Text style={[styles.cycleLabel, sel && { color: accent }]}>{c.label}</Text>
                      <View style={styles.cyclePriceRow}>
                        <Text style={[styles.cycleCurrency, sel && { color: accent }]}>₦</Text>
                        <Text style={[styles.cyclePrice, sel && { color: accent }]}>
                          {c.price.toLocaleString('en-NG')}
                        </Text>
                      </View>
                      <Text style={styles.cycleBilling}>{c.billing}</Text>
                      {c.savings && (
                        <View style={[styles.savingsPill, { backgroundColor: accent + '18' }]}>
                          <Text style={[styles.savingsText, { color: accent }]}>{c.savings}</Text>
                        </View>
                      )}
                      {sel && (
                        <View style={[styles.selectedDot, { backgroundColor: accent }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

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

          <Text style={styles.sectionLabel}>WHAT YOU GET</Text>
          <View style={styles.featuresCard}>
            {PRO_FEATURES.map((f, i) => (
              <View key={i} style={[styles.featureRow, i < PRO_FEATURES.length - 1 && styles.featureBorder]}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

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

const makeStyles = (colors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.surface },
  centred:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 48 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

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
    backgroundColor: colors.errorBg, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 2,
  },
  cancelBtnText: { color: colors.error, fontSize: 12, fontWeight: '700' },

  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.warningBg, borderRadius: 14, padding: 14,
    marginBottom: 14, borderWidth: 1.5, borderColor: colors.warning,
  },
  pendingIcon:  { fontSize: 24 },
  pendingTitle: { fontSize: 14, fontWeight: '800', color: colors.textSub, marginBottom: 3 },
  pendingSub:   { fontSize: 12, color: colors.textSub, lineHeight: 17 },
  verifyingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  verifyingText: { fontSize: 13, color: colors.textSub },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    letterSpacing: 1.1, marginBottom: 10, marginTop: 4,
  },

  cycleWrap: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  cycleCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', position: 'relative',
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cycleBadge: {
    position: 'absolute', top: -8, alignSelf: 'center',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  cycleBadgeText:  { color: '#fff', fontSize: 9, fontWeight: '800' },
  cycleLabel:      { fontSize: 12, fontWeight: '700', color: colors.textSub, marginBottom: 6, marginTop: 6 },
  cyclePriceRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  cycleCurrency:   { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  cyclePrice:      { fontSize: 20, fontWeight: '900', color: colors.text, lineHeight: 24 },
  cycleBilling:    { fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  savingsPill: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6,
  },
  savingsText:  { fontSize: 10, fontWeight: '800' },
  selectedDot: {
    position: 'absolute', bottom: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
  },

  subBtn: {
    backgroundColor: colors.info, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 24,
    shadowColor: colors.info, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  subBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  featuresCard: {
    backgroundColor: colors.card, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  featureBorder:{ borderBottomWidth: 1, borderBottomColor: colors.surface },
  featureCheck: { fontSize: 14, fontWeight: '800', color: colors.success },
  featureText:  { flex: 1, fontSize: 14, color: colors.textSub, lineHeight: 19 },

  trialInfo: {
    backgroundColor: colors.infoBg, borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: colors.info,
  },
  trialInfoText: { fontSize: 13, color: colors.info, lineHeight: 19 },

  disclaimer: {
    backgroundColor: colors.card, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  disclaimerText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
