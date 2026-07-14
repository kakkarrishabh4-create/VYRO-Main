/**
 * VYRO — Color Tokens
 *
 * The rules:
 * - `ink` is the primary dark background of the whole app.
 * - `bone` is the primary text on Ink AND the primary surface for cards on lighter contexts.
 * - `moss` is the ONLY primary-action color (buttons, active state, links).
 * - `brass` is celebration-only — streaks, PRs, milestones. Never for regular UI chrome.
 * - `slate` is muted/secondary text.
 * - No gradients, ever. Values here are literal.
 */

export const colors = {
  ink: '#17191B',
  inkSoft: '#22252A',
  bone: '#F6F4EF',
  boneSoft: '#ECE8DF',
  moss: '#3E5C46',
  mossMuted: '#2E4535',
  brass: '#B98B3E',
  slate: '#6B7280',

  // Hairlines — the only form of elevation we allow
  hairlineOnInk: '#2A2D31',
  hairlineOnBone: '#E4DFD3',

  // Thread (signature vertical journal line)
  threadOnInk: 'rgba(62,92,70,0.5)',
  threadOnBone: 'rgba(107,114,128,0.4)',

  // Transparency helpers
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
