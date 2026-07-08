import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/theme";

type Variant = "primary" | "ghost" | "danger" | "success";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, { background: string; border: string; text: string }> = {
  primary: { background: colors.primary, border: colors.primary, text: colors.text },
  ghost: { background: colors.surface, border: colors.border, text: colors.text },
  danger: { background: colors.dangerSoft, border: colors.danger, text: colors.danger },
  success: { background: colors.success, border: colors.success, text: colors.background }
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  compact = false,
  style
}: ButtonProps) {
  const palette = variantStyles[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && styles.pressed,
        inactive && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        icon && <Ionicons name={icon} size={compact ? 16 : 20} color={palette.text} />
      )}
      <Text style={[styles.label, compact && styles.compactLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm
  },
  label: {
    fontSize: typography.body,
    fontWeight: "900"
  },
  compactLabel: {
    fontSize: typography.small
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  disabled: {
    opacity: 0.55
  }
});
