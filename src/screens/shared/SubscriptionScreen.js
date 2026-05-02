import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackButton from '../../components/BackButton';
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
  // Persists across browser round-trip so the confirm banner stays visible
  const [pendingPayment, setPendingPayment] = useState(null); // { reference, planName }
  const [artisanStatus, setArtisanStatus] = useState(null);

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

    // Step 1 — explain the process before opening the browser
    const planName = plans.find(p => p.id === planId)?.name || planId;
    Alert.alert(
      'You\'re about to pay via Paystack',
      `You will be redirected to the Paystack payment page to complete your ${planName} subscription.\n\nAfter paying, come back to this screen and tap "I've Paid — Confirm" to activate your subscription.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Paystack →',
          onPress: () => openPaystack(planId, planName),
        },
      ]
    );
  };

  const openPaystack = async (planId, planName) => {
    setSubscribing(planId);
    try {
      const res = await initiateSubscription(planId);
      const { authorizationUrl, reference } = res.data.data;

      // Open Paystack checkout in device browser
      await Linking.openURL(authorizationUrl);

      // Store reference in state — this persists when user returns from browser
      setPendingPayment({ reference, planName });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not initiate payment. Please try again.';
      Alert.alert('Payment Error', msg);
    } finally {
      setSubscribing(null);
    }
  };

  const handleVerify = async () => {
    if (!pendingPayment) return;
    setVerifying(true);
    try {
      const res = await verifySubscription(pendingPayment.reference);
      if (res.data.success) {
        setPendingPayment(null);
        Alert.alert('Subscription Activated! 🎉', res.data.message);
        load();
      } else {
        Alert.alert('Verification Failed', 'Payment could not be verified. Contact support if funds were deducted.');
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
          {/* ── Pending payment confirmation banner ── */}
          {pendingPayment && (
            <View style={styles.pendingBanner}>
              <View style={styles.pendingBannerTop}>
                <Text style={styles.pendingBannerIcon}>⏳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingBannerTitle}>Payment Pending Confirmation</Text>
                  <Text style={styles.pendingBannerSub}>
                    If you completed the {pendingPayment.planName} payment on Paystack, tap the button below to activate your subscription.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.confirmBtn, verifying && { opacity: 0.7 }]}
                onPress={handleVerify}
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

          {/* Verification required notice — shown for unverified artisans */}
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

          {/* Upgrade nudge — shown when navigated here from a job limit error */}
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
            const accent     = PLAN_ACCENT[plan.id] || PLAN_ACCENT.free;
            const isCurrent  = activePlan === plan.id && isActive;
            const isFree     = plan.id === 'free';
            const isLoading  = subscribing === plan.id;

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
                  {/* Name row + inline badge */}
                  <View style={styles.cardHeaderTop}>
                    <Text style={[styles.planName, { color: accent.color }]}>{plan.name}</Text>
                    {accent.badge && (
                      <View style={[styles.planBadge, { backgroundColor: accent.color }]}>
                        <Text style={styles.planBadgeText}>{accent.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planDesc}>{plan.description}</Text>
                  {/* Price row — always below the name, never overlapping */}
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

                {/* CTA button */}
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
                      (isLoading || (artisanStatus && artisanStatus !== 'verified')) && { opacity: 0.5 },
                    ]}
                    onPress={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || !!isLoading || (artisanStatus != null && artisanStatus !== 'verified')}
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

          {/* Paystack disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              🔒 Payments are processed securely via Paystack.
              Subscriptions auto-renew monthly. Cancel anytime.
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

  // Upgrade nudge banner (shown when arriving from a job limit error)
  upgradeNudge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FCD34D', marginBottom: 16,
  },
  upgradeNudgeIcon: { fontSize: 24 },
  upgradeNudgeTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  upgradeNudgeSub:   { fontSize: 13, color: '#78350F', lineHeight: 18 },

  // Current plan banner
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

  // Plan card
  card: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { padding: 18 },
  cardHeaderTop: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap',
  },
  planName:     { fontSize: 18, fontWeight: '800' },
  planBadge:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  planBadgeText:{ color: '#FFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  planDesc:     { fontSize: 12, color: C.sub, marginBottom: 10 },
  priceWrap:    { flexDirection: 'row', alignItems: 'flex-end' },
  priceCurrency:{ fontSize: 14, fontWeight: '700', marginBottom: 4 },
  price:        { fontSize: 28, fontWeight: '900', lineHeight: 34 },
  priceInterval:{ fontSize: 12, color: C.sub, marginBottom: 6, marginLeft: 1 },

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

  // ── Verification required notice ─────────────────────────────────────────────
  verificationNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FDE68A', marginBottom: 16,
  },
  verificationNoticeIcon: { fontSize: 24 },
  verificationNoticeTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  verificationNoticeSub: { fontSize: 13, color: '#78350F', lineHeight: 18 },

  // ── Pending payment confirmation banner ──────────────────────────────────────
  pendingBanner: {
    backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 2, borderColor: '#F59E0B',
  },
  pendingBannerTop: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14,
  },
  pendingBannerIcon: { fontSize: 26, marginTop: 2 },
  pendingBannerTitle: {
    fontSize: 15, fontWeight: '800', color: '#92400E', marginBottom: 4,
  },
  pendingBannerSub: { fontSize: 13, color: '#78350F', lineHeight: 18 },
  confirmBtn: {
    backgroundColor: C.green, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  pendingDismiss: { alignItems: 'center', paddingVertical: 6 },
  pendingDismissText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
});
