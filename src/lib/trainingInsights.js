import { calculateWorkoutVolume } from "@/lib/workoutUtils";

const DAY_MS = 86400000;
export const WORKOUT_DRAFT_STORAGE_KEY = "fittrack-workout-draft";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const normalized = (value) => String(value || "").trim().toLowerCase();

export function getSetCount(workout) {
  return (workout?.exercises || []).reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0);
}

export function getCompletedSetCount(workout) {
  const isCompletedWorkout = (workout?.status || "completed") === "completed";
  return (workout?.exercises || []).reduce(
    (sum, exercise) =>
      sum +
      (exercise.sets || []).filter((set) => {
        const hasLoggedValue = toNumber(set.weight) > 0 || toNumber(set.reps) > 0;
        return Boolean(set.completed) || (isCompletedWorkout && hasLoggedValue);
      }).length,
    0
  );
}

export function getRemainingSetCount(workout) {
  return Math.max(getSetCount(workout) - getCompletedSetCount(workout), 0);
}

export function getWorkoutDurationMinutes(workout) {
  const explicit = toNumber(workout?.durationMinutes || workout?.duration_minutes);
  if (explicit > 0) return explicit;

  const completedSets = getCompletedSetCount(workout);
  const plannedSets = getSetCount(workout);
  const setBasis = completedSets || plannedSets;
  if (!setBasis) return 0;

  return Math.max(18, Math.round(setBasis * 2.75 + (workout?.exercises?.length || 0) * 2));
}

export function formatDuration(minutes) {
  if (!minutes) return "Not timed";
  return `${Math.round(minutes)} min`;
}

export function bestSetFromSets(sets = []) {
  return sets
    .filter((set) => toNumber(set.weight) > 0 || toNumber(set.reps) > 0)
    .map((set, index) => ({
      ...set,
      setIndex: index,
      weight: toNumber(set.weight),
      reps: toNumber(set.reps),
      oneRepMax: estimateOneRepMax(set.weight, set.reps),
    }))
    .sort((a, b) => {
      if (b.oneRepMax !== a.oneRepMax) return b.oneRepMax - a.oneRepMax;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.reps - a.reps;
    })[0] || null;
}

export function estimateOneRepMax(weight, reps) {
  const numericWeight = toNumber(weight);
  const numericReps = toNumber(reps);
  if (!numericWeight || !numericReps) return 0;
  if (numericReps === 1) return numericWeight;
  return Math.round(numericWeight * (1 + numericReps / 30));
}

export function formatSetPerformance(set) {
  if (!set) return "No history yet";
  const weight = toNumber(set.weight);
  const reps = toNumber(set.reps);
  if (!weight && !reps) return "No history yet";
  if (!weight) return `${reps} reps`;
  return `${weight.toLocaleString()} lb x ${reps || 0}`;
}

export function getExerciseHistory(workouts, exerciseName, options = {}) {
  const target = normalized(exerciseName);
  if (!target) return [];
  const before = options.beforeDate ? new Date(`${options.beforeDate}T23:59:59`) : null;
  const excludeWorkoutId = options.excludeWorkoutId;

  return (workouts || [])
    .filter((workout) => {
      if (excludeWorkoutId && workout.id === excludeWorkoutId) return false;
      if (before && new Date(`${workout.date}T00:00:00`) > before) return false;
      return (workout.exercises || []).some((exercise) => normalized(exercise.name) === target);
    })
    .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))
    .map((workout) => {
      const exercise = (workout.exercises || []).find((item) => normalized(item.name) === target);
      const bestSet = bestSetFromSets(exercise?.sets || []);
      return {
        workout,
        exercise,
        bestSet,
        completedSets: getCompletedSetCount({ ...workout, exercises: [exercise] }),
      };
    })
    .filter((entry) => entry.exercise)
    .slice(0, options.limit || 12);
}

export function getLastExercisePerformance(workouts, exerciseName, options = {}) {
  return getExerciseHistory(workouts, exerciseName, { ...options, limit: 1 })[0] || null;
}

export function getExercisePersonalRecord(workouts, exerciseName, options = {}) {
  const history = getExerciseHistory(workouts, exerciseName, { ...options, limit: 500 });
  return history
    .filter((entry) => entry.bestSet)
    .sort((a, b) => {
      if (b.bestSet.oneRepMax !== a.bestSet.oneRepMax) return b.bestSet.oneRepMax - a.bestSet.oneRepMax;
      if (b.bestSet.weight !== a.bestSet.weight) return b.bestSet.weight - a.bestSet.weight;
      return b.bestSet.reps - a.bestSet.reps;
    })[0] || null;
}

