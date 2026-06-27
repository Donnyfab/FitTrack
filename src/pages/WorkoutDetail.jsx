import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { calculateWorkoutVolume, formatDateLong } from "@/lib/workoutUtils";
import { countSets, demoWorkouts } from "@/lib/fittrackDemoData";
import {
  ArrowLeft,
  Check,
  Clock,
  Dumbbell,
  MoreHorizontal,
  Pause,
  Pencil,
  Plus,
  Star,
  TimerReset,
  Trash2,
  Trophy,
} from "lucide-react";

const formatTimer = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
};

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [loggedExercises, setLoggedExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workoutSeconds, setWorkoutSeconds] = useState(46 * 60 + 12);
  const [restSeconds, setRestSeconds] = useState(90);
  const [restPaused, setRestPaused] = useState(false);
  const [favoriteExercises, setFavoriteExercises] = useState(["Bench Press"]);

  useEffect(() => {
    loadWorkout();
  }, [id]);

  useEffect(() => {
    const interval = window.setInterval(() => setWorkoutSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (restPaused) return undefined;
    const interval = window.setInterval(() => {
      setRestSeconds((value) => (value > 0 ? value - 1 : 90));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [restPaused]);

  const loadWorkout = async () => {
    try {
      const data = await base44.entities.Workout.get(id);
      setWorkout(data);
      setLoggedExercises(data.exercises || []);
    } catch {
      const fallback = demoWorkouts.find((item) => item.id === id) || null;
      setWorkout(fallback);
      setLoggedExercises(fallback?.exercises || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this workout? This cannot be undone.")) return;
    await base44.entities.Workout.delete(id);
    navigate("/workouts");
  };

  const toggleSet = (exerciseIndex, setIndex) => {
    setLoggedExercises((items) =>
      items.map((exercise, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, currentSetIndex) =>
                currentSetIndex === setIndex ? { ...set, completed: !set.completed } : set
              ),
            }
          : exercise
      )
    );
  };

  const addSet = (exerciseIndex) => {
    setLoggedExercises((items) =>
      items.map((exercise, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? { ...exercise, sets: [...(exercise.sets || []), { weight: 0, reps: 0, completed: false }] }
          : exercise
      )
    );
  };

  const addExercise = () => {
    setLoggedExercises((items) => [
      ...items,
      { name: "New Exercise", sets: [{ weight: 0, reps: 0, completed: false }] },
    ]);
  };

  const toggleFavorite = (exerciseName) => {
    setFavoriteExercises((items) =>
      items.includes(exerciseName)
        ? items.filter((item) => item !== exerciseName)
        : [...items, exerciseName]
    );
  };

  const displayWorkout = useMemo(
    () => (workout ? { ...workout, exercises: loggedExercises } : null),
    [workout, loggedExercises]
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-5 w-20 bg-neutral-100 rounded-lg mb-4" />
        <div className="h-8 w-48 bg-neutral-100 rounded-lg mb-3" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-neutral-50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!displayWorkout) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">Workout not found.</p>
        <Link to="/workouts" className="text-sm text-neutral-900 font-medium hover:underline mt-2 inline-block">
          Back to workouts
        </Link>
      </div>
    );
  }

  const totalVolume = calculateWorkoutVolume(displayWorkout);
  const completedSets = loggedExercises.reduce(
    (sum, exercise) => sum + (exercise.sets || []).filter((set) => set.completed).length,
    0
  );
  const exerciseCount = loggedExercises.length;
  const nextExercise = loggedExercises.find((exercise) =>
    (exercise.sets || []).some((set) => !set.completed)
  );

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/workouts" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Workouts
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight break-words">{displayWorkout.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm text-neutral-500">{formatDateLong(displayWorkout.date)}</span>
            {displayWorkout.muscleGroup && (
              <>
                <span className="text-neutral-300">·</span>
                <span className="text-sm text-neutral-500">{displayWorkout.muscleGroup}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/workouts/${id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            <MoreHorizontal className="w-4 h-4" /> More
          </button>
          {!id?.startsWith("demo") && (
            <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Active timer</p>
            <Clock className="w-4 h-4 text-neutral-300" />
          </div>
          <p className="text-2xl font-semibold text-neutral-900">{formatTimer(workoutSeconds)}</p>
          <p className="text-xs text-neutral-500 mt-1">Workout in progress</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Rest timer</p>
            <TimerReset className="w-4 h-4 text-neutral-300" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-semibold text-neutral-900">{formatTimer(restSeconds)}</p>
            <button
              onClick={() => setRestPaused((value) => !value)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Pause className="w-3.5 h-3.5" />
              {restPaused ? "Resume" : "Pause"}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Exercises</p>
          <p className="text-2xl font-semibold text-neutral-900">{exerciseCount}</p>
          <p className="text-xs text-neutral-500 mt-1">{completedSets} sets completed</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Total volume</p>
          <p className="text-2xl font-semibold text-neutral-900">{totalVolume.toLocaleString()}</p>
          <p className="text-xs text-neutral-500 mt-1">lbs · {countSets(displayWorkout)} sets</p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-900">Next exercise/rest suggestion</p>
            <p className="text-sm text-neutral-500 mt-1">
              {nextExercise ? `Next: ${nextExercise.name}. Rest 90 seconds, then match last set quality.` : "All planned sets are checked off."}
            </p>
          </div>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800">
            <Check className="w-4 h-4" />
            Finish Workout
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loggedExercises.map((exercise, exerciseIndex) => (
          <div key={`${exercise.name}-${exerciseIndex}`} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-neutral-900 truncate">{exercise.name}</p>
                  {exerciseIndex === 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                      <Trophy className="w-3 h-3" /> New PR
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Last time: {exerciseIndex === 0 ? "205 lb x 6" : "Matched target reps"}</p>
              </div>
              <button
                onClick={() => toggleFavorite(exercise.name)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                aria-label={`Favorite ${exercise.name}`}
              >
                <Star className={`w-4 h-4 ${favoriteExercises.includes(exercise.name) ? "fill-neutral-900 text-neutral-900" : ""}`} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    <th className="px-4 py-2 w-20">Set</th>
                    <th className="px-4 py-2">Weight</th>
                    <th className="px-4 py-2">Reps</th>
                    <th className="px-4 py-2 text-right">Done</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {(exercise.sets || []).map((set, setIndex) => (
                    <tr key={setIndex}>
                      <td className="px-4 py-3 text-neutral-500">Set {setIndex + 1}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{Number(set.weight) || 0} lb</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{Number(set.reps) || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="checkbox"
                          checked={Boolean(set.completed)}
                          onChange={() => toggleSet(exerciseIndex, setIndex)}
                          className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
                          aria-label={`Complete ${exercise.name} set ${setIndex + 1}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-neutral-100 px-4 py-3">
              <button
                onClick={() => addSet(exerciseIndex)}
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                <Plus className="w-4 h-4" />
                Add Set
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addExercise}
        className="w-full rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
      >
        <Plus className="w-4 h-4 inline mr-2" />
        Add Exercise
      </button>

      {displayWorkout.notes && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{displayWorkout.notes}</p>
        </div>
      )}
    </div>
  );
}
