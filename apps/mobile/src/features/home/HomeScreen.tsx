import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { GymOccupancy, OccupancyLevel } from "@ratlevel/domain";
import {
  challengeProgress,
  levelFromTotalXp,
  rankFromSeasonXp,
  seasonProgress
} from "@ratlevel/gamification";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";
import { StatPill } from "@/components/StatPill";
import { useNavigation } from "@/navigation/Navigation";
import { useAppStore, useSession } from "@/state/AppStore";
import { colors, radius, rankTierColors, shadow, spacing, typography } from "@/theme";

const OCCUPANCY_POLL_MS = 30000;

const LEVEL_LABELS: Record<OccupancyLevel, { label: string; color: string }> = {
  quiet: { label: "quiet", color: colors.success },
  steady: { label: "steady", color: colors.primary },
  busy: { label: "busy", color: colors.warning },
  packed: { label: "packed", color: colors.danger }
};

export function HomeScreen() {
  const session = useSession();
  const { getGymOccupancy } = useAppStore();
  const { setTab, openModal } = useNavigation();
  const { player, quests, challenges, season } = session;

  const [occupancy, setOccupancy] = useState<GymOccupancy | null>(null);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await getGymOccupancy();
        if (active) setOccupancy(data);
      } catch {
        // Busyness is a nice-to-have; stay quiet if it fails.
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), OCCUPANCY_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [getGymOccupancy]);

  const level = levelFromTotalXp(player.totalXp);
  const rank = rankFromSeasonXp(player.seasonXp);
  const seasonState = seasonProgress(season, new Date().toISOString());
  const gym = session.gyms.find((item) => item.id === player.gymId);
  const dailies = quests.filter((quest) => quest.scope === "daily");
  const activeChallenges = challenges.filter((challenge) => challenge.joined);

  return (
    <View style={styles.stack}>
      <LinearGradient
        colors={[colors.surface, colors.surfaceElevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>{player.playerClass}</Text>
          </View>
          <Text style={styles.memberText}>{player.membership.plan} member</Text>
        </View>
        <View style={styles.heroMiddle}>
          <View style={styles.avatarFrame}>
            <MaterialCommunityIcons name="rodent" size={64} color={colors.text} />
            <Text style={styles.levelText}>LVL {level.level}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroName}>{player.name}</Text>
            <Text style={styles.heroSubtitle}>{player.title}</Text>
            <ProgressBar progress={level.progress} />
            <Text style={styles.progressText}>
              {level.xpIntoLevel.toLocaleString()} / {level.xpForNextLevel.toLocaleString()} XP to level{" "}
              {level.level + 1}
            </Text>
          </View>
        </View>
        <Button label="Log workout" icon="barbell" onPress={() => openModal({ name: "session" })} />
      </LinearGradient>

      <View style={styles.metricRow}>
        <StatPill label="Streak" value={`${player.streakDays}d`} icon="flame" color={colors.warning} />
        <StatPill
          label="Rank"
          value={rank.label}
          icon="trophy"
          color={rankTierColors[rank.tier] ?? colors.primary}
        />
        <StatPill label="PRs" value={`${player.personalRecords}`} icon="trending-up" color={colors.success} />
      </View>

      <Card>
        <View style={styles.gymRow}>
          <View style={styles.gymIcon}>
            <Ionicons name="location" size={20} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{gym?.name ?? "Your gym"}</Text>
            <Text style={styles.muted}>
              {gym ? (gym.openNow ? "Open now" : "Closed") : ""} · {player.membership.plan} plan
            </Text>
            {occupancy && gym?.openNow && (
              <Text style={styles.muted}>
                <Text style={[styles.occupancyLevel, { color: LEVEL_LABELS[occupancy.level].color }]}>
                  {LEVEL_LABELS[occupancy.level].label}
                </Text>
                {" "}· {occupancy.current} training now
              </Text>
            )}
          </View>
          <Button
            label="Check in"
            icon="qr-code"
            compact
            variant="ghost"
            onPress={() => openModal({ name: "membership" })}
          />
        </View>
      </Card>

      <SectionTitle
        title="Today"
        action={`${dailies.filter((quest) => quest.completed).length}/${dailies.length} done`}
        onAction={() => setTab("quests")}
      />
      {dailies.map((quest) => (
        <Card key={quest.id}>
          <View style={styles.missionHeader}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{quest.title}</Text>
              <Text style={styles.muted}>
                {Math.min(quest.progress, quest.target).toLocaleString()}/{quest.target.toLocaleString()}
              </Text>
            </View>
            <Text style={quest.completed ? styles.completeText : styles.xpText}>
              {quest.completed ? "Claimed" : `+${quest.xp} XP`}
            </Text>
          </View>
          <ProgressBar
            progress={quest.progress / quest.target}
            color={quest.completed ? colors.success : colors.primary}
          />
        </Card>
      ))}

      <SectionTitle title={season.name} action={`${seasonState.daysLeft}d left`} onAction={() => setTab("rank")} />
      <Card>
        <View style={styles.missionHeader}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{rank.label}</Text>
            <Text style={styles.muted}>
              {rank.nextLabel
                ? `${(rank.xpForNextRank ?? 0) - rank.xpIntoRank} season XP to ${rank.nextLabel}`
                : "Top of the ladder"}
            </Text>
          </View>
          <Ionicons name="shield" size={24} color={rankTierColors[rank.tier] ?? colors.primary} />
        </View>
        <ProgressBar progress={rank.progress} color={rankTierColors[rank.tier] ?? colors.primary} />
      </Card>

      {activeChallenges.length > 0 && (
        <>
          <SectionTitle title="Active challenges" action="View all" onAction={() => setTab("rank")} />
          {activeChallenges.map((challenge) => (
            <Card key={challenge.id}>
              <View style={styles.missionHeader}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{challenge.name}</Text>
                  <Text style={styles.muted}>{challenge.rewardLabel}</Text>
                </View>
                <Text style={styles.xpText}>+{challenge.rewardXp.toLocaleString()} XP</Text>
              </View>
              <ProgressBar progress={challengeProgress(challenge)} color={colors.xp} />
            </Card>
          ))}
        </>
      )}
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
  heroCard: {
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadow.card
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  classBadge: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  classBadgeText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  memberText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  heroMiddle: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg
  },
  avatarFrame: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderRadius: radius.xl,
    borderWidth: 2,
    height: 128,
    justifyContent: "center",
    width: 108
  },
  levelText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "900"
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm
  },
  heroName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "700"
  },
  progressText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  gymRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  gymIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    height: 40,
    justifyContent: "center",
    width: 40
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
  occupancyLevel: {
    fontWeight: "900",
    textTransform: "capitalize"
  },
  missionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  xpText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: "900"
  },
  completeText: {
    color: colors.success,
    fontSize: typography.body,
    fontWeight: "900"
  }
});
