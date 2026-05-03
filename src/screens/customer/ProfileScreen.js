// import React, { useState, useCallback } from 'react';
// import {
//   View, Text, StyleSheet, ScrollView, TouchableOpacity,
//   ActivityIndicator, Alert, Image, Linking,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useFocusEffect } from '@react-navigation/native';
// import { getUser } from '../../utils/storage';
// import { getMyJobs } from '../../api/jobApi';
// import { becomeArtisan, getOnboardingStatus } from '../../api/artisanApi';
// import { getMySubscription } from '../../api/subscriptionApi';

// const PRIMARY = '#2563EB';

// const TOS_URL = 'https://ematech81.github.io/FixNGTerms/';

// const CUSTOMER_MENU_ITEMS = [
//   { icon: '📋', label: 'My Jobs',            screen: 'MyJobs'          },
//   { icon: '🔔', label: 'Notifications',      screen: 'Notifications'   },
//   { icon: '🔒', label: 'Privacy & Security', screen: 'PrivacySecurity' },
//   { icon: '❓', label: 'Help & Support',     screen: 'HelpSupport'     },
//   { icon: '⚖️', label: 'Terms of Service',  url:    TOS_URL           },
// ];

// const ARTISAN_MENU_ITEMS = [
//   { icon: '📋', label: 'My Jobs',            screen: 'MyJobs'          },
//   { icon: '⭐', label: 'My Reviews',         screen: 'MyReviews'       },
//   { icon: '🔔', label: 'Notifications',      screen: 'Notifications'   },
//   { icon: '🔒', label: 'Privacy & Security', screen: 'PrivacySecurity' },
//   { icon: '❓', label: 'Help & Support',     screen: 'HelpSupport'     },
//   { icon: '⚖️', label: 'Terms of Service',  url:    TOS_URL           },
// ];

// // Maps artisan verificationStatus → badge config for the profile card
// const ARTISAN_STATUS_CONFIG = {
//   incomplete: {
//     icon: '⚠️',
//     label: 'Registration Incomplete',
//     color: '#DC2626',
//     bg: '#FEF2F2',
//     border: '#FECACA',
//     note: 'Complete your profile to unlock full artisan access.',
//   },
//   pending: {
//     icon: '⏳',
//     label: 'Verification Pending',
//     color: '#D97706',
//     bg: '#FFFBEB',
//     border: '#FDE68A',
//     note: 'Our team is reviewing your profile. This usually takes 24–48 hours.',
//   },
//   verified: {
//     icon: '✅',
//     label: 'Verified Artisan',
//     color: '#16A34A',
//     bg: '#DCFCE7',
//     border: '#BBF7D0',
//     note: 'Your account is fully verified. You can receive job requests.',
//   },
//   rejected: {
//     icon: '❌',
//     label: 'Verification Rejected',
//     color: '#DC2626',
//     bg: '#FEF2F2',
//     border: '#FECACA',
//     note: 'Your application was not approved.',
//     tap: 'Tap to view reason and resubmit →',
//   },
// };

// export default function ProfileScreen({ navigation, onLogout, onRefreshAuth, onSwitchToJobs, onSwitchTab }) {
//   const [user, setUser] = useState(null);
//   const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 });
//   const [activeJob, setActiveJob] = useState(null); // most recent active job for "Track" button
//   const [loadingStats, setLoadingStats] = useState(true);
//   const [becomingArtisan, setBecomingArtisan] = useState(false);
//   // Artisan-specific state (only fetched when user.role === 'artisan')
//   const [artisanStatus, setArtisanStatus] = useState(null); // verificationStatus string
//   const [artisanIsPro, setArtisanIsPro] = useState(false);
//   const [loadingArtisanStatus, setLoadingArtisanStatus] = useState(false);
//   const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
//   const [subscription, setSubscription] = useState(null);

//   useFocusEffect(
//     useCallback(() => {
//       loadProfile();
//     }, [])
//   );

//   const loadProfile = async () => {
//     const u = await getUser();
//     setUser(u);
//     fetchStats(u);
//     if (u?.role === 'artisan') {
//       fetchArtisanStatus();
//     }
//   };

//   const ACTIVE_STATUSES = ['pending', 'accepted', 'in-progress', 'disputed'];

//   const fetchStats = async (u) => {
//     setLoadingStats(true);
//     try {
//       const res = await getMyJobs();
//       const jobs = res.data.data || [];
//       const completed = jobs.filter((j) => j.status === 'completed').length;
//       const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
//       setStats({ total: jobs.length, completed, active });

//       // Most recent active job — drives the "Track Your Job" button
//       const mostRecent = jobs.find((j) => ACTIVE_STATUSES.includes(j.status));
//       setActiveJob(mostRecent || null);
//     } catch {
//       // silent
//     } finally {
//       setLoadingStats(false);
//     }
//   };

//   const fetchArtisanStatus = async () => {
//     setLoadingArtisanStatus(true);
//     try {
//       const [onboardRes, subRes] = await Promise.all([
//         getOnboardingStatus(),
//         getMySubscription().catch(() => null),
//       ]);
//       const data = onboardRes.data.data;
//       const status = data?.verificationStatus || 'incomplete';
//       setArtisanStatus(status);
//       setArtisanIsPro(data?.isPro || false);
//       if (data?.profilePhoto?.url) setProfilePhotoUrl(data.profilePhoto.url);
//       setSubscription(subRes?.data?.data || null);
//     } catch {
//       // silent — keep null
//     } finally {
//       setLoadingArtisanStatus(false);
//     }
//   };

//   const handleBecomeArtisan = () => {
//     Alert.alert(
//       'Become an Artisan',
//       'List your skills and start receiving job requests from customers near you. You\'ll complete a quick 5-step profile setup.',
//       [
//         { text: 'Not Now', style: 'cancel' },
//         {
//           text: 'Get Started',
//           onPress: async () => {
//             setBecomingArtisan(true);
//             try {
//               await becomeArtisan();
//               onRefreshAuth?.();
//             } catch (err) {
//               Alert.alert('Error', err?.message || 'Could not start artisan onboarding. Please try again.');
//             } finally {
//               setBecomingArtisan(false);
//             }
//           },
//         },
//       ]
//     );
//   };

