import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { readSelectedWorkoutExercises, writeSelectedWorkoutExercises } from "@/lib/workoutSelection";
import {
  bestSetFromSets,
  estimateOneRepMax,
  formatSetPerformance,
  getExerciseHistory,
  getLastExercisePerformance,
  getExercisePersonalRecord,
} from "@/lib/trainingInsights";
import {
  Activity,
  ArrowLeft,
  Bookmark,
  Check,
  Dumbbell,
  HeartPulse,
  ImageIcon,
  ListChecks,
  Plus,
  Search,
  Star,
  Target,
  Video,
  X,
} from "lucide-react";
import { equipmentOptions, exerciseCatalog, exerciseCategories } from "@/lib/fittrackDemoData";

const tabs = ["All", "My Exercises", "Favorites"];
const categoryFilters = ["All", ...exerciseCategories];
const INITIAL_VISIBLE_EXERCISES = 48;
const LOAD_MORE_EXERCISES = 48;

const iconForGroup = (group) => {
  if (group === "Cardio") return HeartPulse;
  if (group === "Core") return Activity;
  return Dumbbell;
};

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const hasExerciseMedia = (exercise) => Boolean(exercise?.imageUrl || exercise?.videoUrl || exercise?.gifUrl);
const hasExerciseApiDetail = (exercise) =>
  Boolean(
    exercise?.apiSource &&
      (hasExerciseMedia(exercise) ||
        exercise?.overview ||
        asList(exercise?.instructions).length ||
        asList(exercise?.targetMuscles).length ||
        asList(exercise?.secondaryMuscles).length)
  );

const mergeApiExerciseFields = (exercise, imported) => {
  if (!imported) return exercise;
  return {
    ...exercise,
    id: imported.id || exercise.id,
    equipment: imported.equipment || exercise.equipment,
    icon: imported.icon || exercise.icon,
    tip: imported.tip || exercise.tip,
    favorite: imported.favorite ?? exercise.favorite,
    custom: imported.custom ?? exercise.custom,
    apiSource: imported.apiSource,
    apiExerciseId: imported.apiExerciseId,
    imageUrl: imported.imageUrl,
    videoUrl: imported.videoUrl,
    gifUrl: imported.gifUrl,
    bodyParts: imported.bodyParts,
    targetMuscles: imported.targetMuscles,
    secondaryMuscles: imported.secondaryMuscles,
    instructions: imported.instructions,
    overview: imported.overview,
    created_date: imported.created_date || exercise.created_date,
  };
};

