import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getUserFirstName } from "@/lib/userDisplay";
import {
  calculateStreak,
  formatDate,
  formatDateLong,
} from "@/lib/workoutUtils";
import { countSets } from "@/lib/fittrackDemoData";
import {
  formatDuration,
  getCompletedSetCount,
  getNextScheduledWorkout,
  getRemainingSetCount,
  getWorkoutDurationMinutes,
} from "@/lib/trainingInsights";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Flame,
  Layers3,
  Play,
  Square,
  Target,
} from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function isCompleted(workout) {
  return (workout?.status || "completed") === "completed";
}

function getWorkoutSetStats(workout) {
  if (!workout) {
    return { completed: 0, total: 0, remaining: 0, percent: 0 };
  }

  const total = countSets(workout);
  const completed = getCompletedSetCount(workout);
  const remaining = Math.max(total - completed, 0);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, remaining, percent };
}

function getRemainingExerciseCount(workout) {
  if (!Array.isArray(workout?.exercises)) return 0;
  return workout.exercises.filter((exercise) => {
    const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
    if (sets.length === 0) return true;
    return sets.some((set) => !set.completed);
  }).length;
}

function getExerciseStats(workout) {
  const total = Array.isArray(workout?.exercises) ? workout.exercises.length : 0;
  const remaining = getRemainingExerciseCount(workout);
  return {
    completed: Math.max(total - remaining, 0),
    total,
    remaining,
  };
}

function getEstimatedMinutesRemaining(workout) {
  const stats = getWorkoutSetStats(workout);
  if (!stats.remaining) return 0;

  const duration = getWorkoutDurationMinutes(workout);
  if (duration && stats.total) {
    return Math.max(1, Math.round(duration * (stats.remaining / stats.total)));
  }

  return Math.max(1, stats.remaining * 2);
}

function getEstimatedCalories(workout) {
  if (!workout) return null;
  const savedCalories = Number(workout.calories);
  if (savedCalories > 0) return savedCalories;

  const duration = getWorkoutDurationMinutes(workout);
  const sets = countSets(workout);
  if (!duration && !sets) return null;

  return Math.max(90, Math.round((duration || 25) * 5.5 + sets * 5));
}

function getWorkoutSubtitle(workout) {
  if (!workout) return "No scheduled workout";
  const groups = workout.muscleGroup || "Workout";
  const exerciseCount = Array.isArray(workout.exercises) ? workout.exercises.length : 0;
  return `${groups}${exerciseCount ? ` · ${exerciseCount} exercise${exerciseCount !== 1 ? "s" : ""}` : ""}`;
}

function getWorkoutHref(workout) {
  return workout?.id ? `/workouts/${workout.id}` : "/workouts/new";
}

function getDashboardWorkout(workouts, todayKey) {
  const unfinished = workouts.filter((workout) => {
    const stats = getWorkoutSetStats(workout);
    return stats.completed > 0 && stats.remaining > 0 && workout.status !== "missed";
  });

  const activeToday = unfinished.find((workout) => workout.date === todayKey);
  if (activeToday) return activeToday;

  const activeAnytime = unfinished.find((workout) => workout.date <= todayKey);
  if (activeAnytime) return activeAnytime;

  const todayWorkouts = workouts.filter((workout) => workout.date === todayKey && workout.status !== "missed");
  const plannedToday = todayWorkouts.find((workout) => getRemainingSetCount(workout) > 0);
  if (plannedToday) return plannedToday;

  const overdueActive = workouts.find(
    (workout) =>
      ["planned", "scheduled"].includes(workout.status) &&
      workout.date <= todayKey &&
      getRemainingSetCount(workout) > 0
  );
  if (overdueActive) return overdueActive;

  return getNextScheduledWorkout(workouts) || todayWorkouts[0] || null;
}

function EmptyHero() {
  return (
    <section className="rounded-[1.65rem] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] ring-1 ring-neutral-100 sm:p-5">
      <div className="flex min-h-[150px] flex-col justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-blue-600">
            Today&apos;s workout
          </p>
          <h2 className="mt-3 max-w-sm text-2xl font-semibold tracking-tight text-neutral-950">
            No workout scheduled.
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-5 text-neutral-500">
            Create a workout when you are ready to train.
          </p>
        </div>
        <Link
          to="/workouts/new"
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(37,99,235,0.25)] transition hover:bg-blue-500 active:scale-[0.99] sm:w-auto sm:min-w-48"
        >
          <Play className="h-4 w-4 fill-white" />
          Create Workout
        </Link>
      </div>
    </section>
  );
}