//   const handleLogout = () => {
//     Alert.alert('Log Out', 'Are you sure you want to log out?', [
//       { text: 'Cancel', style: 'cancel' },
//       { text: 'Log Out', style: 'destructive', onPress: onLogout },
//     ]);
//   };

//   const initial = (user?.name || 'U')[0].toUpperCase();
//   const isArtisan = user?.role === 'artisan';
//   const isArtisanPending = isArtisan && artisanStatus === 'pending';
//   const isArtisanVerified = isArtisan && artisanStatus === 'verified';
//   const statusConfig = isArtisan && artisanStatus ? ARTISAN_STATUS_CONFIG[artisanStatus] : null;
//   const menuItems = isArtisan ? ARTISAN_MENU_ITEMS : CUSTOMER_MENU_ITEMS;

//   return (
//     <SafeAreaView style={styles.container} edges={['top']}>
//       <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={styles.headerTitle}>Profile</Text>
//         </View>

//         {/* Avatar + Name */}
//         <View style={styles.profileCard}>
//           <View style={[styles.avatarCircle, isArtisan && statusConfig && { borderWidth: 3, borderColor: statusConfig.color }]}>
//             {profilePhotoUrl ? (
//               <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
//             ) : (
//               <Text style={styles.avatarInitial}>{initial}</Text>
//             )}
//           </View>
//           <Text style={styles.userName}>{user?.name || '—'}</Text>
//           <Text style={styles.userPhone}>{user?.phone || ''}</Text>

//           {/* Stats row */}
//           <View style={styles.statsRow}>
//             <StatBox label="Total Jobs" value={loadingStats ? '—' : stats.total} />
//             <View style={styles.statDivider} />
//             <StatBox label="Completed" value={loadingStats ? '—' : stats.completed} />
//             <View style={styles.statDivider} />
//             <StatBox label="Active" value={loadingStats ? '—' : stats.active} />
//           </View>
//         </View>

//         {/* ── Subscription card — verified artisans only ── */}
//         {isArtisan && isArtisanVerified && (() => {
//           const subPlan   = subscription?.plan || 'free';
//           const subActive = subscription?.status === 'active' && subPlan !== 'free';
//           const subExpiry = subscription?.expiresAt
//             ? new Date(subscription.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
//             : null;

//           if (subActive && subPlan === 'basic') {
//             return (
//               <View style={subStyles.basicWrap}>
//                 <View style={subStyles.planRow}>
//                   <View style={subStyles.basicBadge}>
//                     <Text style={subStyles.badgeText}>BASIC</Text>
//                   </View>
//                   <Text style={subStyles.activeLabel}>● Active</Text>
//                 </View>
//                 <Text style={subStyles.planHeadline}>Basic Plan</Text>
//                 <Text style={subStyles.planSub}>10 active jobs • Priority placement • Pro badge</Text>
//                 {subExpiry && <Text style={subStyles.expiry}>Renews {subExpiry}</Text>}
//                 <TouchableOpacity
//                   style={subStyles.upgradeBtn}
//                   onPress={() => navigation.navigate('Subscription')}
//                   activeOpacity={0.85}
//                 >
//                   <Text style={subStyles.upgradeBtnText}>Upgrade to Premium ↑</Text>
//                 </TouchableOpacity>
//               </View>
//             );
//           }

//           if (subActive && subPlan === 'premium') {
//             return (
//               <View style={subStyles.premiumWrap}>
//                 <View style={subStyles.planRow}>
//                   <View style={subStyles.premiumBadge}>
//                     <Text style={subStyles.badgeText}>👑 PREMIUM</Text>
//                   </View>
//                   <Text style={subStyles.activeLabel}>● Active</Text>
//                 </View>
//                 <Text style={subStyles.planHeadline}>Premium Plan</Text>
//                 <Text style={subStyles.planSub}>Unlimited jobs • Featured placement • Priority support</Text>
//                 {subExpiry && <Text style={subStyles.expiry}>Renews {subExpiry}</Text>}
//               </View>
//             );
//           }

//           // Free plan — show upgrade card
//           return (
//             <TouchableOpacity
//               style={subStyles.freeWrap}
//               onPress={() => navigation.navigate('Subscription')}
//               activeOpacity={0.88}
//             >
//               <View style={subStyles.freeLeft}>
//                 <View style={subStyles.verifiedRow}>
//                   <Text style={subStyles.verifiedTick}>✓</Text>
//                   <Text style={subStyles.verifiedLabel}>Verified Artisan</Text>
//                 </View>
//                 <Text style={subStyles.freeHeadline}>Your account is fully verified.</Text>
//                 <Text style={subStyles.freeSub}>
//                   Upgrade to Basic or Premium to unlock priority placement, more jobs & a Pro badge.
//                 </Text>
//               </View>
//               <View style={subStyles.freeRight}>
//                 <Text style={subStyles.freePrice}>from{'\n'}₦3,000</Text>
//                 <View style={subStyles.freeBtn}>
//                   <Text style={subStyles.freeBtnText}>Subscribe →</Text>
//                 </View>
//               </View>
//             </TouchableOpacity>
//           );
//         })()}

