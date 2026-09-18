// Artisan Marketplace Design Tokens
// Kala Udyam — Warm cream + deep forest green minimalist palette

export const Colors = {
  // Primary craft palette — Kala Udyam deep forest green
  primary: '#2D5016',           // deep forest green — CTAs, active states, icons
  primaryLight: '#E8F0EB',      // light sage tint — selected row bg, chip backgrounds
  primaryDark: '#1E380F',       // pressed / darker green states
  primarySoft: '#D6E8D8',       // very light green — banner, soft fills
  secondary: '#3A6B20',         // mid leaf green — secondary accents

  // Accent — for regional greeting text (வணக்கம்!)
  greetingRed: '#C0392B',       // warm red for Tamil/Hindi greeting
  gold: '#D4A017',              // AI Suggested badges
  goldLight: '#FFF3CD',         // gold badge background

  // Backgrounds — Kala Udyam warm cream palette
  background: '#F5F0E8',        // warm cream — main app background
  surface: '#FFFFFF',           // white cards on cream
  surfaceCard: '#FFFFFF',       // product card bg
  surfaceGray: '#F0EEEA',       // subtle input/placeholder bg
  surfaceWarm: '#EDE8DF',       // slightly darker cream — stats bg
  surfaceMuted: '#EBEBEB',      // Help card, grey toned cards

  // Quick action card backgrounds
  myProductsBg: '#F5EDE0',      // warm beige — My Products card
  helpBg: '#EBEBEB',            // grey — Help card

  // Text
  textPrimary: '#1A1A1A',       // headings — near-black
  textDark: '#2B2118',          // body text
  textSecondary: '#6B7280',     // subtitles, secondary
  textMuted: '#9CA3AF',         // muted / placeholder
  textLight: '#B0B0B0',         // very light text
  textWarm: '#2B2118',          // backward compat alias

  // Border
  border: '#E0D9CE',            // standard dividers (warm tone)
  borderLight: '#EDE8DF',       // subtle dividers
  borderWarm: '#E0D9CE',        // backward compat alias

  // Backward compatibility aliases mapped to new green theme
  terracotta: '#2D5016',
  terracottaDark: '#1E380F',
  terracottaLight: '#E8F0EB',
  clay: '#E8F0EB',

  // Status chips
  statusActive: '#2D5016',
  statusActiveBg: '#D6E8D8',
  statusPending: '#F59E0B',
  statusPendingBg: '#FEF3C7',
  statusProcessing: '#3B82F6',
  statusProcessingBg: '#DBEAFE',
  statusCompleted: '#10B981',
  statusCompletedBg: '#D1FAE5',
  statusDraft: '#9CA3AF',
  statusDraftBg: '#F3F4F6',

  // Functional
  error: '#EF4444',
  errorBg: '#FEE2E2',
  success: '#2D5016',
  successBg: '#D6E8D8',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',

  // Nav — Kala Udyam bottom nav (white bar, green active)
  navActive: '#2D5016',         // active icon/text
  navInactive: '#9CA3AF',       // inactive icons
  navBar: '#FFFFFF',            // nav background
};

// Font family names must match the exact identifiers from @expo-google-fonts
export const Fonts = {
  heading: 'Poppins_600SemiBold',     // matches Poppins_600SemiBold export
  headingBold: 'Poppins_700Bold',     // matches Poppins_700Bold export
  body: 'Inter_400Regular',           // matches Inter_400Regular export
  bodyMedium: 'Inter_500Medium',      // matches Inter_500Medium export
  bodyBold: 'Inter_700Bold',          // matches Inter_700Bold export
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,         // fully-rounded pills
  full: 999,
  circle: 9999,
};

export const Shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  hero: {
    shadowColor: '#2D5016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  nav: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const NAV_HEIGHT = 72;
export const HEADER_HEIGHT = 56;
export const MIN_TOUCH_TARGET = 48;
