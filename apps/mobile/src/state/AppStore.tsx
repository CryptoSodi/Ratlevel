import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import type {
  AchievementState,
  BodyMetricEntry,
  Challenge,
  CheckIn,
  CheckInVerification,
  Exercise,
  Gym,
  GymOccupancy,
  LeaderboardEntry,
  MemberNotification,
  Player,
  PlayerClass,
  PlayerSettings,
  Quest,
  RatLevelClient,
  RewardSummary,
  Season,
  WorkoutExerciseEntry,
  WorkoutLog,
  WorkoutTemplate
} from "@ratlevel/domain";
import { levelFromTotalXp, settleWorkout } from "@ratlevel/gamification";
import {
  ApiAuthError,
  completeGoogleOnboarding,
  createHttpClient,
  devLogin,
  googleAuth
} from "@/services/httpClient";
import { tokenStore } from "@/lib/tokenStore";

export interface PendingGoogleProfile {
  pendingToken: string;
  email: string;
  name: string;
}

export interface Session {
  player: Player;
  settings: PlayerSettings;
  gyms: Gym[];
  quests: Quest[];
  achievements: AchievementState[];
  challenges: Challenge[];
  season: Season;
  leaderboard: LeaderboardEntry[];
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  history: WorkoutLog[];
  checkIns: CheckIn[];
  bodyMetrics: BodyMetricEntry[];
  notifications: MemberNotification[];
}

export interface FinishWorkoutInput {
  name: string;
  entries: WorkoutExerciseEntry[];
  durationMin: number;
}

type Status = "loading" | "unauthenticated" | "ready" | "error";

interface AppStoreValue {
  status: Status;
  session: Session | null;
  authError: string | null;
  pendingGoogleProfile: PendingGoogleProfile | null;
  reload: () => Promise<void>;
  /** Verifies a Google ID token. Returns true if a brand-new member needs to pick a gym/class next. */
  signInWithGoogle: (idToken: string) => Promise<{ isNewUser: boolean }>;
  finishGoogleOnboarding: (input: {
    name: string;
    playerClass: PlayerClass;
    gymId: string;
    whatsappNumber?: string;
  }) => Promise<void>;
  /** Dev/testing only — signs in as a seeded demo account without Google. The server refuses this outside development. */
  devSignIn: (email: string) => Promise<void>;
  checkIn: (method: CheckIn["method"], verification?: CheckInVerification) => Promise<CheckIn>;
  markNotificationsRead: () => Promise<void>;
  savePlayer: (player: Player) => Promise<void>;
  getGymOccupancy: () => Promise<GymOccupancy>;
  finishWorkout: (input: FinishWorkoutInput) => Promise<RewardSummary>;
  joinChallenge: (challengeId: string) => Promise<void>;
  addBodyMetric: (entry: Omit<BodyMetricEntry, "id">) => Promise<void>;
  saveSettings: (settings: PlayerSettings) => Promise<void>;
  signOut: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

/** Lifetime totals used by achievement unlock rules and badge progress bars — real counts, no fudge (the server persists real totals). */
export function buildAchievementContext(session: Session) {
  return {
    totalWorkouts: session.history.length,
    totalVolumeKg: session.history.reduce((total, workout) => total + workout.totalVolumeKg, 0),
    totalPrs: session.player.personalRecords,
    totalCheckIns: session.checkIns.length,
    longestStreak: session.player.longestStreak,
    level: levelFromTotalXp(session.player.totalXp).level
  };
}

function isSameCalendarDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function fetchSession(client: RatLevelClient): Promise<Session> {
  const [
    player,
    settings,
    gyms,
    quests,
    achievements,
    challenges,
    season,
    leaderboard,
    exercises,
    templates,
    history,
    checkIns,
    bodyMetrics,
    notifications
  ] = await Promise.all([
    client.players.getPlayer(),
    client.players.getSettings(),
    client.gyms.listGyms(),
    client.quests.listQuests(),
    client.achievements.listAchievements(),
    client.challenges.listChallenges(),
    client.seasons.getCurrentSeason(),
    client.seasons.getLeaderboard(),
    client.workouts.listExercises(),
    client.workouts.listTemplates(),
    client.workouts.listHistory(),
    client.checkIns.listCheckIns(),
    client.body.listBodyMetrics(),
    client.notifications.list()
  ]);
  return {
    player,
    settings,
    gyms,
    quests,
    achievements,
    challenges,
    season,
    leaderboard,
    exercises,
    templates,
    history,
    checkIns,
    bodyMetrics,
    notifications
  };
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const clientRef = useRef<RatLevelClient | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingGoogleProfile, setPendingGoogleProfile] = useState<PendingGoogleProfile | null>(null);

