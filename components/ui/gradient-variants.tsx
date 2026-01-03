'use client';

// Additional gradient and noise configurations for different themes

export const gradientVariants = {
  // Subtle monochrome (for main landing)
  monochrome: {
    gradient: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    accents: [
      'from-gray-200/20 via-gray-100/10 to-transparent',
      'from-slate-200/15 via-slate-100/8 to-transparent',
      'from-zinc-200/12 via-zinc-100/6 to-transparent',
    ],
    streak: 'from-transparent via-gray-200/20 to-transparent',
  },

  // Cool blue theme (for loading/processing)
  coolBlue: {
    gradient: 'bg-gradient-to-br from-blue-50 via-white to-slate-100',
    accents: [
      'from-blue-200/20 via-blue-100/10 to-transparent',
      'from-cyan-200/15 via-cyan-100/8 to-transparent',
      'from-slate-200/12 via-slate-100/6 to-transparent',
    ],
    streak: 'from-transparent via-blue-200/20 to-transparent',
  },

  // Warm success theme (for completed states)
  success: {
    gradient: 'bg-gradient-to-br from-green-50 via-white to-emerald-50',
    accents: [
      'from-green-200/20 via-green-100/10 to-transparent',
      'from-emerald-200/15 via-emerald-100/8 to-transparent',
      'from-teal-200/12 via-teal-100/6 to-transparent',
    ],
    streak: 'from-transparent via-green-200/20 to-transparent',
  },

  // Purple accent theme (for premium features)
  premium: {
    gradient: 'bg-gradient-to-br from-purple-50 via-white to-indigo-50',
    accents: [
      'from-purple-200/20 via-purple-100/10 to-transparent',
      'from-indigo-200/15 via-indigo-100/8 to-transparent',
      'from-violet-200/12 via-violet-100/6 to-transparent',
    ],
    streak: 'from-transparent via-purple-200/20 to-transparent',
  },
};

export const noiseSettings = {
  subtle: { opacity: 0.05, grainSize: 1 },
  medium: { opacity: 0.08, grainSize: 1.2 },
  strong: { opacity: 0.12, grainSize: 1.5 },
};

export type GradientVariant = keyof typeof gradientVariants;
export type NoiseStrength = keyof typeof noiseSettings;