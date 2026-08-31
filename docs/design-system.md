# Ibadah Design System — v2 (blue reference)

This is the spec of record for the visual design shared 2026-08-31 (5-screen
Claude Design reference: Dashboard, Prayers, Adhkar, Tasbeeh, Community).
It **replaces** the warm/olive palette currently encoded in
`src/theme/tokens.ts`. Nothing in the app is rewired to this yet — this
document plus `src/theme/tokens.v2.ts` are the target to build toward, not a
change that's live. Any future design pass (by me or by Claude Design) must
match this doc rather than re-derive the palette from scratch.

Values below are read off the reference screenshot by eye (no Figma/asset
export was provided), so treat exact hex values as "close enough to build
with," not pixel-certified. Flag anything that looks off once it's on a real
device/simulator and we'll correct the token, not the component.

## 1. Color

### Surfaces
| Token | Value | Use |
|---|---|---|
| `bg` | `#F6F7FB` | Page/screen background (very light cool gray-blue) |
| `card` | `#FFFFFF` | All card surfaces |
| `cardBorder` | `rgba(17,24,39,0.06)` | Hairline card borders |
| `cardShadow` | `rgba(17,24,39,0.08)` | Soft drop shadow under cards |
| `divider` | `rgba(17,24,39,0.08)` | List row separators |

### Ink
| Token | Value | Use |
|---|---|---|
| `ink` | `#111827` | Primary text, big numerals |
| `inkSecondary` | `#6B7280` | Secondary/supporting text |
| `inkMuted` | `#9CA3AF` | Placeholder/faint labels, timestamps |
| `inkOnPrimary` | `#FFFFFF` | Text/icons on filled primary buttons |

### Primary (blue)
| Token | Value | Use |
|---|---|---|
| `primary` | `#3B82F6` | Buttons, active tab, links, progress rings |
| `primaryStrong` | `#2563EB` | Pressed state, small-text-on-white AA contrast |
| `primaryTint` | `#EAF2FE` | Light fill behind blue icons/badges |

### Success (green) — used for "current/active" state, streaks, completed items, positive stats
| Token | Value |
|---|---|
| `success` | `#22C55E` |
| `successStrong` | `#16A34A` |
| `successTint` | `#E7F8ED` |

### Gold/amber — Gratitude category, warm accents, lantern illustration
| Token | Value |
|---|---|
| `gold` | `#F59E0B` |
| `goldTint` | `#FEF3E0` |

### Purple — Forgiveness category, "Making Dua" stat
| Token | Value |
|---|---|
| `purple` | `#8B5CF6` |
| `purpleTint` | `#F1EBFE` |

### Danger — not present in the reference; kept consistent with the rest of the system for destructive actions elsewhere in the app
| Token | Value |
|---|---|
| `danger` | `#EF4444` |
| `dangerTint` | `#FDECEC` |

### Prayer semantic colors
Same six-prayer concept as today's `tokens.ts`, recolored to the new palette.
Asr in the reference is shown in **green** because it's the *current* prayer,
not because Asr itself has a fixed green identity — the "current prayer"
state always renders in `success` green regardless of which prayer it is;
the colors below are each prayer's resting/default identity color.

| Prayer | ink | tint |
|---|---|---|
| Fajr | `#3B82F6` | `#EAF2FE` |
| Sunrise | `#F59E0B` | `#FEF3E0` |
| Dhuhr | `#EA580C` | `#FDECDC` |
| Asr | `#22C55E` | `#E7F8ED` |
| Maghrib | `#DC5F41` | `#FBE4DE` |
| Isha | `#1E3A5F` | `#DCE4EE` |

**Current prayer** (whichever one is active right now) always overrides its
resting color with `success` green + `successTint`, matching the reference's
Asr row/tile treatment. **Completed** prayers show a filled `primary` blue
checkmark. **Upcoming** prayers show a gray dash — not tappable (this is the
same rule as the real-time-calculation fix already shipped; the design
system just documents the visual states that rule drives).

## 2. Typography

System font (SF Pro on iOS / Roboto on Android — no custom typeface in the
reference). Numerals lean bold/tight; body copy is regular weight.

