import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { calculateWorkoutVolume, formatDate } from "@/lib/workoutUtils";
import { countSets, mergeWithDemoWorkouts } from "@/lib/fittrackDemoData";
import EmptyState from "@/components/EmptyState";
import {
  ChevronRight,
  Dumbbell,
  Filter,
  Plus,
  Search,
  Star,
} from "lucide-react";

const tabs = ["All Workouts", "Favorites", "Templates"];

export default function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All Workouts");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState("All");

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

  const displayWorkouts = useMemo(() => mergeWithDemoWorkouts(workouts), [workouts]);
  const muscleGroups = useMemo(
    () => ["All", ...new Set(displayWorkouts.map((workout) => workout.muscleGroup?.split(",")[0]).filter(Boolean))],
    [displayWorkouts]
  );

  const filtered = displayWorkouts.filter((workout) => {
    const matchesTab =
      activeTab === "All Workouts" ||
      (activeTab === "Favorites" && workout.favorite) ||
      (activeTab === "Templates" && workout.template);
    const matchesQuery = `${workout.name} ${workout.muscleGroup}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesMuscle =
      muscleFilter === "All" || workout.muscleGroup?.toLowerCase().includes(muscleFilter.toLowerCase());
    return matchesTab && matchesQuery && matchesMuscle;
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-7 w-32 bg-neutral-100 rounded-lg mb-6" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-neutral-50 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Workouts</h1>
          <p className="text-sm text-neutral-500 mt-1">Browse history, favorites, and reusable templates.</p>
        </div>
        <Link to="/workouts/new" className="inline-flex h-10 items-center justify-center gap-2 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
          <Plus className="w-4 h-4" /> New Workout
        </Link>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-9 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workouts"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>
          <button
            onClick={() => setShowFilters((value) => !value)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {muscleGroups.map((group) => (
              <button
                key={group}
                onClick={() => setMuscleFilter(group)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  muscleFilter === group
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState
            icon={Dumbbell}
            title="No workouts found"
            description="Try another search, filter, or tab."
            action={
              <Link to="/workouts/new" className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
                <Plus className="w-4 h-4" /> New Workout
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((workout) => {
            const volume = calculateWorkoutVolume(workout);
            const exerciseCount = workout.exercises?.length || 0;
            const href = workout.id?.startsWith("demo") ? "/workouts/new" : `/workouts/${workout.id}`;
            return (
              <Link
                key={workout.id}
                to={href}
                className="grid gap-3 bg-white rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 hover:shadow-sm transition-all md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0 flex items-start gap-3">
                  <div className="mt-0.5 w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-neutral-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-neutral-900 truncate">{workout.name}</p>
                      {workout.favorite && <Star className="w-3.5 h-3.5 text-neutral-400 fill-neutral-400" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-neutral-500">{formatDate(workout.date)}</span>
                      {workout.muscleGroup && <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{workout.muscleGroup}</span>}
                      {workout.template && <span className="text-xs text-neutral-400">Template</span>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 md:w-[320px] md:items-center">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{exerciseCount}</p>
                    <p className="text-xs text-neutral-500">Exercises</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{countSets(workout)}</p>
                    <p className="text-xs text-neutral-500">Sets</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{volume.toLocaleString()}</p>
                      <p className="text-xs text-neutral-500">lbs</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300 hidden md:block" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