function WorkoutHero({ workout, onEndWorkout, ending }) {
  const stats = getWorkoutSetStats(workout);
  const hasStarted = stats.completed > 0 && stats.remaining > 0;
  const exerciseStats = getExerciseStats(workout);
  const duration = getWorkoutDurationMinutes(workout);
  const calories = getEstimatedCalories(workout);
  const minutesRemaining = getEstimatedMinutesRemaining(workout);

  if (!workout) return <EmptyHero />;

  if (hasStarted) {
    return (
      <section className="relative overflow-hidden rounded-[1.65rem] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] ring-1 ring-neutral-100 sm:p-5">
        <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-blue-100/80 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-blue-600">
                Workout in progress
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                {workout.name}
              </h2>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-neutral-950">
              {stats.percent}%
            </p>
          </div>

          <p className="mt-1 text-sm font-semibold text-neutral-500">Complete</p>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${Math.min(stats.percent, 100)}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-2xl bg-neutral-50 p-2.5">
              <p className="font-semibold text-neutral-950">
                {exerciseStats.completed} / {exerciseStats.total}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">exercises</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-2.5">
              <p className="font-semibold text-neutral-950">
                {stats.completed} / {stats.total}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">sets</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-2.5">
              <p className="font-semibold text-neutral-950">{minutesRemaining} min</p>
              <p className="mt-0.5 text-xs text-neutral-500">remaining</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <Link
              to={getWorkoutHref(workout)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[1.1rem] bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(37,99,235,0.25)] transition hover:bg-blue-500 active:scale-[0.99]"
            >
              <Play className="h-4 w-4 fill-white" />
              Resume Workout
            </Link>
            <button
              type="button"
              onClick={() => onEndWorkout?.(workout)}
              disabled={ending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[1.1rem] bg-neutral-100 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Square className="h-3.5 w-3.5" />
              {ending ? "Ending" : "End"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[1.65rem] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)] ring-1 ring-neutral-100 sm:p-5">
      <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-blue-100/80 blur-3xl" />
      <div className="relative flex min-h-[170px] flex-col justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-blue-600">
            Today&apos;s workout
          </p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight text-neutral-950">
            {workout.name}
          </h2>
          <p className="mt-1.5 text-sm leading-5 text-neutral-500">{getWorkoutSubtitle(workout)}</p>

          <div className="mt-4 grid grid-cols-3 divide-x divide-neutral-200 rounded-2xl bg-neutral-50/80 py-3">
            <div className="px-2.5">
              <p className="text-base font-semibold tabular-nums text-neutral-950">
                {duration ? formatDuration(duration) : "—"}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Est. time
              </p>
            </div>
            <div className="px-2.5">
              <p className="text-base font-semibold tabular-nums text-neutral-950">{stats.total || "—"}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Planned
              </p>
            </div>
            <div className="px-2.5">
              <p className="text-base font-semibold tabular-nums text-neutral-950">
                {calories ? calories.toLocaleString() : "—"}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Est. burn
              </p>
            </div>
          </div>
        </div>

        <Link
          to={getWorkoutHref(workout)}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(37,99,235,0.25)] transition hover:bg-blue-500 active:scale-[0.99]"
        >
          <Play className="h-4 w-4 fill-white" />
          Start Workout
        </Link>
      </div>
    </section>
  );
}

function CompactStat({ icon: Icon, label, value, sublabel, progress }) {
  return (
    <div className="rounded-[1.35rem] bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.055)] ring-1 ring-neutral-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-neutral-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-50 text-neutral-500">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {progress != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
      <p className="mt-1.5 text-xs text-neutral-500">{sublabel}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group flex min-h-20 flex-col items-center justify-center rounded-[1.2rem] bg-white p-2.5 text-center shadow-[0_10px_26px_rgba(15,23,42,0.045)] ring-1 ring-neutral-100 transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)] active:scale-[0.99]"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="mt-2 text-xs font-semibold leading-tight text-neutral-900">{label}</span>
    </Link>
  );
}

