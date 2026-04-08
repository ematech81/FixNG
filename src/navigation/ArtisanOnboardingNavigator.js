import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Step1_ProfilePhoto from '../screens/artisan/onboarding/Step1_ProfilePhoto';
import Step2_Skills from '../screens/artisan/onboarding/Step2_Skills';
import Step3_Location from '../screens/artisan/onboarding/Step3_Location';
import Step4_VerificationID from '../screens/artisan/onboarding/Step4_VerificationID';
import Step5_SkillVideo from '../screens/artisan/onboarding/Step5_SkillVideo';
import PendingVerification from '../screens/artisan/onboarding/PendingVerification';

const Stack = createStackNavigator();

export default function ArtisanOnboardingNavigator({ initialStep }) {
  // initialStep lets us resume where the artisan left off
  const getInitialRoute = () => {
    switch (initialStep) {
      case 'skills': return 'Step2_Skills';
      case 'location': return 'Step3_Location';
      case 'verificationId': return 'Step4_VerificationID';
      case 'skillVideo': return 'Step5_SkillVideo';
      case 'pending': return 'PendingVerification';
      default: return 'Step1_ProfilePhoto';
    }
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // prevent swipe-back during onboarding
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="Step1_ProfilePhoto" component={Step1_ProfilePhoto} />
      <Stack.Screen name="Step2_Skills" component={Step2_Skills} />
      <Stack.Screen name="Step3_Location" component={Step3_Location} />
      <Stack.Screen name="Step4_VerificationID" component={Step4_VerificationID} />
      <Stack.Screen name="Step5_SkillVideo" component={Step5_SkillVideo} />
      <Stack.Screen name="PendingVerification" component={PendingVerification} />
    </Stack.Navigator>
  );
}
