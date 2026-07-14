/**
 * Onboarding entry — redirects to step-1. Kept as its own file so
 * /onboarding is a valid route without needing query params.
 */
import { Redirect } from 'expo-router';

export default function OnboardingIndex() {
  return <Redirect href="/onboarding/step-1" />;
}
