import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ARTISAN_SKILLS } from '../../../constants/skills';
import { updateSkills, updateBio, saveDispatchInfo } from '../../../api/artisanApi';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const PRIMARY = '#2563EB';
const MAX_SKILLS = 5;
const TOTAL_STEPS = 5;
const CURRENT_STEP = 2;
const BIO_MAX = 300;

const VEHICLE_TYPES = ['Motorcycle', 'Bicycle', 'Car', 'Van'];

const validatePlate = (plate) => {
  if (!plate || plate.trim().length < 5) return false;
  return /^[A-Za-z0-9 \-]+$/.test(plate.trim());
};

export default function Step2_Skills({ navigation }) {
  const { onCancelRegistration } = useOnboarding();
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [othersText, setOthersText] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const othersInputRef  = useRef(null);
  const scrollViewRef   = useRef(null);
  const dispatchYRef    = useRef(0);   // Y offset of the dispatch section inside the ScrollView

  // Dispatch rider fields
  const [vehicleType, setVehicleType]             = useState(null);
  const [plateNumber, setPlateNumber]             = useState('');
  const [plateError, setPlateError]               = useState('');
  const [hasHelmet, setHasHelmet]                 = useState(false);
  const [providesPackaging, setProvidesPackaging] = useState(false);

  const isDispatchRider = selectedSkills.includes('Dispatch Rider');

  // When the dispatch section appears, scroll to it so the user sees the required fields
  useEffect(() => {
    if (isDispatchRider) {
      // Small delay so the section has rendered and onLayout has fired
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: dispatchYRef.current - 16, animated: true });
      }, 150);
    }
  }, [isDispatchRider]);

  const othersSelected = selectedSkills.includes('Others');

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) {
        // Deselecting "Others" also clears the custom text
        if (skill === 'Others') setOthersText('');
        return prev.filter((s) => s !== skill);
      }
      if (prev.length >= MAX_SKILLS) {
        Alert.alert('Limit Reached', `You can only select up to ${MAX_SKILLS} skills.`);
        return prev;
      }
      return [...prev, skill];
    });
  };

  // Build the final skills list for submission:
  // Replace the "Others" placeholder with whatever the user typed
  const buildSubmitSkills = () => {
    const custom = othersText.trim();
    return selectedSkills.map((s) => (s === 'Others' ? custom : s));
  };

  const handleContinue = async () => {
    if (selectedSkills.length === 0) {
      Alert.alert('No Skills Selected', 'Please select at least one skill to continue.');
      return;
    }

    if (othersSelected && !othersText.trim()) {
      Alert.alert('Enter Your Skill', 'Please type your skill in the "Others" field before continuing.');
      othersInputRef.current?.focus();
      return;
    }

    // Dispatch Rider validation
    if (isDispatchRider) {
      if (!vehicleType) {
        Alert.alert('Vehicle Required', 'Please select your vehicle type.');
        return;
      }
      if (!validatePlate(plateNumber)) {
        setPlateError('Please enter a valid vehicle plate number');
        return;
      }
      setPlateError('');
    }

    const skillsToSubmit = buildSubmitSkills();

    setSaving(true);
    try {
      await updateSkills(skillsToSubmit);
      if (bio.trim()) await updateBio(bio.trim());
      if (isDispatchRider) {
        await saveDispatchInfo({ vehicleType, plateNumber: plateNumber.trim(), hasHelmet, providesPackaging });
      }
      navigation.navigate('Step3_Location');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to save. Please try again.');
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ProgressBar
            current={CURRENT_STEP}
            total={TOTAL_STEPS}
            onCancel={onCancelRegistration ? handleCancel : null}
          />

          <Text style={styles.title}>Your Skills</Text>
          <Text style={styles.subtitle}>
            Select up to {MAX_SKILLS} skills. These determine the jobs you'll receive.
          </Text>

          <Text style={styles.selected}>{selectedSkills.length}/{MAX_SKILLS} selected</Text>

          <View style={styles.skillsGrid}>
            {ARTISAN_SKILLS.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <TouchableOpacity
                  key={skill}
                  style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                  onPress={() => toggleSkill(skill)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.skillChipText, isSelected && styles.skillChipTextSelected]}>
                    {skill}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* "Others" custom skill input — appears when Others is selected */}
          {othersSelected && (
            <View style={styles.othersBox}>
              <Text style={styles.othersLabel}>Enter your skill</Text>
              <TextInput
                ref={othersInputRef}
                style={styles.othersInput}
                placeholder="e.g. Mason, Weaving, Shoe Cobbler…"
                value={othersText}
                onChangeText={setOthersText}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
          )}

          {selectedSkills.length > 0 && (
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Selected:</Text>
              {selectedSkills.map((s) => (
                <Text key={s} style={styles.previewItem}>
                  • {s === 'Others' && othersText.trim() ? othersText.trim() : s}
                </Text>
              ))}
            </View>
          )}

          {/* Dispatch Rider extra fields */}
          {isDispatchRider && (
            <View
              style={styles.dispatchBox}
              onLayout={(e) => { dispatchYRef.current = e.nativeEvent.layout.y; }}
            >
              <View style={styles.dispatchHeader}>
                <Text style={styles.dispatchIcon}>🏍️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dispatchTitle}>Dispatch Rider Details</Text>
                  <Text style={styles.dispatchSubtitle}>
                    These details help customers trust and book you safely.
                  </Text>
                </View>
              </View>

              {/* Tip card */}
              <View style={styles.dispatchTip}>
                <Text style={styles.dispatchTipText}>
                  💡 Riders with a helmet and packaging option get more bookings. Customers value safety and reliability.
                </Text>
              </View>

              {/* Vehicle type */}
              <Text style={styles.dispatchLabel}>Vehicle Type <Text style={styles.required}>*</Text></Text>
              <View style={styles.vehicleRow}>
                {VEHICLE_TYPES.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.vehicleChip, vehicleType === v && styles.vehicleChipSelected]}
                    onPress={() => setVehicleType(v)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.vehicleChipText, vehicleType === v && styles.vehicleChipTextSelected]}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Plate number */}
              <Text style={styles.dispatchLabel}>
                Vehicle Plate Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.plateInput, plateError ? styles.plateInputError : null]}
                placeholder="e.g. LAG-123AB"
                value={plateNumber}
                onChangeText={(t) => {
                  setPlateNumber(t);
                  if (plateError) setPlateError('');
                }}
                autoCapitalize="characters"
                returnKeyType="done"
              />
              {plateError ? <Text style={styles.plateErrorText}>{plateError}</Text> : null}

              {/* Toggles */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleChip, hasHelmet && styles.toggleChipOn]}
                  onPress={() => setHasHelmet((v) => !v)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.toggleChipText}>{hasHelmet ? '✓ ' : ''}Provides Helmet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleChip, providesPackaging && styles.toggleChipOn]}
                  onPress={() => setProvidesPackaging((v) => !v)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.toggleChipText}>{providesPackaging ? '✓ ' : ''}Provides Packaging</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bio */}
          <Text style={styles.bioLabel}>
            Professional Bio <Text style={styles.bioOptional}>(optional)</Text>
          </Text>
          <Text style={styles.bioHint}>
            Briefly describe your experience and what makes you stand out. Customers see this on your profile.
          </Text>
          <TextInput
            style={styles.bioInput}
            placeholder="e.g. Certified electrician with 8 years of experience in residential wiring and fault detection…"
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.bioCount}>{bio.length}/{BIO_MAX}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, (selectedSkills.length === 0 || saving) && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={selectedSkills.length === 0 || saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.continueBtnText}>Continue</Text>
            )}
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
          <View
            key={i}
            style={[styles.progressSegment, i < current && styles.progressSegmentActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { padding: 24, paddingBottom: 20 },

  progressContainer: { marginBottom: 24 },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText: { fontSize: 13, color: '#999' },
  cancelLink: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5' },
  progressSegmentActive: { backgroundColor: PRIMARY },

  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 8, lineHeight: 22 },
  selected: { fontSize: 13, color: PRIMARY, fontWeight: '600', marginBottom: 20 },

  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  skillChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E5E5E5', backgroundColor: '#FAFAFA',
  },
  skillChipSelected: { borderColor: PRIMARY, backgroundColor: '#EFF6FF' },
  skillChipText: { fontSize: 14, color: '#444' },
  skillChipTextSelected: { color: PRIMARY, fontWeight: '600' },

  othersBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  othersLabel: { fontSize: 13, fontWeight: '700', color: PRIMARY, marginBottom: 8 },
  othersInput: {
    backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#1A1A1A',
  },

  previewBox: { backgroundColor: '#F9F9F9', borderRadius: 10, padding: 16, marginBottom: 24 },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  previewItem: { fontSize: 14, color: '#555', marginBottom: 4 },

  // Dispatch rider
  dispatchBox: {
    backgroundColor: '#FFF7ED', borderRadius: 14, padding: 16,
    marginBottom: 20, borderWidth: 1.5, borderColor: '#FED7AA',
  },
  dispatchHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  dispatchIcon:     { fontSize: 26 },
  dispatchTitle:    { fontSize: 15, fontWeight: '800', color: '#92400E', marginBottom: 2 },
  dispatchSubtitle: { fontSize: 13, color: '#B45309', lineHeight: 18 },
  dispatchTip: {
    backgroundColor: '#FFFBEB', borderRadius: 8, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A',
  },
  dispatchTipText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  dispatchLabel:   { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  required:        { color: '#EF4444' },
  vehicleRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  vehicleChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#FFF',
  },
  vehicleChipSelected: { borderColor: '#EA580C', backgroundColor: '#FFF7ED' },
  vehicleChipText:     { fontSize: 14, color: '#374151' },
  vehicleChipTextSelected: { color: '#EA580C', fontWeight: '700' },
  plateInput: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#D1D5DB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1A1A1A', marginBottom: 6,
    letterSpacing: 1,
  },
  plateInputError:  { borderColor: '#EF4444' },
  plateErrorText:   { fontSize: 12, color: '#EF4444', marginBottom: 12 },
  toggleRow:        { flexDirection: 'row', gap: 10, marginTop: 8 },
  toggleChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#FFF',
    alignItems: 'center',
  },
  toggleChipOn:     { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  toggleChipText:   { fontSize: 13, fontWeight: '600', color: '#374151' },

  bioLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginTop: 4, marginBottom: 6 },
  bioOptional: { fontSize: 13, fontWeight: '400', color: '#9CA3AF' },
  bioHint: { fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 18 },
  bioInput: {
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#1A1A1A',
    backgroundColor: '#FAFAFA', minHeight: 100,
  },
  bioCount: { fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 4, marginBottom: 8 },

  footer: { paddingHorizontal: 24, paddingVertical: 16 },
  continueBtn: { backgroundColor: PRIMARY, padding: 16, borderRadius: 12, alignItems: 'center' },
  continueBtnDisabled: { backgroundColor: '#93C5FD' },
  continueBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
