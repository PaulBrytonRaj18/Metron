/**
 * Metron Design System & Color Palette
 * Sourced directly from brand.txt, color.txt, and uiux.txt
 */

export const Colors = {
  // Brand Accents
  primary: "#CD202C", // Flame Scarlet (Action, focus, countdowns)
  primaryLight: "#E03A3E", // Crimson Glow (Hover, highlights, active states)
  primaryDark: "#9E1520", // Deep Crimson (Pressed state)
  accent: "#FFFFF0", // Snow (Off-white accent)

  // Backgrounds & Surfaces
  background: "#0D0D0D", // Near Black (Deep Canvas)
  surface: "#181818", // Jet (Default Card Surface)
  surfaceElevated: "#222222", // Charcoal (Modals, Dropdowns, Float Cards)
  surfaceInput: "#262626", // Dark Slate (Form inputs, chips)
  border: "#2C2C2C", // Gunmetal (Subtle structural borders)
  borderFocused: "#CD202C",

  // Typography
  textPrimary: "#FFFFFF", // Pure White
  textSecondary: "#A3A3A3", // Muted Gray
  textTertiary: "#666666", // Dark Gray
  textAccent: "#FFFFF0", // Snow White

  // Semantic Status
  success: "#10B981", // Emerald (Completed, submitted)
  warning: "#F59E0B", // Amber (Approaching deadline, pending review)
  error: "#EF4444", // Red (Overdue, failure)
  info: "#3B82F6", // Blue (Instructional, informational)
};

export const Typography = {
  display: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  badge: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 9999,
};