export function getTryTodaySuggestion(lastEntry) {
  const set = lastEntry?.bestSet;
  if (!set) return "Build a baseline today.";
  const nextWeight = set.weight >= 95 ? set.weight + 5 : set.weight > 0 ? set.weight + 2.5 : 0;
  if (nextWeight) return `Try today: ${nextWeight.toLocaleString()} lb x ${Math.max(set.reps - 1, 1)}`;
  return `Try today: ${set.reps + 1} reps`;
}

export function beatsSet(currentSet, previousSet) {
  if (!currentSet || !previousSet) return false;
  const currentOneRepMax = estimateOneRepMax(currentSet.weight, currentSet.reps);
  const previousOneRepMax = estimateOneRepMax(previousSet.weight, previousSet.reps);
  if (!currentOneRepMax || !previousOneRepMax) return false;
  if (currentOneRepMax !== previousOneRepMax) return currentOneRepMax > previousOneRepMax;
  if (toNumber(currentSet.weight) !== toNumber(previousSet.weight)) return toNumber(currentSet.weight) > toNumber(previousSet.weight);
  return toNumber(currentSet.reps) > toNumber(previousSet.reps);
}

export function detectWorkoutPRs(workout, previousWorkouts = []) {
  return (workout?.exercises || []).flatMap((exercise) => {
    const currentBest = bestSetFromSets(exercise.sets || []);
    const previousBestEntry = getExercisePersonalRecord(previousWorkouts, exercise.name, {
      beforeDate: workout.date,
      excludeWorkoutId: workout.id,
    });
    if (!beatsSet(currentBest, previousBestEntry?.bestSet)) return [];
    return [{
      exercise: exercise.name,
      weight: currentBest.weight,
      reps: currentBest.reps,
      oneRepMax: currentBest.oneRepMax,
      previousWeight: previousBestEntry.bestSet.weight,
      previousReps: previousBestEntry.bestSet.reps,
      setIndex: currentBest.setIndex,
    }];
  });
}

