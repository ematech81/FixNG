
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMyJobs } from '../../api/jobApi';
import BackButton from '../../components/BackButton';

// ── Design Tokens ──────────────────────────────────────────────────────────────
const COLORS = {
  primary:       '#2563EB',
  primaryLight:  '#EFF6FF',
  primaryMid:    '#BFDBFE',
  surface:       '#FFFFFF',
  background:    '#F8FAFF',
  textPrimary:   '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  divider:       '#F1F5F9',
  shadow:        '#1E40AF',

  // Status palette
  pending:       '#F59E0B',
  pendingLight:  '#FFFBEB',
  accepted:      '#3B82F6',
  acceptedLight: '#EFF6FF',
  inProgress:    '#8B5CF6',
  inProgressLight:'#F5F3FF',
  completed:     '#22C55E',
  completedLight:'#F0FDF4',
  disputed:      '#EF4444',
  disputedLight: '#FEF2F2',
  cancelled:     '#9CA3AF',
  cancelledLight:'#F9FAFB',
};

// ── Status Config ──────────────────────────────────────────────────────────────
const STATUS_TABS = ['all', 'pending', 'accepted', 'in-progress', 'completed', 'disputed'];

const STATUS_CONFIG = {
  pending:      { color: COLORS.pending,    bg: COLORS.pendingLight,    icon: '🕐', label: 'Pending'     },
  accepted:     { color: COLORS.accepted,   bg: COLORS.acceptedLight,   icon: '✅', label: 'Accepted'    },
  'in-progress':{ color: COLORS.inProgress, bg: COLORS.inProgressLight, icon: '⚡', label: 'In Progress' },
  completed:    { color: COLORS.completed,  bg: COLORS.completedLight,  icon: '🎉', label: 'Completed'   },
  disputed:     { color: COLORS.disputed,   bg: COLORS.disputedLight,   icon: '⚠️', label: 'Disputed'    },
  cancelled:    { color: COLORS.cancelled,  bg: COLORS.cancelledLight,  icon: '✕',  label: 'Cancelled'   },
};

