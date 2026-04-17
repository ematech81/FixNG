import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getConversations } from '../../api/chatApi';
import { getUser } from '../../utils/storage';
import { connectSocket } from '../../hooks/useSocket';

const PRIMARY = '#2563EB';

const STATUS_META = {
  pending:       { label: 'Pending',     color: '#D97706', bg: '#FFFBEB' },
  accepted:      { label: 'Accepted',    color: '#1D4ED8', bg: '#EFF6FF' },
  'in-progress': { label: 'In Progress', color: '#7C3AED', bg: '#F5F3FF' },
  completed:     { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
  disputed:      { label: 'Disputed',    color: '#DC2626', bg: '#FEE2E2' },
  cancelled:     { label: 'Cancelled',   color: '#9CA3AF', bg: '#F9FAFB' },
};

const CHAT_STATUSES = ['accepted', 'in-progress', 'completed', 'disputed'];

export default function MessagesScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [userRole, setUserRole]           = useState('customer');
  const [userId, setUserId]               = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  // Real-time: when a new message arrives, move that thread to the top.
  // Use connectSocket (not getSocket) so the socket is always available even
  // if MessagesScreen mounts before the socket singleton is created.
  useEffect(() => {
    let detach = null;

    getUser().then((u) => {
      const uid = u?._id || u?.id;
      if (!uid) return;

      connectSocket(uid).then((socket) => {
        const handleNewMessage = (data) => {
          const incomingJobId = data.jobId?.toString();
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c._id?.toString() === incomingJobId);
            if (idx === -1) {
              fetchConversations(); // unknown thread — do a full refresh
              return prev;
            }
            const updated = [...prev];
            const [conv] = updated.splice(idx, 1);
            return [
              {
                ...conv,
                lastMessage: {
                  text: data.type === 'image' ? '📷 Photo' : (data.text || ''),
                  at: data.createdAt || new Date().toISOString(),
                },
              },
              ...updated,
            ];
          });
        };

        socket.on('new_message', handleNewMessage);
        detach = () => socket.off('new_message', handleNewMessage);
      });
    });

    return () => detach?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const u = await getUser();
      setUserRole(u?.role || 'customer');
      setUserId(u?._id || u?.id);

      const res = await getConversations();
      setConversations(res.data.data || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const getOtherParty = (conv) => {
    const myId = userId?.toString();
    if (!myId) return userRole === 'artisan' ? 'Customer' : 'Artisan';

    const customerId = conv.customerId?._id?.toString() || conv.customerId?.toString();
    if (customerId === myId) {
      return conv.assignedArtisanId?.name || 'Artisan';
    }
    return conv.customerId?.name || 'Customer';
  };

  const handleChatPress = (conv) => {
    navigation.navigate('Chat', {
      jobId: conv._id,
      jobCategory: conv.category,
      otherPartyName: getOtherParty(conv),
    });
  };

  const renderItem = ({ item }) => {
    const meta       = STATUS_META[item.status] || STATUS_META.pending;
    const otherParty = getOtherParty(item);
    const initial    = otherParty[0]?.toUpperCase() || '?';
    const canChat    = CHAT_STATUSES.includes(item.status);
    const lastMsg    = item.lastMessage;
    const timeStr    = lastMsg?.at ? getTimeAgo(lastMsg.at) : '';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => canChat && handleChatPress(item)}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.otherPartyName} numberOfLines={1}>{otherParty}</Text>
            <Text style={styles.timeAgo}>{timeStr}</Text>
          </View>

          {/* Last message preview */}
          {lastMsg?.text ? (
            <Text style={styles.lastMsg} numberOfLines={1}>{lastMsg.text}</Text>
          ) : (
            <Text style={styles.jobCategory} numberOfLines={1}>
              {item.category} · {item.location?.address || item.location?.state || 'Nigeria'}
            </Text>
          )}

          <View style={styles.cardBottom}>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {canChat && (
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => handleChatPress(item)}
              >
                <Text style={styles.chatBtnText}>💬 Open Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            {userRole === 'artisan'
              ? 'Accept a job to start chatting\nwith the customer.'
              : 'Once an artisan accepts your job\nand you chat, it will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchConversations}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },

  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEF0F5',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1E232C' },

  list: { paddingTop: 12, paddingBottom: 20, paddingHorizontal: 16 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    marginBottom: 10,
    borderWidth: 1, borderColor: '#EEF0F5',
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
  },

  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: PRIMARY },

  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 2,
  },
  otherPartyName: { fontSize: 15, fontWeight: '700', color: '#1E232C', flex: 1, marginRight: 6 },
  timeAgo:        { fontSize: 11, color: '#9CA3AF' },
  lastMsg:        { fontSize: 13, color: '#374151', marginBottom: 8 },
  jobCategory:    { fontSize: 13, color: '#6B7280', marginBottom: 8 },

  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: '700' },

  chatBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#EFF6FF',
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  chatBtnText: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  centerBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  emptyIcon:     { fontSize: 52, marginBottom: 16 },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: '#1E232C', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
