import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackButton from '../../components/BackButton';
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
  free:  { color: C.sub,     bg: '#F1F5F9', badge: null },
  pro:   { color: C.primary, bg: '#EFF6FF', badge: 'Most Popular' },
  elite: { color: C.gold,    bg: '#FFFBEB', badge: 'Best Value'   },
};

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function SubscriptionScreen({ navigation }) {
  const [plans, setPlans]         = useState([]);
  const [current, setCurrent]     = useState(null); // current subscription
  const [loading, setLoading]     = useState(true);
  const [subscribing, setSubscribing] = useState(null); // planId being processed

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([getPlans(), getMySubscription()]);
      setPlans(plansRes.data.data || []);
      setCurrent(subRes.data.data || null);
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

    setSubscribing(planId);
    try {
      const res = await initiateSubscription(planId);
      const { authorizationUrl, reference } = res.data.data;

      // Open Paystack checkout in device browser
      await Linking.openURL(authorizationUrl);

      // After the browser, ask the user if payment was completed
      Alert.alert(
        'Payment Complete?',
        'If you completed the payment, tap Confirm to activate your subscription.',
        [
          { text: 'Not Yet', style: 'cancel' },
          {
            text: 'Confirm Payment',
            onPress: () => handleVerify(reference),
          },
        ]
      );
    } catch (err) {
      const msg = err?.response?.data?.message || 'Could not initiate payment. Please try again.';
      Alert.alert('Payment Error', msg);
    } finally {
      setSubscribing(null);
    }
  };

  const handleVerify = async (reference) => {
    try {
      const res = await verifySubscription(reference);
      if (res.data.success) {
        Alert.alert('Subscription Activated! 🎉', res.data.message);
        load(); // refresh subscription state
      } else {
        Alert.alert('Verification Failed', 'Payment could not be verified. Contact support if funds were deducted.');
      }
    } catch {
      Alert.alert('Error', 'Verification failed. Contact support with your payment reference.');
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
                      isLoading && { opacity: 0.7 },
                    ]}
                    onPress={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || !!isLoading}
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
});
