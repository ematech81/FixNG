import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendOTP } from '../../api/authApi';
import { getDeviceId } from '../../utils/deviceId';
import BackButton from '../../components/BackButton';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterScreen({ navigation, onAuthSuccess }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (text) => {
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

    const normalized  = phone.startsWith('0') ? `+234${phone.slice(1)}` : `+234${phone}`;
    const cleanEmail  = email.trim().toLowerCase() || null;

    const doSendOtp = async () => {
      setLoading(true);
      try {
        const deviceId = await getDeviceId();
        const res = await sendOTP(normalized, cleanEmail || undefined);
        navigation.navigate('OTP', {
          mode:       'register',
          phone:      normalized,
          name:       name.trim(),
          role:       'customer',
          deviceId,
          onAuthSuccess,
          email:      cleanEmail,
          emailUsed:  res.data?.emailUsed  || false,
          maskedEmail: res.data?.maskedEmail || null,
        });
      } catch (err) {
        Alert.alert('Error', err?.message || 'Could not send OTP. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (!cleanEmail) {
      Alert.alert(
        'Add Your Email',
        'Without an email you cannot receive your access key at night when SMS is unavailable.',
        [
          { text: 'Add Email', style: 'cancel' },
          { text: 'Continue Anyway', style: 'destructive', onPress: doSendOtp },
        ]
      );
      return;
    }

    doSendOtp();
  };

  const styles = makeStyles(colors);

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
          <View style={styles.backRow}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={styles.appName}>FixNG</Text>
            <View style={{ width: 28 }} />
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join the community of trusted professionals{'\n'}and clients.
          </Text>

          {/* Full Name */}
          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textHint}
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
              placeholderTextColor={colors.textHint}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={11}
            />
          </View>

          {/* Email Address */}
          <Text style={styles.fieldLabel}>Email Address</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="yourname@example.com"
              placeholderTextColor={colors.textHint}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            <Text style={styles.inputIcon}>✉️</Text>
          </View>

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
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://ematech81.github.io/FixNGTerms/')}
              >Terms of Service</Text>
              {' '}and{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://ematech81.github.io/FixNGTerms/')}
              >Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>

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

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.inputBg },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1 },

  backRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16,
  },
  appName: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },

  title: {
    fontSize: 30, fontWeight: '800', color: colors.text,
    textAlign: 'center', marginTop: 12, marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: colors.textMuted, textAlign: 'center',
    lineHeight: 22, marginBottom: 30,
  },

  fieldLabel: {
    fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8, marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.borderInput,
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 16,
  },
  input: {
    flex: 1, paddingVertical: 16, fontSize: 15, color: colors.text,
  },
  inputIcon: { fontSize: 18, marginLeft: 6 },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.borderInput,
    borderRadius: 12, overflow: 'hidden', marginBottom: 16,
  },
  prefixBox: {
    paddingHorizontal: 14, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRightWidth: 1.5, borderRightColor: colors.borderInput,
  },
  prefixText: { fontSize: 15, fontWeight: '700', color: colors.text },
  phoneInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 16,
    fontSize: 15, color: colors.text,
  },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderInput },
  dividerText: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },

  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.borderInput, marginBottom: 28,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: colors.success, justifyContent: 'center', alignItems: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkboxTick: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  termsText: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  termsLink: { color: colors.primary, fontWeight: '700' },

  submitBtn: {
    backgroundColor: colors.primary, paddingVertical: 18,
    borderRadius: 14, alignItems: 'center', marginBottom: 20,
  },
  submitBtnDisabled: { backgroundColor: colors.primaryDisabled },
  submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

  loginLink: { alignItems: 'center', paddingVertical: 4 },
  loginLinkText: { fontSize: 14, color: colors.textMuted },
  loginLinkBold: { color: colors.primary, fontWeight: '700' },
});
