import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function DispatchSafetyModal({ visible, onConfirm, onGoBack }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onGoBack}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🏍️</Text>
          </View>

          <Text style={styles.title}>Before You Book a Dispatch Rider</Text>
          <Text style={styles.subtitle}>Please read and acknowledge the following.</Text>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <SectionHeader icon="💰" label="Pricing Disclaimer" />
            <Bullet text="Delivery prices are negotiated directly between you and the rider — FixNG does not set or guarantee pricing." />
            <Bullet text="Always agree on a price BEFORE the rider picks up your item." />
            <Bullet text="FixNG is not responsible for pricing disputes between you and the rider." />

            <SectionHeader icon="🔒" label="Security Tips" />
            <Bullet text="Verify the rider's vehicle plate number on their profile before handing over any item." />
            <Bullet text="Only send items you are comfortable entrusting to a third party." />
            <Bullet text="For valuable or fragile items, ensure the rider provides packaging." />
            <Bullet text="Take a photo of your item before handover as proof of condition." />
            <Bullet text="Share the rider's name and plate number with someone you trust." />

            <SectionHeader icon="📦" label="Delivery Tips" />
            <Bullet text="Provide a clear delivery address with a landmark to avoid confusion." />
            <Bullet text="Stay reachable on your phone throughout the delivery." />
            <Bullet text="Confirm receipt with the recipient before closing the job." />
            <Bullet text="Use the in-app chat to communicate with the rider during delivery." />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.backBtn} onPress={onGoBack} activeOpacity={0.8}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>I Understand →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SectionHeader({ icon, label }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

function Bullet({ text }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    width: '100%',
    maxHeight: '88%',
    overflow: 'hidden',
  },
  iconWrap: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: colors.primaryLight,
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: 18, fontWeight: '800', color: colors.text,
    textAlign: 'center', marginTop: 16, paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 13, color: colors.textSub,
    textAlign: 'center', marginTop: 4, marginBottom: 12, paddingHorizontal: 20,
  },
  scroll:        { maxHeight: 340 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 8 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, marginBottom: 8,
  },
  sectionIcon:  { fontSize: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.textSub, textTransform: 'uppercase', letterSpacing: 0.5 },

  bulletRow:  { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bulletDot:  { fontSize: 14, color: colors.primaryDark, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 13, color: colors.textSub, lineHeight: 19 },

  actions: {
    flexDirection: 'row', gap: 12,
    padding: 20, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  backBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  backBtnText:    { fontSize: 14, fontWeight: '700', color: colors.textSub },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.primaryDark, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});
