import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

export function SectionTitle({
  title,
  action,
  onAction
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action &&
        (onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
            <Text style={styles.action}>{action}</Text>
          </Pressable>
        ) : (
          <Text style={styles.action}>{action}</Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900"
  },
  action: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800"
  }
});
