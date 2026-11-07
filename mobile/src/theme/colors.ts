// Reprummble mobile design tokens: a deep navy and black night sky with a red-orange brand (the same as the website),
// ocean blue and blood red as supporting colours. (The names stay the same as before, so every screen picks the
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

  // Brand: red-orange, like the website's buttons and highlights
  brand:       '#ff5a36', // primary: buttons, links, active tab
  brandHover:  '#e0451f',
  brandBright: '#ff9a4d', // highlights, progress ends
  brandSoft:   '#ff5a362b', // tinted backgrounds
  tealMid:     '#8f1d2a', // gradient end (deep red; the old name is kept so every screen picks it up)
  tealDeep:    '#3a0b16',

  // Energy: orange and blood red
  accent:     '#ff7a1a', // streaks, fire, energy
  accentSoft: '#ff7a1a2b',
  violet:     '#4da3ff',
  violetSoft: '#4da3ff2b',

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

/** The deep-red hero gradient used on headers. */
export const heroGradient = ['#c4263a', '#3a0b16'] as const;
