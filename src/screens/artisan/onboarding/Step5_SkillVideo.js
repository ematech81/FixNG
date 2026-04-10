import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { uploadSkillVideo, skipSkillVideo } from '../../../api/artisanApi';
import { useOnboarding } from '../../../contexts/OnboardingContext';

const PRIMARY = '#2563EB';
const TOTAL_STEPS = 5;
const CURRENT_STEP = 5;

const MAX_VIDEO_DURATION_SECS = 120; // 2 minutes

export default function Step5_SkillVideo({ navigation, route }) {
  const isEdit = route?.params?.isEdit === true;
  const { onCancelRegistration } = useOnboarding();

  const [videoUri, setVideoUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select a video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_DURATION_SECS,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        Alert.alert(
          'Video Too Large',
          `Your video is ${(asset.fileSize / (1024 * 1024)).toFixed(0)}MB. For faster uploads, keep it under 50MB. Try recording a shorter clip.`,
          [
            { text: 'Use Anyway', onPress: () => setVideoUri(asset.uri) },
            { text: 'Pick Another' },
          ]
        );
        return;
      }

      setVideoUri(asset.uri);
    }
  };

  const recordVideo = async () => {
    const camStatus = await ImagePicker.requestCameraPermissionsAsync();
    if (camStatus.status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to record a video.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: MAX_VIDEO_DURATION_SECS,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!videoUri) {
      Alert.alert('No Video', 'Please upload or record a short skill video to continue.');
      return;
    }

    setUploading(true);

    try {
      await uploadSkillVideo(videoUri);
      if (isEdit) {
        navigation.navigate('ArtisanTabs');
      } else {
        navigation.navigate('PendingVerification');
      }
    } catch (err) {
      const isTimeout = err?.isTimeout;
      const isNetwork = err?.isNetworkError;

      let message;
      if (isTimeout) {
        message = 'Upload timed out. The video may be too large for your current connection speed. Try switching to WiFi or recording a shorter clip (under 30 seconds).';
      } else if (isNetwork) {
        message = 'No internet connection. Please check your network and try again.';
      } else {
        message = err?.message || 'Video upload failed. Please try again.';
      }

      Alert.alert('Upload Failed', message, [
        { text: 'Retry', onPress: handleSubmit },
        { text: 'Cancel' },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Skill Video?',
      'Profiles with skill video evidence tend to receive significantly more job requests from customers. Are you sure you want to skip?',
      [
        { text: 'Add Video', style: 'cancel' },
        {
          text: 'Continue Anyway',
          onPress: async () => {
            if (isEdit) {
              navigation.goBack();
              return;
            }
            setSkipping(true);
            try {
              await skipSkillVideo();
              navigation.navigate('PendingVerification');
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
        <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} onCancel={!isEdit && onCancelRegistration ? () => {
          Alert.alert('Cancel Registration?', 'This will cancel your artisan registration and return you to your customer account.', [
            { text: 'Stay', style: 'cancel' },
            { text: 'Cancel Registration', style: 'destructive', onPress: () => onCancelRegistration?.() },
          ]);
        } : null} />

        <Text style={styles.title}>Skill Video</Text>
        <Text style={styles.subtitle}>
          Record a short video showing your work or workspace. This helps customers trust your
          skills before booking.
        </Text>

        {/* Video Preview */}
        {videoUri ? (
          <View style={styles.videoPreview}>
            <Video
              source={{ uri: videoUri }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
            />
            <TouchableOpacity style={styles.rePickBtn} onPress={pickVideo}>
              <Text style={styles.rePickBtnText}>Change Video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoIcon}>🎬</Text>
            <Text style={styles.videoPlaceholderText}>No video selected</Text>
          </View>
        )}

        {/* Pick/Record Options */}
        <View style={styles.pickRow}>
          <TouchableOpacity style={styles.pickBtn} onPress={pickVideo}>
            <Text style={styles.pickBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={recordVideo}>
            <Text style={styles.pickBtnText}>Record Now</Text>
          </TouchableOpacity>
        </View>

        {/* Upload progress indicator */}
        {uploading && (
          <View style={styles.uploadingBox}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.uploadingText}>
              Uploading video… This may take a few minutes on mobile data. Please stay connected.
            </Text>
          </View>
        )}

        {/* Guidelines */}
        <View style={styles.guideBox}>
          <Text style={styles.guideTitle}>Video Guidelines:</Text>
          <Text style={styles.guideItem}>• Max 2 minutes long</Text>
          <Text style={styles.guideItem}>• Show your tools, workspace, or a past project</Text>
          <Text style={styles.guideItem}>• Speak or demonstrate your skill — no slideshow images</Text>
          <Text style={styles.guideItem}>• Good lighting — avoid dark videos</Text>
          <Text style={styles.guideItem}>
            ⚡ Tip: Upload on WiFi — mobile data can be slow for large videos
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (!videoUri || uploading || skipping) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!videoUri || uploading || skipping}
        >
          {uploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isEdit ? 'Save & Continue' : 'Submit for Verification'}
            </Text>
          )}
        </TouchableOpacity>

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

        {!isEdit && (
          <Text style={styles.submitNote}>
            After submission, an admin will review your profile within 24–48 hours.
          </Text>
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
  videoPlaceholder: {
    height: 180,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  videoIcon: { fontSize: 40, marginBottom: 8 },
  videoPlaceholderText: { fontSize: 14, color: '#BBB' },
  videoPreview: { marginBottom: 16 },
  video: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#000' },
  rePickBtn: { marginTop: 8, alignSelf: 'center' },
  rePickBtnText: { color: PRIMARY, fontSize: 13, fontWeight: '600' },
  pickRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  pickBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    alignItems: 'center',
  },
  pickBtnText: { color: PRIMARY, fontWeight: '600', fontSize: 15 },
  uploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  uploadingText: { flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 },
  guideBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  guideTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  guideItem: { fontSize: 13, color: '#555', marginBottom: 5, lineHeight: 18 },
  footer: { padding: 24, paddingTop: 0, gap: 10 },
  submitBtn: { backgroundColor: PRIMARY, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#93C5FD' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  skipBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  skipBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  submitNote: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 },
});