export default function Exercises() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isWorkoutBuilder = searchParams.get("mode") === "workout-builder";
  const [exercises, setExercises] = useState(exerciseCatalog);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeEquipment, setActiveEquipment] = useState("All");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_EXERCISES);
  const [query, setQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(exerciseCatalog[0]);
  const [detailExercise, setDetailExercise] = useState(null);
  const [selectedForWorkout, setSelectedForWorkout] = useState(() => readSelectedWorkoutExercises());
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", muscleGroup: "Chest", equipment: "Dumbbell", tip: "" });

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_EXERCISES);
  }, [activeCategory, activeEquipment, activeTab, query]);

  const mergeExercises = (savedExercises) => {
    const importedByName = new Map(
      savedExercises
        .filter((exercise) => exercise.apiSource && !exercise.userId)
        .map((exercise) => [exercise.name, exercise])
    );
    const userOwnedByName = new Map(
      savedExercises
        .filter((exercise) => exercise.userId)
        .map((exercise) => [exercise.name, exercise])
    );
    const catalog = exerciseCatalog.map((exercise) => {
      const imported = importedByName.get(exercise.name);
      const saved = userOwnedByName.get(exercise.name);
      const mergedImported = mergeApiExerciseFields(exercise, imported);
      const savedWithApiFields = saved?.apiSource ? mergeApiExerciseFields(mergedImported, saved) : mergedImported;
      return saved
        ? {
            ...savedWithApiFields,
            id: saved.id,
            favorite: saved.favorite,
            custom: saved.custom,
            tip: saved.tip || savedWithApiFields.tip,
            created_date: saved.created_date,
          }
        : mergedImported;
    });
    const custom = savedExercises.filter(
      (exercise) => !exercise.apiSource && !exerciseCatalog.some((item) => item.name === exercise.name)
    );
    const importedOnly = savedExercises.filter(
      (exercise) => exercise.apiSource && !exerciseCatalog.some((item) => item.name === exercise.name)
    );
    return [...custom, ...importedOnly, ...catalog];
  };

  const loadExercises = async () => {
    setError(null);
    try {
      const [savedExercises, workoutRows] = await Promise.all([
        base44.entities.UserExercise.list("name", 500),
        base44.entities.Workout.list("-date", 500),
      ]);
      const merged = mergeExercises(savedExercises);
      setExercises(merged);
      setWorkouts(workoutRows);
      setSelectedExercise((current) => merged.find((exercise) => exercise.name === current?.name) || merged[0] || null);
      setDetailExercise((current) => (current ? merged.find((exercise) => exercise.name === current.name) || null : null));
    } catch {
      setExercises(exerciseCatalog);
      setError("Exercise media could not load. Showing the local library for now.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () =>
      exercises.filter((exercise) => {
        const matchesTab =
          activeTab === "All" ||
          (activeTab === "My Exercises" && exercise.custom) ||
          (activeTab === "Favorites" && exercise.favorite);
        const matchesCategory = activeCategory === "All" || exercise.muscleGroup === activeCategory;
        const matchesEquipment = activeEquipment === "All" || exercise.equipment === activeEquipment;
        const searchable = [
          exercise.name,
          exercise.muscleGroup,
          exercise.equipment,
          ...asList(exercise.bodyParts),
          ...asList(exercise.targetMuscles),
          ...asList(exercise.secondaryMuscles),
        ].join(" ");
        const matchesQuery = searchable
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesTab && matchesCategory && matchesEquipment && matchesQuery;
      }),
    [activeCategory, activeEquipment, activeTab, exercises, query]
  );

  const visibleExercises = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const lastPerformanceByExercise = useMemo(() => {
    const rows = [...(workouts || [])].sort(
      (a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`)
    );
    const map = new Map();
    rows.forEach((workout) => {
      (workout.exercises || []).forEach((exercise) => {
        if (!exercise?.name || map.has(exercise.name)) return;
        const bestSet = bestSetFromSets(exercise.sets || []);
        map.set(exercise.name, { workout, exercise, bestSet });
      });
    });
    return map;
  }, [workouts]);

  const toggleFavorite = async (exerciseName) => {
    const current = exercises.find((exercise) => exercise.name === exerciseName);
    if (!current) return;
    const nextFavorite = !current.favorite;
    setExercises((items) =>
      items.map((exercise) =>
        exercise.name === exerciseName ? { ...exercise, favorite: nextFavorite } : exercise
      )
    );
    if (selectedExercise?.name === exerciseName) {
      setSelectedExercise((exercise) => ({ ...exercise, favorite: nextFavorite }));
    }
    if (detailExercise?.name === exerciseName) {
      setDetailExercise((exercise) => ({ ...exercise, favorite: nextFavorite }));
    }
    try {
      await base44.entities.UserExercise.upsert(
        { ...current, favorite: nextFavorite, custom: current.custom || false },
        { onConflict: "user_id,name" }
      );
    } catch {
      loadExercises();
    }
  };

  const createExercise = async (event) => {
    event.preventDefault();
    const nextExercise = {
      name: form.name,
      muscleGroup: form.muscleGroup,
      equipment: form.equipment,
      icon: form.muscleGroup.toLowerCase(),
      favorite: false,
      custom: true,
      tip: form.tip || "Add notes after your first completed workout.",
    };
    const savedExercise = await base44.entities.UserExercise.upsert(nextExercise, { onConflict: "user_id,name" });
    setExercises((items) => [savedExercise, ...items.filter((item) => item.name !== savedExercise.name)]);
    setSelectedExercise(savedExercise);
    setActiveCategory(savedExercise.muscleGroup);
    setActiveEquipment(savedExercise.equipment || "All");
    setActiveTab("My Exercises");
    setForm({ name: "", muscleGroup: "Chest", equipment: "Dumbbell", tip: "" });
    setShowCreate(false);
  };

  const persistExerciseForLibrary = async (exercise) => {
    try {
      await base44.entities.UserExercise.upsert(
        { ...exercise, custom: Boolean(exercise.custom), favorite: Boolean(exercise.favorite) },
        { onConflict: "user_id,name" }
      );
    } catch {
      // Selection still works through session storage; persistence will retry on favorite/custom edits.
    }
  };

  const updateWorkoutSelection = (nextItems) => {
    setSelectedForWorkout(nextItems);
    writeSelectedWorkoutExercises(nextItems);
  };

  const removeWorkoutSelection = (exerciseName) => {
    updateWorkoutSelection(selectedForWorkout.filter((name) => name !== exerciseName));
  };

  const selectForWorkout = async (exercise) => {
    if (!exercise?.name) return;
    const nextItems = selectedForWorkout.includes(exercise.name)
      ? isWorkoutBuilder
        ? selectedForWorkout.filter((name) => name !== exercise.name)
        : selectedForWorkout
      : [...selectedForWorkout, exercise.name];
    updateWorkoutSelection(nextItems);
    await persistExerciseForLibrary(exercise);
  };

  const confirmAddExercisesToWorkout = () => {
    if (selectedForWorkout.length === 0) return;
    writeSelectedWorkoutExercises(selectedForWorkout);
    navigate("/workouts/new");
  };

  const startWorkoutFromSelection = () => {
    writeSelectedWorkoutExercises(selectedForWorkout);
    navigate("/workouts/new");
  };

  const selectedHistory = useMemo(
    () => getExerciseHistory(workouts, selectedExercise?.name, { limit: 6 }),
    [selectedExercise?.name, workouts]
  );
  const selectedPr = useMemo(
    () => getExercisePersonalRecord(workouts, selectedExercise?.name),
    [selectedExercise?.name, workouts]
  );
  const selectedLast = useMemo(
    () => getLastExercisePerformance(workouts, selectedExercise?.name),
    [selectedExercise?.name, workouts]
  );
  const selectedWorkoutCountLabel =
    selectedForWorkout.length === 1 ? "1 exercise" : `${selectedForWorkout.length} exercises`;
  const selectedWorkoutSummary = selectedForWorkout.length
    ? `${selectedForWorkout.slice(0, 2).join(", ")}${selectedForWorkout.length > 2 ? ` +${selectedForWorkout.length - 2}` : ""}`
    : "";
  const selectedExerciseQueued = selectedExercise
    ? selectedForWorkout.includes(selectedExercise.name)
    : false;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Exercise</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage exercises, favorites, custom movements, and workout selections.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex h-10 items-center justify-center gap-2 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Exercise
        </button>
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
        <div className="relative lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises"
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-neutral-400"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categoryFilters.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === category
                ? "bg-neutral-900 text-white"
                : "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Equipment</p>
          {activeEquipment !== "All" && (
            <button
              onClick={() => setActiveEquipment("All")}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["All", ...equipmentOptions].map((equipment) => (
            <button
              key={equipment}
              onClick={() => setActiveEquipment(equipment)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeEquipment === equipment
                  ? "bg-neutral-900 text-white"
                  : "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {equipment}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {loading && (
            <div className="col-span-full rounded-2xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">
              Loading exercises...
            </div>
          )}
          {!loading && error && (
            <div className="col-span-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={loadExercises}
                  className="h-9 rounded-lg bg-white px-3 text-xs font-semibold text-amber-900 shadow-sm"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
          {visibleExercises.map((exercise) => {
            const Icon = iconForGroup(exercise.muscleGroup);
            const selected = selectedExercise?.name === exercise.name;
            const queuedForWorkout = selectedForWorkout.includes(exercise.name);
            const lastEntry = lastPerformanceByExercise.get(exercise.name);
            const imageUrl = exercise.imageUrl || exercise.gifUrl;
            const canOpenDetail = hasExerciseApiDetail(exercise);
            return (
              <button
                key={exercise.name}
                onClick={() => {
                  setSelectedExercise(exercise);
                  if (isWorkoutBuilder) {
                    selectForWorkout(exercise);
                  } else if (canOpenDetail) {
                    setDetailExercise(exercise);
                  }
                }}
                className={`relative min-h-[164px] overflow-hidden text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${
                  queuedForWorkout
                    ? "border-blue-500 bg-blue-50/40"
                    : selected
                      ? "border-neutral-400"
                      : "border-neutral-200 hover:border-neutral-300"
                } ${imageUrl ? "pr-32 sm:pr-28" : ""}`}
              >
                {imageUrl && (
                  <div className="pointer-events-none absolute bottom-0 right-0 top-0 flex w-32 items-end justify-center overflow-hidden bg-gradient-to-l from-neutral-50 via-neutral-50/95 to-transparent sm:w-28">
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain object-bottom opacity-95"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-neutral-500" />
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(exercise.name);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") toggleFavorite(exercise.name);
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
                    aria-label={`Favorite ${exercise.name}`}
                  >
                    <Star className={`w-4 h-4 ${exercise.favorite ? "fill-neutral-900 text-neutral-900" : ""}`} />
                  </span>
                </div>
                {isWorkoutBuilder && queuedForWorkout && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                    <Check className="h-3 w-3" />
                    Selected
                  </span>
                )}
                <p className="mt-4 font-medium text-neutral-900">{exercise.name}</p>
                <p className="mt-1 text-sm text-neutral-500">{exercise.muscleGroup}</p>
                <p className="mt-1 text-xs font-medium text-neutral-400">{exercise.equipment || "Any equipment"}</p>
                <p className="mt-3 text-xs text-neutral-400">Last used: {lastEntry ? formatSetPerformance(lastEntry.bestSet) : "No history"}</p>
                {exercise.apiSource && (
                  <span className="mt-3 inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600">
                    Media guide
                  </span>
                )}
                {exercise.custom && <p className="mt-3 text-xs text-neutral-400">Custom exercise</p>}
              </button>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-neutral-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-neutral-900">No exercises match this equipment</p>
              <p className="mt-1 text-sm text-neutral-500">Try a different equipment option or clear the filter.</p>
            </div>
          )}
          {!loading && filtered.length > visibleExercises.length && (
            <button
              onClick={() => setVisibleCount((count) => count + LOAD_MORE_EXERCISES)}
              className="col-span-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              Show {Math.min(LOAD_MORE_EXERCISES, filtered.length - visibleExercises.length)} more exercises
            </button>
          )}
        </div>

        <aside className="bg-white rounded-2xl border border-neutral-200 p-5 h-fit">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Exercise Detail</p>
              <h2 className="text-xl font-semibold text-neutral-900 mt-2">{selectedExercise?.name}</h2>
              <p className="text-sm text-neutral-500 mt-1">Primary: {selectedExercise?.muscleGroup}</p>
              <p className="text-xs font-medium text-neutral-400 mt-1">{selectedExercise?.equipment || "Any equipment"}</p>
            </div>
            <button
              onClick={() => selectedExercise && toggleFavorite(selectedExercise.name)}
              disabled={!selectedExercise}
              className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <Star className={`w-4 h-4 ${selectedExercise?.favorite ? "fill-neutral-900 text-neutral-900" : ""}`} />
            </button>
          </div>

          {hasExerciseApiDetail(selectedExercise) && (
            <button
              type="button"
              onClick={() => setDetailExercise(selectedExercise)}
              className="mt-5 flex w-full items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <span className="inline-flex items-center gap-2">
                <Video className="h-4 w-4" />
                View media and instructions
              </span>
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Personal record</p>
              <p className="text-sm font-semibold text-neutral-900 mt-1">{formatSetPerformance(selectedPr?.bestSet)}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Last completed</p>
              <p className="text-sm font-semibold text-neutral-900 mt-1">{formatSetPerformance(selectedLast?.bestSet)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Estimated 1RM</p>
              <p className="text-sm font-semibold text-neutral-900 mt-1">
                {selectedPr?.bestSet ? `${estimateOneRepMax(selectedPr.bestSet.weight, selectedPr.bestSet.reps).toLocaleString()} lb` : "No estimate"}
              </p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Logged sessions</p>
              <p className="text-sm font-semibold text-neutral-900 mt-1">{selectedHistory.length}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-neutral-900">Past performance history</p>
            {selectedHistory.length > 0 ? (
              <div className="mt-3 space-y-2">
                {selectedHistory.map((entry) => (
                  <div key={`${entry.workout.id}-${entry.exercise.name}`} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2">
                    <span className="text-sm text-neutral-600">{entry.workout.date}</span>
                    <span className="text-sm font-semibold text-neutral-900">{formatSetPerformance(entry.bestSet)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-neutral-100 p-4">
                <p className="text-sm text-neutral-500">History appears after this exercise is logged in a workout.</p>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl bg-neutral-50 p-4">
            <p className="text-sm font-medium text-neutral-900">Notes or form tips</p>
            <p className="text-sm text-neutral-600 mt-2">{selectedExercise?.tip}</p>
          </div>

          {isWorkoutBuilder ? (
            <div className="mt-5 space-y-2">
              <button
                onClick={() => selectForWorkout(selectedExercise)}
                disabled={!selectedExercise}
                className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
                  selectedExerciseQueued
                    ? "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    : "bg-neutral-900 text-white hover:bg-neutral-800"
                }`}
              >
                {selectedExerciseQueued ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {selectedExerciseQueued ? "Remove from plan" : "Select Exercise"}
              </button>
              <button
                onClick={confirmAddExercisesToWorkout}
                disabled={selectedForWorkout.length === 0}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add {selectedWorkoutCountLabel}
              </button>
              <button
                onClick={() => navigate("/workouts/new")}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Back to workout
              </button>
            </div>
          ) : (
            <button
              onClick={() => selectForWorkout(selectedExercise)}
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <Plus className="w-4 h-4" />
              Select for Workout
            </button>
          )}

          {selectedForWorkout.length > 0 && (
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-neutral-900">Selected exercises</p>
                {!isWorkoutBuilder && (
                  <button
                    onClick={startWorkoutFromSelection}
                    className="text-xs font-semibold text-neutral-900 hover:text-neutral-600"
                  >
                    Build workout
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedForWorkout.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                    {name}
                    <button
                      onClick={() => removeWorkoutSelection(name)}
                      aria-label={`Remove ${name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {isWorkoutBuilder && selectedForWorkout.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-[0_18px_60px_-28px_rgba(23,23,23,0.55)] backdrop-blur-xl">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-neutral-500">{selectedWorkoutCountLabel} selected</p>
              <p className="truncate text-sm font-semibold text-neutral-900">{selectedWorkoutSummary}</p>
            </div>
            <button
              onClick={confirmAddExercisesToWorkout}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <form onSubmit={createExercise} className="bg-white rounded-2xl border border-neutral-200 p-6 w-full max-w-md shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">Create Custom Exercise</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Exercise name</label>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Primary muscle group</label>
                <select value={form.muscleGroup} onChange={(event) => setForm({ ...form, muscleGroup: event.target.value })} className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400">
                  {exerciseCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Equipment</label>
                <select value={form.equipment} onChange={(event) => setForm({ ...form, equipment: event.target.value })} className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400">
                  {equipmentOptions.map((equipment) => <option key={equipment}>{equipment}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes or form tips</label>
                <textarea value={form.tip} onChange={(event) => setForm({ ...form, tip: event.target.value })} rows={3} className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:border-neutral-400" />
              </div>
            </div>
            <button type="submit" className="mt-5 h-11 w-full rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800">
              Add Exercise
            </button>
          </form>
        </div>
      )}

      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          isWorkoutBuilder={isWorkoutBuilder}
          selectedForWorkout={selectedForWorkout}
          onClose={() => setDetailExercise(null)}
          onToggleFavorite={toggleFavorite}
          onSelectForWorkout={selectForWorkout}
        />
      )}
    </div>
  );
}

function ExerciseDetailModal({
  exercise,
  isWorkoutBuilder,
  selectedForWorkout,
  onClose,
  onToggleFavorite,
  onSelectForWorkout,
}) {
  const imageUrl = exercise.imageUrl || exercise.gifUrl;
  const videoUrl = exercise.videoUrl;
  const targetMuscles = asList(exercise.targetMuscles).length ? asList(exercise.targetMuscles) : [exercise.muscleGroup].filter(Boolean);
  const secondaryMuscles = asList(exercise.secondaryMuscles);
  const bodyParts = asList(exercise.bodyParts);
  const instructions = asList(exercise.instructions);
  const selected = selectedForWorkout.includes(exercise.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border border-neutral-200 bg-white shadow-2xl sm:rounded-[2rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Close exercise detail"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 px-3 text-center">
            <h2 className="truncate text-base font-semibold text-neutral-950">{exercise.name}</h2>
            <p className="text-xs font-medium text-neutral-500">{exercise.equipment || "Any equipment"}</p>
          </div>
          <button
            type="button"
            onClick={() => onToggleFavorite(exercise.name)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label={`Favorite ${exercise.name}`}
          >
            <Bookmark className={`h-5 w-5 ${exercise.favorite ? "fill-neutral-900 text-neutral-900" : ""}`} />
          </button>
        </div>

        <div className="space-y-5 px-4 pb-6 pt-4 sm:px-6">
          <div className="overflow-hidden rounded-[1.75rem] border border-neutral-100 bg-neutral-50">
            {videoUrl ? (
              <video
                src={videoUrl}
                poster={imageUrl || undefined}
                controls
                muted
                playsInline
                preload="metadata"
                className="aspect-[4/3] w-full bg-white object-contain"
              />
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={`${exercise.name} demonstration`}
                className="aspect-[4/3] w-full bg-white object-contain"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center">
                <ImageIcon className="h-10 w-10 text-neutral-300" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricTile icon={Target} label="Primary" value={targetMuscles[0] || exercise.muscleGroup || "Unknown"} />
            <MetricTile icon={Dumbbell} label="Equipment" value={exercise.equipment || "Any equipment"} />
          </div>

          {exercise.overview && (
            <section className="rounded-2xl bg-neutral-50 p-4">
              <h3 className="text-sm font-semibold text-neutral-950">Overview</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{exercise.overview}</p>
            </section>
          )}

          <section className="rounded-2xl border border-neutral-100 p-4">
            <h3 className="text-sm font-semibold text-neutral-950">Target muscles</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {targetMuscles.map((muscle) => (
                <span key={muscle} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {muscle}
                </span>
              ))}
              {bodyParts.map((part) => (
                <span key={part} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                  {part}
                </span>
              ))}
            </div>
            {secondaryMuscles.length > 0 && (
              <>
                <h4 className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">Secondary muscles</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {secondaryMuscles.map((muscle) => (
                    <span key={muscle} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                      {muscle}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-100 p-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-950">How to perform</h3>
            </div>
            {instructions.length > 0 ? (
              <ol className="mt-3 space-y-3">
                {instructions.map((step, index) => (
                  <li key={`${step}-${index}`} className="flex gap-3 text-sm leading-6 text-neutral-600">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">Instructions will appear after this exercise is imported with full media data.</p>
            )}
          </section>

          <button
            type="button"
            onClick={() => onSelectForWorkout(exercise)}
            className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors ${
              selected && isWorkoutBuilder
                ? "border border-neutral-200 bg-white text-neutral-800"
                : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            {selected && isWorkoutBuilder ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {selected && isWorkoutBuilder ? "Selected for workout" : "Select for Workout"}
          </button>
        </div>
      </section>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <Icon className="h-4 w-4 text-neutral-500" />
      <p className="mt-3 text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
