import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Activity,
  Dumbbell,
  HeartPulse,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import { exerciseCatalog, exerciseCategories } from "@/lib/fittrackDemoData";

const tabs = ["All", "My Exercises", "Favorites"];

const iconForGroup = (group) => {
  if (group === "Cardio") return HeartPulse;
  if (group === "Core") return Activity;
  return Dumbbell;
};

export default function Exercises() {
  const [exercises, setExercises] = useState(exerciseCatalog);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [activeCategory, setActiveCategory] = useState("Chest");
  const [query, setQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(exerciseCatalog[0]);
  const [selectedForWorkout, setSelectedForWorkout] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", muscleGroup: "Chest", tip: "" });

  useEffect(() => {
    loadExercises();
  }, []);

  const mergeExercises = (savedExercises) => {
    const savedByName = new Map(savedExercises.map((exercise) => [exercise.name, exercise]));
    const catalog = exerciseCatalog.map((exercise) => ({ ...exercise, ...(savedByName.get(exercise.name) || {}) }));
    const custom = savedExercises.filter((exercise) => !exerciseCatalog.some((item) => item.name === exercise.name));
    return [...custom, ...catalog];
  };

  const loadExercises = async () => {
    try {
      const savedExercises = await base44.entities.UserExercise.list("name", 500);
      const merged = mergeExercises(savedExercises);
      setExercises(merged);
      setSelectedExercise((current) => merged.find((exercise) => exercise.name === current?.name) || merged[0] || null);
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
        const matchesCategory = exercise.muscleGroup === activeCategory;
        const matchesQuery = `${exercise.name} ${exercise.muscleGroup}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesTab && matchesCategory && matchesQuery;
      }),
    [activeCategory, activeTab, exercises, query]
  );

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
      icon: form.muscleGroup.toLowerCase(),
      favorite: false,
      custom: true,
      tip: form.tip || "Add notes after your first completed workout.",
    };
    const savedExercise = await base44.entities.UserExercise.upsert(nextExercise, { onConflict: "user_id,name" });
    setExercises((items) => [savedExercise, ...items.filter((item) => item.name !== savedExercise.name)]);
    setSelectedExercise(savedExercise);
    setActiveCategory(savedExercise.muscleGroup);
    setActiveTab("My Exercises");
    setForm({ name: "", muscleGroup: "Chest", tip: "" });
    setShowCreate(false);
  };

  const selectForWorkout = (exercise) => {
    setSelectedForWorkout((items) =>
      items.includes(exercise.name) ? items : [...items, exercise.name]
    );
  };

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
        {exerciseCategories.map((category) => (
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

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {loading && (
            <div className="col-span-full rounded-2xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">
              Loading exercises...
            </div>
          )}
          {filtered.map((exercise) => {
            const Icon = iconForGroup(exercise.muscleGroup);
            const selected = selectedExercise?.name === exercise.name;
            return (
              <button
                key={exercise.name}
                onClick={() => setSelectedExercise(exercise)}
                className={`text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${
                  selected ? "border-neutral-400" : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
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
                <p className="mt-4 font-medium text-neutral-900">{exercise.name}</p>
                <p className="mt-1 text-sm text-neutral-500">{exercise.muscleGroup}</p>
                {exercise.custom && <p className="mt-3 text-xs text-neutral-400">Custom exercise</p>}
              </button>
            );
          })}
        </div>

        <aside className="bg-white rounded-2xl border border-neutral-200 p-5 h-fit">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Exercise Detail</p>
              <h2 className="text-xl font-semibold text-neutral-900 mt-2">{selectedExercise?.name}</h2>
              <p className="text-sm text-neutral-500 mt-1">Primary: {selectedExercise?.muscleGroup}</p>
            </div>
            <button
              onClick={() => toggleFavorite(selectedExercise.name)}
              className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <Star className={`w-4 h-4 ${selectedExercise?.favorite ? "fill-neutral-900 text-neutral-900" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Personal record</p>
              <p className="text-sm font-semibold text-neutral-900 mt-1">No PR recorded</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">Last completed</p>
              <p className="text-sm font-semibold text-neutral-900 mt-1">No history yet</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-neutral-900">Past performance history</p>
            <div className="mt-3 rounded-xl border border-neutral-100 p-4">
              <p className="text-sm text-neutral-500">History appears after this exercise is logged in a workout.</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-neutral-50 p-4">
            <p className="text-sm font-medium text-neutral-900">Notes or form tips</p>
            <p className="text-sm text-neutral-600 mt-2">{selectedExercise?.tip}</p>
          </div>

          <button
            onClick={() => selectForWorkout(selectedExercise)}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Plus className="w-4 h-4" />
            Select for Workout
          </button>

          {selectedForWorkout.length > 0 && (
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <p className="text-sm font-medium text-neutral-900">Selected exercises</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedForWorkout.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                    {name}
                    <button
                      onClick={() => setSelectedForWorkout((items) => items.filter((item) => item !== name))}
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
    </div>
  );
}