//         {/* ── Artisan status card (shown when user is an artisan) ── */}
//         {isArtisan && (
//           loadingArtisanStatus ? (
//             <View style={styles.artisanStatusLoading}>
//               <ActivityIndicator color={PRIMARY} size="small" />
//               <Text style={styles.artisanStatusLoadingText}>Loading artisan status…</Text>
//             </View>
//           ) : statusConfig ? (
//             (artisanStatus === 'incomplete' || artisanStatus === 'rejected') ? (
//               <TouchableOpacity
//                 style={[styles.artisanStatusCard, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}
//                 onPress={() => {
//                   if (artisanStatus === 'incomplete') {
//                     navigation.navigate('Step4_VerificationID', { isEdit: true });
//                   } else {
//                     navigation.navigate('AccountStatus', { type: 'rejected' });
//                   }
//                 }}
//                 activeOpacity={0.8}
//               >
//                 <View style={styles.artisanStatusTop}>
//                   <Text style={styles.artisanStatusIcon}>{statusConfig.icon}</Text>
//                   <Text style={[styles.artisanStatusLabel, { color: statusConfig.color }]}>
//                     {statusConfig.label}
//                   </Text>
//                 </View>
//                 <Text style={styles.artisanStatusNote}>{statusConfig.note}</Text>
//                 <Text style={[styles.artisanStatusTap, { color: statusConfig.color }]}>
//                   {artisanStatus === 'incomplete'
//                     ? 'Tap to upload your ID and complete registration →'
//                     : statusConfig.tap}
//                 </Text>
//               </TouchableOpacity>
//             ) : (
//               <View style={[styles.artisanStatusCard, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
//                 <View style={styles.artisanStatusTop}>
//                   <Text style={styles.artisanStatusIcon}>{statusConfig.icon}</Text>
//                   <Text style={[styles.artisanStatusLabel, { color: statusConfig.color }]}>
//                     {statusConfig.label}
//                   </Text>
//                 </View>
//                 <Text style={styles.artisanStatusNote}>{statusConfig.note}</Text>
//               </View>
//             )
//           ) : null
//         )}

//         {/* ── Dynamic artisan CTA — state-driven ── */}
//         {isArtisanVerified ? (
//           // Verified → View Public Profile + Go to Job Dashboard
//           <>
//             <TouchableOpacity
//               style={styles.publicProfileBtn}
//               onPress={() => navigation.navigate('ArtisanProfile', { artisanId: user._id || user.id })}
//               activeOpacity={0.85}
//             >
//               <View style={styles.publicProfileLeft}>
//                 <Text style={styles.publicProfileIcon}>👁️</Text>
//                 <View>
//                   <Text style={styles.publicProfileTitle}>View Your Public Profile</Text>
//                   <Text style={styles.publicProfileSubtitle}>See what customers see when they find you</Text>
//                 </View>
//               </View>
//               <Text style={styles.publicProfileArrow}>›</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={styles.jobDashboardBtn}
//               onPress={() => navigation.navigate('JobScreen')}
//               activeOpacity={0.85}
//             >
//               <View style={styles.jobDashboardLeft}>
//                 <Text style={styles.jobDashboardIcon}>🔧</Text>
//                 <View>
//                   <Text style={styles.jobDashboardTitle}>Go to Job Dashboard</Text>
//                   <Text style={styles.jobDashboardSubtitle}>View and manage available job requests</Text>
//                 </View>
//               </View>
//               <Text style={styles.jobDashboardArrow}>›</Text>
//             </TouchableOpacity>
//           </>
//         ) : isArtisanPending ? (
//           // Pending → Verification Pending (switches to home/marketplace tab)
//           <TouchableOpacity
//             style={styles.pendingBtn}
//             onPress={() => navigation.navigate('JobScreen')}
//             activeOpacity={0.85}
//           >
//             <View style={styles.pendingBtnLeft}>
//               <Text style={styles.pendingBtnIcon}>⏳</Text>
//               <View>
//                 <Text style={styles.pendingBtnTitle}>Verification Pending</Text>
//                 <Text style={styles.pendingBtnSubtitle}>Tap to return to the job dashboard</Text>
//               </View>
//             </View>
//             <Text style={styles.pendingBtnArrow}>›</Text>
//           </TouchableOpacity>
//         ) : !isArtisan ? (
//           // Customer → Become an Artisan
//           <TouchableOpacity
//             style={styles.artisanCta}
//             onPress={handleBecomeArtisan}
//             activeOpacity={0.85}
//             disabled={becomingArtisan}
//           >
//             <View style={styles.artisanCtaLeft}>
//               <Text style={styles.artisanCtaIcon}>🔧</Text>
//               <View>
//                 <Text style={styles.artisanCtaTitle}>Create Job</Text>
//                 <Text style={styles.artisanCtaSubtitle}>List your skills & earn money</Text>
//               </View>
//             </View>
//             {becomingArtisan
//               ? <ActivityIndicator color={PRIMARY} />
//               : <Text style={styles.artisanCtaArrow}>›</Text>}
//           </TouchableOpacity>
//         ) : null}

//         {/* ── Track Your Job — visible only when there is an active job ── */}
//         {activeJob && (
//           <TouchableOpacity
//             style={styles.trackJobBtn}
//             onPress={() => navigation.navigate('JobDetail', { jobId: activeJob._id })}
//             activeOpacity={0.85}
//           >
//             <View style={styles.trackJobLeft}>
//               <Text style={styles.trackJobIcon}>📍</Text>
//               <View>
//                 <Text style={styles.trackJobTitle}>Track Your Job</Text>
//                 <Text style={styles.trackJobSubtitle} numberOfLines={1}>
//                   {activeJob.category} · {activeJob.status.replace('-', ' ')}
//                 </Text>
//               </View>
//             </View>
//             <Text style={styles.trackJobArrow}>›</Text>
//           </TouchableOpacity>
//         )}

//         {/* Menu items */}
//         <View style={styles.menuCard}>
//           {menuItems.map((item, i) => (
//             <TouchableOpacity
//               key={item.label}
//               style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
//               onPress={() => {
//                 if (item.url)    Linking.openURL(item.url);
//                 else if (item.screen) navigation.navigate(item.screen);
//               }}
//               activeOpacity={0.7}
//             >
//               <Text style={styles.menuIcon}>{item.icon}</Text>
//               <Text style={styles.menuLabel}>{item.label}</Text>
//               <Text style={styles.menuChevron}>›</Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* Logout */}
//         <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
//           <Text style={styles.logoutIcon}>🚪</Text>
//           <Text style={styles.logoutText}>Log Out</Text>
//         </TouchableOpacity>

