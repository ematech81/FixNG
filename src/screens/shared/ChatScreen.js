import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getChatHistory, sendMessage, sendImageMessage } from '../../api/chatApi';
import { getUser } from '../../utils/storage';
import { connectSocket } from '../../hooks/useSocket';

export default function ChatScreen({ route, navigation }) {
  const { jobId, jobCategory, otherPartyName } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const flatListRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    initChat();
    return () => {
      // Detach chat message listener on unmount
      if (socketRef.current) {
        socketRef.current.off('new_message', handleNewMessage);
      }
    };
  }, []);

  const handleNewMessage = useCallback((msg) => {
    if (msg.jobId !== jobId) return;
    setMessages((prev) => {
      const exists = prev.find((m) => m.id === msg.id);
      if (exists) return prev;
      return [...prev, msg];
    });
    scrollToBottom();
  }, [jobId]);

  const initChat = async () => {
    const user = await getUser();
    setCurrentUser(user);

    // Connect socket and listen for new messages
    const socket = await connectSocket(user.id);
    socketRef.current = socket;
    socket.on('new_message', handleNewMessage);

    // Load history
    try {
      const res = await getChatHistory(jobId, { page: 1, limit: 50 });
      setMessages(res.data.data || []);
    } catch (err) {
      Alert.alert('Error', 'Could not load chat history.');
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setInputText('');
    setSending(true);
    try {
      const res = await sendMessage(jobId, text);
      setMessages((prev) => [...prev, res.data.data]);
      scrollToBottom();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send message.');
      setInputText(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

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

    setSending(true);
    try {
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop();
      const ext = filename.split('.').pop().toLowerCase();

      const formData = new FormData();
      formData.append('image', { uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });

      const res = await sendImageMessage(jobId, formData);
      setMessages((prev) => [...prev, res.data.data]);
      scrollToBottom();
    } catch {
      Alert.alert('Error', 'Failed to send image.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === currentUser?.id || item.senderId?._id === currentUser?.id || item.senderId === currentUser?.id;
    const senderIdStr = item.senderId?._id || item.senderId;
    const isMine = senderIdStr?.toString() === currentUser?.id?.toString();

    return (
      <View style={[styles.messageRow, isMine && styles.messageRowRight]}>
        <View style={[styles.messageBubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {!isMine && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}

          {item.type === 'image' && item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} resizeMode="cover" />
          ) : (
            <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
              {item.text}
            </Text>
          )}

          {item.wasFiltered && (
            <Text style={styles.filteredNote}>📵 Phone number hidden</Text>
          )}

          <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id?.toString() || item._id?.toString() || Math.random().toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onLayout={scrollToBottom}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatIcon}>💬</Text>
              <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.imageBtn} onPress={handleSendImage} disabled={sending}>
            <Text style={styles.imageBtnText}>📷</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { color: '#FF6B00', fontSize: 15, fontWeight: '600', width: 60 },
  headerCenter: { alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  headerJob: { fontSize: 12, color: '#888' },
  notice: {
    backgroundColor: '#FFF3EC', padding: 8, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#FFE0CC',
  },
  noticeText: { fontSize: 11, color: '#CC5500' },
  messageList: { padding: 16, gap: 8, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 8 },
  messageRowRight: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '75%', padding: 12, borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: '#FF6B00', borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFF', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  senderName: { fontSize: 11, color: '#888', fontWeight: '700', marginBottom: 4 },
  messageText: { fontSize: 15, color: '#1A1A1A', lineHeight: 20 },
  messageTextMine: { color: '#FFF' },
  messageImage: { width: 200, height: 150, borderRadius: 10 },
  filteredNote: { fontSize: 10, color: '#999', marginTop: 4, fontStyle: 'italic' },
  messageTime: { fontSize: 10, color: '#999', marginTop: 4, textAlign: 'right' },
  messageTimeMine: { color: 'rgba(255,255,255,0.7)' },
  emptyChat: { alignItems: 'center', paddingTop: 60 },
  emptyChatIcon: { fontSize: 40, marginBottom: 12 },
  emptyChatText: { fontSize: 14, color: '#AAA' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  imageBtn: { padding: 8, justifyContent: 'center' },
  imageBtnText: { fontSize: 22 },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#FAFAFA', maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#FF6B00', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, minWidth: 56, alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#FFCBA4' },
  sendBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
