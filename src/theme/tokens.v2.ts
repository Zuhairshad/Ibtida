// Design tokens for the blue reference design shared 2026-08-31 (5-screen
// Claude Design handoff: Dashboard, Prayers, Adhkar, Tasbeeh, Community).
// Full rationale and component-pattern notes live in `docs/design-system.md`
// — read that alongside this file.
//
// THIS IS NOT WIRED UP YET. `src/theme/tokens.ts` (the current warm/olive
// palette) is still what every screen actually imports and renders with.
// This file exists so the new palette has one place to live and iterate on
// before any screen is repointed at it. When we do apply it, the intent is
// to replace the contents of `tokens.ts` with (an evolved version of) this
// file, not to have both files live long-term.

export const colors = {
  // Surfaces
  bg: '#F6F7FB',
  card: '#FFFFFF',
  cardBorder: 'rgba(17,24,39,0.06)',
  cardShadow: 'rgba(17,24,39,0.08)',
  divider: 'rgba(17,24,39,0.08)',

  // Ink
  ink: '#111827',
  inkSecondary: '#6B7280',
  inkMuted: '#9CA3AF',
  inkOnPrimary: '#FFFFFF',

  // Primary
  primary: '#3B82F6',
  primaryStrong: '#2563EB',
  primaryTint: '#EAF2FE',

  // Success (also the "current prayer" / active-state color)
  success: '#22C55E',
  successStrong: '#16A34A',
  successTint: '#E7F8ED',

  // Gold — Gratitude category, warm accents
  gold: '#F59E0B',
  goldTint: '#FEF3E0',

  // Purple — Forgiveness category, "Making Dua" stat
  purple: '#8B5CF6',
  purpleTint: '#F1EBFE',

  // Danger — not present in the reference; kept consistent with the rest
  // of the system for destructive actions elsewhere in the app
  danger: '#EF4444',
  dangerTint: '#FDECEC',

  // Prayer semantic colors — each prayer's resting/default identity color.
  // The *current* prayer always overrides to `success`/`successTint`
  // regardless of which prayer it is (see docs/design-system.md §1).
  fajr: { ink: '#3B82F6', tint: '#EAF2FE' },
  sunrise: { ink: '#F59E0B', tint: '#FEF3E0' },
  dhuhr: { ink: '#EA580C', tint: '#FDECDC' },
  asr: { ink: '#22C55E', tint: '#E7F8ED' },
  maghrib: { ink: '#DC5F41', tint: '#FBE4DE' },
  isha: { ink: '#1E3A5F', tint: '#DCE4EE' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  standard: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  control: 10,
  button: 14,
  card: 20,
  cardLarge: 24,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 28, fontWeight: '700' as const },
  h1: { fontSize: 22, fontWeight: '700' as const },
  h2: { fontSize: 18, fontWeight: '700' as const },
  h3: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  captionStrong: { fontSize: 13, fontWeight: '600' as const },
  numeral: { fontSize: 22, fontWeight: '700' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
