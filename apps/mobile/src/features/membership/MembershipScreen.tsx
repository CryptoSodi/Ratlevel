import { StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { daysUntilDue, getFeeStatus, memberQrPayload, type CheckInMethod, type FeeStatus } from "@ratlevel/domain";

import { Card } from "@/components/Card";
import { MemberQrCode } from "@/components/MemberQrCode";
import { SectionTitle } from "@/components/SectionTitle";
import { formatDate, formatRelativeDay } from "@/lib/format";
import { useSession } from "@/state/AppStore";
import { colors, radius, shadow, spacing, typography } from "@/theme";
import { CheckInPanel } from "./CheckInPanel";

const METHOD_ICONS: Record<CheckInMethod, keyof typeof Ionicons.glyphMap> = {
  qr: "qr-code",
  manual: "create",
  gps: "navigate"
};

const METHOD_LABELS: Record<CheckInMethod, string> = {
  qr: "QR scan",
  manual: "Manual entry",
  gps: "GPS check-in"
};

const FEE_BADGES: Record<FeeStatus, { color: string; soft: string; label: string }> = {
  paid: { color: colors.success, soft: colors.successSoft, label: "Paid up" },
  due_soon: { color: colors.warning, soft: colors.warningSoft, label: "Due soon" },
  overdue: { color: colors.danger, soft: colors.dangerSoft, label: "Overdue" }
};

export function MembershipScreen() {
  const session = useSession();
  const { player, checkIns } = session;
  const gym = session.gyms.find((item) => item.id === player.gymId);

  const now = new Date().toISOString();
  const feeStatus = getFeeStatus(player.membership.feeDueAt, now);
  const dueDays = daysUntilDue(player.membership.feeDueAt, now);
  const feeBadge = FEE_BADGES[feeStatus];

  return (
    <View style={styles.stack}>
      <LinearGradient
        colors={["#1B2A4A", colors.surfaceElevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="rodent" size={22} color={colors.text} />
            <Text style={styles.brand}>RatLevel</Text>
          </View>
          <View style={styles.planPill}>
            <Text style={styles.planText}>{player.membership.plan}</Text>
          </View>
        </View>
        <Text style={styles.cardName}>{player.name}</Text>
        <Text style={styles.cardNumber}>{player.membership.cardNumber}</Text>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.cardLabel}>Home gym</Text>
            <Text style={styles.cardValue}>{gym?.name ?? "—"}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>Member since</Text>
            <Text style={styles.cardValue}>{formatDate(player.membership.memberSince)}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>Status</Text>
            <Text style={[styles.cardValue, styles.statusActive]}>
              {player.membership.status === "active" ? "Active" : player.membership.status}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <SectionTitle title="Membership fee" action={`€${player.membership.monthlyFee}/mo`} />
      <Card>
        <View style={styles.feeRow}>
          <View style={[styles.feeBadge, { backgroundColor: feeBadge.soft }]}>
            <Ionicons
              name={feeStatus === "paid" ? "checkmark-circle" : feeStatus === "due_soon" ? "time" : "alert-circle"}
              size={20}
              color={feeBadge.color}
            />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.feeStatus, { color: feeBadge.color }]}>{feeBadge.label}</Text>
            <Text style={styles.muted}>
              {feeStatus === "overdue"
                ? `€${player.membership.monthlyFee} was due ${formatDate(player.membership.feeDueAt)}. Pay at the front desk to keep access.`
                : feeStatus === "due_soon"
                  ? `€${player.membership.monthlyFee} due in ${dueDays} day${dueDays === 1 ? "" : "s"} (${formatDate(player.membership.feeDueAt)}).`
                  : `Next payment ${formatDate(player.membership.feeDueAt)}.`}
            </Text>
          </View>
        </View>
      </Card>

      <SectionTitle title="Gym entry" action={gym?.openNow ? "Open now" : "Closed"} />
      {gym && <CheckInPanel gym={gym} />}

      <SectionTitle title="Your member pass" action="Staff scan" />
      <Card style={styles.qrCard}>
        <MemberQrCode value={memberQrPayload(player.id)} size={172} />
        <Text style={styles.muted}>
          Front desk can scan this to check you in — handy when the door poster is busy or out of
          order.
        </Text>
      </Card>

      <SectionTitle title="Recent visits" action={`${checkIns.length} total`} />
      {checkIns.length === 0 && (
        <Card>
          <Text style={styles.muted}>No visits yet. Your first check-in starts the streak.</Text>
        </Card>
      )}
      {checkIns.slice(0, 6).map((entry) => (
        <View key={entry.id} style={styles.visitRow}>
          <View style={styles.visitIcon}>
            <Ionicons name={METHOD_ICONS[entry.method]} size={18} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.visitTitle}>{formatRelativeDay(entry.at)}</Text>
            <Text style={styles.muted}>
              {new Date(entry.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} ·{" "}
              {METHOD_LABELS[entry.method]}
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
  card: {
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadow.card
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  brand: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900",
    letterSpacing: 1
  },
  planPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4
  },
  planText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  cardName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: spacing.md
  },
  cardNumber: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "700",
    letterSpacing: 2
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  cardValue: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "800"
  },
  statusActive: {
    color: colors.success
  },
  feeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  feeBadge: {
    alignItems: "center",
    borderRadius: radius.full,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  feeStatus: {
    fontSize: typography.body,
    fontWeight: "900"
  },
  qrCard: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 18
  },
  visitRow: {
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
  visitIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  visitTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "left"
  }
});
