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
  History,
  Layers3,
  Play,
  Sparkles,
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
  const todayWorkouts = workouts.filter((workout) => workout.date === todayKey && workout.status !== "missed");
  const activeToday = todayWorkouts.find((workout) => getRemainingSetCount(workout) > 0);
  if (activeToday) return activeToday;

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
    <section className="rounded-[2rem] bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] ring-1 ring-neutral-100 sm:p-7">
      <div className="flex h-full min-h-[232px] flex-col justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Today&apos;s workout
          </p>
          <h2 className="mt-4 max-w-sm text-4xl font-semibold leading-[0.98] tracking-tight text-neutral-950">
            Plan today&apos;s workout
          </h2>
          <p className="mt-3 max-w-md text-base leading-6 text-neutral-500">
            No workout is scheduled right now. Build one or pick a template when you are ready.
          </p>
        </div>
        <Link
          to="/workouts/new"
          className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[1.35rem] bg-blue-600 px-5 py-4 text-base font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-500 active:scale-[0.99] sm:w-auto sm:min-w-56"
        >
          <Play className="h-4 w-4 fill-white" />
          Start Workout
        </Link>
      </div>
    </section>
  );
}

function WorkoutHero({ workout }) {
  const stats = getWorkoutSetStats(workout);
  const hasStarted = stats.completed > 0 && stats.remaining > 0;
  const isFinished = stats.total > 0 && stats.remaining === 0 && stats.completed > 0;
  const remainingExercises = getRemainingExerciseCount(workout);
  const duration = getWorkoutDurationMinutes(workout);
  const calories = getEstimatedCalories(workout);
  const ctaLabel = hasStarted ? "Resume Workout" : isFinished ? "Review Workout" : "Start Workout";

  if (!workout) return <EmptyHero />;

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] ring-1 ring-neutral-100 sm:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-100/80 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-10 h-44 w-44 rounded-full bg-sky-50 blur-3xl" />

      {hasStarted || isFinished ? (
        <div className="relative flex min-h-[232px] flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Workout progress
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-[0.98] tracking-tight text-neutral-950">
                  {stats.percent}%
                </h2>
              </div>
              <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                {stats.completed}/{stats.total}
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${Math.min(stats.percent, 100)}%` }}
              />
            </div>
            <p className="mt-4 text-lg font-semibold text-neutral-950">{workout.name}</p>
            <p className="mt-2 text-base leading-6 text-neutral-500">
              {remainingExercises} exercise{remainingExercises !== 1 ? "s" : ""} remaining ·{" "}
              {stats.remaining} set{stats.remaining !== 1 ? "s" : ""} remaining
            </p>
          </div>

          <Link
            to={getWorkoutHref(workout)}
            className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[1.35rem] bg-blue-600 px-5 py-4 text-base font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-500 active:scale-[0.99]"
          >
            <Play className="h-4 w-4 fill-white" />
            {ctaLabel}
          </Link>
        </div>
      ) : (
        <div className="relative flex min-h-[232px] flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Today&apos;s workout
            </p>
            <h2 className="mt-4 max-w-md text-4xl font-semibold leading-[0.98] tracking-tight text-neutral-950">
              {workout.name}
            </h2>
            <p className="mt-3 text-base leading-6 text-neutral-500">{getWorkoutSubtitle(workout)}</p>

            <div className="mt-6 grid grid-cols-3 divide-x divide-neutral-200 rounded-2xl bg-neutral-50/80 py-4">
              <div className="px-3">
                <p className="text-lg font-semibold tabular-nums text-neutral-950">
                  {duration ? formatDuration(duration) : "—"}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Est. time
                </p>
              </div>
              <div className="px-3">
                <p className="text-lg font-semibold tabular-nums text-neutral-950">{stats.total || "—"}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Planned
                </p>
              </div>
              <div className="px-3">
                <p className="text-lg font-semibold tabular-nums text-neutral-950">
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
            className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[1.35rem] bg-blue-600 px-5 py-4 text-base font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-500 active:scale-[0.99]"
          >
            <Play className="h-4 w-4 fill-white" />
            {ctaLabel}
          </Link>
        </div>
      )}
    </section>
  );
}

function CompactStat({ icon: Icon, label, value, sublabel, progress }) {
  return (
    <div className="rounded-[1.6rem] bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] ring-1 ring-neutral-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-50 text-neutral-500">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {progress != null && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
      <p className="mt-2 text-sm text-neutral-500">{sublabel}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group flex min-h-24 flex-col items-center justify-center rounded-[1.35rem] bg-white p-3 text-center shadow-[0_14px_34px_rgba(15,23,42,0.05)] ring-1 ring-neutral-100 transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(15,23,42,0.08)] active:scale-[0.99]"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 text-sm font-semibold leading-tight text-neutral-900">{label}</span>
    </Link>
  );
}

function RecentWorkoutSection({ workout }) {
  if (!workout) {
    return (
      <section className="rounded-[1.6rem] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] ring-1 ring-neutral-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-neutral-950">Weekly activity</p>
            <p className="mt-2 text-sm text-neutral-500">Your completed workouts will appear here.</p>
          </div>
          <CalendarDays className="h-5 w-5 text-neutral-400" />
        </div>
      </section>
    );
  }

  const completedSets = getCompletedSetCount(workout);
  const exerciseCount = Array.isArray(workout.exercises) ? workout.exercises.length : 0;

  return (
    <section className="rounded-[1.6rem] bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] ring-1 ring-neutral-100">
      <div className="mb-3 flex items-center justify-between gap-4">
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
        className="flex items-center justify-between gap-4 rounded-[1.25rem] bg-neutral-50 p-3.5 transition hover:bg-neutral-100"
      >
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-neutral-950">{workout.name}</p>
          <p className="mt-1 text-sm text-neutral-500">{formatDate(workout.date)}</p>
          <p className="mt-3 text-sm font-medium text-neutral-600">
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
      <div className="mx-auto max-w-5xl animate-pulse space-y-5">
        <div className="h-10 w-72 rounded-2xl bg-neutral-100" />
        <div className="h-72 rounded-[2rem] bg-neutral-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-36 rounded-[1.6rem] bg-neutral-100" />
          <div className="h-36 rounded-[1.6rem] bg-neutral-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-4 pb-4">
      <header className="pt-1">
        <h1 className="max-w-3xl text-[2.35rem] font-semibold leading-[0.98] tracking-tight text-neutral-950 sm:text-5xl">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-2 text-base font-medium text-neutral-500">
          {formatDateLong(todayKey)}
        </p>
      </header>

      <WorkoutHero workout={dashboardWorkout} />

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
        <QuickAction to="/workouts" icon={History} label="History" />
      </section>

      <RecentWorkoutSection workout={lastCompletedWorkout} />

      {!dashboardWorkout && workouts.length === 0 && (
        <Link
          to="/workouts/new"
          className="flex items-center justify-between rounded-[1.6rem] bg-blue-50 p-5 text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100"
        >
          <span className="flex items-center gap-3 text-sm font-semibold">
            <Sparkles className="h-5 w-5" />
            Build your first routine
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
