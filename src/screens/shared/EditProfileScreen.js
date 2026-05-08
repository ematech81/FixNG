import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { getUser, saveUser } from '../../utils/storage';
import { getOnboardingStatus, getSkillsList } from '../../api/artisanApi';
import { updateUserProfile, updateArtisanProfile } from '../../api/profileApi';
import { uploadImageToCloudinary } from '../../utils/cloudinaryUpload';

const PRIMARY = '#2563EB';

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Shared state
  const [user, setUser]       = useState(null);
  const [isArtisan, setIsArtisan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // User fields
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');

  // Artisan fields
  const [bio, setBio]                 = useState('');
  const [skills, setSkills]           = useState([]);
  const [allSkills, setAllSkills]     = useState([]);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [locationFields, setLocationFields] = useState({ address: '', state: '', lga: '' });
  const [locationCoords, setLocationCoords] = useState(null); // existing GPS [lng, lat]
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);
  const [newPhotoUri, setNewPhotoUri] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const u = await getUser();
      setUser(u);
      setName(u?.name || '');
      setEmail(u?.email || '');

      if (u?.role === 'artisan') {
        setIsArtisan(true);
        const [statusRes, skillsRes] = await Promise.all([
          getOnboardingStatus(),
          getSkillsList(),
        ]);
        const data = statusRes.data.data;
        setBio(data.bio || '');
        setSkills(data.skills || []);
        setLocationFields({
          address: data.location?.address || '',
          state:   data.location?.state   || '',
          lga:     data.location?.lga     || '',
        });
        setLocationCoords(data.location?.coordinates || null);
        if (data.profilePhoto) setExistingPhotoUrl(data.profilePhoto);

        const raw = skillsRes.data.data || [];
        setAllSkills(raw.map(s => (typeof s === 'string' ? s : s.name || String(s))));
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setNewPhotoUri(result.assets[0].uri);
    }
  };

  const toggleSkill = (skill) => {
    setSkills(prev => {
      if (prev.includes(skill)) return prev.filter(s => s !== skill);
      if (prev.length >= 5) {
        Alert.alert('Limit reached', 'You can select up to 5 skills.');
        return prev;
      }
      return [...prev, skill];
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    if (isArtisan && skills.length === 0) {
      Alert.alert('Skills required', 'Please select at least one skill.');
      return;
    }
    if (isArtisan && locationFields.address && !locationFields.state) {
      Alert.alert('State required', 'Please enter your state.');
      return;
    }

    setSaving(true);
    try {
      // 1. Upload new photo if selected
      let photoData = null;
      if (newPhotoUri) {
        setUploadingPhoto(true);
        photoData = await uploadImageToCloudinary(newPhotoUri);
        setUploadingPhoto(false);
      }

      // 2. Update user (name, email)
      const userRes = await updateUserProfile({
        name: name.trim(),
        email: email.trim() || undefined,
      });
      const updatedUser = userRes.data.data;

      // 3. Update artisan profile
      if (isArtisan) {
        const artisanPayload = {
          bio: bio.trim(),
          skills,
        };

        if (locationFields.address.trim() && locationFields.state.trim()) {
          artisanPayload.location = {
            address: locationFields.address.trim(),
            state:   locationFields.state.trim(),
            lga:     locationFields.lga.trim() || undefined,
            ...(locationCoords && {
              longitude: locationCoords[0],
              latitude:  locationCoords[1],
            }),
          };
        }

        if (photoData) {
          artisanPayload.profilePhoto = photoData;
        }

        await updateArtisanProfile(artisanPayload);
      }

      // 4. Sync local storage so ProfileScreen reflects changes immediately
      await saveUser({ ...user, ...updatedUser });

      Alert.alert('Profile updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  };

  /* ── Photo display: new pick > existing > initials ── */
  const displayPhotoUri = newPhotoUri || existingPhotoUrl;
  const initial = (name || 'U')[0].toUpperCase();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {saving
            ? <ActivityIndicator size="small" color={PRIMARY} />
            : <Text style={styles.headerSave}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Profile Photo (artisans only) ── */}
          {isArtisan && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PROFILE PHOTO</Text>
              <View style={styles.photoRow}>
                <View style={styles.avatarWrap}>
                  {displayPhotoUri
                    ? <Image source={{ uri: displayPhotoUri }} style={styles.avatarImg} />
                    : <Text style={styles.avatarInitial}>{initial}</Text>}
                  {uploadingPhoto && (
                    <View style={styles.photoOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </View>
                <View style={styles.photoActions}>
                  <Text style={styles.photoHint}>Square images work best (1:1 ratio)</Text>
                  <TouchableOpacity style={styles.changePhotoBtn} onPress={pickPhoto} disabled={uploadingPhoto}>
                    <Text style={styles.changePhotoBtnText}>
                      {newPhotoUri ? 'Change Again' : 'Change Photo'}
                    </Text>
                  </TouchableOpacity>
                  {newPhotoUri && (
                    <TouchableOpacity onPress={() => setNewPhotoUri(null)}>
                      <Text style={styles.removePhotoText}>Remove new photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ── Basic Info ── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BASIC INFO</Text>
            <View style={styles.card}>
              <FieldRow label="Full Name" required>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </FieldRow>
              <View style={styles.divider} />
              <FieldRow label="Email" note="Optional">
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                />
              </FieldRow>
            </View>
          </View>

          {/* ── Bio (artisans only) ── */}
          {isArtisan && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ABOUT YOU</Text>
              <View style={styles.card}>
                <View style={styles.bioRow}>
                  <TextInput
                    style={styles.bioInput}
                    value={bio}
                    onChangeText={t => setBio(t.slice(0, 300))}
                    placeholder="Tell customers a bit about yourself, your experience and what makes you great at your craft..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={300}
                  />
                  <Text style={styles.bioCount}>{bio.length}/300</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Skills (artisans only) ── */}
          {isArtisan && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>SKILLS</Text>
                <Text style={styles.sectionMeta}>Max 5</Text>
              </View>
              <View style={styles.card}>
                {skills.length > 0 ? (
                  <View style={styles.chipRow}>
                    {skills.map(s => (
                      <View key={s} style={styles.skillChip}>
                        <Text style={styles.skillChipText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptySkills}>No skills selected yet.</Text>
                )}
                <TouchableOpacity
                  style={styles.editSkillsBtn}
                  onPress={() => setShowSkillPicker(true)}
                >
                  <Text style={styles.editSkillsBtnText}>
                    {skills.length === 0 ? '+ Select Skills' : 'Edit Skills'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Location (artisans only) ── */}
          {isArtisan && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SERVICE LOCATION</Text>
              <View style={styles.card}>
                <FieldRow label="Address">
                  <TextInput
                    style={styles.input}
                    value={locationFields.address}
                    onChangeText={v => setLocationFields(p => ({ ...p, address: v }))}
                    placeholder="Street address or area"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                  />
                </FieldRow>
                <View style={styles.divider} />
                <FieldRow label="State" required>
                  <TextInput
                    style={styles.input}
                    value={locationFields.state}
                    onChangeText={v => setLocationFields(p => ({ ...p, state: v }))}
                    placeholder="e.g. Lagos"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </FieldRow>
                <View style={styles.divider} />
                <FieldRow label="LGA">
                  <TextInput
                    style={styles.input}
                    value={locationFields.lga}
                    onChangeText={v => setLocationFields(p => ({ ...p, lga: v }))}
                    placeholder="Local Government Area"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </FieldRow>
              </View>
              <Text style={styles.locationNote}>
                Your GPS coordinates from onboarding are preserved. Only update your location text if you've moved.
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Skills Picker Modal ── */}
      {isArtisan && (
        <Modal
          visible={showSkillPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSkillPicker(false)}
        >
          <SafeAreaView style={styles.modalSafe} edges={['top']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Skills</Text>
              <TouchableOpacity onPress={() => setShowSkillPicker(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              {skills.length}/5 selected
            </Text>
            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.skillGrid}>
                {allSkills.map(skill => {
                  const selected = skills.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={[styles.skillOption, selected && styles.skillOptionSelected]}
                      onPress={() => toggleSkill(skill)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.skillOptionText, selected && styles.skillOptionTextSelected]}>
                        {skill}
                      </Text>
                      {selected && <Text style={styles.skillCheck}> ✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function FieldRow({ label, required, note, children }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldLabelWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {required && <Text style={styles.fieldRequired}> *</Text>}
        {note && <Text style={styles.fieldNote}> ({note})</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerBack:  { fontSize: 15, color: PRIMARY, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerSave:  { fontSize: 15, color: PRIMARY, fontWeight: '800' },

  scroll: { paddingTop: 20 },

  /* Section */
  section:       { marginHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionLabel:  { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.1, marginBottom: 8 },
  sectionMeta:   { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  /* Card */
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },

  /* Photo */
  photoRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  avatarWrap:  { width: 80, height: 80, borderRadius: 40, backgroundColor: '#C7D2FE', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#BFDBFE' },
  avatarImg:   { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { fontSize: 32, fontWeight: '900', color: PRIMARY },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  photoActions:  { flex: 1, marginLeft: 16, gap: 8 },
  photoHint:     { fontSize: 12, color: '#94A3B8' },
  changePhotoBtn:{ backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start' },
  changePhotoBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  removePhotoText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },

  /* Field rows */
  fieldRow:      { paddingHorizontal: 16, paddingVertical: 14 },
  fieldLabelWrap:{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fieldLabel:    { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRequired: { fontSize: 12, color: '#EF4444', fontWeight: '700' },
  fieldNote:     { fontSize: 12, color: '#94A3B8' },
  input: {
    fontSize: 15, color: '#0F172A', fontWeight: '500',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },

  /* Bio */
  bioRow:   { padding: 16 },
  bioInput: {
    fontSize: 14, color: '#0F172A', lineHeight: 20,
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    padding: 12, backgroundColor: '#F8FAFC',
    minHeight: 100,
  },
  bioCount: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 6 },

  /* Skills */
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  skillChip: {
    backgroundColor: '#EFF6FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  skillChipText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  emptySkills: { fontSize: 14, color: '#94A3B8', padding: 16 },
  editSkillsBtn: {
    marginHorizontal: 16, marginBottom: 14, marginTop: 8,
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  editSkillsBtnText: { fontSize: 14, fontWeight: '700', color: PRIMARY },

  /* Location note */
  locationNote: { fontSize: 12, color: '#94A3B8', marginTop: 8, lineHeight: 17 },

  /* Skills Modal */
  modalSafe:   { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalTitle:  { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  modalDone:   { fontSize: 15, fontWeight: '800', color: PRIMARY },
  modalSub:    { fontSize: 13, color: '#64748B', paddingHorizontal: 20, paddingTop: 10 },
  modalScroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  skillGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skillOption: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  skillOptionSelected: { borderColor: PRIMARY, backgroundColor: '#EFF6FF' },
  skillOptionText:     { fontSize: 14, fontWeight: '600', color: '#475569' },
  skillOptionTextSelected: { color: PRIMARY, fontWeight: '700' },
  skillCheck:  { fontSize: 12, color: PRIMARY, fontWeight: '900' },
});
