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
import { uploadVerificationId } from '../../../api/artisanApi';

const TOTAL_STEPS = 5;
const CURRENT_STEP = 4;

const ID_TYPES = [
  { label: 'NIN Slip / Card', value: 'NIN' },
  { label: "Voter's Card", value: 'Voters Card' },
  { label: "Driver's License", value: "Driver's License" },
  { label: 'International Passport', value: 'International Passport' },
  { label: 'BVN Printout', value: 'BVN' },
];

export default function Step4_VerificationID({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [selectedIdType, setSelectedIdType] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select your ID.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false, // Don't crop — need to see full ID
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
      navigation.navigate('Step5_SkillVideo');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} />

        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          Upload a government-issued ID. This is reviewed only by FixNG admins and is never shared
          with customers.
        </Text>

        {/* ID Type Selection */}
        <Text style={styles.label}>Select ID Type *</Text>
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
            <Text style={styles.uploadPlaceholderText}>No ID selected yet</Text>
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
          <Text style={styles.tipItem}>• Ensure all text on the ID is clearly readable</Text>
          <Text style={styles.tipItem}>• No blurry or dark photos</Text>
          <Text style={styles.tipItem}>• Ensure the full ID fits in the frame</Text>
          <Text style={styles.tipItem}>• Expired IDs will be rejected</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (!imageUri || !selectedIdType || uploading) && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          disabled={!imageUri || !selectedIdType || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.continueBtnText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProgressBar({ current, total }) {
  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressText}>Step {current} of {total}</Text>
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
  progressText: { fontSize: 13, color: '#999', marginBottom: 8 },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5' },
  progressSegmentActive: { backgroundColor: '#FF6B00' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 22 },
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
  idTypeChipSelected: { borderColor: '#FF6B00', backgroundColor: '#FFF3EC' },
  idTypeChipText: { fontSize: 13, color: '#444' },
  idTypeChipTextSelected: { color: '#FF6B00', fontWeight: '700' },
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
  retakeText: { marginTop: 8, fontSize: 13, color: '#FF6B00' },
  pickRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    alignItems: 'center',
  },
  pickBtnText: { color: '#FF6B00', fontWeight: '600', fontSize: 15 },
  tipsBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 8 },
  tipItem: { fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 18 },
  footer: { padding: 24, paddingTop: 0 },
  continueBtn: { backgroundColor: '#FF6B00', padding: 16, borderRadius: 12, alignItems: 'center' },
  continueBtnDisabled: { backgroundColor: '#FFCBA4' },
  continueBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
