import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { updateLocation } from '../../../api/artisanApi';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const PRIMARY = '#2563EB';
const TOTAL_STEPS = 5;
const CURRENT_STEP = 3;

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
];

export default function Step3_Location({ navigation }) {
  const { onCancelRegistration } = useOnboarding();
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  const detectLocation = async () => {
    setLocating(true);
    setGpsError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Location permission denied. Please enter your address manually below.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 0,
      });

      setCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (place) {
          const parts = [place.street, place.district, place.city, place.subregion].filter(Boolean);
          setAddress(parts.join(', '));
          if (place.region) {
            const matched = NIGERIAN_STATES.find((s) =>
              place.region.toLowerCase().includes(s.toLowerCase())
            );
            if (matched) setState(matched);
          }
        }
      } catch {
        setGpsError('GPS detected, but could not fetch address. Please fill it in below.');
      }
    } catch {
      setGpsError(
        'Could not detect your location. This is common on some devices. Please enter your address manually.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleContinue = async () => {
    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter your address or detect via GPS.');
      return;
    }
    if (!state) {
      Alert.alert('State Required', 'Please select your state.');
      return;
    }

    setSaving(true);
    try {
      let finalCoords = coords;

      // If GPS was not used, try geocoding the typed address to get real coordinates
      if (!finalCoords) {
        try {
          const query = `${address.trim()}, ${state}, Nigeria`;
          const results = await Location.geocodeAsync(query);
          if (results?.length > 0) {
            finalCoords = { latitude: results[0].latitude, longitude: results[0].longitude };
          }
        } catch {
          // Geocoding failed — backend will use Nigeria-centre fallback
        }
      }

      await updateLocation({
        latitude: finalCoords?.latitude ?? null,
        longitude: finalCoords?.longitude ?? null,
        address: address.trim(),
        state,
        lga: lga.trim(),
      });
      navigation.navigate('Step4_VerificationID');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Registration?',
      'This will cancel your artisan registration and return you to your customer account.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Cancel Registration', style: 'destructive', onPress: () => onCancelRegistration?.() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} onCancel={onCancelRegistration ? handleCancel : null} />

          <Text style={styles.title}>Your Location</Text>
          <Text style={styles.subtitle}>
            Your location helps customers find nearby artisans. Only your area is shown — never your
            exact address.
          </Text>

          {/* GPS Detect Button */}
          <TouchableOpacity style={styles.gpsBtn} onPress={detectLocation} disabled={locating}>
            {locating ? (
              <ActivityIndicator color={PRIMARY} />
            ) : (
              <>
                <Text style={styles.gpsBtnIcon}>📍</Text>
                <Text style={styles.gpsBtnText}>
                  {coords ? 'Location Detected — Re-detect' : 'Detect My Location (GPS)'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {coords && <Text style={styles.gpsSuccess}>✓ GPS coordinates captured</Text>}
          {gpsError && <Text style={styles.gpsError}>{gpsError}</Text>}

          <Text style={styles.orDivider}>— or enter manually —</Text>

          <Text style={styles.label}>Street / Area Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 12 Balogun Street, Surulere"
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <Text style={styles.label}>State *</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowStateDropdown((v) => !v)}
          >
            <Text style={state ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {state || 'Select State'}
            </Text>
            <Text style={styles.dropdownArrow}>{showStateDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showStateDropdown && (
            <View style={styles.dropdown}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {NIGERIAN_STATES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.dropdownItem}
                    onPress={() => { setState(s); setShowStateDropdown(false); }}
                  >
                    <Text style={[styles.dropdownItemText, state === s && styles.dropdownItemActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={styles.label}>LGA (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Surulere"
            value={lga}
            onChangeText={setLga}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, saving && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.continueBtnText}>Continue</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProgressBar({ current, total, onCancel }) {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTopRow}>
        <Text style={styles.progressText}>Step {current} of {total}</Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.progressTrack}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.progressSegment, i < current && styles.progressSegmentActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { padding: 24, paddingBottom: 40 },
  progressContainer: { marginBottom: 24 },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText: { fontSize: 13, color: '#999' },
  cancelLink: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5' },
  progressSegmentActive: { backgroundColor: PRIMARY },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 22 },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: PRIMARY,
    backgroundColor: '#EFF6FF', marginBottom: 10, minHeight: 50,
  },
  gpsBtnIcon: { fontSize: 18 },
  gpsBtnText: { color: PRIMARY, fontWeight: '600', fontSize: 15 },
  gpsSuccess: { color: '#22C55E', fontSize: 13, marginBottom: 6, fontWeight: '600' },
  gpsError: { color: '#EF4444', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  orDivider: { textAlign: 'center', color: '#BBB', fontSize: 13, marginVertical: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#1A1A1A',
    marginBottom: 16, backgroundColor: '#FAFAFA',
  },
  dropdownTrigger: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    padding: 13, marginBottom: 4, backgroundColor: '#FAFAFA',
  },
  dropdownValue: { fontSize: 15, color: '#1A1A1A' },
  dropdownPlaceholder: { fontSize: 15, color: '#AAA' },
  dropdownArrow: { color: '#999', fontSize: 12 },
  dropdown: {
    borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 10,
    backgroundColor: '#FFF', marginBottom: 16, overflow: 'hidden', elevation: 4,
  },
  dropdownItem: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 15, color: '#444' },
  dropdownItemActive: { color: PRIMARY, fontWeight: '700' },
  footer: { padding: 24, paddingTop: 0 },
  continueBtn: { backgroundColor: PRIMARY, padding: 16, borderRadius: 12, alignItems: 'center' },
  continueBtnDisabled: { backgroundColor: '#93C5FD' },
  continueBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
