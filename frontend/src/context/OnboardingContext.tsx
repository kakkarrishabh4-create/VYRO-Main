/**
 * VYRO — Onboarding state + target calculations.
 *
 * Holds partial answers across the 5-step flow and derives daily calorie /
 * macro targets on demand using Mifflin-St Jeor + activity multiplier +
 * goal adjustment. Kept intentionally local (no persistence between app
 * launches) — once the user hits "Looks good" the profile is POSTed to the
 * backend and this state is dropped.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';

export type Sex = 'male' | 'female';
export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft';
export type Goal = 'fat_loss' | 'muscle_gain' | 'recomposition' | 'general' | 'endurance';
export type JobActivity = 'desk' | 'active' | 'manual';
export type StressLevel = 'low' | 'moderate' | 'high';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'home' | 'gym' | 'none';

export interface OnboardingAnswers {
  // Step 1 — basic info
  name: string;
  age: string; // string while typing; parsed at summary
  sex: Sex | null;
  heightCm: string;
  weight: string;
  weightUnit: WeightUnit;
  // Step 2 — goal
  goal: Goal | null;
  // Step 3 — lifestyle
  jobActivity: JobActivity | null;
  sleepHours: number; // default 7
  stress: StressLevel | null;
  trainingDays: number; // default 3
  // Step 4 — training background
  experience: Experience | null;
  injuries: string;
  equipment: Equipment | null;
}

export interface Targets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  bmr: number;
  tdee: number;
}

const DEFAULT_ANSWERS: OnboardingAnswers = {
  name: '',
  age: '',
  sex: null,
  heightCm: '',
  weight: '',
  weightUnit: 'kg',
  goal: null,
  jobActivity: null,
  sleepHours: 7,
  stress: null,
  trainingDays: 3,
  experience: null,
  injuries: '',
  equipment: null,
};

interface OnboardingContextValue {
  answers: OnboardingAnswers;
  update: (patch: Partial<OnboardingAnswers>) => void;
  reset: () => void;
  computeTargets: () => Targets | null;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [answers, setAnswers] = useState<OnboardingAnswers>(DEFAULT_ANSWERS);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      answers,
      update: (patch) => setAnswers((prev) => ({ ...prev, ...patch })),
      reset: () => setAnswers(DEFAULT_ANSWERS),
      computeTargets: () => computeTargets(answers),
    }),
    [answers]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextValue => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  }
  return ctx;
};

// ---------- Calculation ----------

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  fat_loss: -0.2,
  muscle_gain: 0.1,
  recomposition: -0.05,
  general: 0,
  endurance: 0.05,
};

const GOAL_MACRO_SPLIT: Record<Goal, { p: number; c: number; f: number }> = {
  // percent of total calories: protein / carbs / fat
  fat_loss:      { p: 0.4, c: 0.3,  f: 0.3 },
  muscle_gain:   { p: 0.3, c: 0.45, f: 0.25 },
  recomposition: { p: 0.35, c: 0.4, f: 0.25 },
  general:       { p: 0.25, c: 0.5, f: 0.25 },
  endurance:     { p: 0.2, c: 0.6,  f: 0.2 },
};

const kcalPerG = { p: 4, c: 4, f: 9 };

export const computeTargets = (a: OnboardingAnswers): Targets | null => {
  const age = parseInt(a.age, 10);
  const heightCm = parseFloat(a.heightCm);
  const weightNum = parseFloat(a.weight);
  if (
    !a.sex ||
    !a.goal ||
    !a.jobActivity ||
    Number.isNaN(age) ||
    Number.isNaN(heightCm) ||
    Number.isNaN(weightNum) ||
    weightNum <= 0
  ) {
    return null;
  }

  const weightKg = a.weightUnit === 'kg' ? weightNum : weightNum / 2.20462;

  // Mifflin-St Jeor
  const bmr =
    a.sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  // Activity multiplier: base from job + boost from weekly training days.
  const jobBase = a.jobActivity === 'desk' ? 1.2 : a.jobActivity === 'active' ? 1.4 : 1.55;
  const trainingBoost = Math.min(a.trainingDays, 6) * 0.03; // up to +0.18
  const multiplier = jobBase + trainingBoost;
  const tdee = bmr * multiplier;

  const calories = Math.round(tdee * (1 + GOAL_ADJUSTMENT[a.goal]));

  const split = GOAL_MACRO_SPLIT[a.goal];
  const proteinG = Math.round((calories * split.p) / kcalPerG.p);
  const carbsG = Math.round((calories * split.c) / kcalPerG.c);
  const fatG = Math.round((calories * split.f) / kcalPerG.f);

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
};

export const GOAL_LABELS: Record<Goal, { title: string; desc: string }> = {
  fat_loss:      { title: 'Fat loss', desc: 'Sustained deficit, protect muscle.' },
  muscle_gain:   { title: 'Muscle gain', desc: 'Controlled surplus, structured lifting.' },
  recomposition: { title: 'Recomposition', desc: 'Slow lean-out while building.' },
  general:       { title: 'General fitness', desc: 'Feel strong, move well, eat honest.' },
  endurance:     { title: 'Endurance', desc: 'Fuel for distance, recover harder.' },
};
