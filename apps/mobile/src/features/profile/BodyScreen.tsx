import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LineChart } from "@/components/LineChart";
import { SectionTitle } from "@/components/SectionTitle";
import { displayToKg, formatDate, formatWeight, kgToDisplay, weightUnit } from "@/lib/format";
import { useAppStore, useSession } from "@/state/AppStore";
import { colors, radius, spacing, typography } from "@/theme";

export function BodyScreen() {
  const session = useSession();
  const { addBodyMetric } = useAppStore();
  const { bodyMetrics, settings } = session;
  const units = settings.units;

  const [weightText, setWeightText] = useState("");
  const [chestText, setChestText] = useState("");
  const [waistText, setWaistText] = useState("");
  const [armText, setArmText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const latest = bodyMetrics[bodyMetrics.length - 1];

  const save = async () => {
    const weight = Number(weightText);
    if (!weightText.trim() || Number.isNaN(weight) || weight <= 0) {
      setError(`Enter your weight in ${weightUnit(units)}.`);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const optional = (text: string) => {
        const value = Number(text);
        return text.trim() && !Number.isNaN(value) && value > 0 ? value : undefined;
      };
      await addBodyMetric({
        recordedAt: new Date().toISOString(),
        weightKg: displayToKg(weight, units),
        chestCm: optional(chestText),
        waistCm: optional(waistText),
        armCm: optional(armText)
      });
      setWeightText("");
      setChestText("");
      setWaistText("");
      setArmText("");
      setSaved(true);
    } catch {
      setError("Could not save the entry. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text style={styles.bigValue}>
              {latest ? formatWeight(latest.weightKg, units) : "—"}
            </Text>
            <Text style={styles.muted}>
              {latest ? `Last logged ${formatDate(latest.recordedAt)}` : "No entries yet"}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="scale-bathroom" size={24} color={colors.primary} />
          </View>
        </View>
        <LineChart
          points={bodyMetrics.map((entry) => kgToDisplay(entry.weightKg, units))}
          formatValue={(value) => `${value}`}
        />
      </Card>

      <SectionTitle title="New entry" action={`Weight in ${weightUnit(units)}`} />
      <Card>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Weight ({weightUnit(units)}) *</Text>
            <TextInput
              accessibilityLabel={`Weight in ${weightUnit(units)}`}
              value={weightText}
              onChangeText={setWeightText}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Chest (cm)</Text>
            <TextInput
              accessibilityLabel="Chest in centimeters"
              value={chestText}
              onChangeText={setChestText}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Waist (cm)</Text>
            <TextInput
              accessibilityLabel="Waist in centimeters"
              value={waistText}
              onChangeText={setWaistText}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Arm (cm)</Text>
            <TextInput
              accessibilityLabel="Arm in centimeters"
              value={armText}
              onChangeText={setArmText}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {saved && <Text style={styles.savedText}>Entry saved. Consistency pays off.</Text>}
        <Button label="Save entry" icon="checkmark" loading={saving} onPress={() => void save()} />
      </Card>

      <SectionTitle title="History" action={`${bodyMetrics.length} entries`} />
      {bodyMetrics.length === 0 && (
        <Card>
          <Text style={styles.muted}>
            Track weight and measurements to see trends and recovery gains over time.
          </Text>
        </Card>
      )}
      {[...bodyMetrics].reverse().map((entry) => (
        <View key={entry.id} style={styles.historyRow}>
          <View style={styles.flex}>
            <Text style={styles.historyWeight}>{formatWeight(entry.weightKg, units)}</Text>
            <Text style={styles.muted}>
              {formatDate(entry.recordedAt)}
              {entry.chestCm ? ` · Chest ${entry.chestCm}` : ""}
              {entry.waistCm ? ` · Waist ${entry.waistCm}` : ""}
              {entry.armCm ? ` · Arm ${entry.armCm}` : ""}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md
  },
  flex: {
    flex: 1
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  bigValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900"
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 18
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  inputWrap: {
    flex: 1,
    gap: spacing.xs
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    minHeight: 46,
    paddingHorizontal: spacing.md
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  savedText: {
    color: colors.success,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  historyRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 60,
    padding: spacing.md
  },
  historyWeight: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  }
});
