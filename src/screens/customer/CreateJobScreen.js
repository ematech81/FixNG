import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ARTISAN_SKILLS } from '../../constants/skills';
import { createJob } from '../../api/jobApi';
import { getUser } from '../../utils/storage';
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
  {
    value: 'remote',
    label: 'Remote',
    description: 'No on-site visit needed (e.g. web dev, design)',
    icon: '💻',
    color: '#8B5CF6',
  },
];

// Default Lagos centre coords used for remote jobs when no GPS is available
const LAGOS_DEFAULT = { latitude: 6.5244, longitude: 3.3792 };

export default function CreateJobScreen({ route, navigation }) {
  const { artisanId, artisanName, artisanSkill } = route?.params || {};

  const [category, setCategory] = useState(artisanSkill || '');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => {
    getUser().then((u) => setCurrentUserName(u?.name?.split(' ')[0] || ''));
  }, []);

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
      Alert.alert(
        'GPS Failed',
        'Could not detect your location automatically.',
        [
          { text: 'Try Again', onPress: detectLocation },
          { text: 'Enter Manually', onPress: () => setManualMode(true) },
        ]
      );
    } finally {
      setLocating(false);
    }
  };

  const confirmManualLocation = async () => {
    if (!manualAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your address.');
      return;
    }
    setLocating(true);
    try {
      // Try to geocode the entered address to get real coordinates
      const results = await Location.geocodeAsync(manualAddress.trim());
      const coords = results?.[0] ?? LAGOS_DEFAULT;
      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: manualAddress.trim(),
        state: null,
      });
      setManualMode(false);
    } catch {
      // Geocoding failed — fall back to Lagos centre so the job can still be posted
      setLocation({
        latitude: LAGOS_DEFAULT.latitude,
        longitude: LAGOS_DEFAULT.longitude,
        address: manualAddress.trim(),
        state: null,
      });
      setManualMode(false);
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
    if (!location && urgency !== 'remote') {
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
    const loc = location ?? LAGOS_DEFAULT; // remote jobs fall back to Lagos centre
    try {
      const res = await createJob(
        {
          category,
          description: description.trim(),
          urgency,
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address || null,
          state: loc.state || null,
          artisanId: artisanId || undefined,
        },
        images
      );

      const { jobId, artisansNotified, targetArtisanName } = res.data.data;

      // Personalized message when sent to a specific artisan; generic for broadcasts
      const isDirectRequest = !!(artisanId);
      const recipientName = targetArtisanName || artisanName || 'the artisan';
      const greeting = currentUserName ? `Dear ${currentUserName}, your` : 'Your';
      const successMsg = isDirectRequest
        ? `${greeting} job request has been successfully sent to ${recipientName}. Tap "Track Job" below to follow the progress.`
        : `${artisansNotified} artisan${artisansNotified !== 1 ? 's' : ''} near you ${artisansNotified !== 1 ? 'have' : 'has'} been notified.`;

      Alert.alert(
        isDirectRequest ? 'Request Sent!' : 'Job Posted!',
        successMsg,
        [{ text: 'Track Job', onPress: () => navigation.replace('JobDetail', { jobId }) }]
      );
    } catch (err) {
      const msg = err?.message || err?.data?.message || 'Failed to post job. Please check your connection and try again.';
      Alert.alert('Job Post Failed', msg, [
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          {artisanSkill ? (
            // Pre-filled from artisan profile — show as locked badge
            <View style={styles.categoryLocked}>
              <Text style={styles.categoryLockedText}>{category}</Text>
              <Text style={styles.categoryLockedBadge}>Auto-selected</Text>
            </View>
          ) : (
            // General job creation — show full dropdown
            <>
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
            </>
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
          <View style={styles.urgencyStack}>
            {URGENCY_OPTIONS.map((opt) => {
              const active = urgency === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.urgencyRow, active && { borderColor: opt.color, backgroundColor: opt.color + '12' }]}
                  onPress={() => setUrgency(opt.value)}
                >
                  <Text style={styles.urgencyIcon}>{opt.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.urgencyLabel, active && { color: opt.color }]}>{opt.label}</Text>
                    <Text style={styles.urgencyDesc}>{opt.description}</Text>
                  </View>
                  <View style={[styles.urgencyRadio, active && { borderColor: opt.color }]}>
                    {active && <View style={[styles.urgencyRadioDot, { backgroundColor: opt.color }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
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

          {/* Location — hidden for remote jobs */}
          {urgency !== 'remote' && (
            <>
              <Text style={styles.label}>Job Location *</Text>

              {/* GPS detect button */}
              {!manualMode && (
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
              )}

              {/* Toggle manual entry */}
              {!manualMode && (
                <TouchableOpacity style={styles.manualToggle} onPress={() => setManualMode(true)}>
                  <Text style={styles.manualToggleText}>✏️  Enter location manually instead</Text>
                </TouchableOpacity>
              )}

              {/* Manual entry form */}
              {manualMode && (
                <View style={styles.manualBox}>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="e.g. 12 Adeola Street, Ikeja, Lagos"
                    placeholderTextColor="#AAA"
                    value={manualAddress}
                    onChangeText={setManualAddress}
                  />
                  <View style={styles.manualActions}>
                    <TouchableOpacity
                      style={styles.manualCancelBtn}
                      onPress={() => { setManualMode(false); setManualAddress(''); }}
                    >
                      <Text style={styles.manualCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.manualConfirmBtn}
                      onPress={confirmManualLocation}
                      disabled={locating}
                    >
                      {locating
                        ? <ActivityIndicator color="#FFF" size="small" />
                        : <Text style={styles.manualConfirmText}>Confirm</Text>}
                    </TouchableOpacity>
                  </View>
                  {location?.address && (
                    <Text style={styles.locationAddress}>✅ {location.address}</Text>
                  )}
                </View>
              )}
            </>
          )}

          {urgency === 'remote' && (
            <View style={styles.remoteNote}>
              <Text style={styles.remoteNoteText}>
                💻  No location needed for remote jobs. Artisans will contact you online.
              </Text>
            </View>
          )}
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
                {urgency === 'emergency' ? '🚨 Post Emergency Job'
                  : urgency === 'remote' ? '💻 Post Remote Job'
                  : 'Post Job'}
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
  categoryLocked: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 10,
    padding: 13, backgroundColor: '#EFF6FF',
  },
  categoryLockedText: { fontSize: 15, fontWeight: '600', color: '#1D4ED8' },
  categoryLockedBadge: {
    fontSize: 11, fontWeight: '700', color: '#2563EB',
    backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20,
  },
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
  urgencyStack: { gap: 10 },
  urgencyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: '#E5E5E5',
    borderRadius: 12, padding: 14,
  },
  urgencyIcon: { fontSize: 24 },
  urgencyLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 2 },
  urgencyDesc: { fontSize: 11, color: '#999' },
  urgencyRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center',
  },
  urgencyRadioDot: { width: 10, height: 10, borderRadius: 5 },
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
  manualToggle: { marginTop: 8, alignSelf: 'flex-start' },
  manualToggleText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  manualBox: {
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 12,
    padding: 14, backgroundColor: '#FAFAFA', gap: 10,
  },
  manualInput: {
    borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8,
    padding: 11, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FFF',
  },
  manualActions: { flexDirection: 'row', gap: 10 },
  manualCancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center',
  },
  manualCancelText: { fontSize: 13, fontWeight: '600', color: '#555' },
  manualConfirmBtn: {
    flex: 2, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#3B82F6', alignItems: 'center',
  },
  manualConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  remoteNote: {
    backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  remoteNoteText: { fontSize: 13, color: '#6D28D9', fontWeight: '500', lineHeight: 20 },
  footer: { padding: 20, paddingTop: 8 },
  submitBtn: {
    backgroundColor: '#FF6B00', padding: 16, borderRadius: 12,
    alignItems: 'center', minHeight: 54, justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#FFCBA4' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
