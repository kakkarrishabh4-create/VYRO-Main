/**
 * VYRO — LineIcon
 *
 * Enforces the "simple, consistent line-icon set throughout" rule from the
 * design brief. Locks the icon family to Feather (line-only, uniform 1.5pt
 * stroke) so the rest of the app can't accidentally mix in filled, colored,
 * or clipart-style glyphs from other families.
 *
 * Usage:
 *   <LineIcon name="activity" size={20} tone="bone" />
 */

import Feather from '@expo/vector-icons/Feather';
import React from 'react';

import { ColorToken, colors } from '../theme';

// Restrict to Feather's icon keys — enforced at the type level.
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export interface LineIconProps {
  name: FeatherIconName;
  size?: number;
  tone?: ColorToken;
  testID?: string;
}

export const LineIcon: React.FC<LineIconProps> = ({
  name,
  size = 20,
  tone = 'bone',
  testID,
}) => {
  return <Feather name={name} size={size} color={colors[tone]} testID={testID} />;
};
