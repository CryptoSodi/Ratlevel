import { useEffect, useRef } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { RewardSummary, StatKey } from "@ratlevel/domain";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useNavigation } from "@/navigation/Navigation";
import { colors, radius, shadow, spacing, typography } from "@/theme";

const STAT_LABELS: Record<StatKey, string> = {
  strength: "Strength",
  endurance: "Endurance",
  power: "Power",
  speed: "Speed",
  discipline: "Discipline",
  consistency: "Consistency",
  recovery: "Recovery"
};

export function RewardScreen({ summary }: { summary: RewardSummary }) {
  const { closeModal } = useNavigation();
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true })
    ]).start();
  }, [opacity, scale]);

  const statGains = (Object.entries(summary.statGains) as Array<[StatKey, number]>).filter(
    ([, value]) => value > 0
  );

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          {summary.leveledUp ? (
            <LinearGradient
              colors={["#2A1E52", colors.surfaceElevated]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.levelUpCard}
            >
              <View style={styles.levelUpBadge}>
                <Ionicons name="arrow-up" size={28} color={colors.xp} />
              </View>
              <Text style={styles.levelUpEyebrow}>Level up</Text>
              <Text style={styles.levelUpTitle}>
                {summary.previousLevel} → {summary.newLevel}
              </Text>
              <Text style={styles.levelUpBody}>Your character grows with every session.</Text>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={[colors.surface, colors.surfaceElevated]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.levelUpCard}
            >
              <View style={styles.levelUpBadge}>
                <Ionicons name="flash" size={28} color={colors.primary} />
              </View>
              <Text style={styles.questCompleteEyebrow}>Quest complete</Text>
              <Text style={styles.levelUpTitle}>+{summary.totalXp.toLocaleString()} XP</Text>
              <Text style={styles.levelUpBody}>{summary.workoutName} banked.</Text>
            </LinearGradient>
          )}
        </Animated.View>

        <Card>
          <Text style={styles.sectionLabel}>XP earned</Text>
          {summary.xpLines.map((line, index) => (
            <View key={index} style={styles.xpRow}>
              <Text style={styles.xpLabel}>{line.label}</Text>
              <Text style={styles.xpValue}>+{line.xp.toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.xpRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>+{summary.totalXp.toLocaleString()} XP</Text>
          </View>
        </Card>

        {statGains.length > 0 && (
          <Card>
            <Text style={styles.sectionLabel}>Stat gains</Text>
            <View style={styles.statWrap}>
              {statGains.map(([key, value]) => (
                <View key={key} style={styles.statPill}>
                  <Text style={styles.statValue}>+{value}</Text>
                  <Text style={styles.statName}>{STAT_LABELS[key]}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {summary.questsCompleted.length > 0 && (
          <Card>
            <Text style={styles.sectionLabel}>Quests completed</Text>
            {summary.questsCompleted.map((quest) => (
              <View key={quest.id} style={styles.xpRow}>
                <View style={styles.iconRow}>
                  <Ionicons name="flag" size={16} color={colors.success} />
                  <Text style={styles.xpLabel}>{quest.title}</Text>
                </View>
                <Text style={styles.xpValue}>+{quest.xp.toLocaleString()}</Text>
              </View>
            ))}
          </Card>
        )}

        {summary.achievementsUnlocked.length > 0 && (
          <Card>
            <Text style={styles.sectionLabel}>Badges unlocked</Text>
            {summary.achievementsUnlocked.map((achievement) => (
              <View key={achievement.id} style={styles.xpRow}>
                <View style={styles.iconRow}>
                  <Ionicons name="ribbon" size={16} color={colors.warning} />
                  <Text style={styles.xpLabel}>{achievement.title}</Text>
                </View>
                <Text style={styles.xpValue}>+{achievement.badgeXp.toLocaleString()}</Text>
              </View>
            ))}
          </Card>
        )}

        <Card>
          <View style={styles.streakRow}>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={22} color={colors.warning} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.xpLabel}>
                {summary.streakDays}-day streak
                {summary.prCount > 0
                  ? ` · ${summary.prCount} PR${summary.prCount > 1 ? "s" : ""}`
                  : ""}
              </Text>
              <Text style={styles.mutedSmall}>Come back tomorrow to keep the flame alive.</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue" icon="checkmark" onPress={closeModal} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 24
  },
  levelUpCard: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.xl,
    ...shadow.card
  },
  levelUpBadge: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.xp,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 64
  },
  levelUpEyebrow: {
    color: colors.xp,
    fontSize: typography.small,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  questCompleteEyebrow: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  levelUpTitle: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "900"
  },
  levelUpBody: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "600",
    textAlign: "center"
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  xpRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  iconRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  xpLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700"
  },
  xpValue: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: "900"
  },
  divider: {
    backgroundColor: colors.border,
    height: 1
  },
  totalLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  totalValue: {
    color: colors.xp,
    fontSize: typography.heading,
    fontWeight: "900"
  },
  statWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statPill: {
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 84,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  statValue: {
    color: colors.success,
    fontSize: typography.body,
    fontWeight: "900"
  },
  statName: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800"
  },
  streakRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  streakBadge: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.full,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  mutedSmall: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600"
  },
  footer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    padding: spacing.md,
    paddingHorizontal: spacing.lg
  }
});
