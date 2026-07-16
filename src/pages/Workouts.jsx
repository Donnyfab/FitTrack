import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatDate } from "@/lib/workoutUtils";
import { countSets } from "@/lib/fittrackDemoData";
import {
  formatDuration,
  getCompletedSetCount,
  getStarterRoutine,
  getWorkoutDurationMinutes,
  getWorkoutStatusLabel,
  writeWorkoutDraft,
} from "@/lib/trainingInsights";
import { DEFAULT_WORKOUT_TEMPLATES, createDraftFromDefaultTemplate } from "@/lib/workoutTemplates";
import EmptyState from "@/components/EmptyState";
import {
  ChevronRight,
  Clock,
  Dumbbell,
  Filter,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from "lucide-react";

const tabs = ["All Workouts", "Favorites", "Templates"];

function getTabFromQuery(tab) {
  if (tab === "favorites") return "Favorites";
  if (tab === "templates") return "Templates";
  return "All Workouts";
}

export default function Workouts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { settings } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => getTabFromQuery(tabParam));
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState("All");
  const [swipedWorkoutId, setSwipedWorkoutId] = useState(null);
  const [swipeState, setSwipeState] = useState(null);
  const [startingTemplateId, setStartingTemplateId] = useState(null);

  useEffect(() => {
    loadWorkouts();
  }, []);

  useEffect(() => {
    setActiveTab(getTabFromQuery(tabParam));
  }, [tabParam]);

  const loadWorkouts = async () => {
    try {
      const data = await base44.entities.Workout.list("-date", 200);
      setWorkouts(data);
    } finally {
      setLoading(false);
    }
  };

  const muscleGroups = useMemo(
    () => [
      "All",
      ...new Set([
        ...workouts.map((workout) => workout.muscleGroup?.split(",")[0]).filter(Boolean),
        ...DEFAULT_WORKOUT_TEMPLATES.flatMap((template) => template.muscleGroup.split(",").map((group) => group.trim())),
      ]),
    ],
    [workouts]
  );

  const defaultTemplates = DEFAULT_WORKOUT_TEMPLATES.filter((template) => {
    const matchesQuery = `${template.name} ${template.focus} ${template.level} ${template.muscleGroup}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesMuscle =
      muscleFilter === "All" || template.muscleGroup.toLowerCase().includes(muscleFilter.toLowerCase());
    return matchesQuery && matchesMuscle;
  });

  const filtered = workouts.filter((workout) => {
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

  const emptyTitle = workouts.length === 0 ? "No workouts logged yet" : "No workouts match this view";
  const emptyDescription =
    workouts.length === 0
      ? "Start with a simple routine. Create Push, Pull, Legs, or Full Body and adjust it before saving."
      : "Clear the search, switch tabs, or choose a different muscle group.";

  const openDraft = (draft) => {
    writeWorkoutDraft(draft);
    navigate("/workouts/new");
  };

  const repeatWorkout = (workout) => {
    navigate(`/workouts/${workout.id}/edit?repeat=weekly`);
  };

  const createStarter = (day) => {
    openDraft(getStarterRoutine(settings?.workout_split_preference, day));
  };

  const customizeDefaultTemplate = (template, saveAsTemplate = false) => {
    openDraft(createDraftFromDefaultTemplate(template, {
      template: saveAsTemplate,
      notes: saveAsTemplate
        ? `${template.notes}\n\nSaved as your own template. Adjust exercises, sets, reps, rest times, and rest days before saving.`
        : template.notes,
    }));
  };

  const startDefaultTemplate = async (template) => {
    if (startingTemplateId) return;
    setStartingTemplateId(template.id);
    try {
      const draft = createDraftFromDefaultTemplate(template, { status: "planned", template: false });
      const created = await base44.entities.Workout.create(draft);
      navigate(`/workouts/${created.id}`);
    } finally {
      setStartingTemplateId(null);
    }
  };

  const createCustomTemplate = () => {
    openDraft({
      name: "Custom Workout Template",
      date: new Date().toISOString().split("T")[0],
      muscleGroup: "",
      notes: "Build this once, save it as a template, and reuse it later.",
      status: "planned",
      favorite: false,
      template: true,
      calories: "",
      exercises: [],
    });
  };

  const toggleFavorite = async (workout) => {
    const nextFavorite = !workout.favorite;
    setWorkouts((items) =>
      items.map((item) => item.id === workout.id ? { ...item, favorite: nextFavorite } : item)
    );
    try {
      await base44.entities.Workout.update(workout.id, { favorite: nextFavorite });
    } catch {
      loadWorkouts();
    }
  };

  const handleSwipeStart = (event, workoutId) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    if (swipedWorkoutId && swipedWorkoutId !== workoutId) {
      setSwipedWorkoutId(null);
    }
    setSwipeState({
      workoutId,
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset: swipedWorkoutId === workoutId ? -92 : 0,
      deltaX: swipedWorkoutId === workoutId ? -92 : 0,
      dragging: true,
      lockedAxis: null,
    });
  };

  const handleSwipeMove = (event, workoutId) => {
    const touch = event.touches?.[0];
    if (!touch || !swipeState || swipeState.workoutId !== workoutId) return;
    const rawDeltaX = touch.clientX - swipeState.startX;
    const rawDeltaY = touch.clientY - swipeState.startY;
    const axis =
      swipeState.lockedAxis ||
      (Math.abs(rawDeltaX) > 8 || Math.abs(rawDeltaY) > 8
        ? Math.abs(rawDeltaX) > Math.abs(rawDeltaY)
          ? "x"
          : "y"
        : null);

    if (axis === "y") {
      setSwipeState((current) => current?.workoutId === workoutId ? { ...current, lockedAxis: "y" } : current);
      return;
    }

    if (axis === "x") event.preventDefault();

    const nextOffset = Math.min(0, swipeState.startOffset + rawDeltaX);
    const resistedOffset = nextOffset < -92 ? -92 + (nextOffset + 92) * 0.18 : nextOffset;
    setSwipeState((current) => current?.workoutId === workoutId
      ? { ...current, lockedAxis: axis, deltaX: Math.max(resistedOffset, -108) }
      : current
    );
  };

  const handleSwipeEnd = (workoutId) => {
    const nextOpen = swipeState?.workoutId === workoutId && swipeState.deltaX < -44;
    setSwipedWorkoutId(nextOpen ? workoutId : null);
    setSwipeState(null);
  };

  const deleteWorkout = async (workout) => {
    if (!window.confirm(`Delete ${workout.name}? This cannot be undone.`)) return;
    setSwipedWorkoutId(null);
    setWorkouts((items) => items.filter((item) => item.id !== workout.id));
    try {
      await base44.entities.Workout.delete(workout.id);
    } catch {
      loadWorkouts();
    }
  };

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
          <Link
            to="/workouts/ai-plan"
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-100 bg-blue-50 px-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Sparkles className="h-4 w-4" />
            Plan with AI
          </Link>
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

      {activeTab === "Templates" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-950/[0.03]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Starter templates</p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-900">Pick a plan and start fast</h2>
                <p className="mt-1 text-sm text-neutral-500">Each plan includes exercises, sets, reps, rest times, and a simple weekly structure.</p>
              </div>
              <button
                type="button"
                onClick={createCustomTemplate}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <Plus className="h-4 w-4" />
                Custom template
              </button>
            </div>
          </div>

          {defaultTemplates.length > 0 && (
            <div className="grid gap-3 lg:grid-cols-2">
              {defaultTemplates.map((template) => {
                const setCount = countSets(template);
                return (
                  <article key={template.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-950/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-neutral-900">{template.name}</h3>
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">{template.level}</span>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">{template.focus}</p>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Wand2 className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-neutral-50 p-3">
                        <p className="text-sm font-semibold text-neutral-900">{template.exercises.length}</p>
                        <p className="text-xs text-neutral-500">Exercises</p>
                      </div>
                      <div className="rounded-xl bg-neutral-50 p-3">
                        <p className="text-sm font-semibold text-neutral-900">{setCount}</p>
                        <p className="text-xs text-neutral-500">Sets</p>
                      </div>
                      <div className="rounded-xl bg-neutral-50 p-3">
                        <p className="text-sm font-semibold text-neutral-900">{template.duration}</p>
                        <p className="text-xs text-neutral-500">Duration</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-neutral-600">
                      <p className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" /> {template.schedule}</p>
                      <p className="text-xs text-neutral-500">Rest days: {template.restDays}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startDefaultTemplate(template)}
                        disabled={startingTemplateId === template.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white hover:bg-neutral-800"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        {startingTemplateId === template.id ? "Starting..." : "Start now"}
                      </button>
                      <button
                        type="button"
                        onClick={() => customizeDefaultTemplate(template)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        Customize
                      </button>
                      <button
                        type="button"
                        onClick={() => customizeDefaultTemplate(template, true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        Save copy
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="pt-2">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Your saved templates</p>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 && (activeTab !== "Templates" || defaultTemplates.length === 0) ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState
            icon={Dumbbell}
            title={emptyTitle}
            description={emptyDescription}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {["Push", "Pull", "Legs", "Full Body"].map((day) => (
                  <button key={day} onClick={() => createStarter(day)} className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
                    <Plus className="w-4 h-4" /> {day}
                  </button>
                ))}
                <Link to="/workouts/new" className="inline-flex items-center gap-2 px-3 py-2 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors">
                  Build My Plan
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((workout) => {
            const exerciseCount = workout.exercises?.length || 0;
            const completedSets = getCompletedSetCount(workout);
            const plannedSets = countSets(workout);
            const duration = getWorkoutDurationMinutes(workout);
            const swipeOffset =
              swipeState?.workoutId === workout.id
                ? swipeState.deltaX
                : swipedWorkoutId === workout.id
                  ? -92
                  : 0;
            return (
              <div key={workout.id} className="relative overflow-hidden rounded-xl bg-white">
                <div className="absolute inset-y-0 right-0 z-0 flex w-[92px] items-center justify-center rounded-xl border border-neutral-200 bg-white">
                  <button
                    type="button"
                    onClick={() => deleteWorkout(workout)}
                    className="flex h-full w-full items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-[#ff3b30]"
                    aria-label={`Delete ${workout.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
                <article
                  onTouchStart={(event) => handleSwipeStart(event, workout.id)}
                  onTouchMove={(event) => handleSwipeMove(event, workout.id)}
                  onTouchEnd={() => handleSwipeEnd(workout.id)}
                  onTouchCancel={() => handleSwipeEnd(workout.id)}
                  style={{ transform: `translateX(${swipeOffset}px)`, touchAction: "pan-y" }}
                  className={`relative z-10 grid gap-3 bg-white rounded-xl border border-neutral-200 p-4 shadow-sm shadow-neutral-950/[0.03] hover:border-neutral-300 transition-[transform,border-color,box-shadow] md:grid-cols-[1fr_auto] md:items-center ${
                    swipeState?.workoutId === workout.id ? "duration-0 ease-linear" : "duration-300 ease-out"
                  }`}
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="mt-0.5 w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                      <Dumbbell className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link to={`/workouts/${workout.id}`} className="font-medium text-neutral-900 truncate hover:text-neutral-600">
                          {workout.name}
                        </Link>
                        {workout.favorite && <Star className="w-3.5 h-3.5 text-neutral-400 fill-neutral-400" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-neutral-500">Last performed {formatDate(workout.date)}</span>
                        {workout.muscleGroup && <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{workout.muscleGroup}</span>}
                        <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{getWorkoutStatusLabel(workout)}</span>
                        {workout.template && <span className="text-xs text-neutral-400">Template</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => repeatWorkout(workout)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800">
                          <RotateCcw className="h-3.5 w-3.5" /> Repeat
                        </button>
                        <Link to={`/workouts/${workout.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                          <Play className="h-3.5 w-3.5" /> Quick start
                        </Link>
                        <button onClick={() => toggleFavorite(workout)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                          <Star className={`h-3.5 w-3.5 ${workout.favorite ? "fill-neutral-900 text-neutral-900" : ""}`} /> Favorite
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 md:w-[320px] md:items-center">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{exerciseCount}</p>
                      <p className="text-xs text-neutral-500">Exercises</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{completedSets} / {plannedSets}</p>
                      <p className="text-xs text-neutral-500">Sets done</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{formatDuration(duration)}</p>
                        <p className="text-xs text-neutral-500">Duration</p>
                      </div>
                      <Link to={`/workouts/${workout.id}`} aria-label={`Open ${workout.name}`}>
                        <ChevronRight className="w-4 h-4 text-neutral-300 hidden md:block" />
                      </Link>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
