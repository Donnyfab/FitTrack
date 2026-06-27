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
import { getGoalTypeLabel } from "@/lib/constants";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import {
  Dumbbell,
  Flame,
  Target,
  Calendar,
  Plus,
  ArrowRight,
} from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
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

  const today = new Date().toISOString().split("T")[0];
  const todayWorkout = workouts.find((w) => w.date === today);
  const streak = calculateStreak(workouts);
  const totalWorkouts = workouts.length;
  const activeGoals = goals.length;
  const recentWorkouts = workouts.slice(0, 4);
  const firstName =
    user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">{formatDateLong(today)}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-10">
        <StatCard icon={Calendar} label="Today" value={todayWorkout ? todayWorkout.name : "Rest day"} sublabel={todayWorkout ? todayWorkout.muscleGroup : "No workout logged"} />
        <StatCard icon={Flame} label="Streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} sublabel={streak > 0 ? "Keep it up!" : "Start today"} />
        <StatCard icon={Dumbbell} label="Workouts" value={totalWorkouts} sublabel="All time" />
        <StatCard icon={Target} label="Active Goals" value={activeGoals} sublabel={activeGoals > 0 ? "In progress" : "Set a goal"} />
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">Recent Workouts</h2>
          {recentWorkouts.length > 0 && (
            <Link to="/workouts" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        {recentWorkouts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200">
            <EmptyState icon={Dumbbell} title="No workouts yet" description="Start tracking your fitness journey by logging your first workout." action={<Link to="/workouts/new" className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"><Plus className="w-4 h-4" /> New Workout</Link>} />
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map((workout) => {
              const volume = calculateWorkoutVolume(workout);
              return (
                <Link key={workout.id} to={`/workouts/${workout.id}`} className="flex items-center justify-between bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 hover:shadow-sm transition-all">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900 truncate">{workout.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500">{formatDate(workout.date)}</span>
                      {workout.muscleGroup && (<><span className="text-neutral-300">·</span><span className="text-xs text-neutral-500">{workout.muscleGroup}</span></>)}
                    </div>
                  </div>
                  {volume > 0 && (
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-neutral-900">{volume.toLocaleString()}</p>
                      <p className="text-xs text-neutral-500">lbs volume</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {activeGoals > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-neutral-900">Active Goals</h2>
            <Link to="/goals" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {goals.slice(0, 3).map((goal) => (
              <Link key={goal.id} to="/goals" className="block bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 transition-colors">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="font-medium text-neutral-900">{goal.title}</p>
                  <span className="text-xs text-neutral-400">{getGoalTypeLabel(goal.type)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-neutral-900 rounded-full transition-all" style={{ width: `${goal.progress || 0}%` }} />
                  </div>
                  <span className="text-xs font-medium text-neutral-600">{goal.progress || 0}%</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
