import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getJob, acceptJob, declineJob, markArrived, markCompleted, raiseDispute, cancelJob } from '../../api/jobApi';
import useSocket from '../../hooks/useSocket';
import BackButton from '../../components/BackButton';
import { getUser } from '../../utils/storage';

const STATUS_LABELS = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FFFBEB' },
  accepted: { label: 'Accepted', color: '#3B82F6', bg: '#EFF6FF' },
  'in-progress': { label: 'In Progress', color: '#8B5CF6', bg: '#F5F3FF' },
  completed: { label: 'Completed', color: '#22C55E', bg: '#F0FDF4' },
  disputed: { label: 'Disputed', color: '#EF4444', bg: '#FEF2F2' },
  cancelled: { label: 'Cancelled', color: '#9CA3AF', bg: '#F9FAFB' },
};

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [disputeModal, setDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [acceptModal, setAcceptModal] = useState(false);
  const [eta, setEta] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    getUser().then(setCurrentUser);
    fetchJob();
  }, []);

  // Live status updates
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

  const isCustomer = currentUser && job?.customerId?._id === currentUser.id;
  const isArtisan = currentUser && job?.assignedArtisanId?._id === currentUser.id;
  const role = currentUser?.role;

  // ── Actions ───────────────────────────────────────────────────────────────

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
    Alert.alert('Confirm Arrival', 'This will notify the customer that you have arrived.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'I Have Arrived',
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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </SafeAreaView>
    );
  }

  if (!job) return null;

  const statusConfig = STATUS_LABELS[job.status] || STATUS_LABELS.pending;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Job Info */}
        <Text style={styles.category}>{job.category}</Text>
        <View style={styles.urgencyRow}>
          <Text style={[styles.urgencyBadge, job.urgency === 'emergency' && styles.urgencyEmergency]}>
            {job.urgency === 'emergency' ? '🚨 Emergency' : '🔧 Normal'}
          </Text>
          <Text style={styles.timestamp}>{new Date(job.createdAt).toLocaleDateString()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{job.description}</Text>

        {/* Images */}
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

        {/* Location */}
        {job.location?.address && (
          <>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.locationText}>📍 {job.location.address}</Text>
            {job.location.state && (
              <Text style={styles.locationState}>{job.location.state}</Text>
            )}
          </>
        )}

        {/* Artisan info (customer view) + chat */}
        {job.assignedArtisanId && isCustomer && (
          <>
            <Text style={styles.sectionTitle}>Artisan</Text>
            <View style={styles.personCard}>
              <Text style={styles.personName}>{job.assignedArtisanId.name}</Text>
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

        {/* Customer info (artisan view) + chat */}
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

        {/* Timeline */}
        <Text style={styles.sectionTitle}>Timeline</Text>
        <TimelineRow label="Job Posted" date={job.createdAt} />
        <TimelineRow label="Accepted" date={job.timeline?.acceptedAt} />
        <TimelineRow label="Artisan Arrived" date={job.timeline?.artisanArrivedAt} />
        <TimelineRow label="Started" date={job.timeline?.startedAt} />
        <TimelineRow label="Completed" date={job.timeline?.completedAt} />
        {job.timeline?.disputedAt && <TimelineRow label="Dispute Raised" date={job.timeline.disputedAt} isAlert />}
        {job.timeline?.cancelledAt && <TimelineRow label="Cancelled" date={job.timeline.cancelledAt} isAlert />}

        {/* Dispute info */}
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

      {/* Action Buttons */}
      {acting ? (
        <View style={styles.actingBar}>
          <ActivityIndicator color="#FF6B00" />
        </View>
      ) : (
        <View style={styles.actions}>
          {/* Artisan actions */}
          {role === 'artisan' && job.status === 'pending' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => setAcceptModal(true)}>
                <Text style={styles.acceptBtnText}>Accept Job</Text>
              </TouchableOpacity>
            </View>
          )}
          {role === 'artisan' && job.status === 'accepted' && isArtisan && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleArrived}>
              <Text style={styles.primaryBtnText}>📍 I Have Arrived</Text>
            </TouchableOpacity>
          )}
          {role === 'artisan' && job.status === 'in-progress' && isArtisan && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => setDisputeModal(true)}>
                <Text style={styles.declineBtnText}>Raise Dispute</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleComplete}>
                <Text style={styles.acceptBtnText}>Mark Complete</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Customer actions */}
          {role === 'customer' && job.status === 'completed' && isCustomer && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('RateJob', { jobId })}
            >
              <Text style={styles.primaryBtnText}>⭐ Rate Artisan</Text>
            </TouchableOpacity>
          )}
          {role === 'customer' && ['pending', 'accepted'].includes(job.status) && isCustomer && (
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
        </View>
      )}

      {/* Accept Modal */}
      <Modal visible={acceptModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Accept Job</Text>
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
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAcceptModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAccept} onPress={handleAccept} disabled={acting}>
                <Text style={styles.modalAcceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dispute Modal */}
      <Modal visible={disputeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Raise a Dispute</Text>
            <Text style={styles.modalSubtitle}>
              Describe the problem clearly. An admin will review within 24 hours.
            </Text>
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="e.g. Artisan did not show up after accepting, and is not responding..."
              multiline
              value={disputeReason}
              onChangeText={setDisputeReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDisputeModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDisputeSubmit} onPress={handleDispute} disabled={acting}>
                <Text style={styles.modalAcceptText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TimelineRow({ label, date, isAlert }) {
  if (!date) return null;
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.timelineDot, isAlert && styles.timelineDotAlert]} />
      <Text style={[styles.timelineLabel, isAlert && styles.timelineLabelAlert]}>{label}</Text>
      <Text style={styles.timelineDate}>{new Date(date).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '700' },
  category: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  urgencyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  urgencyBadge: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  urgencyEmergency: { color: '#EF4444' },
  timestamp: { fontSize: 12, color: '#BBB' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#999', marginTop: 20, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { fontSize: 15, color: '#444', lineHeight: 22 },
  imagesRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  jobImage: { width: 120, height: 100, borderRadius: 10 },
  locationText: { fontSize: 15, color: '#444' },
  locationState: { fontSize: 13, color: '#999', marginTop: 2 },
  personCard: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14 },
  personName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  eta: { fontSize: 13, color: '#3B82F6' },
  agreedPrice: { fontSize: 13, color: '#22C55E', marginTop: 4 },
  chatBtn: {
    marginTop: 10, backgroundColor: '#FFF3EC', borderRadius: 8, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#FF6B00',
  },
  chatBtnText: { color: '#FF6B00', fontWeight: '700', fontSize: 14 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  timelineDotAlert: { backgroundColor: '#EF4444' },
  timelineLabel: { flex: 1, fontSize: 13, color: '#555', fontWeight: '600' },
  timelineLabelAlert: { color: '#EF4444' },
  timelineDate: { fontSize: 12, color: '#999' },
  disputeBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14,
    borderLeftWidth: 4, borderLeftColor: '#EF4444', marginTop: 16,
  },
  disputeTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
  disputeBy: { fontSize: 12, color: '#777', marginBottom: 4 },
  disputeReason: { fontSize: 14, color: '#444', lineHeight: 20 },
  disputeResolution: { fontSize: 13, color: '#22C55E', marginTop: 6, fontWeight: '600' },
  actingBar: { padding: 24, alignItems: 'center' },
  actions: { padding: 16, paddingBottom: 24 },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    backgroundColor: '#FF6B00', padding: 16, borderRadius: 12,
    alignItems: 'center', marginBottom: 8,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  acceptBtn: {
    flex: 1, backgroundColor: '#FF6B00', padding: 14,
    borderRadius: 12, alignItems: 'center',
  },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  declineBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E5E5', alignItems: 'center',
  },
  declineBtnText: { color: '#666', fontWeight: '600', fontSize: 15 },
  disputeActionBtn: {
    flex: 1, backgroundColor: '#FEF2F2', padding: 14,
    borderRadius: 12, alignItems: 'center',
  },
  disputeActionBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#777', marginBottom: 16, lineHeight: 20 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    padding: 13, fontSize: 15, backgroundColor: '#FAFAFA',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E5E5', alignItems: 'center',
  },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalAccept: { flex: 1, backgroundColor: '#FF6B00', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalDisputeSubmit: { flex: 1, backgroundColor: '#EF4444', padding: 14, borderRadius: 12, alignItems: 'center' },
  modalAcceptText: { color: '#FFF', fontWeight: '700' },
});
