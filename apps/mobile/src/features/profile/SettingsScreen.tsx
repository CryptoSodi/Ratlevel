import { useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerSettings } from "@ratlevel/domain";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { SectionTitle } from "@/components/SectionTitle";
import { useNavigation } from "@/navigation/Navigation";
import { useAppStore, useSession } from "@/state/AppStore";
import { colors, spacing, typography } from "@/theme";

export function SettingsScreen() {
  const session = useSession();
  const { saveSettings, savePlayer, signOut } = useAppStore();
  const { closeModal } = useNavigation();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState(session.player.whatsappNumber ?? "");
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  const settings = session.settings;

  const saveWhatsapp = async () => {
    if (savingWhatsapp) return;
    setSavingWhatsapp(true);
    setError(null);
    setWhatsappSaved(false);
    try {
      await savePlayer({ ...session.player, whatsappNumber: whatsapp.trim() || undefined });
      setWhatsappSaved(true);
    } catch {
      setError("Could not save your WhatsApp number. Try again.");
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const update = async (patch: Partial<PlayerSettings>) => {
    setError(null);
    try {
      await saveSettings({ ...settings, ...patch });
    } catch {
      setError("Could not save settings. Try again.");
    }
  };

  const handleSignOut = () => {
    closeModal();
    void signOut();
  };

  return (
    <View style={styles.stack}>
      <SectionTitle title="Units" action="Applies everywhere" />
      <Card>
        <View style={styles.chipRow}>
          <Chip
            label="Metric (kg)"
            active={settings.units === "metric"}
            onPress={() => void update({ units: "metric" })}
          />
          <Chip
            label="Imperial (lb)"
            active={settings.units === "imperial"}
            onPress={() => void update({ units: "imperial" })}
          />
        </View>
      </Card>

      <SectionTitle title="Notifications" action="Mocked for now" />
      <Card style={styles.settingsCard}>
        <SettingRow
          icon="barbell"
          title="Workout reminders"
          subtitle="Nudge me when a training day is slipping."
          value={settings.workoutReminders}
          onChange={(value) => void update({ workoutReminders: value })}
        />
        <SettingRow
          icon="flag"
          title="Quest alerts"
          subtitle="Daily missions and weekly quest deadlines."
          value={settings.questAlerts}
          onChange={(value) => void update({ questAlerts: value })}
        />
      </Card>

      <SectionTitle title="Contact" action="Used by your gym" />
      <Card>
        <Text style={styles.muted}>
          Your gym uses WhatsApp for class updates, payment reminders and member offers. Leave
          empty to opt out.
        </Text>
        <TextInput
          accessibilityLabel="WhatsApp number"
          value={whatsapp}
          onChangeText={(text) => {
            setWhatsapp(text);
            setWhatsappSaved(false);
          }}
          placeholder="+31 6 1234 5678"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          maxLength={20}
          style={styles.input}
        />
        {whatsappSaved && <Text style={styles.savedText}>WhatsApp number saved.</Text>}
        <Button
          label="Save number"
          icon="logo-whatsapp"
          variant="ghost"
          loading={savingWhatsapp}
          onPress={() => void saveWhatsapp()}
        />
      </Card>

      <SectionTitle title="Privacy" action="" />
      <Card style={styles.settingsCard}>
        <SettingRow
          icon="trophy"
          title="Show me on leaderboards"
          subtitle="Hide to compete anonymously."
          value={settings.leaderboardVisible}
          onChange={(value) => void update({ leaderboardVisible: value })}
        />
      </Card>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <SectionTitle title="Account" action="Demo build" />
      <Card>
        <Text style={styles.muted}>
          Signing out resets the demo: character, XP, quests and history return to their seeded
          state.
        </Text>
        {confirmSignOut ? (
          <View style={styles.confirmRow}>
            <Button
              label="Yes, sign out"
              variant="danger"
              onPress={handleSignOut}
              style={styles.flex}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => setConfirmSignOut(false)}
              style={styles.flex}
            />
          </View>
        ) : (
          <Button
            label="Sign out"
            icon="log-out-outline"
            variant="ghost"
            onPress={() => setConfirmSignOut(true)}
          />
        )}
      </Card>

      <Text style={styles.version}>RatLevel 0.1.0 · made for gym rats</Text>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onChange
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.muted}>{subtitle}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceSoft, true: colors.primary }}
        thumbColor={colors.text}
      />
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
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  settingsCard: {
    gap: spacing.md
  },
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  settingIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  settingTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 17
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
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  confirmRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  version: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    paddingBottom: spacing.md,
    textAlign: "center"
  }
});
