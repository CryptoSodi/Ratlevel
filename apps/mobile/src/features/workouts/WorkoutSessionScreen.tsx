import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Exercise, MuscleGroup, WorkoutExerciseEntry } from "@ratlevel/domain";
import { calculateWorkoutXp, totalXp } from "@ratlevel/gamification";

import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { displayToKg, kgToDisplay, weightUnit } from "@/lib/format";
import { useNavigation } from "@/navigation/Navigation";
import { useAppStore, useSession } from "@/state/AppStore";
import { colors, radius, spacing, typography } from "@/theme";

interface DraftSet {
  repsText: string;
  weightText: string;
  completed: boolean;
}

interface DraftEntry {
  exercise: Exercise;
  sets: DraftSet[];
}

const MUSCLE_FILTERS: Array<{ key: MuscleGroup | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "arms", label: "Arms" },
  { key: "legs", label: "Legs" },
  { key: "core", label: "Core" },
  { key: "cardio", label: "Cardio" }
];

export function WorkoutSessionScreen({
  templateId,
  repeatLogId
}: {
  templateId?: string;
  repeatLogId?: string;
}) {
  const session = useSession();
  const { finishWorkout } = useAppStore();
  const { openModal, closeModal } = useNavigation();
  const { exercises, templates, history, settings } = session;
  const units = settings.units;

  const startedAt = useRef(Date.now());

  const historicalMax = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of history) {
      for (const entry of log.entries) {
        const max = Math.max(...entry.sets.map((set) => set.weightKg), 0);
        map.set(entry.exerciseId, Math.max(map.get(entry.exerciseId) ?? 0, max));
      }
    }
    return map;
  }, [history]);

  const makeDraft = (exercise: Exercise, setCount = 3): DraftEntry => {
    const lastWeight = historicalMax.get(exercise.id);
    const weightText =
      lastWeight && lastWeight > 0 ? String(kgToDisplay(lastWeight, units)) : "";
    return {
      exercise,
      sets: Array.from({ length: setCount }, () => ({
        repsText: exercise.muscleGroup === "cardio" ? "1" : "10",
        weightText: exercise.muscleGroup === "cardio" ? "0" : weightText,
        completed: false
      }))
    };
  };

  const initial = useMemo((): { name: string; drafts: DraftEntry[] } => {
    if (repeatLogId) {
      const log = history.find((item) => item.id === repeatLogId);
      if (log) {
        return {
          name: log.name,
          drafts: log.entries.flatMap((entry) => {
            const exercise = exercises.find((item) => item.id === entry.exerciseId);
            if (!exercise) return [];
            return [
              {
                exercise,
                sets: entry.sets.map((set) => ({
                  repsText: String(set.reps),
                  weightText: String(kgToDisplay(set.weightKg, units)),
                  completed: false
                }))
              }
            ];
          })
        };
      }
    }
    if (templateId) {
      const template = templates.find((item) => item.id === templateId);
      if (template) {
        return {
          name: template.name,
          drafts: template.exerciseIds.flatMap((id) => {
            const exercise = exercises.find((item) => item.id === id);
            return exercise ? [makeDraft(exercise)] : [];
          })
        };
      }
    }
    return { name: "Custom workout", drafts: [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [name, setName] = useState(initial.name);
  const [drafts, setDrafts] = useState<DraftEntry[]>(initial.drafts);
  const [pickerOpen, setPickerOpen] = useState(initial.drafts.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const toEntries = (source: DraftEntry[]): WorkoutExerciseEntry[] =>
    source.map((draft) => ({
      exerciseId: draft.exercise.id,
      exerciseName: draft.exercise.name,
      muscleGroup: draft.exercise.muscleGroup,
      isCompound: draft.exercise.isCompound,
      sets: draft.sets.map((set) => ({
        reps: Math.max(0, Math.round(Number(set.repsText) || 0)),
        weightKg: displayToKg(Math.max(0, Number(set.weightText) || 0), units),
        completed: set.completed
      }))
    }));

  const completedSets = drafts.reduce(
    (total, draft) => total + draft.sets.filter((set) => set.completed).length,
    0
  );

  const estimatedXp = useMemo(() => {
    if (completedSets === 0) return 0;
    return totalXp(
      calculateWorkoutXp({
        entries: toEntries(drafts),
        durationMin: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)),
        prCount: 0,
        streakDays: session.player.streakDays
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, completedSets]);

  const updateSet = (entryIndex: number, setIndex: number, patch: Partial<DraftSet>) => {
    setDrafts((current) =>
      current.map((draft, index) =>
        index === entryIndex
          ? {
              ...draft,
              sets: draft.sets.map((set, sIndex) => (sIndex === setIndex ? { ...set, ...patch } : set))
            }
          : draft
      )
    );
  };

  const addSet = (entryIndex: number) => {
    setDrafts((current) =>
      current.map((draft, index) => {
        if (index !== entryIndex) return draft;
        const last = draft.sets[draft.sets.length - 1];
        return {
          ...draft,
          sets: [
            ...draft.sets,
            { repsText: last?.repsText ?? "10", weightText: last?.weightText ?? "", completed: false }
          ]
        };
      })
    );
  };

  const removeExercise = (entryIndex: number) => {
    setDrafts((current) => current.filter((_, index) => index !== entryIndex));
  };

  const addExercise = (exercise: Exercise) => {
    setDrafts((current) => [...current, makeDraft(exercise)]);
    setPickerOpen(false);
  };

  const finish = async () => {
    if (saving) return;
    const entries = toEntries(drafts).filter((entry) =>
      entry.sets.some((set) => set.completed && set.reps > 0)
    );
    if (entries.length === 0) {
      setError("Complete at least one set to bank XP.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const summary = await finishWorkout({
        name: name.trim() || "Workout",
        entries,
        durationMin: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))
      });
      openModal({ name: "reward", summary });
    } catch {
      setError("Could not save your workout. Your sets are still here — try again.");
      setSaving(false);
    }
  };

  if (pickerOpen) {
    return (
      <ExercisePicker
        exercises={exercises}
        onPick={addExercise}
        onClose={() => setPickerOpen(false)}
        canClose={drafts.length > 0}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>Active session</Text>
          <TextInput
            accessibilityLabel="Workout name"
            value={name}
            onChangeText={setName}
            style={styles.nameInput}
            maxLength={32}
            placeholder="Workout name"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        {confirmDiscard ? (
          <Button label="Discard?" variant="danger" compact onPress={closeModal} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard workout"
            onPress={() => setConfirmDiscard(true)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {drafts.map((draft, entryIndex) => (
          <View key={`${draft.exercise.id}-${entryIndex}`} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.flex}>
                <Text style={styles.exerciseName}>{draft.exercise.name}</Text>
                <Text style={styles.muted}>
                  {draft.exercise.muscleGroup} · {draft.exercise.equipment}
                  {draft.exercise.isCompound ? " · compound" : ""}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${draft.exercise.name}`}
                onPress={() => removeExercise(entryIndex)}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.setHeaderRow}>
              <Text style={[styles.setLabel, styles.setCol]}>Set</Text>
              <Text style={[styles.setLabel, styles.inputCol]}>{weightUnit(units)}</Text>
              <Text style={[styles.setLabel, styles.inputCol]}>Reps</Text>
              <Text style={[styles.setLabel, styles.checkCol]}>Done</Text>
            </View>
            {draft.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setRow}>
                <Text style={[styles.setNumber, styles.setCol]}>{setIndex + 1}</Text>
                <TextInput
                  accessibilityLabel={`Set ${setIndex + 1} weight`}
                  value={set.weightText}
                  onChangeText={(text) => updateSet(entryIndex, setIndex, { weightText: text })}
                  keyboardType="decimal-pad"
                  style={[styles.setInput, styles.inputCol]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  accessibilityLabel={`Set ${setIndex + 1} reps`}
                  value={set.repsText}
                  onChangeText={(text) => updateSet(entryIndex, setIndex, { repsText: text })}
                  keyboardType="number-pad"
                  style={[styles.setInput, styles.inputCol]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: set.completed }}
                  accessibilityLabel={`Set ${setIndex + 1} completed`}
                  onPress={() => updateSet(entryIndex, setIndex, { completed: !set.completed })}
                  style={[styles.checkBox, styles.checkCol, set.completed && styles.checkBoxDone]}
                >
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={set.completed ? colors.background : colors.textMuted}
                  />
                </Pressable>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => addSet(entryIndex)}
              style={({ pressed }) => [styles.addSetButton, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addSetText}>Add set</Text>
            </Pressable>
          </View>
        ))}

        <Button label="Add exercise" icon="search" variant="ghost" onPress={() => setPickerOpen(true)} />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.flex}>
          <Text style={styles.footerXp}>~{estimatedXp.toLocaleString()} XP</Text>
          <Text style={styles.muted}>{completedSets} sets done</Text>
        </View>
        <Button
          label="Finish workout"
          icon="flash"
          loading={saving}
          disabled={completedSets === 0}
          onPress={() => void finish()}
          style={styles.finishButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function ExercisePicker({
  exercises,
  onPick,
  onClose,
  canClose
}: {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
  canClose: boolean;
}) {
  const { closeModal } = useNavigation();
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");

  const filtered = exercises.filter((exercise) => {
    const matchesMuscle = muscle === "all" || exercise.muscleGroup === muscle;
    const matchesSearch = exercise.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>Add exercise</Text>
          <Text style={styles.pickerTitle}>Exercise library</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={canClose ? "Back to workout" : "Close"}
          onPress={canClose ? onClose : closeModal}
          style={styles.closeButton}
        >
          <Ionicons name={canClose ? "arrow-back" : "close"} size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Search exercises"
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoFocus
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipStrip}
      >
        {MUSCLE_FILTERS.map((filter) => (
          <Chip
            key={filter.key}
            label={filter.label}
            active={muscle === filter.key}
            onPress={() => setMuscle(filter.key)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="search" size={28} color={colors.textMuted} />
            <Text style={styles.muted}>No exercises match “{search}”.</Text>
          </View>
        )}
        {filtered.map((exercise) => (
          <Pressable
            key={exercise.id}
            accessibilityRole="button"
            onPress={() => onPick(exercise)}
            style={({ pressed }) => [styles.exerciseRow, pressed && styles.pressed]}
          >
            <View style={styles.flex}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.muted}>
                {exercise.muscleGroup} · {exercise.equipment}
              </Text>
            </View>
            {exercise.isCompound && (
              <View style={styles.compoundPill}>
                <Text style={styles.compoundText}>Compound</Text>
              </View>
            )}
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  nameInput: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    padding: 0
  },
  pickerTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900"
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 120
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  exerciseHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  exerciseName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "600",
    textTransform: "capitalize"
  },
  setHeaderRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: 2
  },
  setLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  setRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  setCol: {
    width: 28
  },
  inputCol: {
    flex: 1,
    textAlign: "center"
  },
  checkCol: {
    width: 44,
    textAlign: "center"
  },
  setNumber: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: "900"
  },
  setInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
    minHeight: 42,
    paddingHorizontal: spacing.sm
  },
  checkBox: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: "center"
  },
  checkBoxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  addSetButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.xs
  },
  addSetText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "center"
  },
  footer: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    paddingHorizontal: spacing.lg
  },
  footerXp: {
    color: colors.xp,
    fontSize: typography.heading,
    fontWeight: "900"
  },
  finishButton: {
    flex: 1.4
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "700"
  },
  chipStrip: {
    flexGrow: 0,
    marginTop: spacing.sm
  },
  chipRow: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg
  },
  exerciseRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md
  },
  compoundPill: {
    backgroundColor: colors.xpSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3
  },
  compoundText: {
    color: colors.xp,
    fontSize: 10,
    fontWeight: "800"
  },
  emptyWrap: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl
  },
  pressed: {
    opacity: 0.78
  }
});
