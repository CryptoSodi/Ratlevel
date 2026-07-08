import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { StatKey } from "@ratlevel/domain";
import { levelFromTotalXp, rankFromSeasonXp } from "@ratlevel/gamification";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LineChart } from "@/components/LineChart";
import { ProgressRing } from "@/components/ProgressRing";
import { SectionTitle } from "@/components/SectionTitle";
import { formatWeight, kgToDisplay, weightUnit } from "@/lib/format";
import { useNavigation } from "@/navigation/Navigation";
import { useSession } from "@/state/AppStore";
import { colors, radius, rankTierColors, spacing, typography } from "@/theme";

const STAT_ROWS: Array<{ key: StatKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "strength", label: "Strength", icon: "barbell" },
  { key: "endurance", label: "Endurance", icon: "pulse" },
  { key: "power", label: "Power", icon: "flash" },
  { key: "speed", label: "Speed", icon: "speedometer" },
  { key: "discipline", label: "Discipline", icon: "calendar" },
  { key: "consistency", label: "Consistency", icon: "repeat" },
  { key: "recovery", label: "Recovery", icon: "moon" }
];

export function ProfileScreen() {
  const session = useSession();
  const { openModal } = useNavigation();
  const { player, bodyMetrics, settings } = session;

  const level = levelFromTotalXp(player.totalXp);
  const rank = rankFromSeasonXp(player.seasonXp);
  const latestBody = bodyMetrics[bodyMetrics.length - 1];
  const firstBody = bodyMetrics[0];
  const weightDelta = latestBody && firstBody ? latestBody.weightKg - firstBody.weightKg : 0;

  return (
    <View style={styles.stack}>
      <Card style={styles.characterCard}>
        <ProgressRing progress={level.progress} label={`LVL ${level.level}`} />
        <View style={styles.characterCopy}>
          <Text style={styles.characterName}>{player.name}</Text>
          <Text style={styles.muted}>
            {player.playerClass} · {player.title}
          </Text>
          <View style={styles.rankRow}>
            <Ionicons name="shield" size={14} color={rankTierColors[rank.tier] ?? colors.primary} />
            <Text style={[styles.rankText, { color: rankTierColors[rank.tier] ?? colors.primary }]}>
              {rank.label}
            </Text>
            <Text style={styles.muted}> · {player.totalXp.toLocaleString()} lifetime XP</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => openModal({ name: "settings" })}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
        >
          <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </Card>

      <SectionTitle title="Character stats" action="Earned by training" />
      <Card style={styles.statsCard}>
        {STAT_ROWS.map((stat) => (
          <View key={stat.key} style={styles.statRow}>
            <View style={styles.statIcon}>
              <Ionicons name={stat.icon} size={15} color={colors.primary} />
            </View>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <View style={styles.statTrack}>
              <View
                style={[styles.statFill, { width: `${Math.min(player.stats[stat.key], 100)}%` }]}
              />
            </View>
            <Text style={styles.statNumber}>{Math.round(player.stats[stat.key])}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle
        title="Body tracking"
        action="Log entry"
        onAction={() => openModal({ name: "body" })}
      />
      <Card>
        {latestBody ? (
          <>
            <View style={styles.bodyHeader}>
              <View style={styles.flex}>
                <Text style={styles.bodyWeight}>{formatWeight(latestBody.weightKg, settings.units)}</Text>
                <Text style={styles.muted}>
                  {weightDelta === 0
                    ? "Holding steady"
                    : `${weightDelta > 0 ? "+" : ""}${kgToDisplay(weightDelta, settings.units)} ${weightUnit(settings.units)} since first log`}
                </Text>
              </View>
              <View style={styles.bodyIcon}>
                <MaterialCommunityIcons name="scale-bathroom" size={22} color={colors.primary} />
              </View>
            </View>
            <LineChart
              points={bodyMetrics.map((entry) => kgToDisplay(entry.weightKg, settings.units))}
              formatValue={(value) => `${value}`}
            />
          </>
        ) : (
          <View style={styles.emptyBody}>
            <MaterialCommunityIcons name="scale-bathroom" size={28} color={colors.textMuted} />
            <Text style={styles.muted}>No body data yet. Log your first weigh-in.</Text>
            <Button label="Log weight" compact onPress={() => openModal({ name: "body" })} />
          </View>
        )}
      </Card>

      <SectionTitle title="Membership" action={player.membership.plan} />
      <Card>
        <View style={styles.bodyHeader}>
          <View style={styles.flex}>
            <Text style={styles.statLabel}>RatLevel {player.membership.plan}</Text>
            <Text style={styles.muted}>
              {player.membership.status === "active" ? "Active" : player.membership.status} · card ending{" "}
              {player.membership.cardNumber.slice(-4)}
            </Text>
          </View>
          <Button
            label="View card"
            compact
            variant="ghost"
            onPress={() => openModal({ name: "membership" })}
          />
        </View>
      </Card>
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
  characterCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg
  },
  characterCopy: {
    flex: 1,
    gap: 3
  },
  characterName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  rankRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  rankText: {
    fontSize: typography.caption,
    fontWeight: "900"
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  pressed: {
    opacity: 0.78
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 18
  },
  statsCard: {
    gap: spacing.sm
  },
  statRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 34
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  statLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "800",
    width: 96
  },
  statTrack: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    flex: 1,
    height: 8,
    overflow: "hidden"
  },
  statFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: "100%"
  },
  statNumber: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "900",
    minWidth: 28,
    textAlign: "right"
  },
  bodyHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  bodyWeight: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900"
  },
  bodyIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  emptyBody: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md
  }
});
