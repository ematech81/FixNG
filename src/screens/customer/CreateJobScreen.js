import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ARTISAN_SKILLS } from '../../constants/skills';
import { createJob } from '../../api/jobApi';
import BackButton from '../../components/BackButton';

const URGENCY_OPTIONS = [
  {
    value: 'normal',
    label: 'Normal',
    description: 'Artisan arrives within a few hours',
    icon: '🔧',
    color: '#3B82F6',
  },
  {
    value: 'emergency',
    label: 'Emergency',
    description: 'Urgent — artisan comes ASAP',
    icon: '🚨',
    color: '#EF4444',
  },
];

export default function CreateJobScreen({ navigation }) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const filteredCategories = ARTISAN_SKILLS.filter((s) =>
    s.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // ── Image picking ──────────────────────────────────────────────────────────
  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can attach up to 5 photos per job.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Location detection ─────────────────────────────────────────────────────
  const detectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Location is needed so artisans near you can see this job.',
          [{ text: 'OK' }]
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      let address = null;
      let state = null;
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (place) {
          const parts = [place.street, place.district, place.city].filter(Boolean);
          address = parts.join(', ');
          state = place.region || null;
        }
      } catch {
        // Address lookup failed — coordinates are still captured
      }

      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        address,
        state,
      });
    } catch {
      Alert.alert('GPS Failed', 'Could not detect location. Please try again or move outdoors.');
    } finally {
      setLocating(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!category) {
      Alert.alert('Category Required', 'Please select the type of artisan you need.');
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      Alert.alert('Description Too Short', 'Please describe the job in at least 20 characters.');
      return;
    }
    if (!location) {
      Alert.alert('Location Required', 'Please detect your location so artisans can find you.');
      return;
    }

    if (urgency === 'emergency') {
      Alert.alert(
        'Confirm Emergency Job',
        'Emergency jobs notify artisans immediately and may cost more. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Post Emergency', onPress: () => submitJob() },
        ]
      );
    } else {
      submitJob();
    }
  };

  const submitJob = async () => {
    setSubmitting(true);
    try {
      const res = await createJob(
        {
          category,
          description: description.trim(),
          urgency,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          state: location.state,
        },
        images
      );

      const { jobId, artisansNotified } = res.data.data;

      Alert.alert(
        'Job Posted!',
        `${artisansNotified} artisan${artisansNotified !== 1 ? 's' : ''} near you ${artisansNotified !== 1 ? 'have' : 'has'} been notified.`,
        [{ text: 'Track Job', onPress: () => navigation.replace('JobDetail', { jobId }) }]
      );
    } catch (err) {
      const msg = err?.message || 'Failed to post job.';
      Alert.alert('Error', msg, [
        { text: 'Retry', onPress: submitJob },
        { text: 'Cancel' },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text style={styles.headerTitle}>Post a Job</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Category */}
          <Text style={styles.label}>What do you need? *</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowCategories((v) => !v)}
          >
            <Text style={category ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {category || 'Select category'}
            </Text>
            <Text style={styles.dropdownArrow}>{showCategories ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showCategories && (
            <View style={styles.dropdown}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search category..."
                value={categorySearch}
                onChangeText={setCategorySearch}
              />
              <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                {filteredCategories.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCategory(s);
                      setShowCategories(false);
                      setCategorySearch('');
                    }}
                  >
                    <Text style={[styles.dropdownItemText, category === s && styles.dropdownItemActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Description */}
          <Text style={styles.label}>Describe the Job *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. My kitchen tap is leaking badly and water is dripping underneath the sink. I need it fixed urgently."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            maxLength={1000}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>

          {/* Urgency */}
          <Text style={styles.label}>Urgency *</Text>
          <View style={styles.urgencyRow}>
            {URGENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.urgencyCard,
                  urgency === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '12' },
                ]}
                onPress={() => setUrgency(opt.value)}
              >
                <Text style={styles.urgencyIcon}>{opt.icon}</Text>
                <Text style={[styles.urgencyLabel, urgency === opt.value && { color: opt.color }]}>
                  {opt.label}
                </Text>
                <Text style={styles.urgencyDesc}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Images */}
          <Text style={styles.label}>Photos (optional, max 5)</Text>
          <View style={styles.imagesRow}>
            {images.map((uri, i) => (
              <View key={i} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity
                  style={styles.removeThumb}
                  onPress={() => removeImage(i)}
                >
                  <Text style={styles.removeThumbText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                <Text style={styles.addImageIcon}>+</Text>
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location */}
          <Text style={styles.label}>Job Location *</Text>
          <TouchableOpacity
            style={[styles.locationBtn, location && styles.locationBtnActive]}
            onPress={detectLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color="#FF6B00" />
            ) : (
              <>
                <Text style={styles.locationIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationBtnText}>
                    {location ? 'Location Detected — Tap to re-detect' : 'Detect My Location'}
                  </Text>
                  {location?.address && (
                    <Text style={styles.locationAddress}>{location.address}</Text>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Submit */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {urgency === 'emergency' ? '🚨 Post Emergency Job' : 'Post Job'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { padding: 20, paddingBottom: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
  dropdownTrigger: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    padding: 13, backgroundColor: '#FAFAFA',
  },
  dropdownValue: { fontSize: 15, color: '#1A1A1A' },
  dropdownPlaceholder: { fontSize: 15, color: '#AAA' },
  dropdownArrow: { color: '#999', fontSize: 12 },
  dropdown: {
    borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 10,
    backgroundColor: '#FFF', marginTop: 4, overflow: 'hidden', elevation: 4,
  },
  searchInput: {
    padding: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', fontSize: 14,
  },
  dropdownItem: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  dropdownItemText: { fontSize: 15, color: '#444' },
  dropdownItemActive: { color: '#FF6B00', fontWeight: '700' },
  textArea: {
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#1A1A1A',
    textAlignVertical: 'top', minHeight: 110, backgroundColor: '#FAFAFA',
  },
  charCount: { fontSize: 12, color: '#BBB', textAlign: 'right', marginTop: 4 },
  urgencyRow: { flexDirection: 'row', gap: 12 },
  urgencyCard: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E5E5',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  urgencyIcon: { fontSize: 24, marginBottom: 6 },
  urgencyLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
  urgencyDesc: { fontSize: 11, color: '#999', textAlign: 'center' },
  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageThumb: { width: 80, height: 80, position: 'relative' },
  thumbImg: { width: 80, height: 80, borderRadius: 8 },
  removeThumb: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#EF4444', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  removeThumbText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  addImageBtn: {
    width: 80, height: 80, borderRadius: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#FF6B00',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF3EC',
  },
  addImageIcon: { fontSize: 22, color: '#FF6B00' },
  addImageText: { fontSize: 10, color: '#FF6B00', marginTop: 2 },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#E5E5E5', backgroundColor: '#FAFAFA', minHeight: 54,
  },
  locationBtnActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  locationIcon: { fontSize: 20 },
  locationBtnText: { fontSize: 14, color: '#555', fontWeight: '600' },
  locationAddress: { fontSize: 12, color: '#888', marginTop: 2 },
  footer: { padding: 20, paddingTop: 8 },
  submitBtn: {
    backgroundColor: '#FF6B00', padding: 16, borderRadius: 12,
    alignItems: 'center', minHeight: 54, justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#FFCBA4' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
