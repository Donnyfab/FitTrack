import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { calculateWorkoutVolume, formatDateLong } from "@/lib/workoutUtils";
import { countSets, exerciseCatalog } from "@/lib/fittrackDemoData";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Dumbbell,
  MoreHorizontal,
  Pause,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  TimerReset,
  Trash2,
  X,
} from "lucide-react";

const formatTimer = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
};

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [loggedExercises, setLoggedExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const defaultRestSeconds = Number(settings?.default_rest_timer_seconds) || 90;
  const [restSeconds, setRestSeconds] = useState(defaultRestSeconds);
  const [restPaused, setRestPaused] = useState(false);
  const [favoriteExercises, setFavoriteExercises] = useState([]);
  const [availableExercises, setAvailableExercises] = useState(exerciseCatalog);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [saveState, setSaveState] = useState("saved");

  useEffect(() => {
    loadWorkout();
  }, [id]);

  useEffect(() => {
    const interval = window.setInterval(() => setWorkoutSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setRestSeconds(defaultRestSeconds);
  }, [defaultRestSeconds]);

  useEffect(() => {
    if (restPaused) return undefined;
    const interval = window.setInterval(() => {
      setRestSeconds((value) => (value > 0 ? value - 1 : defaultRestSeconds));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [defaultRestSeconds, restPaused]);

  const loadWorkout = async () => {
    try {
      const [data, savedExercises] = await Promise.all([
        base44.entities.Workout.get(id),
        base44.entities.UserExercise.list("name", 500),
      ]);
      const savedByName = new Map(savedExercises.map((exercise) => [exercise.name, exercise]));
      const mergedCatalog = exerciseCatalog.map((exercise) => ({ ...exercise, ...(savedByName.get(exercise.name) || {}) }));
      const customExercises = savedExercises.filter((exercise) => !exerciseCatalog.some((item) => item.name === exercise.name));
      setWorkout(data);
      setLoggedExercises(data.exercises || []);
      setAvailableExercises([...customExercises, ...mergedCatalog]);
      setFavoriteExercises(savedExercises.filter((exercise) => exercise.favorite).map((exercise) => exercise.name));
    } catch {
      setWorkout(null);
      setLoggedExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this workout? This cannot be undone.")) return;
    await base44.entities.Workout.delete(id);
    navigate("/workouts");
  };

  const saveExercises = async (nextExercises, extra = {}) => {
    if (settings?.auto_save_workouts === false && !extra.forceSave) return;
    const { forceSave, ...payload } = extra;
    setSaveState("saving");
    try {
      const savedWorkout = await base44.entities.Workout.update(id, { exercises: nextExercises, ...payload });
      setWorkout(savedWorkout);
      setSaveState("saved");
    } catch (error) {
      console.error("Workout save failed:", error);
      setSaveState("error");
    }
  };

  const toggleSet = (exerciseIndex, setIndex) => {
    const nextExercises = loggedExercises.map((exercise, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, currentSetIndex) =>
                currentSetIndex === setIndex ? { ...set, completed: !set.completed } : set
              ),
            }
          : exercise
    );
    setLoggedExercises(nextExercises);
    saveExercises(nextExercises);
  };

  const addSet = (exerciseIndex) => {
    const nextExercises = loggedExercises.map((exercise, currentExerciseIndex) =>
        currentExerciseIndex === exerciseIndex
          ? {
              ...exercise,
              sets: [
                ...(exercise.sets || []),
                {
                  weight: exercise.sets?.at(-1)?.weight ?? "",
                  reps: exercise.sets?.at(-1)?.reps ?? "",
                  completed: false,
                },
              ],
            }
          : exercise
    );
    setLoggedExercises(nextExercises);
    saveExercises(nextExercises);
  };

  const updateSetValue = (exerciseIndex, setIndex, field, value) => {
    const nextExercises = loggedExercises.map((exercise, currentExerciseIndex) =>
      currentExerciseIndex === exerciseIndex
        ? {
            ...exercise,
            sets: (exercise.sets || []).map((set, currentSetIndex) =>
              currentSetIndex === setIndex ? { ...set, [field]: value } : set
            ),
          }
        : exercise
    );
    setLoggedExercises(nextExercises);
    saveExercises(nextExercises);
  };

  const removeSet = (exerciseIndex, setIndex) => {
    const nextExercises = loggedExercises.map((exercise, currentExerciseIndex) =>
      currentExerciseIndex === exerciseIndex
        ? {
            ...exercise,
            sets: (exercise.sets || []).filter((_, currentSetIndex) => currentSetIndex !== setIndex),
          }
        : exercise
    );
    setLoggedExercises(nextExercises);
    saveExercises(nextExercises);
  };

  const addExerciseToWorkout = (exercise) => {
    if (!exercise?.name || loggedExercises.some((item) => item.name === exercise.name)) {
      setShowExercisePicker(false);
      return;
    }
    const nextExercises = [
      ...loggedExercises,
      { name: exercise.name, sets: [{ weight: "", reps: "", completed: false }] },
    ];
    setLoggedExercises(nextExercises);
    saveExercises(nextExercises);
    setExerciseQuery("");
    setShowExercisePicker(false);
  };

  const duplicateAsTemplate = async () => {
    const source = displayWorkout || workout;
    if (!source) return;
    await base44.entities.Workout.create({
      name: `${source.name} Template`,
      date: new Date().toISOString().split("T")[0],
      muscleGroup: source.muscleGroup,
      notes: source.notes,
      exercises: loggedExercises,
      status: "planned",
      calories: source.calories,
      favorite: false,
      template: true,
    });
    setMoreOpen(false);
    navigate("/workouts");
  };

  const finishWorkout = async () => {
    const nextExercises = loggedExercises.map((exercise) => ({
      ...exercise,
      sets: (exercise.sets || []).map((set) => ({ ...set, completed: true })),
    }));
    setLoggedExercises(nextExercises);
    await saveExercises(nextExercises, { status: "completed", forceSave: true });
    navigate("/workouts");
  };

  const toggleFavorite = async (exerciseName) => {
    const currentFavorite = favoriteExercises.includes(exerciseName);
    setFavoriteExercises((items) =>
      items.includes(exerciseName)
        ? items.filter((item) => item !== exerciseName)
        : [...items, exerciseName]
    );
    const workoutExercise = loggedExercises.find((exercise) => exercise.name === exerciseName);
    if (!workoutExercise) return;
    try {
      await base44.entities.UserExercise.upsert(
        {
          name: exerciseName,
          muscleGroup: workout.muscleGroup || "Full Body",
          icon: (workout.muscleGroup || "Full Body").toLowerCase(),
          tip: "",
          favorite: !currentFavorite,
          custom: false,
        },
        { onConflict: "user_id,name" }
      );
    } catch {
      setFavoriteExercises((items) =>
        currentFavorite
          ? [...items, exerciseName]
          : items.filter((item) => item !== exerciseName)
      );
    }
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
  const pickerResults = availableExercises.filter((exercise) =>
    `${exercise.name} ${exercise.muscleGroup}`.toLowerCase().includes(exerciseQuery.toLowerCase())
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
        <div className="relative flex items-center gap-2 shrink-0">
          <Link to={`/workouts/${id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
          <button
            onClick={() => setMoreOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
          >
            <MoreHorizontal className="w-4 h-4" /> More
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl" role="menu">
              <button onClick={duplicateAsTemplate} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" role="menuitem">
                <Copy className="h-4 w-4 text-neutral-400" /> Save as template
              </button>
              <button onClick={() => { setRestSeconds(defaultRestSeconds); setMoreOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" role="menuitem">
                <RotateCcw className="h-4 w-4 text-neutral-400" /> Reset rest timer
              </button>
            </div>
          )}
          <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
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
              {nextExercise ? `Next: ${nextExercise.name}. Rest ${defaultRestSeconds} seconds, then match last set quality.` : "All planned sets are checked off."}
            </p>
          </div>
          <p className={`text-xs ${saveState === "error" ? "text-red-500" : "text-neutral-400"}`}>
            {saveState === "saving" ? "Saving..." : saveState === "error" ? "Save failed" : settings?.auto_save_workouts === false ? "Saved on finish" : "Saved"}
          </p>
          <button onClick={finishWorkout} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800">
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
                </div>
                <p className="text-xs text-neutral-500 mt-1">Last time appears after this exercise has saved history.</p>
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
                    <th className="px-4 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {(exercise.sets || []).map((set, setIndex) => (
                    <tr key={setIndex}>
                      <td className="px-4 py-3 text-neutral-500">Set {setIndex + 1}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={set.weight ?? ""}
                          onChange={(event) => updateSetValue(exerciseIndex, setIndex, "weight", event.target.value)}
                          className="h-9 w-24 rounded-lg border border-neutral-200 bg-white px-2 text-sm font-medium text-neutral-900 focus:outline-none focus:border-neutral-400"
                          aria-label={`${exercise.name} set ${setIndex + 1} weight`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          value={set.reps ?? ""}
                          onChange={(event) => updateSetValue(exerciseIndex, setIndex, "reps", event.target.value)}
                          className="h-9 w-20 rounded-lg border border-neutral-200 bg-white px-2 text-sm font-medium text-neutral-900 focus:outline-none focus:border-neutral-400"
                          aria-label={`${exercise.name} set ${setIndex + 1} reps`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="checkbox"
                          checked={Boolean(set.completed)}
                          onChange={() => toggleSet(exerciseIndex, setIndex)}
                          className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
                          aria-label={`Complete ${exercise.name} set ${setIndex + 1}`}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeSet(exerciseIndex, setIndex)}
                          disabled={(exercise.sets || []).length <= 1}
                          className="rounded-lg p-1.5 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40"
                          aria-label={`Remove ${exercise.name} set ${setIndex + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
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
        onClick={() => setShowExercisePicker((value) => !value)}
        className="w-full rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
      >
        <Plus className="w-4 h-4 inline mr-2" />
        Add Exercise
      </button>

      {showExercisePicker && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Choose exercise</p>
              <p className="text-xs text-neutral-500 mt-1">Add a saved or common movement to this workout.</p>
            </div>
            <button onClick={() => setShowExercisePicker(false)} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900" aria-label="Close exercise picker">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={exerciseQuery}
              onChange={(event) => setExerciseQuery(event.target.value)}
              placeholder="Search exercises"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pickerResults.slice(0, 12).map((exercise) => (
              <button
                key={exercise.name}
                onClick={() => addExerciseToWorkout(exercise)}
                disabled={loggedExercises.some((item) => item.name === exercise.name)}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-45"
              >
                <span>
                  <span className="block font-medium text-neutral-900">{exercise.name}</span>
                  <span className="block text-xs text-neutral-500">{exercise.muscleGroup}</span>
                </span>
                <Plus className="h-4 w-4 text-neutral-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {displayWorkout.notes && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{displayWorkout.notes}</p>
        </div>
      )}
    </div>
  );
}
