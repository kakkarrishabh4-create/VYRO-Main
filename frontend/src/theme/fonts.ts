/**
 * VYRO — expo-font source map.
 * Loaded once in the root layout so every screen inherits the theme.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const fontAssets = {
  'Fraunces-Regular': require('../../assets/fonts/Fraunces-Regular.ttf'),
  'Fraunces-Italic': require('../../assets/fonts/Fraunces-Italic.ttf'),

  'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('../../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),

  'IBMPlexMono-Regular': require('../../assets/fonts/IBMPlexMono-Regular.ttf'),
  'IBMPlexMono-Medium': require('../../assets/fonts/IBMPlexMono-Medium.ttf'),
  'IBMPlexMono-SemiBold': require('../../assets/fonts/IBMPlexMono-SemiBold.ttf'),
} as const;
