// Reprummble design tokens. These mirror the website (web/src/styles/site.css) so the app and
// the site look like one product: white cards on a soft grey page, teal brand, orange accent.
export const colors = {
  // Surfaces
  bg:          '#f6f8f9', // screen background
  surface:     '#ffffff', // cards, sheets, inputs
  surfaceAlt:  '#edf1f3', // quiet fills inside a card
  border:      '#e4e8ec', // card borders, dividers
  borderStrong:'#d0d5dd', // inputs, outlined buttons

  // Text
  ink:    '#0b1220', // headings, primary text
  inkSoft:'#344054', // body text
  muted:  '#667085', // secondary text, labels
  faint:  '#8792a2', // placeholders, disabled

  // Brand
  brand:       '#0f766e', // primary: buttons, links, active tab
  brandHover:  '#0b5f58',
  brandBright: '#14b8a6', // highlights, progress ends
  brandSoft:   '#e7f6f3', // tinted backgrounds
  tealMid:     '#115e59', // hero gradient end
  tealDeep:    '#134e4a',

  accent:     '#f97316', // streaks, fire, energy
  accentSoft: '#fff1e7',
  violet:     '#6d5bd0',
  violetSoft: '#f0edfc',

  // Status
  success:     '#12b76a',
  successSoft: '#ecfdf3',
  warning:     '#f79009',
  warningSoft: '#fffaeb',
  danger:      '#d92d20',
  dangerSoft:  '#fef3f2',
  info:        '#2e90fa',
  infoSoft:    '#eff8ff',

  white: '#ffffff',
  black: '#000000',

  // Leaderboard medals
  gold:   '#f5b301',
  silver: '#98a2b3',
  bronze: '#c2793a',
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 } as const;

/** Soft card shadow, like the website's cards. Spread into a style. */
export const shadow = {
  card: { shadowColor: '#101828', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  lift: { shadowColor: '#101828', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
} as const;

/** The teal hero gradient used on the website's headers. */
export const heroGradient = ['#0f766e', '#134e4a'] as const;
