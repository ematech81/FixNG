/**
 * VoiceNoteRecorder — reusable voice recording component
 *
 * Props:
 *   onSend(uri, duration)  — called when user confirms the recording
 *   onCancel()             — called when user dismisses without sending
 *   maxDuration            — seconds (default 180 = 3 minutes)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../context/ThemeContext';

const MAX_DURATION = 180; // 3 minutes

export default function VoiceNoteRecorder({
  onSend,
  onCancel,
  maxDuration = MAX_DURATION,
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [phase, setPhase] = useState('idle'); // idle | recording | preview
  const [elapsed, setElapsed] = useState(0);
  const [recordingUri, setRecordingUri] = useState(null);
  const [duration, setDuration] = useState(0);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPosition, setPlayPosition] = useState(0); // ms

  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      sound?.unloadAsync().catch(() => {});
      pulseLoop.current?.stop();
    };
  }, [sound]);

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setElapsed(0);
      setPhase('recording');
      startPulse();

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= maxDuration) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording. Please try again.');
      console.error('VoiceNoteRecorder startRecording error:', err);
    }
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    stopPulse();

    try {
      const rec = recordingRef.current;
      if (!rec) return;
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      const status = await rec.getStatusAsync();
      const durationSec = Math.round((status.durationMillis || elapsed * 1000) / 1000);

      recordingRef.current = null;
      setRecordingUri(uri);
      setDuration(durationSec || elapsed);
      setPhase('preview');
    } catch (err) {
      console.error('VoiceNoteRecorder stopRecording error:', err);
      setPhase('idle');
    }
  };

  const playPreview = async () => {
    if (!recordingUri) return;
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPlayPosition(status.positionMillis || 0);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlayPosition(0);
            }
          }
        }
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      console.error('VoiceNoteRecorder playPreview error:', err);
    }
  };

  const pausePreview = async () => {
    await sound?.pauseAsync();
    setIsPlaying(false);
  };

  const discardRecording = async () => {
    await sound?.unloadAsync();
    setSound(null);
    setRecordingUri(null);
    setDuration(0);
    setPlayPosition(0);
    setIsPlaying(false);
    setPhase('idle');
  };

  const handleSend = () => {
    if (!recordingUri) return;
    sound?.unloadAsync().catch(() => {});
    onSend(recordingUri, duration);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (phase === 'idle') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.micBtn} onPress={startRecording} activeOpacity={0.8}>
          <Text style={styles.micIcon}>🎤</Text>
        </TouchableOpacity>
        <Text style={styles.hintText}>Tap to record a voice note (max {formatTime(maxDuration)})</Text>
        <TouchableOpacity onPress={onCancel} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'recording') {
    const remaining = maxDuration - elapsed;
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.micBtnRecording}>
            <Text style={styles.micIcon}>🎤</Text>
          </View>
        </Animated.View>

        <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        {remaining <= 30 && (
          <Text style={styles.remainingText}>
            {remaining}s remaining
          </Text>
        )}

        <TouchableOpacity style={styles.stopBtn} onPress={stopRecording} activeOpacity={0.8}>
          <View style={styles.stopSquare} />
          <Text style={styles.stopText}>Stop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressRatio = duration > 0 ? (playPosition / 1000) / duration : 0;
  return (
    <View style={styles.container}>
      <View style={styles.previewRow}>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={isPlaying ? pausePreview : playPreview}
          activeOpacity={0.8}
        >
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
        </TouchableOpacity>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
        </View>

        <Text style={styles.durationText}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.previewActions}>
        <TouchableOpacity style={styles.discardBtn} onPress={discardRecording} activeOpacity={0.8}>
          <Text style={styles.discardText}>🗑 Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendVoiceBtn} onPress={handleSend} activeOpacity={0.8}>
          <Text style={styles.sendVoiceText}>Send Voice Note</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  micBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 4,
  },
  micIcon: { fontSize: 32 },
  hintText: { fontSize: 12, color: colors.textMuted, marginBottom: 12, textAlign: 'center' },
  cancelLink: { paddingVertical: 4 },
  cancelLinkText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  pulseRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,107,0,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  micBtnRecording: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  timerText: {
    fontSize: 28, fontWeight: '700', color: colors.text,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  remainingText: { fontSize: 12, color: colors.error, marginBottom: 8 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
    backgroundColor: colors.borderLight, marginTop: 12,
  },
  stopSquare: {
    width: 14, height: 14, borderRadius: 2, backgroundColor: colors.error,
  },
  stopText: { fontSize: 14, fontWeight: '600', color: colors.textSub },

  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', marginBottom: 16,
  },
  playBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  playIcon: { fontSize: 18 },
  progressTrack: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  durationText: { fontSize: 12, color: colors.textMuted, minWidth: 36, textAlign: 'right' },
  previewActions: {
    flexDirection: 'row', gap: 12, width: '100%',
  },
  discardBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  discardText: { fontSize: 14, color: colors.textSub, fontWeight: '500' },
  sendVoiceBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  sendVoiceText: { fontSize: 14, color: '#FFF', fontWeight: '700' },
});
