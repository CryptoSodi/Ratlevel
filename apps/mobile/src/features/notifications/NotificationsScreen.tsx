import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MemberNotificationType } from "@ratlevel/domain";

import { Card } from "@/components/Card";
import { formatRelativeDay } from "@/lib/format";
import { useAppStore, useSession } from "@/state/AppStore";
import { colors, radius, spacing, typography } from "@/theme";

const TYPE_STYLE: Record<
  MemberNotificationType,
  { icon: keyof typeof Ionicons.glyphMap; color: string; soft: string }
> = {
  payment_due: { icon: "time", color: colors.warning, soft: colors.warningSoft },
  payment_overdue: { icon: "alert-circle", color: colors.danger, soft: colors.dangerSoft },
  info: { icon: "sparkles", color: colors.primary, soft: colors.primarySoft }
};

export function NotificationsScreen() {
  const session = useSession();
  const { markNotificationsRead } = useAppStore();
  const { notifications } = session;
  const hasUnread = notifications.some((item) => !item.read);

  useEffect(() => {
    if (hasUnread) {
      void markNotificationsRead();
    }
  }, [hasUnread, markNotificationsRead]);

  if (notifications.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Ionicons name="notifications-off" size={28} color={colors.textMuted} />
        <Text style={styles.muted}>Nothing yet. Payment reminders and gym news land here.</Text>
      </Card>
    );
  }

  return (
    <View style={styles.stack}>
      {notifications.map((notification) => {
        const style = TYPE_STYLE[notification.type];
        return (
          <View
            key={notification.id}
            style={[styles.row, !notification.read && styles.unreadRow]}
            accessibilityLabel={`${notification.title}. ${notification.body}`}
          >
            <View style={[styles.icon, { backgroundColor: style.soft }]}>
              <Ionicons name={style.icon} size={19} color={style.color} />
            </View>
            <View style={styles.flex}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{notification.title}</Text>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.body}>{notification.body}</Text>
              <Text style={styles.time}>{formatRelativeDay(notification.createdAt)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm
  },
  flex: {
    flex: 1
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    textAlign: "center"
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  unreadRow: {
    borderColor: colors.primary
  },
  icon: {
    alignItems: "center",
    borderRadius: radius.full,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "900"
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 8,
    width: 8
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 2
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: spacing.xs
  }
});
