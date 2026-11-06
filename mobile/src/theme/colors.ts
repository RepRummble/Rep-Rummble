// Reprummble mobile design tokens: a deep navy and black night theme with an ocean-blue brand,
// blood-red and orange for energy. (The names stay the same as before, so every screen picks the
// new look up from here.)
export const colors = {
  // Surfaces (dark, from black-navy up to lighter navy)
  bg:          '#050a14', // screen background
  surface:     '#0c1730', // cards, sheets, inputs
  surfaceAlt:  '#14264b', // quiet fills inside a card
  border:      '#1f3560', // card borders, dividers
  borderStrong:'#2f4d85', // inputs, outlined buttons

  // Text
  ink:    '#f3f7ff', // headings, primary text
  inkSoft:'#cfdaf0', // body text
  muted:  '#8fa4c9', // secondary text, labels
  faint:  '#6179a3', // placeholders, disabled

  // Brand: ocean blue
  brand:       '#1f6fff', // primary: buttons, links, active tab
  brandHover:  '#1558d6',
  brandBright: '#4da3ff', // highlights, progress ends
  brandSoft:   '#1f6fff2b', // tinted backgrounds
  tealMid:     '#0b3d91', // hero gradient end (deep ocean)
  tealDeep:    '#061d4a',

  // Energy: orange and blood red
  accent:     '#ff7a1a', // streaks, fire, energy
  accentSoft: '#ff7a1a2b',
  violet:     '#7a8cff',
  violetSoft: '#7a8cff2b',

  // Status
  success:     '#1ec98a',
  successSoft:'#1ec98a2b',
  warning:    '#ffa62b',
  warningSoft:'#ffa62b2b',
  danger:     '#d62839', // blood red
  dangerSoft: '#d628392e',
  info:       '#38bdf8',
  infoSoft:   '#38bdf82b',

  white: '#ffffff',
  black: '#000000',

  // Leaderboard medals
  gold:   '#f5b301',
  silver: '#a9b6cf',
  bronze: '#d08a4a',
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 } as const;

/** Soft card shadow. Spread into a style. */
export const shadow = {
  card: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  lift: { shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
} as const;

/** The ocean-blue hero gradient used on headers. */
export const heroGradient = ['#1f6fff', '#061d4a'] as const;
