import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AchievementState, Quest } from "@ratlevel/domain";
import { achievementProgress, streakMultiplier } from "@ratlevel/gamification";

import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";
import { buildAchievementContext, useSession } from "@/state/AppStore";
import { colors, radius, spacing, typography } from "@/theme";

const TIER_COLORS = {
  bronze: "#CD7F32",
  silver: "#B6C2D1",
  gold: "#F59E0B"
} as const;

export function QuestsScreen() {
  const session = useSession();
  const { player, quests, achievements } = session;

  const dailies = quests.filter((quest) => quest.scope === "daily");
  const weeklies = quests.filter((quest) => quest.scope === "weekly");
  const unlockedCount = achievements.filter((achievement) => achievement.unlockedAt).length;
  const context = buildAchievementContext(session);
  const multiplier = streakMultiplier(player.streakDays);

  return (
    <View style={styles.stack}>
      <Card style={styles.streakCard}>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={26} color={colors.warning} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.streakTitle}>{player.streakDays}-day streak</Text>
          <Text style={styles.muted}>
            Longest: {player.longestStreak}d
            {multiplier > 1 ? ` · XP boost x${multiplier.toFixed(2)} active` : " · Hit 3 days for an XP boost"}
          </Text>
        </View>
      </Card>

      <SectionTitle
        title="Daily missions"
        action={`${dailies.filter((quest) => quest.completed).length}/${dailies.length} done`}
      />
      {dailies.map((quest) => (
        <QuestCard key={quest.id} quest={quest} />
      ))}

      <SectionTitle
        title="Weekly quests"
        action={`${weeklies.filter((quest) => quest.completed).length}/${weeklies.length} done`}
      />
      {weeklies.map((quest) => (
        <QuestCard key={quest.id} quest={quest} />
      ))}

      <SectionTitle title="Badges" action={`${unlockedCount}/${achievements.length} unlocked`} />
      <View style={styles.badgeGrid}>
        {achievements.map((achievement) => (
          <BadgeTile
            key={achievement.id}
            achievement={achievement}
            progress={achievementProgress(achievement, context)}
          />
        ))}
      </View>
    </View>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  return (
    <Card>
      <View style={styles.questHeader}>
        <View style={styles.flex}>
          <Text style={styles.questTitle}>{quest.title}</Text>
          <Text style={styles.muted}>{quest.description}</Text>
        </View>
        <Text style={quest.completed ? styles.completeText : styles.xpText}>
          {quest.completed ? "Claimed" : `+${quest.xp.toLocaleString()} XP`}
        </Text>
      </View>
      <ProgressBar
        progress={quest.progress / quest.target}
        color={quest.completed ? colors.success : colors.primary}
      />
      <Text style={styles.progressCaption}>
        {Math.min(quest.progress, quest.target).toLocaleString()} / {quest.target.toLocaleString()}
      </Text>
    </Card>
  );
}

function BadgeTile({
  achievement,
  progress
}: {
  achievement: AchievementState;
  progress: number;
}) {
  const unlocked = Boolean(achievement.unlockedAt);
  const tierColor = TIER_COLORS[achievement.tier];

  return (
    <View
      style={[styles.badgeTile, !unlocked && styles.badgeLocked]}
      accessibilityLabel={`${achievement.title}, ${unlocked ? "unlocked" : `${Math.round(progress * 100)} percent progress`}`}
    >
      <View style={[styles.badgeIcon, { borderColor: unlocked ? tierColor : colors.border }]}>
        <Ionicons
          name={unlocked ? (achievement.icon as keyof typeof Ionicons.glyphMap) : "lock-closed"}
          size={22}
          color={unlocked ? tierColor : colors.textMuted}
        />
      </View>
      <Text style={styles.badgeTitle} numberOfLines={1}>
        {achievement.title}
      </Text>
      <Text style={styles.badgeDescription} numberOfLines={2}>
        {achievement.description}
      </Text>
      {!unlocked && <ProgressBar progress={progress} height={5} color={tierColor} />}
      {unlocked && (
        <Text style={[styles.badgeTier, { color: tierColor }]}>
          {achievement.tier.toUpperCase()}
        </Text>
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
  streakCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  streakBadge: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.full,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  streakTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900"
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 18
  },
  questHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  questTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
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
  },
  progressCaption: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  badgeTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  badgeLocked: {
    opacity: 0.82
  },
  badgeIcon: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.full,
    borderWidth: 1.5,
    height: 44,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 44
  },
  badgeTitle: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900"
  },
  badgeDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 16,
    minHeight: 32
  },
  badgeTier: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  }
});
