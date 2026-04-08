import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getOnboardingStatus } from '../../../api/artisanApi';
import { clearSession } from '../../../utils/storage';

const STATUS_CONFIG = {
  pending: {
    icon: '⏳',
    title: 'Verification Pending',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    message:
      'Your profile has been submitted and is under review. Our team will verify your details within 24–48 hours.',
  },
  verified: {
    icon: '✅',
    title: 'Verified!',
    color: '#22C55E',
    bgColor: '#F0FDF4',
    message: 'Your account is verified. You can now receive and accept job requests.',
  },
  rejected: {
    icon: '❌',
    title: 'Verification Rejected',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    message: 'Your verification was not approved. See the reason below and re-submit.',
  },
  incomplete: {
    icon: '📋',
    title: 'Onboarding Incomplete',
    color: '#6B7280',
    bgColor: '#F9FAFB',
    message: 'Please complete all onboarding steps before submitting for verification.',
  },
};

export default function PendingVerification({ navigation }) {
  const [status, setStatus] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch status every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [])
  );

  const fetchStatus = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getOnboardingStatus();
      const data = res.data.data;
      setStatus(data.verificationStatus);
      setRejectionReason(data.rejectionReason || null);
      setCompletedSteps(data.completedSteps);

      // If now verified, redirect to dashboard
      if (data.verificationStatus === 'verified') {
        setTimeout(() => {
          // Navigation to main dashboard — replace with real route when built
          Alert.alert('Account Verified!', 'You can now start receiving job requests.', [
            { text: 'Get Started' },
          ]);
        }, 500);
      }
    } catch (err) {
      if (!isRefresh) {
        Alert.alert('Error', 'Could not fetch your verification status. Check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResubmit = () => {
    // Find the first incomplete step and navigate there
    if (!completedSteps) return;
    if (!completedSteps.profilePhoto) return navigation.navigate('Step1_ProfilePhoto');
    if (!completedSteps.skills) return navigation.navigate('Step2_Skills');
    if (!completedSteps.location) return navigation.navigate('Step3_Location');
    if (!completedSteps.verificationId) return navigation.navigate('Step4_VerificationID');
    if (!completedSteps.skillVideo) return navigation.navigate('Step5_SkillVideo');
    // All steps done but rejected — go re-upload ID (most common rejection reason)
    navigation.navigate('Step4_VerificationID');
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          // Navigate to login — replace with real navigation once auth screens are built
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Checking verification status...</Text>
      </SafeAreaView>
    );
  }

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: config.bgColor }]}>
          <Text style={styles.statusIcon}>{config.icon}</Text>
          <Text style={[styles.statusTitle, { color: config.color }]}>{config.title}</Text>
          <Text style={styles.statusMessage}>{config.message}</Text>
        </View>

        {/* Rejection Reason */}
        {status === 'rejected' && rejectionReason && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionTitle}>Reason for Rejection:</Text>
            <Text style={styles.rejectionText}>{rejectionReason}</Text>
          </View>
        )}

        {/* Step Checklist */}
        {completedSteps && (
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Onboarding Checklist</Text>
            {[
              { key: 'profilePhoto', label: 'Profile Photo' },
              { key: 'skills', label: 'Skills' },
              { key: 'location', label: 'Location' },
              { key: 'verificationId', label: 'Verification ID' },
              { key: 'skillVideo', label: 'Skill Video' },
            ].map((step) => (
              <View key={step.key} style={styles.stepRow}>
                <Text style={styles.stepCheck}>
                  {completedSteps[step.key] ? '✅' : '⬜'}
                </Text>
                <Text
                  style={[
                    styles.stepLabel,
                    !completedSteps[step.key] && styles.stepLabelIncomplete,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Info about what happens next */}
        {status === 'pending' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <Text style={styles.infoText}>
              1. Our team reviews your profile photo, ID, and skill video.
            </Text>
            <Text style={styles.infoText}>2. You will receive a notification once reviewed.</Text>
            <Text style={styles.infoText}>
              3. If rejected, you can correct the issue and re-submit.
            </Text>
            <Text style={styles.infoText}>
              4. Once verified, you can start receiving job requests.
            </Text>
            <Text style={[styles.infoText, { marginTop: 8, color: '#999' }]}>
              ⚠ Do not share personal contact details with anyone before your account is verified.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {/* Refresh */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchStatus(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color="#FF6B00" size="small" />
          ) : (
            <Text style={styles.refreshBtnText}>↻ Refresh Status</Text>
          )}
        </TouchableOpacity>

        {/* Re-submit if rejected or incomplete */}
        {(status === 'rejected' || status === 'incomplete') && (
          <TouchableOpacity style={styles.resubmitBtn} onPress={handleResubmit}>
            <Text style={styles.resubmitBtnText}>
              {status === 'rejected' ? 'Fix & Re-submit' : 'Complete Onboarding'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingText: { marginTop: 12, color: '#999', fontSize: 14 },
  scroll: { padding: 24, paddingBottom: 20 },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIcon: { fontSize: 48, marginBottom: 12 },
  statusTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  statusMessage: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  rejectionBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  rejectionTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
  rejectionText: { fontSize: 14, color: '#7F1D1D', lineHeight: 20 },
  stepsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stepsTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepCheck: { fontSize: 16, marginRight: 10 },
  stepLabel: { fontSize: 15, color: '#333' },
  stepLabelIncomplete: { color: '#BBB' },
  infoBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 10 },
  infoText: { fontSize: 13, color: '#374151', marginBottom: 6, lineHeight: 20 },
  footer: { padding: 24, paddingTop: 0, gap: 10 },
  refreshBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  refreshBtnText: { color: '#FF6B00', fontWeight: '600', fontSize: 15 },
  resubmitBtn: {
    backgroundColor: '#FF6B00',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resubmitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  logoutBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#999', fontSize: 14 },
});
