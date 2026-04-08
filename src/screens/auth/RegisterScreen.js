import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendOTP } from '../../api/authApi';

// Role option data
const ROLES = [
  {
    value: 'customer',
    label: 'Customer',
    icon: '👤',
  },
  {
    value: 'artisan',
    label: 'Artisan',
    icon: '🔧',
  },
];

export default function RegisterScreen({ navigation, onAuthSuccess }) {
  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (text) => {
    // Input value is raw digits only — no +234 prefix in the TextInput value
    setPhone(text.replace(/\D/g, ''));
  };

  const handleCreateAccount = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!phone || phone.length < 10) {
      Alert.alert('Required', 'Please enter a valid Nigerian phone number.');
      return;
    }
    if (!agreed) {
      Alert.alert('Terms', 'Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    // Build full phone for API (+234 + digits without leading 0)
    const normalized = phone.startsWith('0') ? `+234${phone.slice(1)}` : `+234${phone}`;

    setLoading(true);
    try {
      await sendOTP(normalized);
      // Navigate to OTP screen, passing registration data
      navigation.navigate('OTP', {
        mode: 'register',
        phone: normalized,
        name: name.trim(),
        role,
        onAuthSuccess,
      });
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back arrow */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.appName}>FixNG</Text>
            <View style={{ width: 24 }} />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join the community of trusted professionals{'\n'}and clients.
          </Text>

          {/* Role selector */}
          <Text style={styles.sectionLabel}>SELECT YOUR ROLE</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleCard, role === r.value && styles.roleCardActive]}
                onPress={() => setRole(r.value)}
                activeOpacity={0.8}
              >
                {role === r.value && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                )}
                <View style={[styles.roleIconCircle, role === r.value && styles.roleIconCircleActive]}>
                  <Text style={styles.roleEmoji}>{r.icon}</Text>
                </View>
                <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Full Name */}
          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#B0B7C3"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Text style={styles.inputIcon}>👤</Text>
          </View>

          {/* Phone Number */}
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+234</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="801 234 5678"
              placeholderTextColor="#B0B7C3"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={11}
            />
          </View>

          {/* Security check / Terms */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SECURITY CHECK</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreed((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              By clicking Create Account, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleCreateAccount}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Create Account  →</Text>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#FF6B00';
const BORDER = '#E8ECF4';
const LABEL_COLOR = '#8391A1';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1 },

  backRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backArrow: { fontSize: 22, color: '#1A1A1A' },
  appName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  title: {
    fontSize: 30, fontWeight: '800', color: '#1E232C',
    textAlign: 'center', marginTop: 12, marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: '#8391A1', textAlign: 'center',
    lineHeight: 22, marginBottom: 30,
  },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#8391A1',
    letterSpacing: 1.2, marginBottom: 12,
  },

  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  roleCard: {
    flex: 1, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 16, padding: 20, alignItems: 'center',
    backgroundColor: '#FFF', position: 'relative', minHeight: 120,
    justifyContent: 'center',
  },
  roleCardActive: { borderColor: PRIMARY, borderWidth: 2 },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
  },
  checkIcon: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  roleIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F0F3FF', justifyContent: 'center',
    alignItems: 'center', marginBottom: 10,
  },
  roleIconCircleActive: { backgroundColor: '#FFF3EC' },
  roleEmoji: { fontSize: 26 },
  roleLabel: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  roleLabelActive: { color: PRIMARY },

  fieldLabel: {
    fontSize: 15, fontWeight: '700', color: '#1E232C', marginBottom: 8, marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 16,
  },
  input: {
    flex: 1, paddingVertical: 16, fontSize: 15, color: '#1E232C',
  },
  inputIcon: { fontSize: 18, marginLeft: 6 },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 12, overflow: 'hidden', marginBottom: 16,
  },
  prefixBox: {
    paddingHorizontal: 14, paddingVertical: 16,
    backgroundColor: '#F0F3FF',
    borderRightWidth: 1.5, borderRightColor: BORDER,
  },
  prefixText: { fontSize: 15, fontWeight: '700', color: '#1E232C' },
  phoneInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 16,
    fontSize: 15, color: '#1E232C',
  },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontSize: 11, fontWeight: '700', color: LABEL_COLOR, letterSpacing: 1 },

  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: BORDER, marginBottom: 28,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: '#22C55E', justifyContent: 'center', alignItems: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  checkboxTick: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  termsText: { flex: 1, fontSize: 13, color: '#6B7280', lineHeight: 20 },
  termsLink: { color: PRIMARY, fontWeight: '700' },

  submitBtn: {
    backgroundColor: PRIMARY, paddingVertical: 18,
    borderRadius: 14, alignItems: 'center', marginBottom: 20,
  },
  submitBtnDisabled: { backgroundColor: '#FFCBA4' },
  submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

  loginLink: { alignItems: 'center', paddingVertical: 4 },
  loginLinkText: { fontSize: 14, color: '#6B7280' },
  loginLinkBold: { color: PRIMARY, fontWeight: '700' },
});
