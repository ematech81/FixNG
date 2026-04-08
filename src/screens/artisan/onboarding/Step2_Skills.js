import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ARTISAN_SKILLS } from '../../../constants/skills';
import { updateSkills } from '../../../api/artisanApi';

const MAX_SKILLS = 5;
const TOTAL_STEPS = 5;
const CURRENT_STEP = 2;

export default function Step2_Skills({ navigation }) {
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      }
      if (prev.length >= MAX_SKILLS) {
        Alert.alert('Limit Reached', `You can only select up to ${MAX_SKILLS} skills.`);
        return prev;
      }
      return [...prev, skill];
    });
  };

  const handleContinue = async () => {
    if (selectedSkills.length === 0) {
      Alert.alert('No Skills Selected', 'Please select at least one skill to continue.');
      return;
    }

    setSaving(true);
    try {
      await updateSkills(selectedSkills);
      navigation.navigate('Step3_Location');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save skills. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} />

        <Text style={styles.title}>Your Skills</Text>
        <Text style={styles.subtitle}>
          Select up to {MAX_SKILLS} skills. These determine the jobs you'll receive.
        </Text>

        <Text style={styles.selected}>
          {selectedSkills.length}/{MAX_SKILLS} selected
        </Text>

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

        {selectedSkills.length > 0 && (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Selected:</Text>
            {selectedSkills.map((s) => (
              <Text key={s} style={styles.previewItem}>
                • {s}
              </Text>
            ))}
          </View>
        )}
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
  subtitle: { fontSize: 15, color: '#666', marginBottom: 8, lineHeight: 22 },
  selected: { fontSize: 13, color: '#FF6B00', fontWeight: '600', marginBottom: 20 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  skillChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  skillChipSelected: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF3EC',
  },
  skillChipText: { fontSize: 14, color: '#444' },
  skillChipTextSelected: { color: '#FF6B00', fontWeight: '600' },
  previewBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  previewItem: { fontSize: 14, color: '#555', marginBottom: 4 },
  footer: { padding: 24, paddingTop: 0 },
  continueBtn: { backgroundColor: '#FF6B00', padding: 16, borderRadius: 12, alignItems: 'center' },
  continueBtnDisabled: { backgroundColor: '#FFCBA4' },
  continueBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