//         <Text style={styles.version}>FixNG v1.0</Text>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// function StatBox({ label, value }) {
//   return (
//     <View style={styles.statBox}>
//       <Text style={styles.statValue}>{value}</Text>
//       <Text style={styles.statLabel}>{label}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F5F7FB' },
//   scroll: { paddingBottom: 30 },

//   header: {
//     paddingHorizontal: 20, paddingVertical: 16,
//     backgroundColor: '#FFF',
//     borderBottomWidth: 1, borderBottomColor: '#EEF0F5',
//   },
//   headerTitle: { fontSize: 22, fontWeight: '800', color: '#1E232C' },

//   profileCard: {
//     backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16,
//     borderRadius: 20, padding: 24, alignItems: 'center',
//     borderWidth: 1, borderColor: '#EEF0F5',
//     elevation: 1,
//     shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05, shadowRadius: 4,
//     marginBottom: 16,
//   },
//   avatarCircle: {
//     width: 80, height: 80, borderRadius: 40,
//     backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center',
//     marginBottom: 14,
//   },
//   avatarImage: { width: 80, height: 80, borderRadius: 40 },
//   avatarInitial: { fontSize: 34, fontWeight: '800', color: PRIMARY },
//   userName: { fontSize: 20, fontWeight: '800', color: '#1E232C', marginBottom: 4 },
//   userPhone: { fontSize: 14, color: '#6B7280', marginBottom: 20 },

//   statsRow: {
//     flexDirection: 'row', alignItems: 'center',
//     width: '100%', backgroundColor: '#F5F7FB',
//     borderRadius: 14, paddingVertical: 16,
//   },
//   statBox: { flex: 1, alignItems: 'center' },
//   statValue: { fontSize: 22, fontWeight: '800', color: '#1E232C', marginBottom: 2 },
//   statLabel: { fontSize: 12, color: '#6B7280' },
//   statDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB' },

//   // Artisan status card
//   artisanStatusCard: {
//     marginHorizontal: 16, marginBottom: 16,
//     borderRadius: 16, padding: 16,
//     borderWidth: 1.5,
//   },
//   artisanStatusTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
//   artisanStatusIcon: { fontSize: 22 },
//   artisanStatusLabel: { fontSize: 15, fontWeight: '800' },
//   artisanStatusNote: { fontSize: 13, color: '#374151', lineHeight: 18 },
//   artisanStatusTap: { fontSize: 13, fontWeight: '700', marginTop: 8 },
//   artisanStatusLoading: {
//     flexDirection: 'row', alignItems: 'center', gap: 10,
//     marginHorizontal: 16, marginBottom: 16, padding: 14,
//     backgroundColor: '#F9FAFB', borderRadius: 12,
//   },
//   artisanStatusLoadingText: { fontSize: 13, color: '#6B7280' },

//   menuCard: {
//     backgroundColor: '#FFF', marginHorizontal: 16,
//     borderRadius: 20, overflow: 'hidden',
//     borderWidth: 1, borderColor: '#EEF0F5',
//     marginBottom: 16,
//     elevation: 1,
//     shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05, shadowRadius: 4,
//   },
//   menuItem: {
//     flexDirection: 'row', alignItems: 'center', gap: 14,
//     paddingHorizontal: 20, paddingVertical: 16,
//   },
//   menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
//   menuIcon: { fontSize: 20, width: 26, textAlign: 'center' },
//   menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E232C' },
//   menuChevron: { fontSize: 20, color: '#9CA3AF' },

//   // View Public Profile button
//   publicProfileBtn: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     marginHorizontal: 16, marginBottom: 16,
//     backgroundColor: '#F0FDF4', borderRadius: 16,
//     paddingHorizontal: 20, paddingVertical: 16,
//     borderWidth: 1.5, borderColor: '#BBF7D0',
//   },
//   publicProfileLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
//   publicProfileIcon: { fontSize: 26 },
//   publicProfileTitle: { fontSize: 15, fontWeight: '800', color: '#16A34A', marginBottom: 2 },
//   publicProfileSubtitle: { fontSize: 12, color: '#6B7280' },
//   publicProfileArrow: { fontSize: 24, color: '#16A34A', fontWeight: '700' },

//   // Track Your Job button (visible when there is an active job)
//   trackJobBtn: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     marginHorizontal: 16, marginBottom: 16,
//     backgroundColor: '#FFF7ED', borderRadius: 16,
//     paddingHorizontal: 20, paddingVertical: 16,
//     borderWidth: 1.5, borderColor: '#FED7AA',
//   },
//   trackJobLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
//   trackJobIcon: { fontSize: 26 },
//   trackJobTitle: { fontSize: 15, fontWeight: '800', color: '#C2410C', marginBottom: 2 },
//   trackJobSubtitle: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
//   trackJobArrow: { fontSize: 24, color: '#C2410C', fontWeight: '700' },

//   // Go to Job Dashboard button (verified artisans)
//   jobDashboardBtn: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     marginHorizontal: 16, marginBottom: 16,
//     backgroundColor: '#EFF6FF', borderRadius: 16,
//     paddingHorizontal: 20, paddingVertical: 16,
//     borderWidth: 1.5, borderColor: '#BFDBFE',
//   },
//   jobDashboardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
//   jobDashboardIcon: { fontSize: 26 },
//   jobDashboardTitle: { fontSize: 15, fontWeight: '800', color: '#2563EB', marginBottom: 2 },
//   jobDashboardSubtitle: { fontSize: 12, color: '#6B7280' },
//   jobDashboardArrow: { fontSize: 24, color: '#2563EB', fontWeight: '700' },

