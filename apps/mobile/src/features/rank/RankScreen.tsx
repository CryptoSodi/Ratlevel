import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Challenge } from "@ratlevel/domain";
import {
  challengeProgress,
  rankFromSeasonXp,
  seasonProgress
} from "@ratlevel/gamification";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppStore, useSession } from "@/state/AppStore";
import { colors, radius, rankTierColors, shadow, spacing, typography } from "@/theme";

export function RankScreen() {
  const session = useSession();
  const { joinChallenge } = useAppStore();
  const { player, season, leaderboard, challenges } = session;
  const [joining, setJoining] = useState<string | null>(null);

  const rank = rankFromSeasonXp(player.seasonXp);
  const seasonState = seasonProgress(season, new Date().toISOString());
  const tierColor = rankTierColors[rank.tier] ?? colors.primary;

  const handleJoin = async (challenge: Challenge) => {
    if (joining) return;
    setJoining(challenge.id);
    try {
      await joinChallenge(challenge.id);
    } finally {
      setJoining(null);
    }
  };

  return (
    <View style={styles.stack}>
      <LinearGradient
        colors={[colors.surface, colors.surfaceElevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.seasonCard}
      >
        <View style={styles.seasonHeader}>
          <View style={styles.flex}>
            <Text style={styles.seasonEyebrow}>{season.name}</Text>
            <Text style={styles.seasonDays}>{seasonState.daysLeft} days left</Text>
          </View>
          <View style={[styles.shieldBubble, { borderColor: tierColor }]}>
            <Ionicons name="shield" size={30} color={tierColor} />
          </View>
        </View>
        <Text style={[styles.rankLabel, { color: tierColor }]}>{rank.label}</Text>
        <ProgressBar progress={rank.progress} color={tierColor} />
        <Text style={styles.muted}>
          {rank.nextLabel
            ? `${((rank.xpForNextRank ?? 0) - rank.xpIntoRank).toLocaleString()} season XP to ${rank.nextLabel}`
            : "Highest rank reached — defend it."}{" "}
          · {player.seasonXp.toLocaleString()} season XP
        </Text>
        <ProgressBar progress={seasonState.elapsed} height={4} color={colors.surfaceSoft} />
      </LinearGradient>

      <SectionTitle title="Gym leaderboard" action="Season XP" />
      <Card style={styles.leaderboardCard}>
        {leaderboard.map((entry, index) => (
          <View
            key={entry.playerId}
            style={[styles.leaderRow, entry.isCurrentUser && styles.currentUserRow]}
          >
            <View style={[styles.rankBubble, index < 3 && styles.podiumBubble]}>
              <Text style={[styles.rankNumber, index < 3 && styles.podiumNumber]}>{index + 1}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.leaderName}>
                {entry.name}
                {entry.isCurrentUser ? " (you)" : ""}
              </Text>
              <Text style={styles.muted}>
                {entry.title} · LVL {entry.level}
              </Text>
            </View>
            <Text style={styles.leaderXp}>{entry.xp.toLocaleString()}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle title="Challenges" action={`${challenges.filter((c) => c.joined).length} joined`} />
      {challenges.map((challenge) => {
        const done = challenge.progress >= challenge.goal;
        return (
          <Card key={challenge.id}>
            <View style={styles.challengeHeader}>
              <View style={styles.flex}>
                <Text style={styles.challengeTitle}>{challenge.name}</Text>
                <Text style={styles.muted}>{challenge.description}</Text>
              </View>
              <Text style={styles.xpText}>+{challenge.rewardXp.toLocaleString()} XP</Text>
            </View>
            {challenge.joined ? (
              <>
                <ProgressBar
                  progress={challengeProgress(challenge)}
                  color={done ? colors.success : colors.xp}
                />
                <View style={styles.challengeFooter}>
                  <Text style={styles.muted}>
                    {Math.min(challenge.progress, challenge.goal).toLocaleString()} /{" "}
                    {challenge.goal.toLocaleString()} · {challenge.entrants.toLocaleString()} entrants
                  </Text>
                  {done && <Text style={styles.completeText}>Complete</Text>}
                </View>
              </>
            ) : (
              <View style={styles.challengeFooter}>
                <Text style={styles.muted}>
                  {challenge.entrants.toLocaleString()} entrants · {challenge.rewardLabel}
                </Text>
                <Button
                  label="Join"
                  compact
                  loading={joining === challenge.id}
                  onPress={() => void handleJoin(challenge)}
                />
              </View>
            )}
          </Card>
        );
      })}
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
  seasonCard: {
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadow.card
  },
  seasonHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  seasonEyebrow: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  seasonDays: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  shieldBubble: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.full,
    borderWidth: 2,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  rankLabel: {
    fontSize: 32,
    fontWeight: "900"
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 18
  },
  leaderboardCard: {
    gap: spacing.sm
  },
  leaderRow: {
    alignItems: "center",
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.sm
  },
  currentUserRow: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1
  },
  rankBubble: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  podiumBubble: {
    backgroundColor: colors.warningSoft
  },
  rankNumber: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900"
  },
  podiumNumber: {
    color: colors.warning
  },
  leaderName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  leaderXp: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: "900"
  },
  challengeHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  challengeTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  challengeFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  xpText: {
    color: colors.xp,
    fontSize: typography.body,
    fontWeight: "900"
  },
  completeText: {
    color: colors.success,
    fontSize: typography.caption,
    fontWeight: "900"
  }
});
