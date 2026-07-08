import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/theme";

export function AppLoadingState() {
  return (
    <View style={styles.stack} accessibilityRole="progressbar" accessibilityLabel="Loading RatLevel dashboard">
      <View style={[styles.skeleton, styles.heroSkeleton]} />
      <View style={styles.row}>
        <View style={styles.skeleton} />
        <View style={styles.skeleton} />
        <View style={styles.skeleton} />
      </View>
      <View style={[styles.skeleton, styles.cardSkeleton]} />
      <View style={[styles.skeleton, styles.cardSkeleton]} />
    </View>
  );
}

export function AppErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.stateCard}>
      <Ionicons name="warning" size={30} color={colors.danger} />
      <Text style={styles.title}>Could not load your character</Text>
      <Text style={styles.body}>This is usually a network hiccup. Try again and keep the streak alive.</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <View style={styles.stateCard}>
      <Ionicons name="sparkles" size={30} color={colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  skeleton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    height: 72,
    opacity: 0.72
  },
  heroSkeleton: {
    flex: 0,
    height: 278
  },
  cardSkeleton: {
    flex: 0,
    height: 96
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    justifyContent: "center",
    minHeight: 280,
    padding: spacing.xl
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    textAlign: "center"
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.xl
  },
  buttonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.78
  }
});