//   // Verification Pending button
//   pendingBtn: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     marginHorizontal: 16, marginBottom: 16,
//     backgroundColor: '#FFFBEB', borderRadius: 16,
//     paddingHorizontal: 20, paddingVertical: 16,
//     borderWidth: 1.5, borderColor: '#FDE68A',
//   },
//   pendingBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
//   pendingBtnIcon: { fontSize: 26 },
//   pendingBtnTitle: { fontSize: 15, fontWeight: '800', color: '#D97706', marginBottom: 2 },
//   pendingBtnSubtitle: { fontSize: 12, color: '#6B7280' },
//   pendingBtnArrow: { fontSize: 24, color: '#D97706', fontWeight: '700' },

//   artisanCta: {
//     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     marginHorizontal: 16, marginBottom: 16,
//     backgroundColor: '#EFF6FF', borderRadius: 16,
//     paddingHorizontal: 20, paddingVertical: 16,
//     borderWidth: 1.5, borderColor: '#BFDBFE',
//   },
//   artisanCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
//   artisanCtaIcon: { fontSize: 28 },
//   artisanCtaTitle: { fontSize: 18, fontWeight: '800', color: PRIMARY, marginBottom: 2 },
//   artisanCtaSubtitle: { fontSize: 13, color: '#6B7280' },
//   artisanCtaArrow: { fontSize: 24, color: PRIMARY, fontWeight: '700' },

//   logoutBtn: {
//     flexDirection: 'row', alignItems: 'center', gap: 10,
//     marginHorizontal: 16, backgroundColor: '#FEE2E2',
//     borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16,
//     marginBottom: 20,
//   },
//   logoutIcon: { fontSize: 20 },
//   logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },

//   version: { textAlign: 'center', fontSize: 12, color: '#C4C9D4' },
// });

// const subStyles = StyleSheet.create({
//   // ── Basic plan (active) ─────────────────────────────────────────────────────
//   basicWrap: {
//     marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16,
//     backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#2563EB',
//   },

//   // ── Premium plan (active) ───────────────────────────────────────────────────
//   premiumWrap: {
//     marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16,
//     backgroundColor: '#FFFBEB', borderWidth: 2, borderColor: '#F59E0B',
//   },

//   // ── Shared: badge row, headline, sub, expiry, upgrade button ───────────────
//   planRow: {
//     flexDirection: 'row', alignItems: 'center',
//     justifyContent: 'space-between', marginBottom: 8,
//   },
//   basicBadge: {
//     backgroundColor: '#2563EB', borderRadius: 20,
//     paddingHorizontal: 10, paddingVertical: 4,
//   },
//   premiumBadge: {
//     backgroundColor: '#F59E0B', borderRadius: 20,
//     paddingHorizontal: 10, paddingVertical: 4,
//   },
//   badgeText:     { color: '#FFF', fontSize: 11, fontWeight: '800' },
//   activeLabel:   { fontSize: 13, fontWeight: '700', color: '#16A34A' },
//   planHeadline:  { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
//   planSub:       { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 8 },
//   expiry:        { fontSize: 12, color: '#64748B', marginBottom: 12 },
//   upgradeBtn: {
//     backgroundColor: '#2563EB', borderRadius: 10,
//     paddingVertical: 10, alignItems: 'center',
//   },
//   upgradeBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

//   // ── Free plan — dark navy card with subscribe CTA ──────────────────────────
//   freeWrap: {
//     flexDirection: 'row', alignItems: 'center',
//     marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16,
//     backgroundColor: '#1E293B',
//   },
//   freeLeft:  { flex: 1, paddingRight: 12 },
//   freeRight: { alignItems: 'center', gap: 8 },

//   verifiedRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
//   verifiedTick: { fontSize: 14, fontWeight: '800', color: '#34D399' },
//   verifiedLabel:{ fontSize: 13, fontWeight: '700', color: '#34D399' },

//   freeHeadline: { fontSize: 15, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
//   freeSub:      { fontSize: 12, color: '#94A3B8', lineHeight: 17 },
//   freePrice:    { fontSize: 13, fontWeight: '800', color: '#F8FAFC', textAlign: 'center', lineHeight: 18 },

//   freeBtn: {
//     backgroundColor: '#2563EB', borderRadius: 8,
//     paddingHorizontal: 12, paddingVertical: 8,
//   },
//   freeBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
// });



import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getUser } from '../../utils/storage';
import { getMyJobs } from '../../api/jobApi';
import { becomeArtisan, getOnboardingStatus } from '../../api/artisanApi';
import { getMySubscription } from '../../api/subscriptionApi';

const PRIMARY   = '#2563EB';
const PRIMARY_L = '#EFF6FF';
const TOS_URL   = 'https://ematech81.github.io/FixNGTerms/';

const CUSTOMER_MENU_ITEMS = [
  { icon: '📋', label: 'My Jobs',            screen: 'MyJobs',          color: '#6366F1' },
  { icon: '🔔', label: 'Notifications',      screen: 'Notifications',   color: '#F59E0B' },
  { icon: '🔒', label: 'Privacy & Security', screen: 'PrivacySecurity', color: '#10B981' },
  { icon: '❓', label: 'Help & Support',     screen: 'HelpSupport',     color: '#3B82F6' },
  { icon: '⚖️', label: 'Terms of Service',  url:    TOS_URL,            color: '#8B5CF6' },
];

const ARTISAN_MENU_ITEMS = [
  { icon: '📋', label: 'My Jobs',            screen: 'MyJobs',          color: '#6366F1' },
  { icon: '⭐', label: 'My Reviews',         screen: 'MyReviews',       color: '#F59E0B' },
  { icon: '🔔', label: 'Notifications',      screen: 'Notifications',   color: '#EC4899' },
  { icon: '🔒', label: 'Privacy & Security', screen: 'PrivacySecurity', color: '#10B981' },
  { icon: '❓', label: 'Help & Support',     screen: 'HelpSupport',     color: '#3B82F6' },
  { icon: '⚖️', label: 'Terms of Service',  url:    TOS_URL,            color: '#8B5CF6' },
];

