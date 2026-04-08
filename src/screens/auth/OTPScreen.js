import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { verifyRegister, verifyLoginOTP, sendOTP } from '../../api/authApi';
import { saveToken, saveUser } from '../../utils/storage';

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60; // seconds

export default function OTPScreen({ route, navigation }) {
  // mode: 'register' | 'login'
  const { mode, phone, name, role, deviceId, onAuthSuccess } = route.params;

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(RESEND_COUNTDOWN);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // Start the resend countdown on mount
  useEffect(() => {
    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Focus first box on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleDigitChange = (text, index) => {
    const digit = text.replace(/\D/g, '').slice(-1); // only last digit
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (digit && index === OTP_LENGTH - 1) {
      const all = [...updated];
      if (all.every((d) => d !== '')) {
        handleVerify(all.join(''));
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode) => {
    const otp = otpCode || digits.join('');
    if (otp.length < OTP_LENGTH) {
      Alert.alert('Incomplete', 'Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (mode === 'register') {
        res = await verifyRegister({ name, phone, role, otp });
      } else {
        // Pass deviceId so backend can register this device as trusted
        res = await verifyLoginOTP({ phone, otp, deviceId });
      }

      const { token, user, artisanProfile } = res.data;
      await saveToken(token);
      await saveUser(user);
      onAuthSuccess({ user, artisanProfile });
    } catch (err) {
      const msg = err?.message || 'Verification failed. Please try again.';
      Alert.alert('Invalid Code', msg);
      // Clear digits on failure so user can re-enter
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await sendOTP(phone);
      setDigits(Array(OTP_LENGTH).fill(''));
      setResendCountdown(RESEND_COUNTDOWN);
      // Restart countdown
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      Alert.alert('Sent', 'A new code has been sent to your phone.');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not resend OTP. Try again.');
    } finally {
      setResending(false);
    }
  };

  // Mask the phone number for display: +234 *** *** 4567
  const maskedPhone = phone
    ? phone.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, '$1 *** *** $4')
    : phone;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.appName}>FixNG</Text>
          <View style={{ width: 24 }} />
        </TouchableOpacity>

        <View style={styles.body}>
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
          </Text>

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => (inputRefs.current[i] = r)}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={2} // allow 2 so backspace clears properly
                textAlign="center"
                selectTextOnFocus
                caretHidden
              />
            ))}
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
            onPress={() => handleVerify()}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify  →</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive the code? </Text>
            {resendCountdown > 0 ? (
              <Text style={styles.resendCountdown}>Resend in {resendCountdown}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending ? (
                  <ActivityIndicator size="small" color={PRIMARY} />
                ) : (
                  <Text style={styles.resendLink}>Resend OTP</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.expiryNote}>Code expires in 10 minutes</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#2563EB';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  backRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  backArrow: { fontSize: 22, color: '#1A1A1A' },
  appName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  body: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },

  title: {
    fontSize: 30, fontWeight: '800', color: '#1E232C',
    textAlign: 'center', marginBottom: 12,
  },
  subtitle: {
    fontSize: 15, color: '#8391A1', textAlign: 'center',
    lineHeight: 23, marginBottom: 40,
  },
  phoneHighlight: { color: '#1E232C', fontWeight: '700' },

  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    gap: 10, marginBottom: 40,
  },
  otpBox: {
    flex: 1, height: 60, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E8ECF4',
    backgroundColor: '#FFF', fontSize: 24, fontWeight: '700', color: '#1E232C',
  },
  otpBoxFilled: { borderColor: PRIMARY, backgroundColor: '#FFF3EC' },

  verifyBtn: {
    backgroundColor: PRIMARY, paddingVertical: 18,
    borderRadius: 14, alignItems: 'center', marginBottom: 28,
  },
  verifyBtnDisabled: { backgroundColor: '#FFCBA4' },
  verifyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

  resendRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  resendLabel: { fontSize: 14, color: '#6B7280' },
  resendCountdown: { fontSize: 14, color: '#8391A1', fontWeight: '600' },
  resendLink: { fontSize: 14, color: PRIMARY, fontWeight: '700' },

  expiryNote: { textAlign: 'center', fontSize: 12, color: '#B0B7C3' },
});