| Token | Size | Weight | Use |
|---|---|---|---|
| `display` | 28 | 700 | Big stat numerals (e.g. "2,847,391", "6,483,291") |
| `h1` | 22 | 700 | Screen titles ("Prayers", "Community") |
| `h2` | 18 | 700 | Card titles ("Today's Community Dhikr") |
| `h3` | 16 | 600 | List-row primary text ("Evening Adhkar") |
| `body` | 15 | 400 | Body copy |
| `bodyStrong` | 15 | 600 | Emphasized body copy |
| `caption` | 13 | 400 | Timestamps, helper text |
| `captionStrong` | 13 | 600 | Small labels ("Now" pill, "+18,421 today") |
| `numeral` | 22 | 700 | Mid-size numerals (countdown "23:56") |

## 3. Spacing

8px base rhythm, matching the reference's card padding and row gaps.

| Token | Value |
|---|---|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `standard` | 16 |
| `lg` | 20 |
| `xl` | 24 |
| `xxl` | 32 |

## 4. Radii

| Token | Value | Use |
|---|---|---|
| `control` | 10 | Small buttons, chips |
| `button` | 14 | Primary/secondary buttons |
| `card` | 20 | Standard cards |
| `cardLarge` | 24 | Hero cards (quote card, community goal card) |
| `pill` | 999 | Tab pills, badges, "Now"/"Start" pills |

## 5. Shadow

| Token | Values |
|---|---|
| `card` | `color #111827, opacity 0.06, radius 8, offset (0,2), elevation 2` |
| `floating` | `color #111827, opacity 0.10, radius 16, offset (0,6), elevation 6` |

## 6. Component patterns observed in the reference

- **Cards**: white, `radii.card`, `shadow.card`, 16–20px internal padding, no
  visible border except a near-invisible hairline (`cardBorder`).
- **Primary button**: filled `primary` blue, white text, `radii.button`,
  full-width or content-width depending on context ("Start Dhikr", "Join
  This Goal").
- **Secondary/pill button**: white fill, `cardBorder` outline, `ink` text,
  `radii.pill` ("Change Dhikr").
- **Icon badges**: circular or rounded-square, tint-colored background
  (`{color}Tint`) behind a solid-colored icon — used for adhkar
  categories, "Live Right Now" stats, and the bottom feature-highlight row.
- **Progress rings/bars**: `primary` blue for neutral progress (Today's
  Progress ring, countdown ring), `success` green for goal/community
  progress bars (community goal 64.8%, streak checkmarks).
- **Tab bar**: 5 items, active = `primary` icon + `primary` label text,
  inactive = `ink`/gray icon + `ink` label, icons are simple line/filled
  glyphs (home, moon-mosque, heart-hands, people, person).
- **Segmented control** (Adhkar/Tasbeeh toggle, Community sub-tabs): pill
  track, active segment filled `primary` blue with white text, inactive
  segment transparent with `inkSecondary` text.
- **Avatar stacks**: overlapping circular avatars with white border, "+N"
  overflow badge in a muted gray pill.
- **Streak row**: 7 circular day-dots, completed = filled `success` green
  with white check, future/missed = light gray outline.

## 7. Illustration guidance

The reference uses mosque dome/minaret art in two places: a small translucent
duotone motif behind hero cards (quote card, Prayers header), and a larger,
more literal mosque scene in a marketing/onboarding banner at the bottom.
Sourcing licensed photography for the latter is unnecessary risk and slower
than it's worth — **standardize on flat, single-purpose vector illustration**
instead of photos everywhere:

- **Decorative hero motif** (behind quote card, screen headers): a simple
  duotone SVG silhouette — dome + minaret outline — rendered in `primary`
  blue at low opacity (~8–12%) over `primaryTint`/`bg`. Cheap to draw as a
  flat SVG, scales perfectly, no licensing surface.
- **Marketing/onboarding banner**: same silhouette motif, larger and at
  higher opacity, optionally layered with a soft gradient (`primaryTint` →
  `primary` at low alpha) instead of a photographic sky/skyline. Keeps the
  whole app in one consistent illustration language rather than mixing
  vector icons with stock photography.
- **Category/feature icons**: keep using a line-icon set (already the
  pattern in the reference — home, mosque, heart-hands, people, book,
  shield, heart, praying-hands) on tint-colored circular/rounded-square
  badges per §6. Any consistent icon set (Phosphor, Heroicons, Lucide) works
  as long as stroke weight and corner rounding stay uniform across the app —
  don't mix icon sets.

## 8. What this doc does *not* cover yet

- Dark mode — the reference is light-only; no dark palette has been derived.
- Empty/error/loading states — none appear in the reference screens.
- Accessibility contrast audit of every token pair (spot-checked `primary`
  on white and `ink` on `bg` only; re-verify before shipping).
