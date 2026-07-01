import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, TextInput, Modal, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getJob, acceptJob, declineJob, markArrived, markCompleted, raiseDispute, cancelJob } from '../../api/jobApi';
import useSocket from '../../hooks/useSocket';
import BackButton from '../../components/BackButton';
import { getUser } from '../../utils/storage';
import VoiceNotePlayer from '../../components/VoiceNotePlayer';
import BottomModal from '../../components/BottomModal';
import { useTheme } from '../../context/ThemeContext';

const STATUS_LABELS = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FFFBEB' },
  accepted: { label: 'Accepted', color: '#3B82F6', bg: '#EFF6FF' },
  'in-progress': { label: 'In Progress', color: '#8B5CF6', bg: '#F5F3FF' },
  completed: { label: 'Completed', color: '#22C55E', bg: '#F0FDF4' },
  disputed: { label: 'Disputed', color: '#EF4444', bg: '#FEF2F2' },
  cancelled: { label: 'Cancelled', color: '#9CA3AF', bg: '#F9FAFB' },
};

export default function JobDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [disputeModal, setDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [acceptModal, setAcceptModal] = useState(false);
  const [eta, setEta] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    getUser().then(setCurrentUser);
    fetchJob();
  }, []);

  useSocket(currentUser?.id, {
    job_accepted: (data) => data.jobId === jobId && fetchJob(),
    artisan_arrived: (data) => data.jobId === jobId && fetchJob(),
    job_completed: (data) => data.jobId === jobId && fetchJob(),
    dispute_raised: (data) => data.jobId === jobId && fetchJob(),
    job_cancelled: (data) => data.jobId === jobId && fetchJob(),
  });

  const fetchJob = async () => {
    try {
      const res = await getJob(jobId);
      setJob(res.data.data);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not load job details.');
    } finally {
      setLoading(false);
    }
  };

  const currentUserId = currentUser?.id?.toString() || currentUser?._id?.toString();
  const isCustomer = !!currentUserId && job?.customerId?._id?.toString() === currentUserId;
  const isArtisan = !!currentUserId && job?.assignedArtisanId?._id?.toString() === currentUserId;

  const handleAccept = async () => {
    setActing(true);
    try {
      await acceptJob(jobId, {
        estimatedArrivalMinutes: eta ? parseInt(eta) : undefined,
        agreedPrice: price ? parseFloat(price) : undefined,
      });
      setAcceptModal(false);
      await fetchJob();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to accept job.');
    } finally {
      setActing(false);
    }
  };

  const handleDecline = () => {
    Alert.alert('Decline Job', 'Are you sure? This job will be removed from your list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          try {
            await declineJob(jobId);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err?.message || 'Failed to decline.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const handleArrived = () => {
    Alert.alert('Job Accepted', 'This will notify the customer that you have accepted the job.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Notify Customer',
        onPress: async () => {
          setActing(true);
          try {
            await markArrived(jobId);
            await fetchJob();
          } catch (err) {
            Alert.alert('Error', err?.message || 'Failed.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert('Mark as Complete', 'This tells the customer the job is done. Confirm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Complete',
        onPress: async () => {
          setActing(true);
          try {
            await markCompleted(jobId);
            await fetchJob();
          } catch (err) {
            Alert.alert('Error', err?.message || 'Failed.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      Alert.alert('Required', 'Please describe the issue before submitting.');
      return;
    }
    setActing(true);
    try {
      await raiseDispute(jobId, disputeReason.trim());
      setDisputeModal(false);
      await fetchJob();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to raise dispute.');
    } finally {
      setActing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Job', 'This cannot be undone. Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          try {
            await cancelJob(jobId);
            await fetchJob();
          } catch (err) {
            Alert.alert('Error', err?.message || 'Failed to cancel.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(job.artisanCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!job) return null;

  const statusConfig = STATUS_LABELS[job.status] || STATUS_LABELS.pending;
  const artisanCode = job.artisanCode;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {isCustomer && job.status === 'pending' && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerIcon}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingBannerTitle}>
                {job.assignedArtisanId
                  ? `Waiting for ${job.assignedArtisanId.name} to accept`
                  : 'Looking for an artisan near you…'}
              </Text>
              <Text style={styles.pendingBannerBody}>
                {job.assignedArtisanId
                  ? `Your request has been sent to ${job.assignedArtisanId.name}. They will confirm shortly — you'll get a notification the moment they accept.`
                  : "Your request has been sent to nearby artisans. Sit tight — you'll get a notification the moment someone accepts."}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.category}>{job.category}</Text>
        <View style={styles.urgencyRow}>
          <Text style={[styles.urgencyBadge, job.urgency === 'emergency' && styles.urgencyEmergency]}>
            {job.urgency === 'emergency' ? '🚨 Emergency' : '🔧 Normal'}
          </Text>
          <Text style={styles.timestamp}>{new Date(job.createdAt).toLocaleDateString()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        {job.voiceDescription?.url ? (
          <View style={styles.voiceCard}>
            <View style={styles.voiceCardHeader}>
              <View style={styles.voiceIconCircle}>
                <Text style={styles.voiceIconEmoji}>🎤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.voiceCardTitle}>Voice Description</Text>
                <Text style={styles.voiceCardHint}> You sent a voice description</Text>
              </View>
            </View>
            <VoiceNotePlayer
              uri={job.voiceDescription.url}
              duration={job.voiceDescription.duration}
              isMine={false}
            />
          </View>
        ) : (
          <Text style={styles.description}>{job.description}</Text>
        )}

        {job.images?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imagesRow}>
                {job.images.map((img, i) => (
                  <Image key={i} source={{ uri: img.url }} style={styles.jobImage} />
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {job.location?.address && (
          <>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.locationText}>📍 {job.location.address}</Text>
            {job.location.state && (
              <Text style={styles.locationState}>{job.location.state}</Text>
            )}
          </>
        )}

        {job.assignedArtisanId && isCustomer && (
          <>
            <Text style={styles.sectionTitle}>Artisan</Text>
            <View style={styles.personCard}>
              <Text style={styles.personName}>{job.assignedArtisanId.name}</Text>
              {artisanCode && (
                <View style={styles.codeRow}>
                  <Text style={styles.codeLabel}>Code: </Text>
                  <Text style={styles.codeValue}>{artisanCode}</Text>
                  <TouchableOpacity
                    style={[styles.copyBtn, codeCopied && styles.copyBtnDone]}
                    onPress={handleCopyCode}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.copyBtnText, codeCopied && styles.copyBtnDoneText]}>
                      {codeCopied ? 'Copied ✓' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {job.estimatedArrivalMinutes && (
                <Text style={styles.eta}>
                  ETA: {job.estimatedArrivalMinutes} min
                  {job.arrivedOnTime === false ? ' (arrived late)' : ''}
                </Text>
              )}
              {job.agreedPrice && (
                <Text style={styles.agreedPrice}>Agreed Price: ₦{job.agreedPrice.toLocaleString()}</Text>
              )}
              {['accepted', 'in-progress', 'completed'].includes(job.status) && (
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      jobId: job._id,
                      jobCategory: job.category,
                      otherPartyName: job.assignedArtisanId.name,
                    })
                  }
                >
                  <Text style={styles.chatBtnText}>💬 Open Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {job.customerId && isArtisan && (
          <>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.personCard}>
              <Text style={styles.personName}>{job.customerId.name}</Text>
              {['accepted', 'in-progress', 'completed'].includes(job.status) && (
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      jobId: job._id,
                      jobCategory: job.category,
                      otherPartyName: job.customerId.name,
                    })
                  }
                >
                  <Text style={styles.chatBtnText}>💬 Open Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Timeline</Text>
        <TimelineRow label="Job Posted" date={job.createdAt} />
        <TimelineRow label="Accepted" date={job.timeline?.acceptedAt} />
        <TimelineRow label="Artisan Arrived" date={job.timeline?.artisanArrivedAt} />
        <TimelineRow label="Started" date={job.timeline?.startedAt} />
        <TimelineRow label="Completed" date={job.timeline?.completedAt} />
        {job.timeline?.disputedAt && <TimelineRow label="Dispute Raised" date={job.timeline.disputedAt} isAlert />}
        {job.timeline?.cancelledAt && <TimelineRow label="Cancelled" date={job.timeline.cancelledAt} isAlert />}

        {job.status === 'disputed' && job.dispute && (
          <View style={styles.disputeBox}>
            <Text style={styles.disputeTitle}>Dispute Details</Text>
            <Text style={styles.disputeBy}>Raised by: {job.dispute.raisedBy}</Text>
            <Text style={styles.disputeReason}>{job.dispute.reason}</Text>
            {job.dispute.resolution && (
              <Text style={styles.disputeResolution}>Resolution: {job.dispute.resolution}</Text>
            )}
          </View>
        )}
      </ScrollView>

      {acting ? (
        <View style={styles.actingBar}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.actions}>

          {isCustomer && job.assignedArtisanId &&
           ['accepted', 'in-progress', 'completed', 'disputed'].includes(job.status) && (
            <TouchableOpacity
              style={styles.chatActionBtn}
              onPress={() => navigation.navigate('Chat', {
                jobId: job._id,
                jobCategory: job.category,
                otherPartyName: job.assignedArtisanId.name,
              })}
            >
              <Text style={styles.chatActionBtnText}>💬 Message Artisan</Text>
            </TouchableOpacity>
          )}

          {isCustomer && job.status === 'completed' && !job.rating?.score && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('RateJob', { jobId, artisanCode: job.artisanCode || null })}
            >
              <Text style={styles.primaryBtnText}>⭐ Rate Artisan</Text>
            </TouchableOpacity>
          )}

          {isCustomer && job.status === 'completed' && job.rating?.score && (
            <View style={styles.ratedBadge}>
              <Text style={styles.ratedBadgeText}>
                ⭐ You rated this job {job.rating.score}/5
              </Text>
            </View>
          )}

          {isCustomer && job.status === 'completed' && (
            <TouchableOpacity
              style={styles.disputeCompletedBtn}
              onPress={() => setDisputeModal(true)}
            >
              <Text style={styles.disputeCompletedBtnText}>⚠️ Job not done right? Raise a Dispute</Text>
            </TouchableOpacity>
          )}

          {isCustomer && ['pending', 'accepted'].includes(job.status) && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleCancel}>
                <Text style={styles.declineBtnText}>Cancel Job</Text>
              </TouchableOpacity>
              {job.status === 'accepted' && (
                <TouchableOpacity style={styles.disputeActionBtn} onPress={() => setDisputeModal(true)}>
                  <Text style={styles.disputeActionBtnText}>Raise Dispute</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isArtisan && job.customerId &&
           ['accepted', 'in-progress', 'completed', 'disputed'].includes(job.status) && (
            <TouchableOpacity
              style={styles.chatActionBtn}
              onPress={() => navigation.navigate('Chat', {
                jobId: job._id,
                jobCategory: job.category,
                otherPartyName: job.customerId.name,
              })}
            >
              <Text style={styles.chatActionBtnText}>💬 Message Customer</Text>
            </TouchableOpacity>
          )}

          {isArtisan && job.status === 'pending' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => setAcceptModal(true)}>
                <Text style={styles.acceptBtnText}>Accept Job</Text>
              </TouchableOpacity>
            </View>
          )}
          {isArtisan && job.status === 'accepted' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleArrived}>
              <Text style={styles.primaryBtnText}>📍 Let Customer Know You've Accepted</Text>
            </TouchableOpacity>
          )}
          {isArtisan && job.status === 'in-progress' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => setDisputeModal(true)}>
                <Text style={styles.declineBtnText}>Raise Dispute</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleComplete}>
                <Text style={styles.acceptBtnText}>Mark Complete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <BottomModal
        visible={acceptModal}
        onClose={() => setAcceptModal(false)}
        title="Accept Job"
        confirmLabel="Accept"
        confirmColor="#22C55E"
        onConfirm={handleAccept}
        confirmLoading={acting}
      >
        <Text style={styles.modalLabel}>Estimated Arrival (minutes)</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="e.g. 30"
          keyboardType="number-pad"
          value={eta}
          onChangeText={setEta}
        />
        <Text style={styles.modalLabel}>Agreed Price (₦) — optional</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="e.g. 5000"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
        />
      </BottomModal>

      <BottomModal
        visible={disputeModal}
        onClose={() => setDisputeModal(false)}
        title="Raise a Dispute"
        subtitle="Describe the problem clearly. An admin will review within 24 hours."
        confirmLabel="Submit Dispute"
        confirmColor="#EF4444"
        onConfirm={handleDispute}
        confirmLoading={acting}
      >
        <TextInput
          style={[styles.modalInput, { height: 110, textAlignVertical: 'top' }]}
          placeholder="e.g. Customer refused to pay after job completion, or the agreed scope was changed without notice..."
          multiline
          value={disputeReason}
          onChangeText={setDisputeReason}
        />
      </BottomModal>
    </SafeAreaView>
  );
}

function TimelineRow({ label, date, isAlert }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (!date) return null;
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.timelineDot, isAlert && styles.timelineDotAlert]} />
      <Text style={[styles.timelineLabel, isAlert && styles.timelineLabelAlert]}>{label}</Text>
      <Text style={styles.timelineDate}>{new Date(date).toLocaleString()}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card },
  scroll: { padding: 20, paddingBottom: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '700' },
  category: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  urgencyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  urgencyBadge: { fontSize: 13, color: colors.info, fontWeight: '600' },
  urgencyEmergency: { color: colors.error },
  timestamp: { fontSize: 12, color: colors.textHint },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { fontSize: 15, color: colors.textSub, lineHeight: 22 },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.warningBg, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: colors.warning, marginBottom: 8, marginTop: 4,
  },
  pendingBannerIcon: { fontSize: 22, marginTop: 1 },
  pendingBannerTitle: { fontSize: 14, fontWeight: '700', color: colors.textSub, marginBottom: 4 },
  pendingBannerBody: { fontSize: 13, color: colors.textSub, lineHeight: 19 },
  voiceCard: {
    backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  voiceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  voiceIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  voiceIconEmoji: { fontSize: 20 },
  voiceCardTitle: { fontSize: 14, fontWeight: '700', color: colors.textSub },
  voiceCardHint: { fontSize: 12, color: colors.textSub, marginTop: 2 },
  imagesRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  jobImage: { width: 120, height: 100, borderRadius: 10 },
  locationText: { fontSize: 15, color: colors.textSub },
  locationState: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  personCard: { backgroundColor: colors.surface, borderRadius: 10, padding: 14 },
  personName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  codeLabel: { fontSize: 13, color: colors.textSub },
  codeValue: { fontSize: 13, fontWeight: '700', color: colors.info, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1.5, borderColor: colors.info },
  copyBtnDone: { borderColor: colors.success },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: colors.info },
  copyBtnDoneText: { color: colors.success },
  eta: { fontSize: 13, color: colors.info },
  agreedPrice: { fontSize: 13, color: colors.success, marginTop: 4 },
  chatBtn: {
    marginTop: 10, backgroundColor: colors.primaryLight, borderRadius: 8, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: colors.primary,
  },
  chatBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  timelineDotAlert: { backgroundColor: colors.error },
  timelineLabel: { flex: 1, fontSize: 13, color: colors.textSub, fontWeight: '600' },
  timelineLabelAlert: { color: colors.error },
  timelineDate: { fontSize: 12, color: colors.textMuted },
  disputeBox: {
    backgroundColor: colors.errorBg, borderRadius: 10, padding: 14,
    borderLeftWidth: 4, borderLeftColor: colors.error, marginTop: 16,
  },
  disputeTitle: { fontSize: 13, fontWeight: '700', color: colors.error, marginBottom: 6 },
  disputeBy: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  disputeReason: { fontSize: 14, color: colors.textSub, lineHeight: 20 },
  disputeResolution: { fontSize: 13, color: colors.success, marginTop: 6, fontWeight: '600' },
  chatActionBtn: {
    backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 10,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  chatActionBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  ratedBadge: {
    backgroundColor: colors.warningBg, borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: colors.warning,
  },
  ratedBadgeText: { color: colors.textSub, fontWeight: '600', fontSize: 14 },
  actingBar: { padding: 24, alignItems: 'center' },
  actions: { padding: 16, paddingBottom: 24 },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    backgroundColor: colors.primary, padding: 16, borderRadius: 12,
    alignItems: 'center', marginBottom: 8,
  },
  primaryBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  acceptBtn: {
    flex: 1, backgroundColor: colors.primary, padding: 14,
    borderRadius: 12, alignItems: 'center',
  },
  acceptBtnText: { color: colors.card, fontWeight: '700', fontSize: 15 },
  declineBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  declineBtnText: { color: colors.textSub, fontWeight: '600', fontSize: 15 },
  disputeActionBtn: {
    flex: 1, backgroundColor: colors.errorBg, padding: 14,
    borderRadius: 12, alignItems: 'center',
  },
  disputeActionBtnText: { color: colors.error, fontWeight: '700', fontSize: 15 },
  disputeCompletedBtn: {
    borderWidth: 1.5, borderColor: colors.error, backgroundColor: colors.errorBg,
    borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10,
  },
  disputeCompletedBtnText: { color: colors.error, fontWeight: '700', fontSize: 14 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: colors.textSub, marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    padding: 13, fontSize: 15, backgroundColor: colors.inputBg, color: colors.text,
  },
});
