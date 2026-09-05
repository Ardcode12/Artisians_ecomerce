// Artisan Marketplace Design Tokens
// Blends warm craft palette (spec) with Figma kit monochrome structure

export const Colors = {
  // Primary craft palette
  primary: '#B5502F',        // terracotta / clay — CTA buttons, highlights
  primaryDark: '#8A3D22',    // pressed states, headers
  secondary: '#2F6B4F',      // deep leaf green — success, published
  gold: '#D4A017',           // AI Suggested badges, bulk request accents
  goldLight: '#FFF3CD',      // gold badge background

  // Backgrounds
  background: '#FDF8F3',     // warm off-white — main bg
  surface: '#FFFFFF',        // cards
  surfaceGray: '#F0F0F0',   // search bar, image placeholders (Figma)
  surfaceWarm: '#FFF3E9',    // stat card warm bg

  // Text
  textPrimary: '#0D0D0D',    // headings — near-black (Figma ink)
  textWarm: '#2B2118',       // body text — warm near-black
  textSecondary: '#8E8E93',  // subtitles, secondary (Figma muted)
  textTertiary: '#746558',   // warm muted

  // Border
  border: '#E8DCC8',         // warm dividers
  borderLight: '#F0EDE8',

  // Status chips
  statusPublished: '#2F6B4F',
  statusDraft: '#E8DCC8',
  statusDraftText: '#746558',
  statusInquiry: '#D4A017',
  statusSold: '#1B4535',

  // Functional
  error: '#C13D3D',
  success: '#2F6B4F',
  ratingGold: '#FFC107',     // stars only
  badgeRed: '#E53E3E',       // cart badge only

  // Figma nav
  navActive: '#0D0D0D',      // black capsule active
  navInactive: '#8E8E93',    // inactive icons
  navBar: '#FFFFFF',         // floating pill nav background
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
  pill: 999,         // Figma fully-rounded pills
  circle: 9999,
};

export const Shadow = {
  card: {
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  hero: {
    shadowColor: '#B5502F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  nav: {
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
};

export const NAV_HEIGHT = 80;
export const HEADER_HEIGHT = 64;
export const MIN_TOUCH_TARGET = 56;
