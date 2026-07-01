import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Pressable, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function BottomModal({
  visible,
  onClose,
  title,
  subtitle,
  confirmLabel = 'Submit',
  confirmColor = '#2563EB',
  onConfirm,
  confirmLoading = false,
  confirmDisabled = false,
  children,
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            {children}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={confirmLoading}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: confirmColor }, confirmDisabled && styles.confirmBtnDisabled]}
                onPress={onConfirm}
                disabled={confirmDisabled || confirmLoading}
              >
                {confirmLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.confirmText}>{confirmLabel}</Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  kav: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4,
  },
  subtitle: {
    fontSize: 13, color: colors.textSub, lineHeight: 18, marginBottom: 16,
  },
  actions: {
    flexDirection: 'row', gap: 12, marginTop: 20,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: colors.textSub },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});
