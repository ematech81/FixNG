import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackButton from '../../components/BackButton';
import FlutterwaveWebView from '../../components/FlutterwaveWebView';
import { getUser } from '../../utils/storage';
import { getOnboardingStatus } from '../../api/artisanApi';
import {
  getPlans, getMySubscription,
  initiateSubscription, verifySubscription, cancelSubscription,
} from '../../api/subscriptionApi';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  primary:  '#2563EB',
  gold:     '#F59E0B',
  green:    '#16A34A',
  surface:  '#FFFFFF',
  bg:       '#F8FAFF',
  border:   '#E2E8F0',
  text:     '#0F172A',
  sub:      '#64748B',
  muted:    '#94A3B8',
  red:      '#EF4444',
};

const PLAN_ACCENT = {
  free:    { color: C.sub,     bg: '#F1F5F9', badge: null           },
  basic:   { color: C.primary, bg: '#EFF6FF', badge: 'Most Popular' },
  premium: { color: C.gold,    bg: '#FFFBEB', badge: 'Best Value'   },
};

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function SubscriptionScreen({ navigation, route }) {
  const [plans, setPlans]         = useState([]);
  const [current, setCurrent]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [subscribing, setSubscribing] = useState(null); // planId being processed
  const [verifying, setVerifying] = useState(false);
  const [artisanStatus, setArtisanStatus] = useState(null);

  // WebView state
  const [webviewVisible, setWebviewVisible] = useState(false);
  const [paymentLink,    setPaymentLink]    = useState('');
  const [pendingTxRef,   setPendingTxRef]   = useState('');
  const [pendingPlan,    setPendingPlan]    = useState(null); // plan object
  // Manual fallback: shown if WebView is closed before redirect is auto-detected
  const [pendingPayment, setPendingPayment] = useState(null); // { txRef, planName }

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    setLoading(true);
    try {
      const u = await getUser();
      const fetches = [
        getPlans().catch(() => null),
        getMySubscription().catch(() => null),
      ];
      if (u?.role === 'artisan') fetches.push(getOnboardingStatus().catch(() => null));
      const [plansRes, subRes, onboardRes] = await Promise.all(fetches);
      setPlans(plansRes?.data?.data || []);
      const sub = subRes?.data?.data || null;
      setCurrent(sub);
      // Clear manual pending banner if subscription is already active
      if (sub?.status === 'active' && sub?.plan !== 'free') {
        setPendingPayment(null);
      }
      if (onboardRes) {
        setArtisanStatus(onboardRes?.data?.data?.verificationStatus || 'incomplete');
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (planId === 'free') return;
    if (current?.plan === planId && current?.status === 'active') {
      Alert.alert('Already Subscribed', `You are already on the ${planId} plan.`);
      return;
    }

    const plan = plans.find(p => p.id === planId);
    const planName = plan?.name || planId;

    Alert.alert(
      'Subscribe via Flutterwave',
      `You will be taken to a secure Flutterwave payment page to complete your ${planName} subscription (₦${(plan?.price || 0).toLocaleString('en-NG')}/month).\n\nYour subscription will activate automatically once payment is confirmed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue →', onPress: () => openFlutterwave(planId) },
      ]
    );
  };

  const openFlutterwave = async (planId) => {
    setSubscribing(planId);
    try {
      const res = await initiateSubscription(planId);
      const { payment_link, tx_ref, plan } = res.data.data;

      setPaymentLink(payment_link);
      setPendingTxRef(tx_ref);
      setPendingPlan(plan);
      setWebviewVisible(true);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not initiate payment. Please try again.';
      Alert.alert('Payment Error', msg);
    } finally {
      setSubscribing(null);
    }
  };

  // Called by WebView when redirect is auto-detected, or by manual fallback button
  const handleWebViewSuccess = async (txRef) => {
    setWebviewVisible(false);
    setVerifying(true);
    try {
      const res = await verifySubscription(txRef);
      if (res.data.success) {
        setPendingPayment(null);
        Alert.alert('Subscription Activated! 🎉', res.data.message);
        load();
      } else {
        // Shouldn't normally reach here (backend returns 4xx on failure, not 200 false)
        if (pendingPlan) setPendingPayment({ txRef, planName: pendingPlan.name });
        Alert.alert('Not Confirmed Yet', 'Payment could not be verified. If you paid, tap "Confirm Activation" below to try again.');
      }
    } catch (err) {
      // Surface the pending banner so the user can retry without re-initiating payment.
      // This is the common path for bank transfers, which are confirmed asynchronously.
      if (pendingPlan) setPendingPayment({ txRef, planName: pendingPlan.name });
      const serverMsg = err?.response?.data?.message || '';
      const isPending = serverMsg.toLowerCase().includes('pending');
      Alert.alert(
        isPending ? 'Payment Being Processed' : 'Verification Failed',
        isPending
          ? 'Your bank transfer is still being processed. Once it clears, tap "Confirm Activation" below to activate your subscription.'
          : (serverMsg || 'Verification failed. If funds were deducted, contact support with your payment reference.'),
      );
    } finally {
      setVerifying(false);
    }
  };

  // Called when user closes the WebView without completing payment
  const handleWebViewCancel = () => {
    setWebviewVisible(false);
    // Store txRef so user can manually confirm if they did pay before closing
    if (pendingTxRef && pendingPlan) {
      setPendingPayment({ txRef: pendingTxRef, planName: pendingPlan.name });
    }
  };

  const handleManualVerify = async () => {
    if (!pendingPayment) return;
    setVerifying(true);
    try {
      const res = await verifySubscription(pendingPayment.txRef);
      if (res.data.success) {
        setPendingPayment(null);
        Alert.alert('Subscription Activated! 🎉', res.data.message);
        load();
      } else {
        Alert.alert('Not Verified', 'Payment not confirmed yet. If you paid, please wait a moment and try again.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Verification failed. Contact support with your payment reference.';
      Alert.alert('Verification Error', msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Your plan will remain active until the end of the billing period, then revert to Free.',
      [
        { text: 'Keep My Plan', style: 'cancel' },
        {
          text: 'Cancel Anyway',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription();
              Alert.alert('Cancelled', 'Auto-renewal has been disabled.');
              load();
            } catch {
              Alert.alert('Error', 'Could not cancel. Try again.');
            }
          },
        },
      ]
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const upgradeContext = route?.params?.upgradeContext || null;
  const activePlan = current?.plan || 'free';
  const isActive   = current?.status === 'active';
  const expiresAt  = current?.expiresAt;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Flutterwave WebView modal
          key={pendingTxRef} forces a full remount on every new payment session,
          resetting the WebView's internal loading/error state so the second
          payment doesn't inherit stale state from the first. */}
      <FlutterwaveWebView
        key={pendingTxRef || 'idle'}
        visible={webviewVisible}
        paymentLink={paymentLink}
        txRef={pendingTxRef}
        onSuccess={handleWebViewSuccess}
        onCancel={handleWebViewCancel}
      />

      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Manual fallback banner (shown if WebView closed before auto-detect) ── */}
          {pendingPayment && (
            <View style={styles.pendingBanner}>
              <View style={styles.pendingBannerTop}>
                <Text style={styles.pendingBannerIcon}>⏳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingBannerTitle}>Payment Pending Confirmation</Text>
                  <Text style={styles.pendingBannerSub}>
                    If you completed the {pendingPayment.planName} payment, tap below to activate your subscription.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.confirmBtn, verifying && { opacity: 0.7 }]}
                onPress={handleManualVerify}
                disabled={verifying}
                activeOpacity={0.85}
              >
                {verifying
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.confirmBtnText}>I've Paid — Confirm Activation ✓</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pendingDismiss}
                onPress={() => setPendingPayment(null)}
                disabled={verifying}
              >
                <Text style={styles.pendingDismissText}>I didn't complete payment</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Verification required notice */}
          {artisanStatus && artisanStatus !== 'verified' && (
            <View style={styles.verificationNotice}>
              <Text style={styles.verificationNoticeIcon}>⏳</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.verificationNoticeTitle}>Verification Required</Text>
                <Text style={styles.verificationNoticeSub}>
                  Your artisan account must be approved before you can subscribe. Our team usually reviews applications within 24–48 hours.
                </Text>
              </View>
            </View>
          )}

          {/* Upgrade nudge */}
          {upgradeContext && (
            <View style={styles.upgradeNudge}>
              <Text style={styles.upgradeNudgeIcon}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeNudgeTitle}>
                  {upgradeContext.currentPlan === 'free'
                    ? 'Free Plan: 2-Job Limit Reached'
                    : 'Basic Plan: 10-Job Limit Reached'}
                </Text>
                <Text style={styles.upgradeNudgeSub}>
                  {upgradeContext.currentPlan === 'free'
                    ? 'Upgrade to Basic to accept up to 10 jobs simultaneously.'
                    : 'Upgrade to Premium for unlimited simultaneous jobs.'}
                </Text>
              </View>
            </View>
          )}

          {/* Current plan banner */}
          {current && (
            <View style={styles.currentBanner}>
              <View>
                <Text style={styles.currentLabel}>Current Plan</Text>
                <Text style={styles.currentPlan}>
                  {current.planDetails?.name || 'Free'}
                  {activePlan !== 'free' && isActive && (
                    <Text style={styles.currentActive}>  Active</Text>
                  )}
                </Text>
                {expiresAt && activePlan !== 'free' && (
                  <Text style={styles.currentExpiry}>
                    {isActive ? `Renews ${formatDate(expiresAt)}` : `Expired ${formatDate(expiresAt)}`}
                  </Text>
                )}
              </View>
              {activePlan !== 'free' && isActive && (
                <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Plan cards */}
          {plans.map((plan) => {
            const accent    = PLAN_ACCENT[plan.id] || PLAN_ACCENT.free;
            const isCurrent = activePlan === plan.id && isActive;
            const isFree    = plan.id === 'free';
            const isLoading = subscribing === plan.id;

            return (
              <View
                key={plan.id}
                style={[
                  styles.card,
                  isCurrent && { borderColor: accent.color, borderWidth: 2 },
                ]}
              >
                {/* Plan header */}
                <View style={[styles.cardHeader, { backgroundColor: accent.bg }]}>
                  <View style={styles.cardHeaderTop}>
                    <Text style={[styles.planName, { color: accent.color }]}>{plan.name}</Text>
                    {accent.badge && (
                      <View style={[styles.planBadge, { backgroundColor: accent.color }]}>
                        <Text style={styles.planBadgeText}>{accent.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planDesc}>{plan.description}</Text>
                  <View style={styles.priceWrap}>
                    {isFree ? (
                      <Text style={[styles.price, { color: accent.color }]}>Free</Text>
                    ) : (
                      <>
                        <Text style={[styles.priceCurrency, { color: accent.color }]}>₦</Text>
                        <Text style={[styles.price, { color: accent.color }]}>
                          {plan.price.toLocaleString('en-NG')}
                        </Text>
                        <Text style={styles.priceInterval}>/mo</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Features */}
                <View style={styles.featureList}>
                  {(plan.features || []).map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Text style={[styles.featureCheck, { color: accent.color }]}>✓</Text>
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {/* CTA */}
                {isFree ? (
                  <View style={styles.freePillWrap}>
                    <View style={[styles.freePill, isCurrent && { backgroundColor: C.green }]}>
                      <Text style={styles.freePillText}>
                        {isCurrent ? 'Your current plan' : 'Basic access'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.subBtn,
                      { backgroundColor: isCurrent ? C.green : accent.color },
                      (isLoading || verifying || (artisanStatus && artisanStatus !== 'verified')) && { opacity: 0.5 },
                    ]}
                    onPress={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || !!isLoading || verifying || (artisanStatus != null && artisanStatus !== 'verified')}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.subBtnText}>
                        {isCurrent ? '✓ Active Plan' : `Subscribe — ₦${plan.price.toLocaleString('en-NG')}/mo`}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Flutterwave disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              🔒 Payments are processed securely via Flutterwave.
              Subscriptions are billed monthly. Cancel anytime.
            </Text>
          </View>

          {/* Payment history */}
          {current?.history?.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Payment History</Text>
              {current.history.slice(-5).reverse().map((h, i) => (
                <View key={i} style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyPlan}>{h.plan?.toUpperCase()} Plan</Text>
                    <Text style={styles.historyDate}>{formatDate(h.paidAt)}</Text>
                  </View>
                  <Text style={styles.historyAmount}>₦{(h.amount || 0).toLocaleString('en-NG')}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
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

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:  { padding: 16, paddingBottom: 48 },

  upgradeNudge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FCD34D', marginBottom: 16,
  },
  upgradeNudgeIcon:  { fontSize: 24 },
  upgradeNudgeTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  upgradeNudgeSub:   { fontSize: 13, color: '#78350F', lineHeight: 18 },

  currentBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: 12, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: C.border,
  },
  currentLabel:  { fontSize: 11, color: C.muted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  currentPlan:   { fontSize: 17, fontWeight: '800', color: C.text },
  currentActive: { fontSize: 13, fontWeight: '700', color: C.green },
  currentExpiry: { fontSize: 12, color: C.sub, marginTop: 2 },
  cancelBtn:     { backgroundColor: '#FEE2E2', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  cancelBtnText: { color: C.red, fontSize: 13, fontWeight: '700' },

  card: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader:    { padding: 18 },
  cardHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  planName:      { fontSize: 18, fontWeight: '800' },
  planBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  planBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  planDesc:      { fontSize: 12, color: C.sub, marginBottom: 10 },
  priceWrap:     { flexDirection: 'row', alignItems: 'flex-end' },
  priceCurrency: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  price:         { fontSize: 28, fontWeight: '900', lineHeight: 34 },
  priceInterval: { fontSize: 12, color: C.sub, marginBottom: 6, marginLeft: 1 },

  featureList: { padding: 16, gap: 10 },
  featureRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureCheck:{ fontSize: 14, fontWeight: '800', marginTop: 1 },
  featureText: { flex: 1, fontSize: 14, color: C.sub, lineHeight: 20 },

  freePillWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  freePill: {
    backgroundColor: '#E2E8F0', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  freePillText: { color: '#475569', fontSize: 13, fontWeight: '700' },

  subBtn: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  subBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  disclaimer: {
    backgroundColor: '#F8FAFF', borderRadius: 10, padding: 14,
    marginTop: 4, marginBottom: 24,
    borderWidth: 1, borderColor: C.border,
  },
  disclaimerText: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },

  historySection: { marginBottom: 16 },
  historyTitle:   { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: C.border,
  },
  historyPlan:   { fontSize: 13, fontWeight: '700', color: C.text },
  historyDate:   { fontSize: 11, color: C.muted, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '800', color: C.primary },

  verificationNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FDE68A', marginBottom: 16,
  },
  verificationNoticeIcon:  { fontSize: 24 },
  verificationNoticeTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  verificationNoticeSub:   { fontSize: 13, color: '#78350F', lineHeight: 18 },

  pendingBanner: {
    backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 2, borderColor: '#F59E0B',
  },
  pendingBannerTop:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  pendingBannerIcon: { fontSize: 26, marginTop: 2 },
  pendingBannerTitle:{ fontSize: 15, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  pendingBannerSub:  { fontSize: 13, color: '#78350F', lineHeight: 18 },
  confirmBtn: {
    backgroundColor: C.green, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  confirmBtnText:    { color: '#FFF', fontSize: 15, fontWeight: '800' },
  pendingDismiss:    { alignItems: 'center', paddingVertical: 6 },
  pendingDismissText:{ fontSize: 13, color: '#92400E', fontWeight: '600' },
});
