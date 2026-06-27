import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { calculateWorkoutVolume, formatDate } from "@/lib/workoutUtils";
import { MUSCLE_GROUPS } from "@/lib/constants";
import EmptyState from "@/components/EmptyState";
import { Plus, Dumbbell, ChevronRight } from "lucide-react";

export default function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const data = await base44.entities.Workout.list("-date", 200);
      setWorkouts(data);
    } finally {
      setLoading(false);
    }
  };

  const filtered =
    filter === "all"
      ? workouts
      : workouts.filter((w) => w.muscleGroup === filter);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-7 w-32 bg-neutral-100 rounded-lg mb-6" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-neutral-50 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Workouts</h1>
        <Link to="/workouts/new" className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
          <Plus className="w-4 h-4" /> New
        </Link>
      </div>
      {workouts.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          <button onClick={() => setFilter("all")} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === "all" ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300"}`}>All</button>
          {MUSCLE_GROUPS.map((group) => (
            <button key={group} onClick={() => setFilter(group)} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === group ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300"}`}>{group}</button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={Dumbbell} title={workouts.length === 0 ? "No workouts yet" : "No workouts found"} description={workouts.length === 0 ? "Log your first workout to start tracking your progress." : "Try a different filter."} action={workouts.length === 0 ? <Link to="/workouts/new" className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"><Plus className="w-4 h-4" /> New Workout</Link> : undefined} />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((workout) => {
            const volume = calculateWorkoutVolume(workout);
            const exerciseCount = workout.exercises?.length || 0;
            return (
              <Link key={workout.id} to={`/workouts/${workout.id}`} className="flex items-center justify-between bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 hover:shadow-sm transition-all">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900">{workout.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-neutral-500">{formatDate(workout.date)}</span>
                    {workout.muscleGroup && <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{workout.muscleGroup}</span>}
                    <span className="text-xs text-neutral-400">{exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  {volume > 0 && <div className="text-right"><p className="text-sm font-medium text-neutral-900">{volume.toLocaleString()}</p><p className="text-xs text-neutral-500">lbs</p></div>}
                  <ChevronRight className="w-4 h-4 text-neutral-300" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
