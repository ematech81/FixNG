import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * Reusable back button.
 * Usage:
 *   <BackButton onPress={() => navigation.goBack()} />
 *   <BackButton onPress={() => navigation.goBack()} color="#FFF" size={28} />
 */
export default function BackButton({ onPress, color = '#1E232C', size = 28, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, style]} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name="arrow-back-circle-outline" size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { justifyContent: 'center', alignItems: 'center' },
});
