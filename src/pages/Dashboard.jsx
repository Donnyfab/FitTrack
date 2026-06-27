import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  calculateStreak,
  calculateWorkoutVolume,
  formatDate,
  formatDateLong,
} from "@/lib/workoutUtils";
import {
  countSets,
} from "@/lib/fittrackDemoData";
import StatCard from "@/components/StatCard";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Flame,
  HeartPulse,
  Play,
  Plus,
  TrendingUp,
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

export default function Dashboard() {
  const { user, settings } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [w, g] = await Promise.all([
        base44.entities.Workout.list("-date", 100),
        base44.entities.Goal.filter({ status: "active" }, "-created_date", 10),
      ]);
      setWorkouts(w);
      setGoals(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-7 w-56 bg-neutral-100 rounded-lg mb-2" />
        <div className="h-4 w-32 bg-neutral-50 rounded-lg mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-neutral-50 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const today = new Date();
  const todayKey = today.toISOString().split("T")[0];
  const weekStart = startOfWeek(today);
  const weeklyWorkouts = workouts.filter((workout) => {
    const date = new Date(`${workout.date}T00:00:00`);
    return date >= weekStart && date <= today;
  });
  const weeklyVolume = weeklyWorkouts.reduce((sum, workout) => sum + calculateWorkoutVolume(workout), 0);
  const caloriesBurned = weeklyWorkouts.reduce((sum, workout) => sum + (Number(workout.calories) || 0), 0);
  const streak = calculateStreak(workouts);
  const weeklyGoal = Number(settings?.weekly_workout_goal) || 5;
  const goalProgress = Math.min(100, Math.round((weeklyWorkouts.length / weeklyGoal) * 100));
  const todayWorkout = workouts.find((workout) => workout.date === todayKey);
  const recentWorkouts = workouts.slice(0, 4);
  const firstName =
    user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {formatDateLong(todayKey)} · Welcome back to FitTrack
          </p>
        </div>
        <select className="h-10 w-full sm:w-40 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 focus:outline-none focus:border-neutral-400">
          <option>This Week</option>
          <option>Last Week</option>
          <option>This Month</option>
        </select>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon={Dumbbell} label="Workouts this week" value={`${weeklyWorkouts.length} / ${weeklyGoal}`} sublabel="Logged sessions" />
        <StatCard icon={TrendingUp} label="Total volume" value={`${Math.round(weeklyVolume).toLocaleString()}`} sublabel="lbs this week" />
        <StatCard icon={Flame} label="Current streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} sublabel={streak > 0 ? "Keep it steady" : "Start today"} />
        <StatCard icon={Activity} label="Calories burned" value={caloriesBurned ? caloriesBurned.toLocaleString() : "—"} sublabel={caloriesBurned ? "Estimated" : "Not tracked yet"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Today&apos;s Workout</p>
              <h2 className="text-xl font-semibold text-neutral-900 tracking-tight mt-2">
                {todayWorkout?.name || "No workout scheduled"}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {todayWorkout
                  ? `${todayWorkout.muscleGroup || "Workout"} · ${countSets(todayWorkout)} logged sets`
                  : "Schedule or start a workout when you are ready."}
              </p>
            </div>
            <Link
              to={todayWorkout ? `/workouts/${todayWorkout.id}` : "/workouts/new"}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              {todayWorkout ? <Play className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {todayWorkout ? "Start Workout" : "New Workout"}
            </Link>
          </div>
          <div className="mt-5 rounded-xl bg-neutral-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-900">Next step</span>
              <span className="text-neutral-500">{todayWorkout ? "Review your sets before starting." : "Create a workout from your plan."}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Weekly Goal</p>
              <h2 className="text-lg font-semibold text-neutral-900 mt-2">{weeklyWorkouts.length} / {weeklyGoal} workouts</h2>
            </div>
            <CalendarDays className="w-5 h-5 text-neutral-300" />
          </div>
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div className="h-full rounded-full bg-neutral-900" style={{ width: `${goalProgress}%` }} />
          </div>
          <p className="mt-3 text-sm text-neutral-500">
            {weeklyWorkouts.length >= weeklyGoal
              ? "Goal complete. Keep recovery on the plan."
              : `${Math.max(weeklyGoal - weeklyWorkouts.length, 0)} workout${weeklyGoal - weeklyWorkouts.length !== 1 ? "s" : ""} left to close the week.`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-neutral-900">Recent Workouts</h2>
            <Link to="/workouts" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-neutral-100">
            {recentWorkouts.length > 0 ? (
              recentWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  to={`/workouts/${workout.id}`}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 truncate">{workout.name}</p>
                    <p className="text-xs text-neutral-500 mt-1">{formatDate(workout.date)}{workout.muscleGroup ? ` · ${workout.muscleGroup}` : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-neutral-900">{calculateWorkoutVolume(workout).toLocaleString()}</p>
                    <p className="text-xs text-neutral-500">lbs volume</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center">
                <Dumbbell className="w-7 h-7 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-neutral-900">No workouts logged yet</p>
                <p className="text-xs text-neutral-500 mt-1">Your recent workouts will appear here after you log them.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-neutral-900">Body Stats</h2>
            <HeartPulse className="w-4 h-4 text-neutral-300" />
          </div>
          <div className="rounded-xl bg-neutral-50 p-5 text-center">
            <p className="text-sm font-medium text-neutral-900">No body stats recorded</p>
            <p className="text-xs text-neutral-500 mt-1">Weight and body fat trends will appear after you add body stats.</p>
          </div>
        </div>
      </div>

      {goals.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-neutral-900">Active Goal Focus</h2>
            <Link to="/goals" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
              Manage goals
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            {goals.slice(0, 4).map((goal) => (
              <div key={goal.id} className="rounded-xl border border-neutral-200 p-4">
                <p className="font-medium text-neutral-900 truncate">{goal.title}</p>
                <div className="mt-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full rounded-full bg-neutral-900" style={{ width: `${goal.progress || 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-neutral-500">{goal.progress || 0}% complete</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