function RecentWorkoutSection({ workout }) {
  if (!workout) {
    return (
      <section className="rounded-[1.35rem] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.055)] ring-1 ring-neutral-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-neutral-950">Weekly activity</p>
            <p className="mt-1 text-sm text-neutral-500">Your completed workouts will appear here.</p>
          </div>
          <CalendarDays className="h-5 w-5 text-neutral-400" />
        </div>
      </section>
    );
  }

  const completedSets = getCompletedSetCount(workout);
  const exerciseCount = Array.isArray(workout.exercises) ? workout.exercises.length : 0;

  return (
    <section className="rounded-[1.35rem] bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.055)] ring-1 ring-neutral-100">
      <div className="mb-2.5 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-neutral-950">Recent workout</h2>
        <Link
          to="/workouts"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-500"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <Link
        to={getWorkoutHref(workout)}
        className="flex items-center justify-between gap-4 rounded-[1.1rem] bg-neutral-50 p-3 transition hover:bg-neutral-100"
      >
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-neutral-950">{workout.name}</p>
          <p className="mt-1 text-sm text-neutral-500">{formatDate(workout.date)}</p>
          <p className="mt-2 text-sm font-medium text-neutral-600">
            {formatDuration(getWorkoutDurationMinutes(workout))} · {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} ·{" "}
            {completedSets} set{completedSets !== 1 ? "s" : ""}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
      </Link>
    </section>
  );
}

export default function Dashboard() {
  const { user, settings } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [endingWorkoutId, setEndingWorkoutId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const w = await base44.entities.Workout.list("-date", 100);
      setWorkouts(w);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const endWorkout = async (workout) => {
    if (!workout?.id) return;

    const completedExercises = (workout.exercises || []).map((exercise) => ({
      ...exercise,
      sets: (exercise.sets || []).map((set) => ({ ...set, completed: true })),
    }));
    const completedWorkout = {
      ...workout,
      status: "completed",
      date: workout.date || todayKey,
      exercises: completedExercises,
    };

    setEndingWorkoutId(workout.id);
    setWorkouts((current) =>
      current.map((item) => (item.id === workout.id ? completedWorkout : item))
    );

    try {
      await base44.entities.Workout.update(workout.id, {
        status: "completed",
        date: completedWorkout.date,
        exercises: completedExercises,
      });
    } catch (error) {
      console.error(error);
      loadData();
    } finally {
      setEndingWorkoutId(null);
    }
  };

  const today = new Date();
  const todayKey = today.toISOString().split("T")[0];
  const weekStart = startOfWeek(today);
  const firstName = getUserFirstName(user, "there");
  const weeklyGoal = Number(settings?.weekly_workout_goal) || 5;

  const weeklyWorkouts = useMemo(
    () =>
      workouts.filter((workout) => {
        const date = new Date(`${workout.date}T00:00:00`);
        return isCompleted(workout) && date >= weekStart && date <= today;
      }),
    [workouts, weekStart, today]
  );

  const dashboardWorkout = useMemo(
    () => getDashboardWorkout(workouts, todayKey),
    [workouts, todayKey]
  );
  const lastCompletedWorkout = workouts.find((workout) => isCompleted(workout));
  const streak = calculateStreak(workouts);
  const weeklyProgress = Math.min(100, Math.round((weeklyWorkouts.length / weeklyGoal) * 100));

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse space-y-4">
        <div className="h-8 w-64 rounded-2xl bg-neutral-100" />
        <div className="h-48 rounded-[1.65rem] bg-neutral-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-[1.35rem] bg-neutral-100" />
          <div className="h-28 rounded-[1.35rem] bg-neutral-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-3.5 pb-4">
      <header className="pt-1">
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-neutral-950 sm:text-4xl">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm font-medium text-neutral-500">
          {formatDateLong(todayKey)}
        </p>
      </header>

      <WorkoutHero
        workout={dashboardWorkout}
        onEndWorkout={endWorkout}
        ending={endingWorkoutId === dashboardWorkout?.id}
      />

      <section className="grid grid-cols-2 gap-3">
        <CompactStat
          icon={Flame}
          label="Current streak"
          value={`${streak} day${streak !== 1 ? "s" : ""}`}
          sublabel={streak > 0 ? "Keep it going" : "Start today"}
        />
        <CompactStat
          icon={Dumbbell}
          label="This week"
          value={`${weeklyWorkouts.length} / ${weeklyGoal}`}
          sublabel="Weekly progress"
          progress={weeklyProgress}
        />
      </section>

      <section className="grid grid-cols-3 gap-3" aria-label="Quick actions">
        <QuickAction to="/exercise" icon={BookOpen} label="Exercise Library" />
        <QuickAction to="/workouts?tab=templates" icon={Layers3} label="Workout Templates" />
        <QuickAction to="/goals" icon={Target} label="Goals" />
      </section>

      <RecentWorkoutSection workout={lastCompletedWorkout} />
    </div>
  );
}
