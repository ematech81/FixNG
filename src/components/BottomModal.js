import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Pressable, ActivityIndicator,
} from 'react-native';

/**
 * Reusable bottom-sheet modal with built-in KeyboardAvoidingView so the
 * Android keyboard never covers text inputs inside it.
 *
 * Props:
 *   visible        bool
 *   onClose        () => void   — called on backdrop press or Cancel
 *   title          string
 *   subtitle       string       — optional helper text below the title
 *   confirmLabel   string       — text for the confirm button (default "Submit")
 *   confirmColor   string       — background color of confirm button
 *   onConfirm      () => void
 *   confirmLoading bool         — shows spinner instead of label
 *   confirmDisabled bool
 *   children       ReactNode    — inputs go here
 */
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

const styles = StyleSheet.create({
  kav: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 4,
  },
  subtitle: {
    fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 16,
  },
  actions: {
    flexDirection: 'row', gap: 12, marginTop: 20,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});