export function getLatestPR(workouts) {
  const sorted = [...(workouts || [])].sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`));
  for (const workout of sorted) {
    const previous = sorted.filter((item) => new Date(`${item.date}T00:00:00`) < new Date(`${workout.date}T00:00:00`));
    const prs = detectWorkoutPRs(workout, previous);
    if (prs.length) return { workout, pr: prs[0] };
  }
  return null;
}

export function getImprovementInsight(workouts) {
  const latest = getLatestPR(workouts);
  if (latest?.pr) {
    const delta = latest.pr.weight - latest.pr.previousWeight;
    return {
      title: "Improvement",
      value: `${delta > 0 ? "+" : ""}${delta.toLocaleString()} lb`,
      sublabel: `${latest.pr.exercise} vs last best`,
    };
  }

  const latestCompleted = (workouts || []).find((workout) => (workout.status || "completed") === "completed");
  if (!latestCompleted) {
    return { title: "Improvement", value: "—", sublabel: "Beat a prior set to see progress" };
  }

  return {
    title: "Improvement",
    value: `${getCompletedSetCount(latestCompleted)} sets`,
    sublabel: "Completed in latest workout",
  };
}

export function getWeeklySetSummary(workouts, startDate, endDate) {
  const rows = (workouts || []).filter((workout) => {
    const date = new Date(`${workout.date}T00:00:00`);
    return date >= startDate && date <= endDate;
  });
  return {
    planned: rows.reduce((sum, workout) => sum + getSetCount(workout), 0),
    completed: rows.reduce((sum, workout) => sum + getCompletedSetCount(workout), 0),
  };
}

export function getWorkoutStatusLabel(workout) {
  const status = workout?.status || "completed";
  if (status === "planned") return "Planned";
  if (status === "scheduled") return "Scheduled";
  if (status === "missed") return "Missed";
  return "Completed";
}

export function createWorkoutDraftFromTemplate(source, options = {}) {
  if (!source) return null;
  return {
    name: options.name || source.name || "New Workout",
    date: options.date || new Date().toISOString().split("T")[0],
    muscleGroup: source.muscleGroup || "",
    notes: options.notes ?? source.notes ?? "",
    status: options.status || "planned",
    favorite: false,
    template: false,
    calories: "",
    exercises: (source.exercises || []).map((exercise) => ({
      name: exercise.name,
      sets: (exercise.sets?.length ? exercise.sets : [{ weight: "", reps: "" }]).map((set) => ({
        weight: set.weight ?? "",
        reps: set.reps ?? "",
        restSeconds: set.restSeconds ?? 90,
        completed: false,
      })),
    })),
  };
}

export function writeWorkoutDraft(draft) {
  if (typeof window === "undefined" || !draft) return;
  window.sessionStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function readWorkoutDraft() {
  if (typeof window === "undefined") return null;
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY) || "null");
    return draft && typeof draft === "object" ? draft : null;
  } catch {
    return null;
  }
}

export function clearWorkoutDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(WORKOUT_DRAFT_STORAGE_KEY);
}

export function getStarterRoutine(split = "push_pull_legs", day = "Push") {
  const library = {
    Push: ["Bench Press", "Incline Dumbbell Press", "Overhead Press", "Lateral Raise"],
    Pull: ["Pull-Up", "Barbell Row", "EZ-Bar Curl"],
    Legs: ["Back Squat", "Romanian Deadlift"],
    "Full Body": ["Bench Press", "Barbell Row", "Back Squat", "Hanging Knee Raise"],
    Upper: ["Bench Press", "Pull-Up", "Overhead Press", "EZ-Bar Curl"],
    Lower: ["Back Squat", "Romanian Deadlift", "Hanging Knee Raise"],
  };
  const names = library[day] || library.Push;
  return {
    name: split === "full_body" ? "Full Body" : `${day} Day`,
    date: new Date().toISOString().split("T")[0],
    muscleGroup: day === "Pull" ? "Back" : day === "Legs" || day === "Lower" ? "Legs" : day === "Full Body" ? "Full Body" : "Chest",
    notes: "Starter routine. Adjust exercises, sets, reps, and weights before saving.",
    status: "planned",
    exercises: names.map((name) => ({
      name,
      sets: [
        { weight: "", reps: "8", completed: false },
        { weight: "", reps: "8", completed: false },
        { weight: "", reps: "8", completed: false },
      ],
    })),
  };
}

export function getEarnedBadges(workouts = []) {
  const completedWorkouts = workouts.filter((workout) => (workout.status || "completed") === "completed");
  const completedSets = completedWorkouts.reduce((sum, workout) => sum + getCompletedSetCount(workout), 0);
  const badges = [];
  if (completedWorkouts.length >= 1) badges.push({ title: "First workout completed", description: "Logged your first training session." });
  if (completedWorkouts.length >= 10) badges.push({ title: "10 workouts logged", description: "Built a real training history." });
  if (completedSets >= 100) badges.push({ title: "100 sets completed", description: "Stacked a serious amount of work." });
  if (getLatestPR(workouts)) badges.push({ title: "New strength PR", description: "Beat a previous best set." });
  return badges;
}

export function getConsistencyByWeek(workouts, numberOfWeeks = 6) {
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekStart.setDate(today.getDate() - today.getDay());

  return Array.from({ length: numberOfWeeks }, (_, index) => {
    const start = new Date(currentWeekStart);
    start.setDate(currentWeekStart.getDate() - (numberOfWeeks - 1 - index) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const count = (workouts || []).filter((workout) => {
      const date = new Date(`${workout.date}T00:00:00`);
      return (workout.status || "completed") === "completed" && date >= start && date <= end;
    }).length;
    return {
      week: start.toISOString().split("T")[0],
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      workouts: count,
    };
  });
}

export function getMissedWorkoutCount(workouts = []) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return workouts.filter((workout) => {
    const date = new Date(`${workout.date}T00:00:00`);
    return workout.status === "missed" || ((workout.status === "planned" || workout.status === "scheduled") && date < today);
  }).length;
}

export function getNextScheduledWorkout(workouts = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return [...workouts]
    .filter((workout) => {
      const date = new Date(`${workout.date}T00:00:00`);
      return (workout.status === "planned" || workout.status === "scheduled") && date >= today;
    })
    .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`))[0] || null;
}

export function getHumanWorkoutMetric(workouts, periodWorkouts, weeklySets, nextWorkout) {
  const options = [
    {
      title: "Sets completed",
      value: `${weeklySets.completed} / ${weeklySets.planned || 0}`,
      sublabel: "planned sets this week",
    },
    {
      title: "Next workout",
      value: nextWorkout?.name || "Plan today",
      sublabel: nextWorkout ? `${nextWorkout.muscleGroup || "Workout"} · ${nextWorkout.date}` : "No scheduled workout",
    },
    getImprovementInsight(workouts.length ? workouts : periodWorkouts),
  ];

  const index = Math.floor(Date.now() / 8000) % options.length;
  return options[index];
}

export function getWorkoutVolumeLabel(workout) {
  const volume = calculateWorkoutVolume(workout);
  return volume > 0 ? `${Math.round(volume).toLocaleString()} lb` : "No volume";
}

export function daysBetween(dateA, dateB) {
  const a = new Date(`${dateA}T00:00:00`);
  const b = new Date(`${dateB}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
