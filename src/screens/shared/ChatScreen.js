import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getChatHistory, sendMessage, sendImageMessage, sendVoiceMessage } from '../../api/chatApi';
import BackButton from '../../components/BackButton';
import { getUser } from '../../utils/storage';
import { connectSocket } from '../../hooks/useSocket';
import VoiceNoteRecorder from '../../components/VoiceNoteRecorder';
import VoiceNotePlayer from '../../components/VoiceNotePlayer';

export default function ChatScreen({ route, navigation }) {
  const { jobId, jobCategory, otherPartyName } = route.params;

  const [messages, setMessages]     = useState([]);
  const [inputText, setInputText]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [imageSending, setImageSending] = useState(false); // only images show a loader
  const [currentUser, setCurrentUser]   = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const currentUserRef = useRef(null); // stable ref so socket callbacks never go stale
  const sendingRef     = useRef(false); // guard against double-tap without a re-render
  const flatListRef    = useRef(null);
  const socketRef      = useRef(null);

  // ── Auto-scroll whenever the message list grows ────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    // Small delay lets React flush the new item into the DOM before scrolling
    const t = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(t);
  }, [messages.length]);

  // ── Socket + history bootstrap ─────────────────────────────────────────────
  useEffect(() => {
    initChat();
    return () => {
      socketRef.current?.off('new_message', handleNewMessage);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewMessage = useCallback((msg) => {
    if (msg.jobId?.toString() !== jobId?.toString()) return;
    // Ignore own messages — already added optimistically
    const myId = currentUserRef.current?._id?.toString()
              || currentUserRef.current?.id?.toString();
    if (myId && msg.senderId?.toString() === myId) return;

    setMessages((prev) => {
      const msgId = msg.id?.toString() || msg._id?.toString();
      const exists = prev.find((m) => (m.id || m._id)?.toString() === msgId);
      if (exists) return prev;
      return [...prev, msg];
    });
  }, [jobId]);

  const initChat = async () => {
    const user = await getUser();
    currentUserRef.current = user;
    setCurrentUser(user);

    const socket = await connectSocket(user._id || user.id);
    socketRef.current = socket;
    socket.on('new_message', handleNewMessage);

    try {
      const res = await getChatHistory(jobId, { page: 1, limit: 50 });
      setMessages(res.data.data || []);
    } catch {
      Alert.alert('Error', 'Could not load chat history.');
    } finally {
      setLoading(false);
    }
  };

  // ── Text send — optimistic UI ──────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;

    const tempId = `temp_${Date.now()}`;
    const myUser = currentUserRef.current;
    const tempMsg = {
      id: tempId,
      jobId,
      senderId: myUser?._id || myUser?.id,
      senderName: myUser?.name || 'You',
      senderRole: myUser?.role,
      type: 'text',
      text,
      pending: true,
      createdAt: new Date().toISOString(),
    };

    setInputText('');
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await sendMessage(jobId, text);
      // Swap the optimistic placeholder for the confirmed server message
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? res.data.data : m)
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send message.');
    } finally {
      sendingRef.current = false;
    }
  };

  // ── Image send — keeps a loading overlay since upload takes time ───────────
  const handleSendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access needed to share images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    setImageSending(true);
    try {
      const uri      = result.assets[0].uri;
      const filename = uri.split('/').pop();
      const ext      = filename.split('.').pop().toLowerCase();

      const formData = new FormData();
      formData.append('image', { uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });

      const res = await sendImageMessage(jobId, formData);
      setMessages((prev) => [...prev, res.data.data]);
    } catch {
      Alert.alert('Error', 'Failed to send image.');
    } finally {
      setImageSending(false);
    }
  };

  // ── Voice note send ────────────────────────────────────────────────────────
  const handleSendVoice = async (uri, duration) => {
    setShowVoiceRecorder(false);
    const myUser = currentUserRef.current;
    const tempId = `temp_voice_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      jobId,
      senderId: myUser?._id || myUser?.id,
      senderName: myUser?.name || 'You',
      senderRole: myUser?.role,
      type: 'audio',
      audioUrl: uri,
      audioDuration: duration,
      pending: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const ext = uri.split('.').pop()?.toLowerCase() || 'm4a';
      const formData = new FormData();
      formData.append('audio', { uri, name: `voice_${Date.now()}.${ext}`, type: `audio/${ext === 'caf' ? 'x-caf' : ext}` });
      formData.append('duration', String(duration));

      const res = await sendVoiceMessage(jobId, formData);
      setMessages((prev) => prev.map((m) => m.id === tempId ? res.data.data : m));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send voice note.');
    }
  };

  // ── Message bubble ─────────────────────────────────────────────────────────
  const renderMessage = ({ item }) => {
    const senderIdStr = item.senderId?._id || item.senderId;
    const myId = currentUser?._id || currentUser?.id;
    const isMine = senderIdStr?.toString() === myId?.toString();

    return (
      <View style={[styles.messageRow, isMine && styles.messageRowRight]}>
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
            item.pending && styles.bubblePending,
          ]}
        >
          {!isMine && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}

          {item.type === 'image' && item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} resizeMode="cover" />
          ) : item.type === 'audio' ? (
            <VoiceNotePlayer
              uri={item.audioUrl}
              duration={item.audioDuration}
              isMine={isMine}
            />
          ) : (
            <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
              {item.text}
            </Text>
          )}

          {item.wasFiltered && (
            <Text style={styles.filteredNote}>📵 Phone number hidden</Text>
          )}

          <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
            {item.pending ? '···' : formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerName}>{otherPartyName || 'Chat'}</Text>
            <Text style={styles.headerJob}>{jobCategory}</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Phone masking notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            📱 Phone numbers are hidden to keep communication in-app
          </Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id?.toString() || item._id?.toString() || Math.random().toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatIcon}>💬</Text>
              <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
            </View>
          }
        />

        {/* Image upload overlay */}
        {imageSending && (
          <View style={styles.imageUploadOverlay}>
            <ActivityIndicator color="#FFF" size="small" />
            <Text style={styles.imageUploadText}>Uploading photo…</Text>
          </View>
        )}

        {/* Input row */}
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.imageBtn} onPress={handleSendImage} disabled={imageSending}>
            <Text style={styles.imageBtnText}>📷</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageBtn}
            onPress={() => setShowVoiceRecorder(true)}
            disabled={imageSending}
          >
            <Text style={styles.imageBtnText}>🎤</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* Voice recorder modal */}
        <Modal
          visible={showVoiceRecorder}
          transparent
          animationType="slide"
          onRequestClose={() => setShowVoiceRecorder(false)}
        >
          <View style={styles.voiceModalOverlay}>
            <VoiceNoteRecorder
              onSend={handleSendVoice}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerCenter: { alignItems: 'center' },
  headerName:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  headerJob:    { fontSize: 12, color: '#888' },

  notice: {
    backgroundColor: '#FFF3EC', padding: 8, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#FFE0CC',
  },
  noticeText: { fontSize: 11, color: '#CC5500' },

  messageList: { padding: 16, paddingBottom: 8 },

  messageRow:      { flexDirection: 'row', marginBottom: 8 },
  messageRowRight: { justifyContent: 'flex-end' },

  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  bubbleMine:    { backgroundColor: '#FF6B00', borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: '#FFF', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  // Pending (optimistic) messages look slightly transparent
  bubblePending: { opacity: 0.65 },

  senderName:      { fontSize: 11, color: '#888', fontWeight: '700', marginBottom: 4 },
  messageText:     { fontSize: 15, color: '#1A1A1A', lineHeight: 20 },
  messageTextMine: { color: '#FFF' },
  messageImage:    { width: 200, height: 150, borderRadius: 10 },
  filteredNote:    { fontSize: 10, color: '#999', marginTop: 4, fontStyle: 'italic' },
  messageTime:     { fontSize: 10, color: '#999', marginTop: 4, textAlign: 'right' },
  messageTimeMine: { color: 'rgba(255,255,255,0.7)' },

  emptyChat:     { alignItems: 'center', paddingTop: 60 },
  emptyChatIcon: { fontSize: 40, marginBottom: 12 },
  emptyChatText: { fontSize: 14, color: '#AAA' },

  voiceModalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  imageUploadOverlay: {
    position: 'absolute', bottom: 72, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  imageUploadText: { color: '#FFF', fontSize: 13 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: '#F0F0F0', marginBottom: Platform.OS === 'ios' ? 0 : 50,  
  },
  imageBtn:     { padding: 8, justifyContent: 'center' },
  imageBtnText: { fontSize: 22 },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#FAFAFA', maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#FF6B00', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, minWidth: 60, alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#FFCBA4' },
  sendBtnText:     { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
