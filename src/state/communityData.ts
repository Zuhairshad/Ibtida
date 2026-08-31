import { colors } from '../theme/tokens';

export const COMMUNITY_GOALS = [
  { id: 0, name: '10 Million Durood', people: '18,421', ends: 'in 6 days', pct: 65, pctText: '64.8%', done: '6,483,291', total: '10,000,000' },
  { id: 1, name: 'Fajr together, 30 days', people: '9,117', ends: 'in 21 days', pct: 34, pctText: '33.5%', done: 'day 10', total: 'day 30' },
  { id: 2, name: 'A juz a day', people: '4,880', ends: 'in 12 days', pct: 52, pctText: '52%', done: '15', total: '30 juz' },
];

// Activity feed. Per §16's UX rule, entries describe contribution and
// milestones — never ranking, superiority or comparison between people.
export const FEED = [
  { initial: 'A', bg: colors.primaryTint, name: 'Aisha', action: 'completed morning adhkar', when: '12m', likes: 4 },
  { initial: 'M', bg: colors.successTint, name: 'Musa', action: 'contributed 500 durood to 10 Million Durood', when: '48m', likes: 11 },
  { initial: 'H', bg: colors.goldTint, name: 'Hafsa', action: 'read a juz in the Thursday Quran group', when: '2h', likes: 7 },
  { initial: 'Y', bg: colors.purpleTint, name: 'Yusuf', action: 'reached a 7 day prayer streak', when: '5h', likes: 9 },
  { initial: 'S', bg: colors.dangerTint, name: 'Sumayya', action: 'joined Fajr together, 30 days', when: '1d', likes: 3 },
];

export const LIVE_NOW = [
  { label: 'In dhikr', value: '3,412' },
  { label: 'Reading Quran', value: '1,908' },
  { label: 'In focus', value: '742' },
];

export const CIRCLES = [
  {
    name: 'Rahman family',
    members: 6,
    privacy: 'Invite only',
    goal: 'Fajr together this month',
    pct: 72,
    activity: 'Your father completed morning adhkar.',
    avatars: [
      { initial: 'A', bg: colors.bg },
      { initial: 'S', bg: colors.primaryTint },
      { initial: 'M', bg: colors.goldTint },
    ],
  },
  {
    name: 'Thursday Quran group',
    members: 14,
    privacy: 'Private',
    goal: 'One juz a week',
    pct: 45,
    activity: '9 members read today.',
    avatars: [
      { initial: 'H', bg: colors.goldTint },
      { initial: 'K', bg: colors.bg },
      { initial: 'Z', bg: colors.primaryTint },
    ],
  },
];
