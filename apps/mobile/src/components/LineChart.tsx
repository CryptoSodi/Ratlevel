import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { colors, spacing, typography } from "@/theme";

interface LineChartProps {
  points: number[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
}

export function LineChart({
  points,
  height = 140,
  color = colors.primary,
  formatValue = (value) => `${value}`
}: LineChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Log at least two entries to see your trend.</Text>
      </View>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padY = 14;
  const chartHeight = height - padY * 2;

  const coords = points.map((value, index) => ({
    x: (index / (points.length - 1)) * width,
    y: padY + chartHeight - ((value - min) / range) * chartHeight
  }));

  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = coords[coords.length - 1];

  return (
    <View onLayout={onLayout} accessibilityLabel={`Trend chart, latest ${formatValue(points[points.length - 1])}`}>
      <View style={styles.labels}>
        <Text style={styles.label}>{formatValue(max)}</Text>
        <Text style={styles.label}>{formatValue(min)}</Text>
      </View>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.28" />
              <Stop offset="1" stopColor={color} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#chartFill)" />
          <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={last.x} cy={last.y} r={5} fill={color} stroke={colors.background} strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    justifyContent: "space-between",
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700"
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    textAlign: "center"
  }
});
