import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { getToken, clearSession, saveToken, saveUser } from '../utils/storage';
import { getMe, cancelArtisanRegistration } from '../api/authApi';
import { getOnboardingStatus } from '../api/artisanApi';
import ArtisanOnboardingNavigator from './ArtisanOnboardingNavigator';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OTPScreen from '../screens/auth/OTPScreen';

// Customer
import CustomerTabScreen from '../screens/customer/CustomerTabScreen';
import CreateJobScreen from '../screens/customer/CreateJobScreen';
import SearchArtisansScreen from '../screens/customer/SearchArtisansScreen';
import RateJobScreen from '../screens/customer/RateJobScreen';

// Artisan


// Shared
import MyJobsScreen from '../screens/shared/MyJobsScreen';
import JobDetailScreen from '../screens/shared/JobDetailScreen';
import ArtisanProfileScreen from '../screens/shared/ArtisanProfileScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import NotificationsScreen   from '../screens/shared/NotificationsScreen';
import SubscriptionScreen    from '../screens/shared/SubscriptionScreen';
import MyReviewsScreen       from '../screens/shared/MyReviewsScreen';
import PrivacySecurityScreen from '../screens/shared/PrivacySecurityScreen';
import HelpSupportScreen    from '../screens/shared/HelpSupportScreen';
import AccountStatusScreen  from '../screens/shared/AccountStatusScreen';

// Artisan onboarding
import ArtisanJobScreen from '../screens/artisan/ArtisanJobScreen';
import Step4_VerificationID from '../screens/artisan/onboarding/Step4_VerificationID';

// Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

const Stack = createStackNavigator();
const AuthStack = createStackNavigator();
const CustomerStack = createStackNavigator();
const AdminStack = createStackNavigator();

// Determines which onboarding step to resume from
const getNextStep = (completedSteps) => {
  if (!completedSteps.profilePhoto) return 'profilePhoto';
  if (!completedSteps.skills) return 'skills';
  if (!completedSteps.location) return 'location';
  if (!completedSteps.verificationId) return 'verificationId';
  if (!completedSteps.skillVideo) return 'skillVideo';
  return 'pending';
};

