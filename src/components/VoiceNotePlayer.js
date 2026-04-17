/**
 * VoiceNotePlayer — inline playback component for voice note messages
 *
 * Props:
 *   uri       — Cloudinary/remote audio URL
 *   duration  — duration in seconds (optional, for display)
 *   isMine    — bool, affects color scheme (orange vs white)
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';

export default function VoiceNotePlayer({ uri, duration, isMine }) {
  const [status, setStatus] = useState('idle'); // idle | loading | playing | paused
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState((duration || 0) * 1000);
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const handlePlayPause = async () => {
    try {
      if (status === 'idle' || status === 'paused') {
        if (!soundRef.current) {
          setStatus('loading');
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });
          const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true },
            onPlaybackStatus
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.playAsync();
        }
        setStatus('playing');
      } else if (status === 'playing') {
        await soundRef.current.pauseAsync();
        setStatus('paused');
      }
    } catch (err) {
      console.error('VoiceNotePlayer error:', err);
      setStatus('idle');
    }
  };

  const onPlaybackStatus = (s) => {
    if (!s.isLoaded) return;
    setPositionMs(s.positionMillis || 0);
    if (s.durationMillis) setDurationMs(s.durationMillis);
    if (s.didJustFinish) {
      setStatus('idle');
      setPositionMs(0);
      // Unload so next tap creates a fresh instance from the start
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  };

  const formatTime = (ms) => {
    const totalSec = Math.round(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const displayDuration = status === 'playing' || status === 'paused'
    ? formatTime(positionMs)
    : formatTime(durationMs);

  const trackColor = isMine ? 'rgba(255,255,255,0.3)' : '#E5E7EB';
  const fillColor  = isMine ? '#FFF' : '#FF6B00';
  const iconColor  = isMine ? '#FF6B00' : '#FFF';
  const btnBg      = isMine ? '#FFF' : '#FF6B00';
  const timeColor  = isMine ? 'rgba(255,255,255,0.85)' : '#666';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.playBtn, { backgroundColor: btnBg }]}
        onPress={handlePlayPause}
        activeOpacity={0.8}
      >
        {status === 'loading' ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Text style={{ fontSize: 16, color: iconColor }}>
            {status === 'playing' ? '⏸' : '▶'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.waveformArea}>
        <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: fillColor }]} />
        </View>
      </View>

      <Text style={[styles.time, { color: timeColor }]}>{displayDuration}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minWidth: 180,
  },
  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3,
    elevation: 2,
  },
  waveformArea: {
    flex: 1,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2,
  },
  time: {
    fontSize: 11, fontVariant: ['tabular-nums'],
    minWidth: 36, textAlign: 'right',
  },
});
