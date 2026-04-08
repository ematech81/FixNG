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
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uploadProfilePhoto } from '../../../api/artisanApi';

const TOTAL_STEPS = 5;
const CURRENT_STEP = 1;

export default function Step1_ProfilePhoto({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'FixNG needs access to your photos to upload a profile picture. Please enable it in Settings.'
      );
      return false;
    }
    return true;
  };

  const pickFromGallery = async () => {
    const granted = await requestPermission();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!imageUri) {
      Alert.alert('No Photo', 'Please upload a clear profile photo before continuing.');
      return;
    }

    setUploading(true);
    try {
      await uploadProfilePhoto(imageUri);
      navigation.navigate('Step2_Skills');
    } catch (err) {
      const msg = err?.message || 'Upload failed.';
      Alert.alert(
        'Upload Failed',
        msg + (err?.isNetworkError ? '' : '\n\nTip: Try using a smaller photo or switch to WiFi.'),
        [{ text: 'Retry', onPress: handleContinue }, { text: 'Cancel' }]
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress */}
        <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} />

        <Text style={styles.title}>Profile Photo</Text>
        <Text style={styles.subtitle}>
          Upload a clear photo of your face. This builds trust with customers.
        </Text>

        {/* Photo Preview */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickFromGallery}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>Tap to select photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Pick options */}
        <View style={styles.pickRow}>
          <TouchableOpacity style={styles.pickBtn} onPress={pickFromGallery}>
            <Text style={styles.pickBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={takePhoto}>
            <Text style={styles.pickBtnText}>Camera</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          ⚠ No face masks, sunglasses, or group photos. Admin will reject unclear photos.
        </Text>
      </ScrollView>

      {/* Continue */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, (!imageUri || uploading) && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!imageUri || uploading}
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
      <Text style={styles.progressText}>
        Step {current} of {total}
      </Text>
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
  scroll: { padding: 24, paddingBottom: 40 },
  progressContainer: { marginBottom: 24 },
  progressText: { fontSize: 13, color: '#999', marginBottom: 8 },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5E5',
  },
  progressSegmentActive: { backgroundColor: '#FF6B00' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 32, lineHeight: 22 },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: '#FF6B00',
  },
  photoPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFF3EC',
    borderWidth: 2,
    borderColor: '#FF6B00',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIcon: { fontSize: 36, marginBottom: 8 },
  photoPlaceholderText: { fontSize: 13, color: '#FF6B00' },
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
  hint: { fontSize: 13, color: '#999', lineHeight: 18 },
  footer: { padding: 24, paddingTop: 0 },
  continueBtn: {
    backgroundColor: '#FF6B00',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueBtnDisabled: { backgroundColor: '#FFCBA4' },
  continueBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