// ─── Auth Stack ───────────────────────────────────────────────────────────────
function AuthNavigator({ onAuthSuccess }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {(props) => <LoginScreen {...props} onAuthSuccess={onAuthSuccess} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {(props) => <RegisterScreen {...props} onAuthSuccess={onAuthSuccess} />}
      </AuthStack.Screen>
      {/* OTP is reached from both Register and Login (phone login) */}
      <AuthStack.Screen name="OTP" component={OTPScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Customer Stack ───────────────────────────────────────────────────────────
function CustomerNavigator({ onLogout, onRefreshAuth, initialTab, onInitialTabConsumed }) {
  return (
    <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab root — Jobs / Search / Messages / Profile */}
      <CustomerStack.Screen name="CustomerTabs">
        {(props) => (
          <CustomerTabScreen
            {...props}
            onLogout={onLogout}
            onRefreshAuth={onRefreshAuth}
            initialTab={initialTab}
            onInitialTabConsumed={onInitialTabConsumed}
          />
        )}
      </CustomerStack.Screen>
      {/* Detail screens pushed on top of tabs */}
      <CustomerStack.Screen name="CreateJob" component={CreateJobScreen} />
      <CustomerStack.Screen name="SearchArtisans" component={SearchArtisansScreen} />
      <CustomerStack.Screen name="ArtisanProfile" component={ArtisanProfileScreen} />
      <CustomerStack.Screen name="MyJobs" component={MyJobsScreen} />
      <CustomerStack.Screen name="JobDetail" component={JobDetailScreen} />
      <CustomerStack.Screen name="Chat" component={ChatScreen} />
      <CustomerStack.Screen name="RateJob" component={RateJobScreen} />
      <CustomerStack.Screen name="Notifications"    component={NotificationsScreen} />
      <CustomerStack.Screen name="Subscription"     component={SubscriptionScreen} />
      <CustomerStack.Screen name="MyReviews"        component={MyReviewsScreen} />
      <CustomerStack.Screen name="PrivacySecurity"  component={PrivacySecurityScreen} />
      <CustomerStack.Screen name="HelpSupport"      component={HelpSupportScreen} />
      {/* Pending artisans can access the job dashboard while awaiting verification */}
      <CustomerStack.Screen name="JobScreen" component={ArtisanJobScreen} />
      {/* ID upload accessible in edit mode from the incomplete registration card */}
      <CustomerStack.Screen name="Step4_VerificationID" component={Step4_VerificationID} />
      {/* Account status: rejection details, suspension notice */}
      <CustomerStack.Screen name="AccountStatus" component={AccountStatusScreen} />
    </CustomerStack.Navigator>
  );
}

// ─── Admin Stack ─────────────────────────────────────────────────────────────
function AdminNavigator({ onLogout }) {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminDashboard">
        {(props) => <AdminDashboardScreen {...props} onLogout={onLogout} />}
      </AdminStack.Screen>
    </AdminStack.Navigator>
  );
}


// ─── Root Navigator ───────────────────────────────────────────────────────────
export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    artisanStep: null,      // null | 'profilePhoto' | 'skills' | ... | 'pending' | 'verified' | 'rejected'
    verificationStatus: null,
    isSuspended: false,
    suspensionReason: null,
  });
  // Set to true by handleGoToDashboard so CustomerTabScreen opens on the Profile tab
  const [startOnProfile, setStartOnProfile] = useState(false);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const token = await getToken();
      if (!token) return setIsLoading(false);

      const meRes = await getMe();
      const user = meRes.data.user;
      await saveUser(user); // keep storage in sync with backend (role may have changed)

      if (user.role === 'artisan') {
        const statusRes = await getOnboardingStatus();
        const { completedSteps, verificationStatus, onboardingComplete, isSuspended, suspensionReason } = statusRes.data.data;

        let step = null;
        if (!onboardingComplete) {
          step = getNextStep(completedSteps);
        } else {
          step = verificationStatus; // 'pending' | 'verified' | 'rejected'
        }

        setAuthState({
          isAuthenticated: true, user, artisanStep: step, verificationStatus,
          isSuspended: isSuspended || false,
          suspensionReason: suspensionReason || null,
        });
      } else {
        setAuthState({ isAuthenticated: true, user, artisanStep: null, verificationStatus: null, isSuspended: false, suspensionReason: null });
      }
    } catch {
      // Expired or invalid token — boot to login
      await clearSession();
      setAuthState({ isAuthenticated: false, user: null, artisanStep: null, verificationStatus: null, isSuspended: false, suspensionReason: null });
    } finally {
      setIsLoading(false);
    }
  };

  // Called after successful login / registration
  const handleAuthSuccess = async ({ user, artisanProfile }) => {
    await saveUser(user); // keep storage in sync so ProfileScreen reads correct role
    if (user.role === 'artisan') {
      let step = null;
      if (!artisanProfile?.onboardingComplete) {
        step = getNextStep(artisanProfile?.completedSteps || {});
      } else {
        step = artisanProfile?.verificationStatus || 'pending';
      }
      setAuthState({
        isAuthenticated: true, user, artisanStep: step,
        verificationStatus: artisanProfile?.verificationStatus || null,
        isSuspended: artisanProfile?.isSuspended || false,
        suspensionReason: artisanProfile?.suspensionReason || null,
      });
    } else {
      setAuthState({ isAuthenticated: true, user, artisanStep: null, verificationStatus: null, isSuspended: false, suspensionReason: null });
    }
  };

  // Called from dashboard logout button
  const handleLogout = async () => {
    await clearSession();
    setAuthState({ isAuthenticated: false, user: null, artisanStep: null, verificationStatus: null, isSuspended: false, suspensionReason: null });
  };

  // Called after "Become an Artisan" or "Cancel Registration" — re-fetches auth state
  const handleRefreshAuth = useCallback(() => {
    setIsLoading(true);
    bootstrapAsync();
  }, []);

  // Called from onboarding "Cancel Registration" — reverts role to customer
  const handleCancelRegistration = useCallback(async () => {
    try {
      const res = await cancelArtisanRegistration();
      // Save the new token + user (role is now 'customer')
      await saveToken(res.data.token);
      await saveUser(res.data.user);
    } catch {
      // Even if the API fails, force a re-auth so the UI doesn't stay stuck
    } finally {
      handleRefreshAuth();
    }
  }, [handleRefreshAuth]);

  // Called from PendingVerification "Go to Dashboard"
  // Sends the user to the Profile tab so they can see their pending status.
  const handleGoToDashboard = useCallback(() => {
    setStartOnProfile(true);
    handleRefreshAuth();
  }, [handleRefreshAuth]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // ── Routing logic ──────────────────────────────────────────────────────────
  const { isAuthenticated, user, artisanStep, isSuspended, suspensionReason } = authState;

  const isAdmin = isAuthenticated && user?.role === 'admin';

  const ONBOARDING_STEPS = ['profilePhoto', 'skills', 'location', 'verificationId', 'skillVideo'];
  const isArtisanOnboarding =
    isAuthenticated &&
    user?.role === 'artisan' &&
    ONBOARDING_STEPS.includes(artisanStep);

  // Suspended artisans are locked to the AccountStatus screen until the admin lifts the suspension.
  const isArtisanSuspended = isAuthenticated && user?.role === 'artisan' && isSuspended;

  // All artisans (pending, verified, rejected) stay in CustomerNavigator so the
  // marketplace home is never replaced. Verified artisans access the job dashboard
  // via a button on their Profile tab instead.

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // ── Not logged in → Auth stack
          <Stack.Screen name="Auth">
            {() => <AuthNavigator onAuthSuccess={handleAuthSuccess} />}
          </Stack.Screen>

        ) : isAdmin ? (
          // ── Admin → admin dashboard
          <Stack.Screen name="AdminApp">
            {() => <AdminNavigator onLogout={handleLogout} />}
          </Stack.Screen>

        ) : isArtisanSuspended ? (
          // ── Suspended artisan → locked to suspension notice
          <Stack.Screen name="SuspendedNotice">
            {() => (
              <AccountStatusScreen
                route={{ params: { type: 'suspended', reason: suspensionReason } }}
                navigation={{ goBack: handleLogout, navigate: () => {}, reset: handleLogout }}
              />
            )}
          </Stack.Screen>

        ) : isArtisanOnboarding ? (
          // ── Artisan mid-onboarding → lock into onboarding flow
          <Stack.Screen name="ArtisanOnboarding">
            {() => (
              <ArtisanOnboardingNavigator
                initialStep={artisanStep}
                onCancelRegistration={handleCancelRegistration}
                onGoToDashboard={handleGoToDashboard}
                onVerified={() =>
                  setAuthState((prev) => ({
                    ...prev,
                    artisanStep: 'verified',
                    verificationStatus: 'verified',
                  }))
                }
              />
            )}
          </Stack.Screen>

        ) : (
          // ── Everyone else: customers, pending/verified/rejected artisans → marketplace app
          // The Profile tab shows status-aware buttons; verified artisans navigate
          // to the job dashboard from there without replacing the home screen.
          <Stack.Screen name="CustomerApp">
            {() => (
              <CustomerNavigator
                onLogout={handleLogout}
                onRefreshAuth={handleRefreshAuth}
                initialTab={startOnProfile ? 'profile' : 'home'}
                onInitialTabConsumed={() => setStartOnProfile(false)}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
});
