import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors, typography } from "@/theme";

const size = 104;
const stroke = 10;
const radius = (size - stroke) / 2;
const circumference = 2 * Math.PI * radius;

export function ProgressRing({ progress, label }: { progress: number; label: string }) {
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const offset = circumference - clampedProgress * circumference;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} accessibilityLabel={`${Math.round(clampedProgress * 100)} percent progress`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surfaceSoft} strokeWidth={stroke} fill="transparent" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: size,
    justifyContent: "center",
    width: size
  },
  center: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  label: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  }
});
