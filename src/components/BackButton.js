import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

export default function BackButton({ onPress, color, size = 28, style }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, style]} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name="arrow-back-circle-outline" size={size} color={color ?? colors.text} />
    </TouchableOpacity>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  btn: { justifyContent: 'center', alignItems: 'center' },
});
