
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getMyJobs } from '../../api/jobApi';
import BackButton from '../../components/BackButton';
import { useTheme } from '../../context/ThemeContext';

const STATUS_TABS = ['all', 'pending', 'accepted', 'in-progress', 'completed', 'disputed'];

const STATUS_CONFIG = {
  pending:      { colorKey: 'warning',  bgKey: 'warningBg',  icon: '🕐', label: 'Pending'     },
  accepted:     { colorKey: 'info',     bgKey: 'infoBg',     icon: '✅', label: 'Accepted'    },
  'in-progress':{ colorKey: 'primary',  bgKey: 'primaryLight', icon: '⚡', label: 'In Progress' },
  completed:    { colorKey: 'success',  bgKey: 'successBg',  icon: '🎉', label: 'Completed'   },
  disputed:     { colorKey: 'error',    bgKey: 'errorBg',    icon: '⚠️', label: 'Disputed'    },
  cancelled:    { colorKey: 'textMuted',bgKey: 'surface',    icon: '✕',  label: 'Cancelled'   },
  expired:      { colorKey: 'textMuted',bgKey: 'borderLight', icon: '⏰', label: 'Expired'     },
};

const TAB_LABELS = {
  all:          { label: 'All Jobs',    icon: '📋' },
  pending:      { label: 'Pending',     icon: '🕐' },
  accepted:     { label: 'Accepted',    icon: '✅' },
  'in-progress':{ label: 'In Progress', icon: '⚡' },
  completed:    { label: 'Completed',   icon: '🎉' },
  disputed:     { label: 'Disputed',    icon: '⚠️' },
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const now   = new Date();
  const diff  = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff} days ago`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function MyJobsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [jobs, setJobs]           = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      const data = res.data.data || [];
      setJobs(activeTab === 'all' ? data.filter((j) => j.status !== 'expired') : data);
    } catch {
      // fail silently on refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalJobs     = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const activeJobs    = jobs.filter(
    (j) => j.status === 'accepted' || j.status === 'in-progress'
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

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

        <View style={styles.headerRight}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{activeJobs}</Text>
          </View>
          <Text style={styles.headerBadgeLabel}>Active</Text>
        </View>
      </View>

      {!loading && (
        <View style={styles.summaryStrip}>
          <SummaryStat
            label="Total"
            value={totalJobs}
            colorKey="info"
            bgKey="infoBg"
          />
          <View style={styles.summaryDivider} />
          <SummaryStat
            label="Active"
            value={activeJobs}
            colorKey="primary"
            bgKey="primaryLight"
          />
          <View style={styles.summaryDivider} />
          <SummaryStat
            label="Done"
            value={completedJobs}
            colorKey="success"
            bgKey="successBg"
          />
          <View style={styles.summaryDivider} />
          <SummaryStat
            label="Pending"
            value={jobs.filter((j) => j.status === 'pending').length}
            colorKey="warning"
            bgKey="warningBg"
          />
        </View>
      )}

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

      {loading ? (
        <View style={styles.centered}>
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.info} size="large" />
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
              tintColor={colors.info}
              colors={[colors.info]}
            />
          }
          ListEmptyComponent={<EmptyState activeTab={activeTab} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

function SummaryStat({ label, value, colorKey, bgKey }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const color = colors[colorKey];
  const bg = colors[bgKey];
  return (
    <View style={[styles.summaryStatWrap, { backgroundColor: bg }]}>
      <Text style={[styles.summaryStatValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryStatLabel, { color }]}>{label}</Text>
    </View>
  );
}

function JobCard({ item, onPress }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const cfgKeys = STATUS_CONFIG[item.status] || {
    colorKey: 'textMuted',
    bgKey:    'surface',
    icon:     '•',
    label:    item.status,
  };
  const cfg = {
    color: colors[cfgKeys.colorKey],
    bg:    colors[cfgKeys.bgKey],
    icon:  cfgKeys.icon,
    label: cfgKeys.label,
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={styles.cardHeader}>
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

        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={styles.statusBadgeIcon}>{cfg.icon}</Text>
          <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <Text style={styles.cardDesc} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.cardDateWrap}>
          <Text style={styles.cardDateIcon}>🗓</Text>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.cardArrow}>
          <Text style={styles.cardArrowText}>›</Text>
        </View>
      </View>

      <View style={[styles.cardAccentBar, { backgroundColor: cfg.color }]} />
    </TouchableOpacity>
  );
}

function EmptyState({ activeTab }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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

const makeStyles = (colors) => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  backArrow: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600',
    marginTop: -1,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
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
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
  },
  headerBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },

  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    backgroundColor: colors.borderLight,
  },

  tabsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    marginRight: 6,
  },
  tabActive: {
    backgroundColor: colors.info,
    borderColor: colors.info,
    ...Platform.select({
      ios: {
        shadowColor: colors.info,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  tabIcon: {
    fontSize: 12,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
  },
  tabTextActive: {
    color: colors.card,
  },
  tabActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginLeft: 2,
  },

  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 48,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    color: colors.text,
    letterSpacing: -0.3,
  },
  emergencyPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.errorBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.error,
  },
  emergencyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
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
    backgroundColor: colors.borderLight,
    marginHorizontal: -16,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSub,
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
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArrowText: {
    fontSize: 18,
    color: colors.info,
    fontWeight: '700',
    marginTop: -1,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.info,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
});
