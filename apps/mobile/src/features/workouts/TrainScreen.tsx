import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import { StatPill } from "@/components/StatPill";
import { formatRelativeDay, formatVolume } from "@/lib/format";
import { useNavigation } from "@/navigation/Navigation";
import { useSession } from "@/state/AppStore";
import { colors, radius, spacing, typography } from "@/theme";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function TrainScreen() {
  const session = useSession();
  const { openModal } = useNavigation();
  const { history, templates, settings } = session;

  const lastWorkout = history[0];
  const weekAgo = Date.now() - WEEK_MS;
  const thisWeek = history.filter((log) => new Date(log.performedAt).getTime() >= weekAgo);
  const weekVolume = thisWeek.reduce((total, log) => total + log.totalVolumeKg, 0);
  const weekXp = thisWeek.reduce((total, log) => total + log.xpAwarded, 0);

  return (
    <View style={styles.stack}>
      <SectionTitle title="Quick start" action="Fastest XP" />
      <Card>
        <Text style={styles.cardTitle}>
          {lastWorkout ? `Repeat: ${lastWorkout.name}` : "Your first workout"}
        </Text>
        <Text style={styles.muted}>
          {lastWorkout
            ? `${formatRelativeDay(lastWorkout.performedAt)} · ${lastWorkout.totalSets} sets · +${lastWorkout.xpAwarded} XP`
            : "Start from scratch and build your log."}
        </Text>
        <View style={styles.actionRow}>
          {lastWorkout && (
            <Button
              label="Repeat last"
              icon="refresh"
              onPress={() => openModal({ name: "session", repeatLogId: lastWorkout.id })}
              style={styles.actionButton}
            />
          )}
          <Button
            label="Start empty"
            icon="add"
            variant={lastWorkout ? "ghost" : "primary"}
            onPress={() => openModal({ name: "session" })}
            style={styles.actionButton}
          />
        </View>
      </Card>

      <SectionTitle title="This week" action={`${thisWeek.length} workouts`} />
      <View style={styles.metricRow}>
        <StatPill label="Sessions" value={`${thisWeek.length}`} icon="barbell" color={colors.primary} />
        <StatPill label="Volume" value={formatVolume(weekVolume, settings.units)} icon="trending-up" color={colors.success} />
        <StatPill label="XP" value={weekXp.toLocaleString()} icon="flash" color={colors.xp} />
      </View>

      <SectionTitle title="Templates" action={`${templates.length} saved`} />
      {templates.map((template) => (
        <View key={template.id} style={styles.templateRow}>
          <View style={styles.templateIcon}>
            <Ionicons name="albums" size={20} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{template.name}</Text>
            <Text style={styles.muted}>
              {template.focus} · ~{template.estimatedMinutes} min
            </Text>
          </View>
          <Button
            label="Start"
            compact
            onPress={() => openModal({ name: "session", templateId: template.id })}
          />
        </View>
      ))}

      <SectionTitle title="History" action={`${history.length} logs`} />
      {history.length === 0 && (
        <Card>
          <Text style={styles.muted}>No workouts yet. Your history and PRs will show up here.</Text>
        </Card>
      )}
      {history.slice(0, 10).map((log) => (
        <View key={log.id} style={styles.historyRow}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{log.name}</Text>
            <Text style={styles.muted}>
              {formatRelativeDay(log.performedAt)} · {log.totalSets} sets ·{" "}
              {formatVolume(log.totalVolumeKg, settings.units)}
              {log.prCount > 0 ? ` · ${log.prCount} PR${log.prCount > 1 ? "s" : ""}` : ""}
            </Text>
          </View>
          <Text style={styles.xpText}>+{log.xpAwarded.toLocaleString()} XP</Text>
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
  cardTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 18
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actionButton: {
    flex: 1
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  templateRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    padding: spacing.md
  },
  templateIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  historyRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    padding: spacing.md
  },
  xpText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: "900"
  }
});
