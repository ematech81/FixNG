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
import { useTheme } from '../../context/ThemeContext';

export default function EditProfileScreen({ navigation }) {
  const { colors } = useTheme();
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
  const [locationCoords, setLocationCoords] = useState(null);
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
      let photoData = null;
      if (newPhotoUri) {
        setUploadingPhoto(true);
        photoData = await uploadImageToCloudinary(newPhotoUri);
        setUploadingPhoto(false);
      }

      const userRes = await updateUserProfile({
        name: name.trim(),
        email: email.trim() || undefined,
      });
      const updatedUser = userRes.data.data;

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

  const displayPhotoUri = newPhotoUri || existingPhotoUrl;
  const initial = (name || 'U')[0].toUpperCase();

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.info} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {saving
            ? <ActivityIndicator size="small" color={colors.info} />
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
                      <ActivityIndicator color={colors.card} />
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
              <FieldRow label="Full Name" required colors={colors} styles={styles}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </FieldRow>
              <View style={styles.divider} />
              <FieldRow label="Email" note="Optional" colors={colors} styles={styles}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
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
                    placeholderTextColor={colors.textMuted}
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
                <FieldRow label="Address" colors={colors} styles={styles}>
                  <TextInput
                    style={styles.input}
                    value={locationFields.address}
                    onChangeText={v => setLocationFields(p => ({ ...p, address: v }))}
                    placeholder="Street address or area"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="next"
                  />
                </FieldRow>
                <View style={styles.divider} />
                <FieldRow label="State" required colors={colors} styles={styles}>
                  <TextInput
                    style={styles.input}
                    value={locationFields.state}
                    onChangeText={v => setLocationFields(p => ({ ...p, state: v }))}
                    placeholder="e.g. Lagos"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </FieldRow>
                <View style={styles.divider} />
                <FieldRow label="LGA" colors={colors} styles={styles}>
                  <TextInput
                    style={styles.input}
                    value={locationFields.lga}
                    onChangeText={v => setLocationFields(p => ({ ...p, lga: v }))}
                    placeholder="Local Government Area"
                    placeholderTextColor={colors.textMuted}
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

function FieldRow({ label, required, note, children, colors, styles }) {
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

const makeStyles = (colors) => StyleSheet.create({
  safe:             { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.borderInput,
  },
  headerBack:  { fontSize: 15, color: colors.info, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  headerSave:  { fontSize: 15, color: colors.info, fontWeight: '800' },

  scroll: { paddingTop: 20 },

  /* Section */
  section:       { marginHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionLabel:  { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.1, marginBottom: 8 },
  sectionMeta:   { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  /* Card */
  card: {
    backgroundColor: colors.card, borderRadius: 16,
    shadowColor: colors.textSub, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },

  /* Photo */
  photoRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16,
    shadowColor: colors.textSub, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  avatarWrap:  { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.infoBg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: colors.info },
  avatarImg:   { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { fontSize: 32, fontWeight: '900', color: colors.info },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  photoActions:  { flex: 1, marginLeft: 16, gap: 8 },
  photoHint:     { fontSize: 12, color: colors.textMuted },
  changePhotoBtn:{ backgroundColor: colors.info, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start' },
  changePhotoBtnText: { color: colors.card, fontSize: 13, fontWeight: '700' },
  removePhotoText: { fontSize: 12, color: colors.error, fontWeight: '600' },

  /* Field rows */
  fieldRow:      { paddingHorizontal: 16, paddingVertical: 14 },
  fieldLabelWrap:{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fieldLabel:    { fontSize: 12, fontWeight: '700', color: colors.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRequired: { fontSize: 12, color: colors.error, fontWeight: '700' },
  fieldNote:     { fontSize: 12, color: colors.textMuted },
  input: {
    fontSize: 15, color: colors.text, fontWeight: '500',
    borderWidth: 1, borderColor: colors.borderInput, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.inputBg,
  },
  divider: { height: 1, backgroundColor: colors.surface, marginHorizontal: 16 },

  /* Bio */
  bioRow:   { padding: 16 },
  bioInput: {
    fontSize: 14, color: colors.text, lineHeight: 20,
    borderWidth: 1, borderColor: colors.borderInput, borderRadius: 10,
    padding: 12, backgroundColor: colors.inputBg,
    minHeight: 100,
  },
  bioCount: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 6 },

  /* Skills */
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  skillChip: {
    backgroundColor: colors.infoBg, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.info,
  },
  skillChipText: { fontSize: 13, fontWeight: '700', color: colors.info },
  emptySkills: { fontSize: 14, color: colors.textMuted, padding: 16 },
  editSkillsBtn: {
    marginHorizontal: 16, marginBottom: 14, marginTop: 8,
    borderWidth: 1.5, borderColor: colors.info, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  editSkillsBtnText: { fontSize: 14, fontWeight: '700', color: colors.info },

  /* Location note */
  locationNote: { fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 17 },

  /* Skills Modal */
  modalSafe:   { flex: 1, backgroundColor: colors.card },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.surface,
  },
  modalTitle:  { fontSize: 17, fontWeight: '800', color: colors.text },
  modalDone:   { fontSize: 15, fontWeight: '800', color: colors.info },
  modalSub:    { fontSize: 13, color: colors.textSub, paddingHorizontal: 20, paddingTop: 10 },
  modalScroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  skillGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skillOption: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.inputBg,
  },
  skillOptionSelected: { borderColor: colors.info, backgroundColor: colors.infoBg },
  skillOptionText:     { fontSize: 14, fontWeight: '600', color: colors.textSub },
  skillOptionTextSelected: { color: colors.info, fontWeight: '700' },
  skillCheck:  { fontSize: 12, color: colors.info, fontWeight: '900' },
});