  const loadWithClient = useCallback(async (client: RatLevelClient) => {
    clientRef.current = client;
    try {
      setStatus((current) => (current === "ready" ? current : "loading"));
      const nextSession = await fetchSession(client);
      setSession(nextSession);
      setStatus("ready");
    } catch (cause) {
      if (cause instanceof ApiAuthError) {
        await tokenStore.clear();
        clientRef.current = null;
        setSession(null);
        setStatus("unauthenticated");
        return;
      }
      setStatus("error");
    }
  }, []);

  const reload = useCallback(async () => {
    if (!clientRef.current) return;
    await loadWithClient(clientRef.current);
  }, [loadWithClient]);

  // Bootstrap: try a stored token before falling back to the auth screen.
  useEffect(() => {
    void (async () => {
      const token = await tokenStore.get();
      if (!token) {
        setStatus("unauthenticated");
        return;
      }
      await loadWithClient(createHttpClient(token));
    })();
  }, [loadWithClient]);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    setAuthError(null);
    setPendingGoogleProfile(null);
    try {
      const result = await googleAuth(idToken);
      if (!result.isNewUser) {
        await tokenStore.set(result.token);
        await loadWithClient(createHttpClient(result.token));
        return { isNewUser: false };
      }
      // Brand-new member: stash the server-verified pending token and let the
      // onboarding UI collect gym + character before we create the account.
      setPendingGoogleProfile({
        pendingToken: result.pendingToken,
        email: result.profile.email,
        name: result.profile.name
      });
      return { isNewUser: true };
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : "Could not sign in with Google.");
      throw cause;
    }
  }, [loadWithClient]);

  const finishGoogleOnboarding = useCallback(
    async (input: { name: string; playerClass: PlayerClass; gymId: string; whatsappNumber?: string }) => {
      if (!pendingGoogleProfile) throw new Error("No Google sign-in in progress");
      setAuthError(null);
      try {
        const { token } = await completeGoogleOnboarding({ pendingToken: pendingGoogleProfile.pendingToken, ...input });
        setPendingGoogleProfile(null);
        await tokenStore.set(token);
        await loadWithClient(createHttpClient(token));
      } catch (cause) {
        setAuthError(cause instanceof Error ? cause.message : "Could not create your account.");
        throw cause;
      }
    },
    [pendingGoogleProfile, loadWithClient]
  );

  const devSignIn = useCallback(
    async (email: string) => {
      setAuthError(null);
      try {
        const { token } = await devLogin(email);
        await tokenStore.set(token);
        await loadWithClient(createHttpClient(token));
      } catch (cause) {
        setAuthError(cause instanceof Error ? cause.message : "Dev sign-in failed.");
        throw cause;
      }
    },
    [loadWithClient]
  );

  const markNotificationsRead = useCallback(async () => {
    if (!clientRef.current) return;
    const notifications = await clientRef.current.notifications.markAllRead();
    setSession((current) => (current ? { ...current, notifications } : current));
  }, []);

  const savePlayer = useCallback(async (player: Player) => {
    if (!clientRef.current) return;
    const saved = await clientRef.current.players.savePlayer(player);
    setSession((current) => (current ? { ...current, player: saved } : current));
  }, []);

  const getGymOccupancy = useCallback(async () => {
    if (!session || !clientRef.current) throw new Error("Session not ready");
    return clientRef.current.gyms.getOccupancy(session.player.gymId);
  }, [session]);

  const checkIn = useCallback(
    async (method: CheckIn["method"], verification?: CheckInVerification) => {
      if (!session || !clientRef.current) throw new Error("Session not ready");
      const client = clientRef.current;

      // The server verifies and awards XP/quest progress authoritatively —
      // the client just submits the claim and re-syncs the affected slices.
      const entry = await client.checkIns.checkIn(session.player.gymId, method, verification);
      const [player, quests, challenges, leaderboard] = await Promise.all([
        client.players.getPlayer(),
        client.quests.listQuests(),
        client.challenges.listChallenges(),
        client.seasons.getLeaderboard()
      ]);

      setSession((current) =>
        current
          ? { ...current, player, quests, challenges, leaderboard, checkIns: [entry, ...current.checkIns] }
          : current
      );
      return entry;
    },
    [session]
  );

  const finishWorkout = useCallback(
    async (input: FinishWorkoutInput) => {
      if (!session || !clientRef.current) throw new Error("Session not ready");
      const client = clientRef.current;
      const now = new Date().toISOString();

      // A PR = beating your historical top weight for that exercise. Computed
      // here too (not just server-side) so the celebration screen can show a
      // reward summary immediately — the server recomputes authoritatively
      // and persists that instead; this local run is preview-only.
      const historicalMax = new Map<string, number>();
      for (const workout of session.history) {
        for (const entry of workout.entries) {
          const max = Math.max(...entry.sets.map((set) => set.weightKg), 0);
          historicalMax.set(entry.exerciseId, Math.max(historicalMax.get(entry.exerciseId) ?? 0, max));
        }
      }
      let prCount = 0;
      for (const entry of input.entries) {
        const sessionMax = Math.max(
          ...entry.sets.filter((set) => set.completed).map((set) => set.weightKg),
          0
        );
        if (sessionMax > 0 && sessionMax > (historicalMax.get(entry.exerciseId) ?? 0)) {
          prCount += 1;
        }
      }

      const trainedToday = session.history.some((workout) => isSameCalendarDay(workout.performedAt, now));
      const streakDays = trainedToday ? session.player.streakDays : session.player.streakDays + 1;

      const preview = settleWorkout({
        player: session.player,
        quests: session.quests,
        achievements: session.achievements,
        challenges: session.challenges,
        entries: input.entries,
        workoutName: input.name,
        durationMin: input.durationMin,
        prCount,
        checkedIn: false,
        streakDays,
        lifetime: buildAchievementContext(session),
        now
      });

      // Authoritative: the server recomputes PRs/XP/quests/achievements from
      // its own state and persists the result — this call ignores any
      // client-submitted totals beyond the raw entries.
      const savedLog = await client.workouts.saveWorkout({
        id: "",
        name: input.name,
        performedAt: now,
        durationMin: input.durationMin,
        entries: input.entries,
        totalVolumeKg: 0,
        totalSets: 0,
        xpAwarded: 0,
        prCount: 0
      });

      const [player, quests, achievements, challenges, leaderboard] = await Promise.all([
        client.players.getPlayer(),
        client.quests.listQuests(),
        client.achievements.listAchievements(),
        client.challenges.listChallenges(),
        client.seasons.getLeaderboard()
      ]);

      setSession((current) =>
        current
          ? { ...current, player, quests, achievements, challenges, leaderboard, history: [savedLog, ...current.history] }
          : current
      );
      return preview.summary;
    },
    [session]
  );

  const joinChallenge = useCallback(
    async (challengeId: string) => {
      if (!session || !clientRef.current) return;
      const challenges = session.challenges.map((challenge) =>
        challenge.id === challengeId
          ? { ...challenge, joined: true, entrants: challenge.entrants + 1 }
          : challenge
      );
      const saved = await clientRef.current.challenges.saveChallenges(challenges);
      setSession((current) => (current ? { ...current, challenges: saved } : current));
    },
    [session]
  );

  const addBodyMetric = useCallback(async (entry: Omit<BodyMetricEntry, "id">) => {
    if (!clientRef.current) return;
    await clientRef.current.body.addBodyMetric(entry);
    const bodyMetrics = await clientRef.current.body.listBodyMetrics();
    setSession((current) => (current ? { ...current, bodyMetrics } : current));
  }, []);

  const saveSettings = useCallback(async (settings: PlayerSettings) => {
    if (!clientRef.current) return;
    const saved = await clientRef.current.players.saveSettings(settings);
    setSession((current) => (current ? { ...current, settings: saved } : current));
  }, []);

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    clientRef.current = null;
    setSession(null);
    setAuthError(null);
    setPendingGoogleProfile(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      status,
      session,
      authError,
      pendingGoogleProfile,
      reload,
      signInWithGoogle,
      finishGoogleOnboarding,
      devSignIn,
      checkIn,
      markNotificationsRead,
      savePlayer,
      getGymOccupancy,
      finishWorkout,
      joinChallenge,
      addBodyMetric,
      saveSettings,
      signOut
    }),
    [
      status,
      session,
      authError,
      pendingGoogleProfile,
      reload,
      signInWithGoogle,
      finishGoogleOnboarding,
      devSignIn,
      checkIn,
      markNotificationsRead,
      savePlayer,
      getGymOccupancy,
      finishWorkout,
      joinChallenge,
      addBodyMetric,
      saveSettings,
      signOut
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext);
  if (!value) {
    throw new Error("useAppStore must be used inside AppStoreProvider");
  }
  return value;
}

/** For screens rendered only when the session is loaded. */
export function useSession(): Session {
  const { session } = useAppStore();
  if (!session) {
    throw new Error("useSession must be used after the session has loaded");
  }
  return session;
}
