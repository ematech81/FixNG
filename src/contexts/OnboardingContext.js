import React, { createContext, useContext } from 'react';

/**
 * Shared context for all artisan onboarding screens.
 * Provides callbacks that need to bubble up to the root navigator
 * without prop-drilling through each screen.
 */
const OnboardingContext = createContext({
  onCancelRegistration: null, // abort registration → revert to customer
  onGoToDashboard: null,      // onboarding done → navigate to artisan dashboard
});

export default OnboardingContext;
export const useOnboarding = () => useContext(OnboardingContext);