const ARTISAN_STATUS_CONFIG = {
  incomplete: {
    icon: '⚠️', label: 'Registration Incomplete',
    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
    note: 'Complete your profile to unlock full artisan access.',
  },
  pending: {
    icon: '⏳', label: 'Verification Pending',
    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
    note: 'Our team is reviewing your profile. This usually takes 24–48 hours.',
  },
  verified: {
    icon: '✅', label: 'Verified Artisan',
    color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0',
    note: 'Your account is fully verified. You can receive job requests.',
  },
  rejected: {
    icon: '❌', label: 'Verification Rejected',
    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
    note: 'Your application was not approved.',
    tap: 'Tap to view reason and resubmit →',
  },
};

export default function ProfileScreen({ navigation, onLogout, onRefreshAuth }) {
  const [user, setUser]                         = useState(null);
  const [stats, setStats]                       = useState({ total: 0, completed: 0, active: 0 });
  const [activeJob, setActiveJob]               = useState(null);
  const [loadingStats, setLoadingStats]         = useState(true);
  const [becomingArtisan, setBecomingArtisan]   = useState(false);
  const [artisanStatus, setArtisanStatus]       = useState(null);
  const [artisanIsPro, setArtisanIsPro]         = useState(false);
  const [loadingArtisanStatus, setLoadingArtisanStatus] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl]   = useState(null);
  const [subscription, setSubscription]         = useState(null);

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const loadProfile = async () => {
    const u = await getUser();
    setUser(u);
    fetchStats(u);
    if (u?.role === 'artisan') fetchArtisanStatus();
  };

  const ACTIVE_STATUSES = ['pending', 'accepted', 'in-progress', 'disputed'];

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res  = await getMyJobs();
      const jobs = res.data.data || [];
      const completed = jobs.filter(j => j.status === 'completed').length;
      const active    = jobs.filter(j => ACTIVE_STATUSES.includes(j.status)).length;
      setStats({ total: jobs.length, completed, active });
      setActiveJob(jobs.find(j => ACTIVE_STATUSES.includes(j.status)) || null);
    } catch { /* silent */ }
    finally { setLoadingStats(false); }
  };

  const fetchArtisanStatus = async () => {
    setLoadingArtisanStatus(true);
    try {
      const [onboardRes, subRes] = await Promise.all([
        getOnboardingStatus(),
        getMySubscription().catch(() => null),
      ]);
      const data   = onboardRes.data.data;
      const status = data?.verificationStatus || 'incomplete';
      setArtisanStatus(status);
      setArtisanIsPro(data?.isPro || false);
      if (data?.profilePhoto?.url) setProfilePhotoUrl(data.profilePhoto.url);
      setSubscription(subRes?.data?.data || null);
    } catch { /* silent */ }
    finally { setLoadingArtisanStatus(false); }
  };

  const handleBecomeArtisan = () => {
    Alert.alert(
      'Become an Artisan',
      "List your skills and start receiving job requests from customers near you. You'll complete a quick 5-step profile setup.",
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Get Started', onPress: async () => {
            setBecomingArtisan(true);
            try { await becomeArtisan(); onRefreshAuth?.(); }
            catch (err) { Alert.alert('Error', err?.message || 'Could not start artisan onboarding. Please try again.'); }
            finally { setBecomingArtisan(false); }
        }},
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const initial          = (user?.name || 'U')[0].toUpperCase();
  const isArtisan        = user?.role === 'artisan';
  const isArtisanPending = isArtisan && artisanStatus === 'pending';
  const isArtisanVerified= isArtisan && artisanStatus === 'verified';
  const statusConfig     = isArtisan && artisanStatus ? ARTISAN_STATUS_CONFIG[artisanStatus] : null;
  const menuItems        = isArtisan ? ARTISAN_MENU_ITEMS : CUSTOMER_MENU_ITEMS;

  /* ─── Subscription banner ─────────────────────────────────────────────── */
  const SubscriptionBanner = () => {
    if (!isArtisan || !isArtisanVerified) return null;

    const subPlan   = subscription?.plan || 'free';
    const subActive = subscription?.status === 'active' && subPlan !== 'free';
    const subExpiry = subscription?.expiresAt
      ? new Date(subscription.expiresAt).toLocaleDateString('en-NG',
          { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    if (subActive && subPlan === 'basic') return (
      <View style={subStyles.basicWrap}>
        <View style={subStyles.accentBar} />
        <View style={subStyles.inner}>
          <View style={subStyles.planRow}>
            <View style={[subStyles.badge, { backgroundColor: PRIMARY }]}>
              <Text style={subStyles.badgeText}>BASIC</Text>
            </View>
            <View style={subStyles.activePill}>
              <View style={subStyles.activeDot} />
              <Text style={subStyles.activePillText}>Active</Text>
            </View>
          </View>
          <Text style={subStyles.planHeadline}>Basic Plan</Text>
          <Text style={subStyles.planSub}>10 active jobs · Priority placement · Pro badge</Text>
          {subExpiry && <Text style={subStyles.expiry}>Renews {subExpiry}</Text>}
          <TouchableOpacity
            style={subStyles.upgradeBtn}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.85}
          >
            <Text style={subStyles.upgradeBtnText}>Upgrade to Premium ↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (subActive && subPlan === 'premium') return (
      <View style={[subStyles.basicWrap, subStyles.premiumWrap]}>
        <View style={[subStyles.accentBar, { backgroundColor: '#F59E0B' }]} />
        <View style={subStyles.inner}>
          <View style={subStyles.planRow}>
            <View style={[subStyles.badge, { backgroundColor: '#F59E0B' }]}>
              <Text style={subStyles.badgeText}>👑  PREMIUM</Text>
            </View>
            <View style={subStyles.activePill}>
              <View style={subStyles.activeDot} />
              <Text style={subStyles.activePillText}>Active</Text>
            </View>
          </View>
          <Text style={subStyles.planHeadline}>Premium Plan</Text>
          <Text style={subStyles.planSub}>Unlimited jobs · Featured placement · Priority support</Text>
          {subExpiry && <Text style={subStyles.expiry}>Renews {subExpiry}</Text>}
        </View>
      </View>
    );

    /* Free → upsell */
    return (
      <TouchableOpacity
        style={subStyles.freeWrap}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.88}
      >
        <View style={subStyles.freeLeft}>
          <View style={subStyles.verifiedRow}>
            <Text style={subStyles.verifiedTick}>✓</Text>
            <Text style={subStyles.verifiedLabel}>Verified Artisan</Text>
          </View>
          <Text style={subStyles.freeHeadline}>Unlock your full potential</Text>
          <Text style={subStyles.freeSub}>
            Upgrade to Basic or Premium for priority placement, more jobs & a Pro badge.
          </Text>
        </View>
        <View style={subStyles.freeRight}>
          <Text style={subStyles.freePrice}>from{'\n'}₦3,000</Text>
          <View style={subStyles.freeBtn}>
            <Text style={subStyles.freeBtnText}>Subscribe →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero band ──────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>My Profile</Text>

          {/* Avatar — overlaps the hero band */}
          <View style={styles.avatarWrapper}>
            <View style={[
              styles.avatarRing,
              isArtisan && statusConfig && { borderColor: statusConfig.color },
            ]}>
              {profilePhotoUrl
                ? <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
                : <Text style={styles.avatarInitial}>{initial}</Text>}
            </View>
            {isArtisanVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Name / phone / role pill ───────────────────────────────────── */}
        <View style={styles.nameBlock}>
          <Text style={styles.userName}>{user?.name || '—'}</Text>
          <Text style={styles.userPhone}>{user?.phone || ''}</Text>
          {isArtisan && (
            <View style={[
              styles.rolePill,
              { backgroundColor: isArtisanVerified ? '#DCFCE7' : '#FEF9C3' },
            ]}>
              <Text style={[
                styles.rolePillText,
                { color: isArtisanVerified ? '#16A34A' : '#92400E' },
              ]}>
                {isArtisanVerified ? '✅  Verified Artisan' : '⏳  Artisan'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatBox label="Total Jobs"  value={loadingStats ? '—' : stats.total}     accent="#6366F1" />
          <StatBox label="Completed"   value={loadingStats ? '—' : stats.completed}  accent="#10B981" />
          <StatBox label="Active"      value={loadingStats ? '—' : stats.active}     accent="#F59E0B" />
        </View>

        {/* ── Subscription banner ────────────────────────────────────────── */}
        <SubscriptionBanner />

        {/* ── Artisan status card ────────────────────────────────────────── */}
        {isArtisan && (
          loadingArtisanStatus
            ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={PRIMARY} size="small" />
                <Text style={styles.loadingText}>Loading artisan status…</Text>
              </View>
            )
            : statusConfig
              ? (artisanStatus === 'incomplete' || artisanStatus === 'rejected')
                ? (
                  <TouchableOpacity
                    style={[styles.statusCard, { borderLeftColor: statusConfig.color, backgroundColor: statusConfig.bg }]}
                    onPress={() => artisanStatus === 'incomplete'
                      ? navigation.navigate('Step4_VerificationID', { isEdit: true })
                      : navigation.navigate('AccountStatus', { type: 'rejected' })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.statusTop}>
                      <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
                      <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                    <Text style={styles.statusNote}>{statusConfig.note}</Text>
                    <Text style={[styles.statusTap, { color: statusConfig.color }]}>
                      {artisanStatus === 'incomplete'
                        ? 'Tap to upload your ID and complete registration →'
                        : statusConfig.tap}
                    </Text>
                  </TouchableOpacity>
                )
                : (
                  <View style={[styles.statusCard, { borderLeftColor: statusConfig.color, backgroundColor: statusConfig.bg }]}>
                    <View style={styles.statusTop}>
                      <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
                      <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                    <Text style={styles.statusNote}>{statusConfig.note}</Text>
                  </View>
                )
              : null
        )}

        {/* ── Action CTAs ────────────────────────────────────────────────── */}
        {isArtisanVerified ? (
          <>
            <ActionCard
              icon="👁️" title="View Public Profile"
              subtitle="See what customers see when they find you"
              accentColor="#16A34A" bgColor="#F0FDF4" borderColor="#BBF7D0"
              onPress={() => navigation.navigate('ArtisanProfile', { artisanId: user._id || user.id })}
            />
            <ActionCard
              icon="🔧" title="Job Dashboard"
              subtitle="View and manage available job requests"
              accentColor={PRIMARY} bgColor={PRIMARY_L} borderColor="#BFDBFE"
              onPress={() => navigation.navigate('JobScreen')}
            />
          </>
        ) : isArtisanPending ? (
          <ActionCard
            icon="⏳" title="Verification Pending"
            subtitle="Tap to return to the job dashboard"
            accentColor="#D97706" bgColor="#FFFBEB" borderColor="#FDE68A"
            onPress={() => navigation.navigate('JobScreen')}
          />
        ) : !isArtisan ? (
          <ActionCard
            icon="🔧" title="Become an Artisan"
            subtitle="List your skills & earn money"
            accentColor={PRIMARY} bgColor={PRIMARY_L} borderColor="#BFDBFE"
            onPress={handleBecomeArtisan}
            loading={becomingArtisan}
          />
        ) : null}

        {/* ── Track active job ───────────────────────────────────────────── */}
        {activeJob && (
          <ActionCard
            icon="📍" title="Track Your Job"
            subtitle={`${activeJob.category} · ${activeJob.status.replace('-', ' ')}`}
            accentColor="#C2410C" bgColor="#FFF7ED" borderColor="#FED7AA"
            onPress={() => navigation.navigate('JobDetail', { jobId: activeJob._id })}
          />
        )}

        {/* ── Section label ──────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        {/* ── Menu ───────────────────────────────────────────────────────── */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={() => item.url ? Linking.openURL(item.url) : navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: item.color + '18' }]}>
                <Text style={styles.menuIconEmoji}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logout ─────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FixNG v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Reusable sub-components ──────────────────────────────────────────────── */

function StatBox({ label, value, accent }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statAccentDot, { backgroundColor: accent }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, title, subtitle, accentColor, bgColor, borderColor, onPress, loading }) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: bgColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.82}
      disabled={loading}
    >
      {/* Left colour stripe */}
      <View style={[styles.actionStripe, { backgroundColor: accentColor }]} />
      <View style={styles.actionIconWrap}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionTitle, { color: accentColor }]}>{title}</Text>
        <Text style={styles.actionSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      {loading
        ? <ActivityIndicator color={accentColor} />
        : <Text style={[styles.actionArrow, { color: accentColor }]}>›</Text>}
    </TouchableOpacity>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { paddingBottom: 40 },

  /* Hero */
  hero: {
    backgroundColor: PRIMARY,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 52,          // extra space so avatar overlaps nicely
  },
  heroTitle: {
    fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.3,
  },

  /* Avatar */
  avatarWrapper: {
    alignSelf: 'center',
    marginTop: 16,
    position: 'relative',
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: '#fff',
    backgroundColor: '#C7D2FE',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  avatarImage:   { width: 90, height: 90, borderRadius: 45 },
  avatarInitial: { fontSize: 36, fontWeight: '900', color: PRIMARY },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#16A34A',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  verifiedBadgeText: { fontSize: 11, color: '#fff', fontWeight: '900' },

  /* Name block — sits below hero, centred */
  nameBlock: {
    alignItems: 'center',
    marginTop: -46,             // pulls up into the hero overlap
    paddingTop: 52,             // clears the avatar
    backgroundColor: '#F1F5F9',
    paddingBottom: 8,
  },
  userName:  { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 3 },
  userPhone: { fontSize: 14, color: '#64748B', marginBottom: 10 },
  rolePill: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20,
  },
  rolePillText: { fontSize: 12, fontWeight: '700' },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: 18, marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  statBox:       { flex: 1, alignItems: 'center' },
  statAccentDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 6 },
  statValue:     { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  statLabel:     { fontSize: 11, color: '#94A3B8', fontWeight: '600', letterSpacing: 0.3 },

  /* Loading state */
  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, backgroundColor: '#fff',
    borderRadius: 14,
  },
  loadingText: { fontSize: 13, color: '#64748B' },

  /* Status card — left-border style */
  statusCard: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statusTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusIcon:  { fontSize: 20 },
  statusLabel: { fontSize: 14, fontWeight: '800' },
  statusNote:  { fontSize: 12, color: '#374151', lineHeight: 17 },
  statusTap:   { fontSize: 12, fontWeight: '700', marginTop: 6 },

  /* Action cards */
  actionCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  actionStripe:  { width: 4, alignSelf: 'stretch' },
  actionIconWrap:{ paddingLeft: 14, paddingRight: 4, paddingVertical: 18 },
  actionIcon:    { fontSize: 26 },
  actionText:    { flex: 1, paddingHorizontal: 10, paddingVertical: 18 },
  actionTitle:   { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  actionSubtitle:{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' },
  actionArrow:   { fontSize: 26, fontWeight: '700', paddingRight: 16 },

  /* Section label */
  sectionLabel: {
    marginHorizontal: 20, marginBottom: 8, marginTop: 8,
    fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.2,
  },

  /* Menu */
  menuCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIconBox: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  menuIconEmoji: { fontSize: 18 },
  menuLabel:     { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B' },
  menuChevron:   { fontSize: 20, color: '#CBD5E1' },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 20,
    borderRadius: 16, paddingVertical: 15,
    borderWidth: 1.5, borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  version: { textAlign: 'center', fontSize: 11, color: '#CBD5E1', letterSpacing: 0.5 },
});

/* ─── Subscription styles ───────────────────────────────────────────────────── */
const subStyles = StyleSheet.create({
  /* Shared card shell */
  basicWrap: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5, borderColor: '#BFDBFE',
    overflow: 'hidden',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 6, elevation: 2,
  },
  premiumWrap: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  accentBar: {
    height: 4, backgroundColor: PRIMARY,
  },
  inner: { padding: 16 },

  /* Badge + active pill */
  planRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  badge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText:  { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  activeDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  activePillText:{ fontSize: 12, fontWeight: '700', color: '#16A34A' },

  planHeadline: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  planSub:      { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 8 },
  expiry:       { fontSize: 12, color: '#94A3B8', marginBottom: 12 },

  upgradeBtn: {
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingVertical: 11, alignItems: 'center',
  },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  /* Free / upsell card */
  freeWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 4,
  },
  freeLeft:  { flex: 1, paddingRight: 12 },
  freeRight: { alignItems: 'center', gap: 10 },

  verifiedRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  verifiedTick:  { fontSize: 13, fontWeight: '900', color: '#34D399' },
  verifiedLabel: { fontSize: 12, fontWeight: '700', color: '#34D399' },

  freeHeadline: { fontSize: 15, fontWeight: '800', color: '#F8FAFC', marginBottom: 4 },
  freeSub:      { fontSize: 12, color: '#94A3B8', lineHeight: 17 },

  freePrice: {
    fontSize: 13, fontWeight: '800',
    color: '#F8FAFC', textAlign: 'center', lineHeight: 18,
  },
  freeBtn: {
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  freeBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});