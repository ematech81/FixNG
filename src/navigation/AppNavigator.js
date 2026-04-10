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
import ArtisanTabScreen from '../screens/artisan/ArtisanTabScreen';
import AvailableJobsScreen from '../screens/artisan/AvailableJobsScreen';
// import ArtisanJobScreen from '../screens/artisan/AvailableJobsScreen';


// Shared
import MyJobsScreen from '../screens/shared/MyJobsScreen';
import JobDetailScreen from '../screens/shared/JobDetailScreen';
import ArtisanProfileScreen from '../screens/shared/ArtisanProfileScreen';
import ChatScreen from '../screens/shared/ChatScreen';

// Artisan onboarding
import Step4_VerificationID from '../screens/artisan/onboarding/Step4_VerificationID';
import Step5_SkillVideo from '../screens/artisan/onboarding/Step5_SkillVideo';
import ArtisanJobScreen from '../screens/artisan/ArtisanJobScreen';

const Stack = createStackNavigator();
const AuthStack = createStackNavigator();
const CustomerStack = createStackNavigator();
const ArtisanStack = createStackNavigator();

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
      {/* Pending artisans can access the job dashboard while awaiting verification */}
      <CustomerStack.Screen name="JobScreen" component={ArtisanJobScreen} />
    </CustomerStack.Navigator>
  );
}

// ─── Artisan Stack ────────────────────────────────────────────────────────────
function ArtisanNavigator({ onLogout, onRefreshAuth }) {
  return (
    <ArtisanStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab root — Home / Jobs / Messages / Profile */}
      <ArtisanStack.Screen name="ArtisanTabs">
        {(props) => <ArtisanTabScreen {...props} onLogout={onLogout} onRefreshAuth={onRefreshAuth} />}
      </ArtisanStack.Screen>
      {/* Detail screens pushed on top of tabs */}
      <ArtisanStack.Screen name="AvailableJobs" component={AvailableJobsScreen} />
      <ArtisanStack.Screen name="JobScreen" component={ArtisanJobScreen} />
      <ArtisanStack.Screen name="MyJobs" component={MyJobsScreen} />
      <ArtisanStack.Screen name="JobDetail" component={JobDetailScreen} />
      <ArtisanStack.Screen name="Chat" component={ChatScreen} />
      <ArtisanStack.Screen name="ArtisanProfile" component={ArtisanProfileScreen} />
      <ArtisanStack.Screen name="SearchArtisans" component={SearchArtisansScreen} />
      {/* Profile completion — accessible from "Edit Profile" on the dashboard */}
      <ArtisanStack.Screen name="Step4_VerificationID" component={Step4_VerificationID} />
      <ArtisanStack.Screen name="Step5_SkillVideo" component={Step5_SkillVideo} />
    </ArtisanStack.Navigator>
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
        const { completedSteps, verificationStatus, onboardingComplete } = statusRes.data.data;

        let step = null;
        if (!onboardingComplete) {
          step = getNextStep(completedSteps);
        } else {
          step = verificationStatus; // 'pending' | 'verified' | 'rejected'
        }

        setAuthState({
          isAuthenticated: true, user, artisanStep: step, verificationStatus,
        });
      } else {
        setAuthState({ isAuthenticated: true, user, artisanStep: null, verificationStatus: null });
      }
    } catch {
      // Expired or invalid token — boot to login
      await clearSession();
      setAuthState({ isAuthenticated: false, user: null, artisanStep: null, verificationStatus: null });
    } finally {
      setIsLoading(false);
    }
  };

  // Called after successful login / registration
  const handleAuthSuccess = ({ user, artisanProfile }) => {
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
      });
    } else {
      setAuthState({ isAuthenticated: true, user, artisanStep: null, verificationStatus: null });
    }
  };

  // Called from dashboard logout button
  const handleLogout = async () => {
    await clearSession();
    setAuthState({ isAuthenticated: false, user: null, artisanStep: null, verificationStatus: null });
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
  const { isAuthenticated, user, artisanStep } = authState;

  // Lock into onboarding ONLY while there are incomplete onboarding steps.
  // artisanStep is one of the step names ('profilePhoto', 'skills', etc.) during onboarding,
  // and 'pending' | 'verified' | 'rejected' once onboarding is complete.
  const ONBOARDING_STEPS = ['profilePhoto', 'skills', 'location', 'verificationId', 'skillVideo'];
  const isArtisanOnboarding =
    isAuthenticated &&
    user?.role === 'artisan' &&
    ONBOARDING_STEPS.includes(artisanStep);

  // Only fully verified artisans get the artisan job-management app.
  // Pending / rejected artisans stay in the customer app so the marketplace
  // home screen is never disrupted; their Profile tab shows the pending status.
  const isVerifiedArtisan =
    isAuthenticated && user?.role === 'artisan' && artisanStep === 'verified';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // ── Not logged in → Auth stack
          <Stack.Screen name="Auth">
            {() => <AuthNavigator onAuthSuccess={handleAuthSuccess} />}
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

        ) : isVerifiedArtisan ? (
          // ── Fully verified artisan → artisan job-management app
          <Stack.Screen name="ArtisanApp">
            {() => <ArtisanNavigator onLogout={handleLogout} onRefreshAuth={handleRefreshAuth} />}
          </Stack.Screen>

        ) : (
          // ── Customer, pending artisan, or rejected artisan → customer/marketplace app
          // Pending artisans see their status on the Profile tab; the Home screen
          // (marketplace) is never replaced or overridden.
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