const TAB_LABELS = {
  all:          { label: 'All Jobs',    icon: '📋' },
  pending:      { label: 'Pending',     icon: '🕐' },
  accepted:     { label: 'Accepted',    icon: '✅' },
  'in-progress':{ label: 'In Progress', icon: '⚡' },
  completed:    { label: 'Completed',   icon: '🎉' },
  disputed:     { label: 'Disputed',    icon: '⚠️' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const now   = new Date();
  const diff  = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff} days ago`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function MyJobsScreen({ navigation }) {
  const [jobs, setJobs]           = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── All original logic preserved exactly ────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [activeTab])
  );

  const fetchJobs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const res = await getMyJobs(params);
      setJobs(res.data.data);
    } catch {
      // fail silently on refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  // ── End of original logic ───────────────────────────────────────────────────

  // Derived stats for the summary bar
  const totalJobs     = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const activeJobs    = jobs.filter(
    (j) => j.status === 'accepted' || j.status === 'in-progress'
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ════════════════════════════════════════
          HEADER
      ════════════════════════════════════════ */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Jobs</Text>
          <Text style={styles.headerSub}>
            {totalJobs} job{totalJobs !== 1 ? 's' : ''} total
          </Text>
        </View>

        {/* Notification / filter shortcut (UI only) */}
        <View style={styles.headerRight}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{activeJobs}</Text>
          </View>
          <Text style={styles.headerBadgeLabel}>Active</Text>
        </View>
      </View>

      {/* ════════════════════════════════════════
          SUMMARY STRIP  (only when not loading)
      ════════════════════════════════════════ */}
      {!loading && (
        <View style={styles.summaryStrip}>
          <SummaryStat
            label="Total"
            value={totalJobs}
            color={COLORS.primary}
            bg={COLORS.primaryLight}
          />
          <View style={styles.summaryDivider} />
          <SummaryStat
            label="Active"
            value={activeJobs}
            color={COLORS.inProgress}
            bg={COLORS.inProgressLight}
          />
          <View style={styles.summaryDivider} />
          <SummaryStat
            label="Done"
            value={completedJobs}
            color={COLORS.completed}
            bg={COLORS.completedLight}
          />
          <View style={styles.summaryDivider} />
          <SummaryStat
            label="Pending"
            value={jobs.filter((j) => j.status === 'pending').length}
            color={COLORS.pending}
            bg={COLORS.pendingLight}
          />
        </View>
      )}

      {/* ════════════════════════════════════════
          STATUS FILTER TABS
      ════════════════════════════════════════ */}
      <FlatList
        data={STATUS_TABS}
        horizontal
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        renderItem={({ item: tab }) => {
          const isActive = activeTab === tab;
          const cfg      = TAB_LABELS[tab];
          return (
            <TouchableOpacity
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>{cfg.icon}</Text>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {cfg.label}
              </Text>
              {isActive && <View style={styles.tabActiveDot} />}
            </TouchableOpacity>
          );
        }}
      />

      {/* ════════════════════════════════════════
          JOB LIST / LOADING / EMPTY
      ════════════════════════════════════════ */}
      {loading ? (
        <View style={styles.centered}>
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>Loading your jobs...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <JobCard
              item={item}
              onPress={() => navigation.navigate('JobDetail', { jobId: item._id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchJobs(true)}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={<EmptyState activeTab={activeTab} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY STAT CHIP
// ══════════════════════════════════════════════════════════════════════════════
function SummaryStat({ label, value, color, bg }) {
  return (
    <View style={[styles.summaryStatWrap, { backgroundColor: bg }]}>
      <Text style={[styles.summaryStatValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryStatLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// JOB CARD
// ══════════════════════════════════════════════════════════════════════════════
function JobCard({ item, onPress }) {
  const cfg   = STATUS_CONFIG[item.status] || {
    color: COLORS.cancelled,
    bg:    COLORS.cancelledLight,
    icon:  '•',
    label: item.status,
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* ── Card Header ── */}
      <View style={styles.cardHeader}>
        {/* Category + Emergency tag */}
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardCategory} numberOfLines={1}>
            {item.category}
          </Text>
          {item.urgency === 'emergency' && (
            <View style={styles.emergencyPill}>
              <Text style={styles.emergencyPillText}>🚨 Emergency</Text>
            </View>
          )}
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={styles.statusBadgeIcon}>{cfg.icon}</Text>
          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={styles.cardDivider} />

      {/* ── Description ── */}
      <Text style={styles.cardDesc} numberOfLines={2}>
        {item.description}
      </Text>

      {/* ── Card Footer ── */}
      <View style={styles.cardFooter}>
        {/* Date */}
        <View style={styles.cardDateWrap}>
          <Text style={styles.cardDateIcon}>🗓</Text>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Arrow CTA */}
        <View style={styles.cardArrow}>
          <Text style={styles.cardArrowText}>›</Text>
        </View>
      </View>

      {/* ── Status accent bar (left edge) ── */}
      <View style={[styles.cardAccentBar, { backgroundColor: cfg.color }]} />
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ══════════════════════════════════════════════════════════════════════════════
function EmptyState({ activeTab }) {
  const cfg = TAB_LABELS[activeTab] || { label: activeTab, icon: '📋' };

  const EMPTY_CONFIG = {
    all:           { title: 'No Jobs Yet',           sub: 'Your job requests will appear here once you start booking artisans.' },
    pending:       { title: 'No Pending Jobs',        sub: 'Jobs waiting for an artisan to accept will appear here.'            },
    accepted:      { title: 'No Accepted Jobs',       sub: 'Jobs accepted by an artisan will show up here.'                    },
    'in-progress': { title: 'Nothing In Progress',    sub: 'Jobs currently being worked on will appear here.'                  },
    completed:     { title: 'No Completed Jobs',      sub: 'Your successfully completed jobs will be listed here.'             },
    disputed:      { title: 'No Disputed Jobs',       sub: 'Great news — you have no disputed jobs at the moment.'            },
  };

  const empty = EMPTY_CONFIG[activeTab] || {
    title: `No ${cfg.label} jobs`,
    sub:   'Nothing to show here right now.',
  };

  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>{cfg.icon}</Text>
      </View>
      <Text style={styles.emptyTitle}>{empty.title}</Text>
      <Text style={styles.emptySubText}>{empty.sub}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  backArrow: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: -1,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'center',
    gap: 2,
  },
  headerBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.inProgressLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.inProgress,
  },
  headerBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },

  // ── Summary Strip ────────────────────────────────────────────────────────────
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  summaryStatWrap: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 4,
    gap: 2,
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  summaryStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    opacity: 0.8,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.divider,
  },

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  tabsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    marginRight: 8,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  tabIcon: {
    fontSize: 13,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.surface,
  },
  tabActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginLeft: 2,
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },

  // ── Loading ──────────────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 48,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // ── Job Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  cardAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingLeft: 8,
    gap: 10,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 6,
  },
  cardCategory: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  emergencyPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.disputed,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexShrink: 0,
  },
  statusBadgeIcon: {
    fontSize: 11,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: -16,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
    paddingLeft: 8,
    fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  cardDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardDateIcon: {
    fontSize: 12,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  cardArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArrowText: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: -1,
  },

  // ── Empty State ──────────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
});
