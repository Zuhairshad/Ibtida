// Design tokens ported from Claude Design handoff `Ibadah v5.dc.html`.
// Every screen must consume these — no one-off hex values in component files.

export const colors = {
  // Surfaces
  bg: '#FFFFFF',
  bgTint: '#F1F3EE',
  bgWash: '#F8F7F3',
  card: '#FFFFFF',
  cardBorder: 'rgba(23,32,28,0.06)',
  cardBorderStrong: 'rgba(23,32,28,0.15)',
  cardShadow: 'rgba(27,36,48,0.06)',

  // Ink
  ink: '#1B2430',
  inkStrong: '#16323E',
  inkSecondary: '#697382',
  inkMuted: '#68716C',
  inkFaint: '#6E7671',
  inkOnDark: '#EFF3F0',

  // Primary
  primary: '#2A63B8', // AA-safe ink/fill for small text & CTAs
  primaryFill: '#3B7DDE', // large fills, rings, bars only
  primaryTint: '#DDEAF4',
  primaryHover: '#2F68C0',

  // Success
  success: '#5EAA78',
  successStrong: '#4CA96B',
  successText: '#2F8552',
  successTint: '#E3F3EA',
  successTintStrong: '#EDF7F0',

  // Gold / champagne — illustration & decorative accents only, never functional UI chrome
  gold: '#D9BE86',
  goldTint: '#F3E7C9',
  goldInk: '#7A5F1E',
  goldInkDeep: '#6B5A38',

  // Destructive
  danger: '#C96B6B',
  dangerInk: '#A24E4E',

  // Prayer / category semantic colors (from PRAYER_TIMES)
  fajr: { ink: '#4A7FC1', tint: '#DDEAF4' },
  sunrise: { ink: '#C9902E', tint: '#FBF2DC' },
  dhuhr: { ink: '#D9822E', tint: '#FBEBDA' },
  asr: { ink: '#5EAA78', tint: '#E3F3EA' },
  maghrib: { ink: '#C0563F', tint: '#F7DEDE' },
  isha: { ink: '#2F4B6E', tint: '#DCE3EC' },

  divider: 'rgba(23,32,28,0.07)',
} as const;

export const spacing = {
  micro: 4,
  tight: 8,
  small: 12,
  standard: 16,
  comfortable: 20,
  section: 24,
  large: 32,
  major: 40,
} as const;

export const radii = {
  control: 12,
  button: 16,
  card: 22,
  cardLarge: 26,
  hero: 30,
  pill: 999,
} as const;

export const type = {
  displayLarge: { fontSize: 34, fontWeight: '600' as const, letterSpacing: -0.03 },
  display: { fontSize: 27, fontWeight: '600' as const, letterSpacing: -0.025 },
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.025 },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.02 },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.01 },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  secondary: { fontSize: 14, fontWeight: '400' as const },
  secondaryStrong: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12.5, fontWeight: '400' as const },
  captionStrong: { fontSize: 12.5, fontWeight: '600' as const },
  numeral: { fontSize: 27, fontWeight: '700' as const, letterSpacing: -0.03 },
  numeralLarge: { fontSize: 46, fontWeight: '600' as const, letterSpacing: -0.03 },
} as const;

export const arabicFont = 'NotoNaskhArabic_500Medium';

export const shadow = {
  card: {
    shadowColor: '#1B2430',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#1B2430',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;
