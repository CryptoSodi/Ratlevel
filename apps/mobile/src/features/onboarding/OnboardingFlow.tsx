import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Gym, PlayerClass } from "@ratlevel/domain";

import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { isGoogleClientConfigured, useGoogleIdTokenAuth } from "@/lib/googleAuth";
import { listPublicGyms } from "@/services/httpClient";
import { useAppStore } from "@/state/AppStore";
import { colors, radius, spacing, typography } from "@/theme";

type Step = "welcome" | "gym" | "character";

const CLASSES: Array<{ key: PlayerClass; blurb: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
  { key: "Vanguard", blurb: "Heavy compounds. Built for strength and power.", icon: "shield-sword" },
  { key: "Strider", blurb: "Engine first. Cardio, conditioning, endurance.", icon: "run-fast" },
  { key: "Sentinel", blurb: "Never misses. Discipline and consistency.", icon: "eye" },
  { key: "Medic", blurb: "Recovery-focused. Mobility, sleep, longevity.", icon: "medical-bag" }
];

export function OnboardingFlow() {
  const { signInWithGoogle, finishGoogleOnboarding, devSignIn, pendingGoogleProfile, authError } = useAppStore();
  const [request, response, promptAsync] = useGoogleIdTokenAuth();
  const [step, setStep] = useState<Step>("welcome");
  const [googleBusy, setGoogleBusy] = useState(false);
  const [gymId, setGymId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [playerClass, setPlayerClass] = useState<PlayerClass | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState("tassa@ratlevel.dev");
  const [devBusy, setDevBusy] = useState(false);

  // Prefill the character name from the Google profile once we know it.
  useEffect(() => {
    if (pendingGoogleProfile && !name) {
      setName(pendingGoogleProfile.name);
    }
  }, [pendingGoogleProfile, name]);

  // The auth-session prompt resolves asynchronously into `response`; handle
  // the id token here once Google redirects back to the app.
  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token;
    if (!idToken) {
      setError("Google didn't return an ID token. Try again.");
      return;
    }
    setGoogleBusy(true);
    setError(null);
    signInWithGoogle(idToken)
      .then(({ isNewUser }) => {
        if (isNewUser) setStep("gym");
      })
      .catch(() => {
        // authError is already set by the store; nothing else to do.
      })
      .finally(() => setGoogleBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymsLoading, setGymsLoading] = useState(false);
  useEffect(() => {
    if (step !== "gym" || gyms.length > 0) return;
    setGymsLoading(true);
    listPublicGyms()
      .then(setGyms)
      .catch(() => setError("Could not load gyms. Check your connection and try again."))
      .finally(() => setGymsLoading(false));
  }, [step, gyms.length]);

  const steps: Step[] = ["welcome", "gym", "character"];
  const stepIndex = steps.indexOf(step);
  const googleConfigured = isGoogleClientConfigured();

  const finishOnboarding = async () => {
    if (!name.trim() || !playerClass || !gymId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await finishGoogleOnboarding({
        name: name.trim(),
        playerClass,
        gymId,
        whatsappNumber: whatsapp.trim() || undefined
      });
    } catch {
      setError("Could not create your account. Try again.");
      setSubmitting(false);
    }
  };

  const runDevSignIn = async () => {
    if (devBusy) return;
    setDevBusy(true);
    setError(null);
    try {
      await devSignIn(devEmail.trim());
    } catch {
      setDevBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.progressWrap}>
          <ProgressBar progress={(stepIndex + 1) / steps.length} height={6} />
        </View>

        {step === "welcome" && (
          <View style={styles.stack}>
            <LinearGradient
              colors={[colors.surfaceElevated, colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroPanel}
            >
              <View style={styles.logoBubble}>
                <MaterialCommunityIcons name="rodent" size={54} color={colors.text} />
              </View>
              <Text style={styles.heroTitle}>RatLevel</Text>
              <Text style={styles.heroTagline}>Fitness is now a game.</Text>
              <Text style={styles.heroBody}>
                Earn XP for every rep. Level up your character. Climb your gym's leaderboard.
              </Text>
            </LinearGradient>

            {googleConfigured ? (
              <Pressable
                accessibilityRole="button"
                disabled={!request || googleBusy}
                onPress={() => void promptAsync()}
                style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, (!request || googleBusy) && styles.disabled]}
              >
                {googleBusy ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Ionicons name="logo-google" size={20} color={colors.background} />
                )}
                <Text style={styles.googleLabel}>{googleBusy ? "Signing in…" : "Continue with Google"}</Text>
              </Pressable>
            ) : (
              <View style={styles.notConfiguredBox}>
                <Ionicons name="warning" size={18} color={colors.warning} />
                <Text style={styles.notConfiguredText}>
                  Google Sign-In isn't configured yet. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in
                  apps/mobile/.env (see .env.example).
                </Text>
              </View>
            )}

            {(authError || error) && <Text style={styles.errorText}>{authError ?? error}</Text>}

            {__DEV__ && (
              <View style={styles.devBox}>
                <Text style={styles.devLabel}>DEV ONLY — skip Google, sign in as a seeded demo account</Text>
                <View style={styles.devRow}>
                  <TextInput
                    accessibilityLabel="Dev sign-in email"
                    value={devEmail}
                    onChangeText={setDevEmail}
                    placeholder="tassa@ratlevel.dev"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.devInput}
                  />
                  <Button label="Go" compact loading={devBusy} onPress={() => void runDevSignIn()} />
                </View>
              </View>
            )}
          </View>
        )}

        {step === "gym" && (
          <View style={styles.stack}>
            <Text style={styles.stepTitle}>Choose your gym</Text>
            <Text style={styles.stepBody}>Your leaderboard, challenges and check-ins live here.</Text>
            {gymsLoading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stepBody}>Loading gyms…</Text>
              </View>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
            {gyms.map((gym) => (
              <GymOption key={gym.id} gym={gym} selected={gym.id === gymId} onSelect={() => setGymId(gym.id)} />
            ))}
            <Button
              label="Continue"
              icon="arrow-forward"
              disabled={!gymId}
              onPress={() => setStep("character")}
            />
          </View>
        )}

        {step === "character" && (
          <View style={styles.stack}>
            <Text style={styles.stepTitle}>Create your character</Text>
            <Text style={styles.stepBody}>Pick a name and a class. You can respec later.</Text>
            <TextInput
              accessibilityLabel="Character name"
              value={name}
              onChangeText={setName}
              placeholder="Character name"
              placeholderTextColor={colors.textMuted}
              maxLength={20}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="WhatsApp number, optional"
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="WhatsApp number (optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={20}
              style={styles.input}
            />
            <Text style={styles.finePrint}>
              Your gym uses WhatsApp for class updates and member offers. You can remove it any
              time in Settings.
            </Text>
            {CLASSES.map((option) => {
              const selected = option.key === playerClass;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setPlayerClass(option.key)}
                  style={({ pressed }) => [styles.classRow, selected && styles.classSelected, pressed && styles.pressed]}
                >
                  <View style={[styles.classIcon, selected && styles.classIconSelected]}>
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={24}
                      color={selected ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.classTitle}>{option.key}</Text>
                    <Text style={styles.classBlurb}>{option.blurb}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </Pressable>
              );
            })}
            {(authError || error) && <Text style={styles.errorText}>{authError ?? error}</Text>}
            <Button
              label="Enter the gym"
              icon="flash"
              loading={submitting}
              disabled={!name.trim() || !playerClass || !gymId}
              onPress={() => void finishOnboarding()}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GymOption({ gym, selected, onSelect }: { gym: Gym; selected: boolean; onSelect: () => void }) {
  const subtitle = useMemo(
    () => `${gym.city} · ${gym.memberCount.toLocaleString()} members`,
    [gym]
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => [styles.classRow, selected && styles.classSelected, pressed && styles.pressed]}
    >
      <View style={[styles.classIcon, selected && styles.classIconSelected]}>
        <Ionicons name="barbell" size={22} color={selected ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.classTitle}>{gym.name}</Text>
        <Text style={styles.classBlurb}>{subtitle}</Text>
      </View>
      <View style={[styles.openPill, !gym.openNow && styles.closedPill]}>
        <Text style={[styles.openText, !gym.openNow && styles.closedText]}>
          {gym.openNow ? "Open" : "Closed"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    justifyContent: "center",
    padding: spacing.lg
  },
  progressWrap: {
    paddingHorizontal: spacing.xs
  },
  stack: {
    gap: spacing.md
  },
  heroPanel: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl
  },
  logoBubble: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 96,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 96
  },
  heroTitle: {
    color: colors.text,
    fontSize: typography.display + 6,
    fontWeight: "900"
  },
  heroTagline: {
    color: colors.primary,
    fontSize: typography.heading,
    fontWeight: "800"
  },
  heroBody: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "center"
  },
  googleButton: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52
  },
  googleLabel: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.6
  },
  notConfiguredBox: {
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  notConfiguredText: {
    color: colors.warning,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: "700",
    lineHeight: 18
  },
  devBox: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  devLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  devRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  devInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: typography.small,
    fontWeight: "700",
    minHeight: 44,
    paddingHorizontal: spacing.md
  },
  stepTitle: {
    color: colors.text,
    fontSize: typography.display,
    fontWeight: "900"
  },
  stepBody: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 22
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  finePrint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    textAlign: "center"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  classRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md
  },
  classSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  classIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  classIconSelected: {
    backgroundColor: colors.background
  },
  classTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  classBlurb: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    lineHeight: 17
  },
  openPill: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3
  },
  closedPill: {
    backgroundColor: colors.surfaceSoft
  },
  openText: {
    color: colors.success,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  closedText: {
    color: colors.textMuted
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.78
  }
});
