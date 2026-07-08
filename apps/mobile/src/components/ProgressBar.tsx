import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/theme";

export function ProgressBar({
  progress,
  color = colors.primary,
  height = 10
}: {
  progress: number;
  color?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(progress, 1));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height }]}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    overflow: "hidden"
  },
  fill: {
    borderRadius: radius.full,
    height: "100%"
  }
});
