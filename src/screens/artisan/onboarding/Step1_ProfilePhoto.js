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
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveProfilePhotoUrl } from '../../../api/artisanApi';
import { uploadImageToCloudinary } from '../../../utils/cloudinaryUpload';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';

const TOTAL_STEPS = 5;
const CURRENT_STEP = 1;

export default function Step1_ProfilePhoto({ navigation }) {
  const { colors } = useTheme();
  const { onCancelRegistration } = useOnboarding();
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const styles = makeStyles(colors);

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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // keep full quality here — we compress ourselves below
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
      quality: 1,
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
    setUploadProgress(0);
    try {
      // Compress image before uploading — reduces 3-5 MB to ~150 KB
      const compressed = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }],
        { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Upload directly to Cloudinary from the device (no relay through backend)
      const { url, publicId } = await uploadImageToCloudinary(
        compressed.uri,
        (pct) => setUploadProgress(pct)
      );

      // Tell the backend to save the Cloudinary URL (tiny JSON call — instant)
      await saveProfilePhotoUrl({ url, publicId });
      navigation.navigate('Step2_Skills');
    } catch (err) {
      Alert.alert(
        'Upload Failed',
        err?.message || 'Upload failed. Try again.',
        [{ text: 'Retry', onPress: handleContinue }, { text: 'Cancel' }]
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Registration?',
      'This will cancel your artisan registration and return you to your customer account. You can register as an artisan again later.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Cancel Registration', style: 'destructive', onPress: () => onCancelRegistration?.() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} onCancel={onCancelRegistration ? handleCancel : null} colors={colors} styles={styles} />

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

        {/* Upload progress bar */}
        {uploading && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrackFull}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Processing…'}
            </Text>
          </View>
        )}

        <Text style={styles.hint}>
          ⚠ No face masks, sunglasses, or group photos. Admin will reject unclear photos.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, (!imageUri || uploading) && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!imageUri || uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.continueBtnText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProgressBar({ current, total, onCancel, colors, styles }) {
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

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  scroll: { padding: 24, paddingBottom: 40 },
  progressContainer: { marginBottom: 24 },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText: { fontSize: 13, color: colors.textMuted },
  cancelLink: { fontSize: 13, color: colors.error, fontWeight: '600' },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegmentActive: { backgroundColor: colors.info },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSub, marginBottom: 32, lineHeight: 22 },
  photoContainer: { alignSelf: 'center', marginBottom: 20 },
  photo: { width: 160, height: 160, borderRadius: 80, borderWidth: 3, borderColor: colors.info },
  photoPlaceholder: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.infoBg,
    borderWidth: 2, borderColor: colors.info, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  photoIcon: { fontSize: 36, marginBottom: 8 },
  photoPlaceholderText: { fontSize: 13, color: colors.info },
  pickRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickBtn: {
    flex: 1, padding: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.info, alignItems: 'center',
  },
  pickBtnText: { color: colors.info, fontWeight: '600', fontSize: 15 },

  // Upload progress
  progressWrap: { marginBottom: 20 },
  progressTrackFull: {
    height: 8, borderRadius: 4, backgroundColor: colors.borderLight, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: colors.info, borderRadius: 4 },
  progressLabel: { fontSize: 13, color: colors.info, fontWeight: '600', textAlign: 'center' },

  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  footer: { padding: 24, paddingTop: 0 },
  continueBtn: { backgroundColor: colors.info, padding: 16, borderRadius: 12, alignItems: 'center' },
  continueBtnDisabled: { backgroundColor: colors.infoBg },
  continueBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});
