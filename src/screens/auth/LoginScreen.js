import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkDevice } from '../../api/authApi';
import { getDeviceId } from '../../utils/deviceId';
import { saveToken, saveUser } from '../../utils/storage';

export default function LoginScreen({ navigation, onAuthSuccess }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (text) => {
    // The input value is raw digits only — strip anything else (e.g. paste with spaces)
    const digits = text.replace(/\D/g, '');
    setPhone(digits);
  };

  const handleLogin = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Required', 'Please enter a valid Nigerian phone number.');
      return;
    }

    // Build E.164 from local input
    const normalized = phone.startsWith('0')
      ? `+234${phone.slice(1)}`
      : `+234${phone}`;

    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const res = await checkDevice(normalized, deviceId);
      const data = res.data;

      if (!data.needsOTP) {
        // Known device — backend returned a token directly, no OTP needed
        await saveToken(data.token);
        await saveUser(data.user);
        onAuthSuccess({ user: data.user, artisanProfile: data.artisanProfile });
        return;
      }

      // Unknown device or new user — go through OTP screen
      // Note: OTP was already sent by the check-device endpoint for existing users
      // For new users (isNewUser: true), OTP will be sent from the Register screen
      if (data.isNewUser) {
        Alert.alert(
          'Account Not Found',
          'No account found for this number. Would you like to register?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register', onPress: () => navigation.navigate('Register') },
          ]
        );
        return;
      }

      // Existing user on new device — OTP already sent by check-device
      navigation.navigate('OTP', {
        mode: 'login',
        phone: data.phone || normalized,
        deviceId,
        onAuthSuccess,
      });
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not sign in. Please try again.');
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
          {/* Nav bar */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()}>
              <Text style={styles.navBack}>←</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>FixNG</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* App icon */}
          <View style={styles.iconWrapper}>
            {/* <View style={styles.iconBox}> */}
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.iconImg}
                resizeMode="contain"
              />
            {/* </View> */}
          </View>

          {/* Title + subtitle */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to find the best artisans in Nigeria.</Text>

          {/* Login card */}
          <View style={styles.card}>
            {/* Phone field */}
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
                onSubmitEditing={handleLogin}
                maxLength={11}
              />
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginBtnText}>Login  ⇥</Text>
              )}
            </TouchableOpacity>

            {/* Forgot password */}
            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register link */}
            <Text style={styles.registerText}>
              New to FixNG?{' '}
              <Text
                style={styles.registerLink}
                onPress={() => navigation.navigate('Register')}
              >
                Register
              </Text>
            </Text>
          </View>

          {/* Trust badges */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, styles.badgeGreen]}>
              <Text style={styles.badgeIcon}>✅</Text>
              <Text style={[styles.badgeText, { color: '#166534' }]}>VERIFIED ARTISANS</Text>
            </View>
            <View style={[styles.badge, styles.badgeAmber]}>
              <Text style={styles.badgeIcon}>🔒</Text>
              <Text style={[styles.badgeText, { color: '#92400E' }]}>SECURE PAYMENTS</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLinks}>
              <TouchableOpacity style={styles.footerItem}>
                <Text style={styles.footerIcon}>❓</Text>
                <Text style={styles.footerLabel}>Help</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem}>
                <Text style={styles.footerIcon}>🛡️</Text>
                <Text style={styles.footerLabel}>Security</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem}>
                <Text style={styles.footerIcon}>⚖️</Text>
                <Text style={styles.footerLabel}>Legal</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.copyright}>© 2024 ARTISAN FINDER NIGERIA</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#2563EB';   // blue matching design
const BG = '#F1F5FB';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingBottom: 30 },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E8ECF4',
  },
  navBack: { fontSize: 22, color: '#1A1A1A', width: 24 },
  navTitle: { fontSize: 16, fontWeight: '700', color: PRIMARY },

  iconWrapper: { alignItems: 'center', marginTop: 36, marginBottom: 20 },
  iconBox: {
    width: 90, height: 90, borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  iconImg: { width: 80, height: 80 },

  title: {
    fontSize: 28, fontWeight: '800', color: '#1E232C',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: '#8391A1',
    textAlign: 'center', marginBottom: 28, paddingHorizontal: 40,
  },

  card: {
    marginHorizontal: 20, backgroundColor: '#FFF',
    borderRadius: 20, padding: 24,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
    marginBottom: 28,
  },

  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#1E232C', marginBottom: 10 },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0F4FB', borderRadius: 12,
    overflow: 'hidden', marginBottom: 20,
  },
  prefixBox: {
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: '#E4EBFA',
    borderRightWidth: 1, borderRightColor: '#D0D9EE',
  },
  prefixText: { fontSize: 15, fontWeight: '700', color: '#1E232C' },
  phoneInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 16,
    fontSize: 15, color: '#1E232C',
  },

  loginBtn: {
    backgroundColor: PRIMARY, paddingVertical: 17,
    borderRadius: 14, alignItems: 'center', marginBottom: 20,
  },
  loginBtnDisabled: { backgroundColor: '#93C5FD' },
  loginBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

  forgotRow: { alignItems: 'center', marginBottom: 20 },
  forgotText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8ECF4' },
  dividerLabel: { fontSize: 13, color: '#8391A1', fontWeight: '600' },

  registerText: { textAlign: 'center', fontSize: 14, color: '#6B7280' },
  registerLink: { color: '#16A34A', fontWeight: '800' },

  badgesRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, marginBottom: 32,
  },
  badge: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 14,
  },
  badgeGreen: { backgroundColor: '#DCFCE7' },
  badgeAmber: { backgroundColor: '#FEF3C7' },
  badgeIcon: { fontSize: 18 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, flexShrink: 1 },

  footer: { alignItems: 'center', paddingHorizontal: 20 },
  footerLinks: {
    flexDirection: 'row', gap: 40, marginBottom: 14,
  },
  footerItem: { alignItems: 'center', gap: 4 },
  footerIcon: { fontSize: 22, color: '#9CA3AF' },
  footerLabel: { fontSize: 12, color: '#9CA3AF' },
  copyright: {
    fontSize: 10, color: '#C4C9D4',
    letterSpacing: 1, textTransform: 'uppercase',
  },
});
