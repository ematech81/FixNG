import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { uploadVerificationId, skipVerificationId } from '../../../api/artisanApi';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const PRIMARY = '#2563EB';
const TOTAL_STEPS = 5;
const CURRENT_STEP = 4;

const ID_TYPES = [
  // Government IDs
  { label: 'NIN Slip / Card', value: 'NIN' },
  { label: "Voter's Card", value: 'Voters Card' },
  { label: "Driver's License", value: "Driver's License" },
  { label: 'International Passport', value: 'International Passport' },
  { label: 'BVN Printout', value: 'BVN' },
  // Professional Certificates
  { label: 'NYSC Certificate', value: 'NYSC Certificate' },
  { label: 'Professional Licence', value: 'Professional Licence' },
  { label: 'Degree / HND Certificate', value: 'Degree Certificate' },
  { label: 'Trade / Craft Certificate', value: 'Trade Certificate' },
  { label: 'Bar Certificate (NBA)', value: 'Bar Certificate' },
  { label: 'COREN Certificate', value: 'COREN Certificate' },
  { label: 'Other Certificate', value: 'Other Certificate' },
];

export default function Step4_VerificationID({ navigation, route }) {
  const isEdit = route?.params?.isEdit === true;
  const fromResubmit = route?.params?.fromResubmit === true;
  const { onCancelRegistration } = useOnboarding();

  const [imageUri, setImageUri] = useState(null);
  const [selectedIdType, setSelectedIdType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select your ID.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to photograph your ID.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!selectedIdType) {
      Alert.alert('ID Type Required', 'Please select the type of ID you are uploading.');
      return;
    }
    if (!imageUri) {
      Alert.alert('No ID Uploaded', 'Please take a photo or select your ID document.');
      return;
    }

    setUploading(true);
    try {
      await uploadVerificationId(imageUri, selectedIdType);
      if (fromResubmit) {
        Alert.alert(
          'Resubmission Sent ✅',
          'Your document has been submitted for review. Our team will verify it shortly. You will receive a notification once reviewed.',
          [{ text: 'OK', onPress: () => navigation.navigate('CustomerTabs') }]
        );
      } else if (isEdit) {
        navigation.goBack();
      } else {
        // First-time onboarding — proceed to optional video step
        navigation.navigate('Step5_SkillVideo');
      }
    } catch (err) {
      Alert.alert(
        'Upload Failed',
        err?.message || 'Failed to upload ID. Please try again.',
        [{ text: 'Retry', onPress: handleContinue }, { text: 'Cancel' }]
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Verification ID?',
      'Your registration will not be fully completed until you upload a valid means of identification. Unverified accounts cannot receive jobs or the Verified badge.',
      [
        { text: 'Upload Now', style: 'cancel' },
        {
          text: 'Continue Anyway',
          onPress: async () => {
            if (isEdit) {
              // In edit mode just go back — no API call needed (already skipped before)
              navigation.goBack();
              return;
            }
            setSkipping(true);
            try {
              await skipVerificationId();
              navigation.navigate('Step5_SkillVideo');
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not skip step. Please try again.');
            } finally {
              setSkipping(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {!fromResubmit && <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} onCancel={!isEdit && onCancelRegistration ? () => {
          Alert.alert('Cancel Registration?', 'This will cancel your artisan registration and return you to your customer account.', [
            { text: 'Stay', style: 'cancel' },
            { text: 'Cancel Registration', style: 'destructive', onPress: () => onCancelRegistration?.() },
          ]);
        } : null} />}

        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          Upload a government-issued ID or a professional certificate. This is reviewed only by
          FixNG admins and is never shared with customers.
        </Text>

        {/* Name match notice */}
        <View style={styles.nameNotice}>
          <Text style={styles.nameNoticeIcon}>ℹ️</Text>
          <Text style={styles.nameNoticeText}>
            Ensure the name on your ID or certificate matches your registered name on FixNG.
          </Text>
        </View>

        {/* ID Type Selection */}
        <Text style={styles.label}>Select Document Type *</Text>
        <View style={styles.idTypeRow}>
          {ID_TYPES.map((id) => (
            <TouchableOpacity
              key={id.value}
              style={[styles.idTypeChip, selectedIdType === id.value && styles.idTypeChipSelected]}
              onPress={() => setSelectedIdType(id.value)}
            >
              <Text
                style={[
                  styles.idTypeChipText,
                  selectedIdType === id.value && styles.idTypeChipTextSelected,
                ]}
              >
                {id.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ID Preview */}
        {imageUri ? (
          <TouchableOpacity onPress={pickImage} style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            <Text style={styles.retakeText}>Tap to change</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Text style={styles.uploadIcon}>🪪</Text>
            <Text style={styles.uploadPlaceholderText}>No document selected yet</Text>
          </View>
        )}

        {/* Upload options */}
        <View style={styles.pickRow}>
          <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
            <Text style={styles.pickBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={takePhoto}>
            <Text style={styles.pickBtnText}>Camera</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>Tips for a valid upload:</Text>
          <Text style={styles.tipItem}>• All text must be clearly readable — no blurry or dark photos</Text>
          <Text style={styles.tipItem}>• The full document must fit within the frame</Text>
          <Text style={styles.tipItem}>• Expired IDs or certificates will be rejected</Text>
          <Text style={styles.tipItem}>• Your name must match your FixNG registered name</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (!imageUri || !selectedIdType || uploading || skipping) && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          disabled={!imageUri || !selectedIdType || uploading || skipping}
        >
          {uploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.continueBtnText}>Continue</Text>
          )}
        </TouchableOpacity>

        {!fromResubmit && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
            disabled={uploading || skipping}
          >
            {skipping ? (
              <ActivityIndicator color={PRIMARY} size="small" />
            ) : (
              <Text style={styles.skipBtnText}>Skip for Now</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  nameNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 20,
  },
  nameNoticeIcon: { fontSize: 16, marginTop: 1 },
  nameNoticeText: { flex: 1, fontSize: 13, color: '#78350F', lineHeight: 19 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10 },
  idTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  idTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  idTypeChipSelected: { borderColor: PRIMARY, backgroundColor: '#EFF6FF' },
  idTypeChipText: { fontSize: 13, color: '#444' },
  idTypeChipTextSelected: { color: PRIMARY, fontWeight: '700' },
  uploadPlaceholder: {
    height: 160,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  uploadIcon: { fontSize: 40, marginBottom: 8 },
  uploadPlaceholderText: { fontSize: 14, color: '#BBB' },
  previewContainer: { marginBottom: 16, alignItems: 'center' },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  retakeText: { marginTop: 8, fontSize: 13, color: PRIMARY },
  pickRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    alignItems: 'center',
  },
  pickBtnText: { color: PRIMARY, fontWeight: '600', fontSize: 15 },
  tipsBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 8 },
  tipItem: { fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 18 },
  footer: { padding: 24, paddingTop: 0, gap: 10 },
  continueBtn: { backgroundColor: PRIMARY, padding: 16, borderRadius: 12, alignItems: 'center' },
  continueBtnDisabled: { backgroundColor: '#93C5FD' },
  continueBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  skipBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  skipBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
});
