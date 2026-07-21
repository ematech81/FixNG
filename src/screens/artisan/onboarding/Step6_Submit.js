import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

const TOTAL_STEPS = 6;
const CURRENT_STEP = 6;

const COMPLETED_ITEMS = [
  { label: 'Profile Photo',   required: true  },
  { label: 'Skills & Bio',    required: true  },
  { label: 'Location',        required: true  },
  { label: 'ID Verification', required: false },
  { label: 'Skill Video',     required: false },
];

export default function Step6_Submit({ navigation, route }) {
  const { onGoToDashboard, onCancelRegistration } = useOnboarding();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const styles = makeStyles(colors);

  // Steps the user completed in this session (passed from Step5 as route params)
  const completedFlags = route?.params?.completedFlags ?? {};

  const handleComplete = () => {
    setLoading(true);
    Alert.alert(
      'Registration Successful! 🎉',
      'Welcome to FixNG! Your artisan profile is now live and ready to receive job requests from customers.\n\nClick the button below to access your artisan dashboard.',
      [{ text: 'Access your Artisan Dashboard', onPress: () => { setLoading(false); onGoToDashboard?.(); } }],
      { cancelable: false }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressText}>Final Step</Text>
            <TouchableOpacity onPress={() => {
              Alert.alert(
                'Cancel Registration?',
                'This will cancel your artisan registration and return you to your customer account.',
                [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Cancel Registration', style: 'destructive', onPress: () => onCancelRegistration?.() },
                ]
              );
            }}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressTrack}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View key={i} style={[styles.progressSegment, styles.progressSegmentActive]} />
            ))}
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroWrap}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>✅</Text>
          </View>
          <Text style={styles.title}>Almost Done!</Text>
          <Text style={styles.subtitle}>
            Review your profile below and tap{' '}
            <Text style={styles.bold}>Complete Registration</Text>{' '}
            to go live and start receiving job requests.
          </Text>
        </View>

        {/* Completed steps */}
        <View style={styles.summaryCard}>
          {COMPLETED_ITEMS.map(({ label, required }, i, arr) => {
            const done = completedFlags[label] ?? required;
            return (
              <View key={label} style={[styles.summaryRow, i < arr.length - 1 && styles.summaryRowBorder]}>
                <View style={[styles.checkCircle, { backgroundColor: done ? '#e6f4ed' : '#f5f5f5' }]}>
                  <Text style={{ fontSize: 14 }}>{done ? '✓' : '–'}</Text>
                </View>
                <Text style={styles.summaryLabel}>{label}</Text>
                {!required && !done && (
                  <View style={styles.skippedBadge}>
                    <Text style={styles.skippedText}>Skipped</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.infoNote}>
          You can add your ID and skill video later from profile settings to unlock your Verified badge.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.submitBtnText}>Complete Registration</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.submitNote}>Your profile goes live immediately after submission.</Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container:            { flex: 1, backgroundColor: colors.card },
  scroll:               { padding: 24, paddingBottom: 40 },
  progressContainer:    { marginBottom: 24 },
  progressTopRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText:         { fontSize: 13, color: colors.textMuted },
  cancelLink:           { fontSize: 13, color: colors.error, fontWeight: '600' },
  progressTrack:        { flexDirection: 'row', gap: 6 },
  progressSegment:      { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegmentActive:{ backgroundColor: colors.info },

  heroWrap:   { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e6f4ed', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconEmoji:  { fontSize: 36 },
  title:      { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 10, textAlign: 'center' },
  subtitle:   { fontSize: 15, color: colors.textSub, textAlign: 'center', lineHeight: 23 },
  bold:       { fontWeight: '700', color: colors.text },

  summaryCard:       { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  summaryRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  summaryRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  checkCircle:       { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryLabel:      { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  skippedBadge:      { backgroundColor: colors.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  skippedText:       { fontSize: 11, color: colors.textMuted, fontWeight: '600' },

  infoNote:          { fontSize: 13, color: colors.textHint, textAlign: 'center', lineHeight: 20 },

  footer:            { padding: 24, paddingTop: 0, gap: 10 },
  submitBtn:         { backgroundColor: colors.info, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: colors.infoBg },
  submitBtnText:     { color: colors.card, fontWeight: '700', fontSize: 16 },
  submitNote:        { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
