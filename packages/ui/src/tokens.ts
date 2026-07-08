/**
 * RatLevel design tokens (see /brand.md). Platform-agnostic: the mobile app
 * layers React Native specifics (shadows) on top, the gym portal will map
 * these to CSS variables.
 */
export const colors = {
  background: "#0D1117",
  surface: "#161B22",
  surfaceElevated: "#1C2430",
  surfaceSoft: "#30363D",
  primary: "#2F80FF",
  primarySoft: "rgba(47, 128, 255, 0.16)",
  success: "#22C55E",
  successSoft: "rgba(34, 197, 94, 0.16)",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.16)",
  danger: "#EF4444",
  dangerSoft: "rgba(239, 68, 68, 0.16)",
  xp: "#8B5CF6",
  xpSoft: "rgba(139, 92, 246, 0.16)",
  text: "#F8FAFC",
  textMuted: "#B6C2D1",
  border: "#30363D"
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
} as const;

export const radius = {
  sm: 12,
  lg: 18,
  xl: 24,
  full: 999
} as const;

export const typography = {
  caption: 12,
  small: 13,
  body: 15,
  heading: 20,
  display: 29
} as const;

export const rankTierColors: Record<string, string> = {
  Bronze: "#CD7F32",
  Silver: "#B6C2D1",
  Gold: "#F59E0B",
  Platinum: "#67E8F9",
  Diamond: "#8B5CF6",
  Mythic: "#F43F5E"
};
