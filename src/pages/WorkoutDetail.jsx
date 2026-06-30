import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { calculateWorkoutVolume, formatDateLong } from "@/lib/workoutUtils";
import { countSets, exerciseCatalog } from "@/lib/fittrackDemoData";
import {
  detectWorkoutPRs,
  formatDuration,
  formatSetPerformance,
  getLastExercisePerformance,
  getTryTodaySuggestion,
  getWorkoutDurationMinutes,
} from "@/lib/trainingInsights";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Copy,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Star,
  TimerReset,
  Trophy,
  Trash2,
  X,
} from "lucide-react";

const formatTimer = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
};

const parseTimerInput = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [minutes, seconds] = trimmed.split(":").map((part) => Number(part));
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds < 0 || seconds > 59) return null;
    return Math.max(1, Math.round(minutes * 60 + seconds));
  }
  const minutes = Number(trimmed);
  return Number.isFinite(minutes) ? Math.max(1, Math.round(minutes * 60)) : null;
};

const REST_TIMER_ALERT_SRC = "/sounds/rest-timer-alert.wav";

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [loggedExercises, setLoggedExercises] = useState([]);
  const [allWorkouts, setAllWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [workoutTimerRunning, setWorkoutTimerRunning] = useState(false);
  const defaultRestSeconds = Number(settings?.default_rest_timer_seconds) || 90;
  const [restDurationSeconds, setRestDurationSeconds] = useState(defaultRestSeconds);
  const [restSeconds, setRestSeconds] = useState(defaultRestSeconds);
  const [restRunning, setRestRunning] = useState(false);
  const [customRestInput, setCustomRestInput] = useState(formatTimer(defaultRestSeconds));
  const [favoriteExercises, setFavoriteExercises] = useState([]);
  const [availableExercises, setAvailableExercises] = useState(exerciseCatalog);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [expandedExercises, setExpandedExercises] = useState(new Set());
  const [swipedExerciseKey, setSwipedExerciseKey] = useState(null);
  const [exerciseSwipeState, setExerciseSwipeState] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const [finishSummary, setFinishSummary] = useState(null);
  const restAlertAudioRef = useRef(null);
  const restAlertUnlockedRef = useRef(false);
  const restAlertAudioContextRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const audio = new Audio(REST_TIMER_ALERT_SRC);
    audio.preload = "auto";
    audio.volume = 1;
    audio.setAttribute("playsinline", "true");
    restAlertAudioRef.current = audio;
    return () => {
      audio.pause();
      restAlertAudioRef.current = null;
      restAlertUnlockedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadWorkout();
  }, [id]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(`fittrack-workout-timer:${id}`) || "null");
      setWorkoutSeconds(Number(saved?.seconds) || 0);
    } catch {
      setWorkoutSeconds(0);
    }
    setWorkoutTimerRunning(false);
  }, [id]);

  useEffect(() => {
    if (!workoutTimerRunning) return undefined;
    const interval = window.setInterval(() => setWorkoutSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [workoutTimerRunning]);

  useEffect(() => {
    window.localStorage.setItem(
      `fittrack-workout-timer:${id}`,
      JSON.stringify({ seconds: workoutSeconds })
    );
  }, [id, workoutSeconds]);

  useEffect(() => {
    setRestDurationSeconds(defaultRestSeconds);
    setRestSeconds(defaultRestSeconds);
    setCustomRestInput(formatTimer(defaultRestSeconds));
  }, [defaultRestSeconds]);

  useEffect(() => {
    if (!restRunning) return undefined;
    const interval = window.setInterval(() => {
      setRestSeconds((value) => {
        if (value <= 1) {
          setRestRunning(false);
          playRestTimerAlert();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [restRunning]);

  const loadWorkout = async () => {
    try {
      const [data, savedExercises, workoutRows] = await Promise.all([
        base44.entities.Workout.get(id),
        base44.entities.UserExercise.list("name", 500),
        base44.entities.Workout.list("-date", 500),
      ]);
      const savedByName = new Map(savedExercises.map((exercise) => [exercise.name, exercise]));
      const mergedCatalog = exerciseCatalog.map((exercise) => {
        const saved = savedByName.get(exercise.name);
        return saved
          ? {
              ...exercise,
              id: saved.id,
              favorite: saved.favorite,
              custom: saved.custom,
              tip: saved.tip || exercise.tip,
              created_date: saved.created_date,
            }
          : exercise;
      });
      const customExercises = savedExercises.filter((exercise) => !exerciseCatalog.some((item) => item.name === exercise.name));
      setWorkout(data);
      setLoggedExercises(data.exercises || []);
      setAllWorkouts(workoutRows);
      setAvailableExercises([...customExercises, ...mergedCatalog]);
      setFavoriteExercises(savedExercises.filter((exercise) => exercise.favorite).map((exercise) => exercise.name));
    } catch {
      setWorkout(null);
      setLoggedExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const getRestTimerAudioContext = () => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!restAlertAudioContextRef.current) {
      restAlertAudioContextRef.current = new AudioContextClass();
    }
    return restAlertAudioContextRef.current;
  };

  const getRestTimerAudioElement = () => {
    if (typeof window === "undefined") return null;
    if (!restAlertAudioRef.current) {
      const audio = new Audio(REST_TIMER_ALERT_SRC);
      audio.preload = "auto";
      audio.volume = 1;
      audio.setAttribute("playsinline", "true");
      restAlertAudioRef.current = audio;
    }
    return restAlertAudioRef.current;
  };

  const primeGeneratedRestTimerAlert = () => {
    try {
      const audioContext = getRestTimerAudioContext();
      if (!audioContext) return;
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.025);
    } catch {
      // Sound alerts are best-effort; the timer still works if the browser blocks audio.
    }
  };

  const playGeneratedRestTimerAlert = () => {
    try {
      const audioContext = getRestTimerAudioContext();
      if (!audioContext) return;
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      [0, 0.22, 0.44].forEach((offset, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(index === 2 ? 1046.5 : 880, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + (index === 2 ? 0.34 : 0.16));
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + (index === 2 ? 0.36 : 0.18));
      });
    } catch {
      // Audio is optional because browser autoplay rules can still block it.
    }
  };

  const primeRestTimerAlert = () => {
    const audio = getRestTimerAudioElement();
    if (audio && !restAlertUnlockedRef.current) {
      const previousMuted = audio.muted;
      const previousVolume = audio.volume;
      try {
        audio.muted = true;
        audio.volume = 0;
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise?.then) {
          playPromise
            .then(() => {
              audio.pause();
              audio.currentTime = 0;
              audio.muted = previousMuted;
              audio.volume = previousVolume || 1;
              restAlertUnlockedRef.current = true;
            })
            .catch(() => {
              audio.muted = previousMuted;
              audio.volume = previousVolume || 1;
            });
        } else {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = previousMuted;
          audio.volume = previousVolume || 1;
          restAlertUnlockedRef.current = true;
        }
      } catch {
        audio.muted = previousMuted;
        audio.volume = previousVolume || 1;
      }
    }
    primeGeneratedRestTimerAlert();
  };

  const playRestTimerAlert = () => {
    if (typeof window === "undefined") return;
    try {
      window.navigator?.vibrate?.([180, 70, 180, 70, 240]);
    } catch {
      // Ignore unsupported vibration APIs.
    }
    const audio = getRestTimerAudioElement();
    if (!audio) {
      playGeneratedRestTimerAlert();
      return;
    }
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = 1;
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch(() => playGeneratedRestTimerAlert());
      }
    } catch {
      playGeneratedRestTimerAlert();
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

  const setRestDuration = (seconds) => {
    setRestDurationSeconds(seconds);
    setRestSeconds(seconds);
    setCustomRestInput(formatTimer(seconds));
    setRestRunning(false);
  };

  const applyCustomRestTime = () => {
    const parsed = parseTimerInput(customRestInput);
    if (!parsed) return;
    setRestDuration(parsed);
  };

  const startRestTimer = () => {
    primeRestTimerAlert();
    if (restSeconds <= 0) setRestSeconds(restDurationSeconds);
    setRestRunning(true);
  };

  const stopRestTimer = () => setRestRunning(false);

  const restartRestTimer = () => {
    primeRestTimerAlert();
    setRestSeconds(restDurationSeconds);
    setRestRunning(true);
  };

  const toggleSet = (exerciseIndex, setIndex) => {
    const currentSet = loggedExercises[exerciseIndex]?.sets?.[setIndex];
    const willComplete = !currentSet?.completed;
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
    if (willComplete) {
      const completedExerciseSets = nextExercises[exerciseIndex]?.sets || [];
      const completedExerciseIsDone =
        completedExerciseSets.length > 0 && completedExerciseSets.every((set) => set.completed);
      if (completedExerciseIsDone) {
        const nextExerciseIndex = nextExercises.findIndex(
          (exercise, currentExerciseIndex) =>
            currentExerciseIndex > exerciseIndex && (exercise.sets || []).some((set) => !set.completed)
        );
        setExpandedExercises((current) => {
          const next = new Set(current);
          next.delete(exerciseIndex);
          if (nextExerciseIndex !== -1) next.add(nextExerciseIndex);
          return next;
        });
        if (nextExerciseIndex !== -1) {
          const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
          window.setTimeout(() => {
            document
              .getElementById(`exercise-card-${nextExerciseIndex}`)
              ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
          }, reduceMotion ? 0 : 260);
        }
      }
      primeRestTimerAlert();
      const nextRestSeconds = Math.min(600, Math.max(15, Number(currentSet?.restSeconds) || restDurationSeconds));
      setRestDurationSeconds(nextRestSeconds);
      setRestSeconds(nextRestSeconds);
      setCustomRestInput(formatTimer(nextRestSeconds));
      setRestRunning(true);
    }
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
                  restSeconds: exercise.sets?.at(-1)?.restSeconds ?? restDurationSeconds,
                  completed: false,
                },
              ],
            }
          : exercise
    );
    setLoggedExercises(nextExercises);
    saveExercises(nextExercises);
  };

  const toggleExerciseExpanded = (exerciseIndex) => {
    setExpandedExercises((current) => {
      const next = new Set(current);
      if (next.has(exerciseIndex)) {
        next.delete(exerciseIndex);
      } else {
        next.add(exerciseIndex);
      }
      return next;
    });
  };

  const getExerciseKey = (exercise, exerciseIndex) => `${exercise.name}-${exerciseIndex}`;

  const handleExerciseSwipeStart = (event, exerciseKey) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    if (swipedExerciseKey && swipedExerciseKey !== exerciseKey) {
      setSwipedExerciseKey(null);
    }
    setExerciseSwipeState({
      exerciseKey,
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset: swipedExerciseKey === exerciseKey ? -92 : 0,
      deltaX: swipedExerciseKey === exerciseKey ? -92 : 0,
      lockedAxis: null,
    });
  };

  const handleExerciseSwipeMove = (event, exerciseKey) => {
    const touch = event.touches?.[0];
    if (!touch || !exerciseSwipeState || exerciseSwipeState.exerciseKey !== exerciseKey) return;
    const rawDeltaX = touch.clientX - exerciseSwipeState.startX;
    const rawDeltaY = touch.clientY - exerciseSwipeState.startY;
    const axis =
      exerciseSwipeState.lockedAxis ||
      (Math.abs(rawDeltaX) > 8 || Math.abs(rawDeltaY) > 8
        ? Math.abs(rawDeltaX) > Math.abs(rawDeltaY)
          ? "x"
          : "y"
        : null);

    if (axis === "y") {
      setExerciseSwipeState((current) => current?.exerciseKey === exerciseKey ? { ...current, lockedAxis: "y" } : current);
      return;
    }

    if (axis === "x") event.preventDefault();

    const nextOffset = Math.min(0, exerciseSwipeState.startOffset + rawDeltaX);
    const resistedOffset = nextOffset < -92 ? -92 + (nextOffset + 92) * 0.18 : nextOffset;
    setExerciseSwipeState((current) => current?.exerciseKey === exerciseKey
      ? { ...current, lockedAxis: axis, deltaX: Math.max(resistedOffset, -108) }
      : current
    );
  };

  const handleExerciseSwipeEnd = (exerciseKey) => {
    const nextOpen = exerciseSwipeState?.exerciseKey === exerciseKey && exerciseSwipeState.deltaX < -44;
    setSwipedExerciseKey(nextOpen ? exerciseKey : null);
    setExerciseSwipeState(null);
  };

  const removeExercise = (exerciseIndex) => {
    const exercise = loggedExercises[exerciseIndex];
    if (!exercise) return;
    if (!window.confirm(`Remove ${exercise.name} from this workout?`)) return;
    const nextExercises = loggedExercises.filter((_, currentIndex) => currentIndex !== exerciseIndex);
    setLoggedExercises(nextExercises);
    setExpandedExercises((current) => {
      const next = new Set();
      current.forEach((index) => {
        if (index < exerciseIndex) next.add(index);
        if (index > exerciseIndex) next.add(index - 1);
      });
      return next;
    });
    setSwipedExerciseKey(null);
    setExerciseSwipeState(null);
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
    setWorkoutTimerRunning(false);
    setRestRunning(false);
    const nextExercises = loggedExercises.map((exercise) => ({
      ...exercise,
      sets: (exercise.sets || []).map((set) => ({ ...set, completed: true })),
    }));
    setLoggedExercises(nextExercises);
    await saveExercises(nextExercises, { status: "completed", forceSave: true });
    const nextWorkout = { ...displayWorkout, status: "completed", exercises: nextExercises };
    const prs = detectWorkoutPRs(nextWorkout, allWorkouts.filter((item) => item.id !== id));
    setFinishSummary({
      workout: nextWorkout,
      duration: Math.max(Math.ceil(workoutSeconds / 60), getWorkoutDurationMinutes(nextWorkout)),
      sets: countSets(nextWorkout),
      completedSets: countSets(nextWorkout),
      exercises: nextExercises.length,
      prs,
      consistency: allWorkouts.filter((item) => {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(today.getDate() - today.getDay());
        const date = new Date(`${item.date}T00:00:00`);
        return (item.status || "completed") === "completed" && date >= weekStart && date <= today && item.id !== id;
      }).length + 1,
    });
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
  const previousWorkouts = useMemo(
    () => allWorkouts.filter((item) => item.id !== id),
    [allWorkouts, id]
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
  const totalSets = countSets(displayWorkout);
  const completedSets = loggedExercises.reduce(
    (sum, exercise) => sum + (exercise.sets || []).filter((set) => set.completed).length,
    0
  );
  const progressPercent = totalSets > 0 ? Math.min(100, Math.round((completedSets / totalSets) * 100)) : 0;
  const exerciseCount = loggedExercises.length;
  const nextExercise = loggedExercises.find((exercise) =>
    (exercise.sets || []).some((set) => !set.completed)
  );
  const pickerResults = availableExercises.filter((exercise) =>
    `${exercise.name} ${exercise.muscleGroup} ${exercise.equipment || ""}`.toLowerCase().includes(exerciseQuery.toLowerCase())
  );
  const workoutPrs = detectWorkoutPRs(displayWorkout, previousWorkouts);
  const prByExercise = new Map(workoutPrs.map((pr) => [pr.exercise, pr]));

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/workouts" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Workouts
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
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
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm shadow-neutral-950/[0.03]">
          <Clock className="hidden h-4 w-4 text-neutral-300 sm:block" />
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Active</p>
            <p className="text-lg font-semibold leading-tight text-neutral-900">{formatTimer(workoutSeconds)}</p>
          </div>
          <button
            type="button"
            onClick={() => setWorkoutTimerRunning((running) => !running)}
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white"
            aria-label={workoutTimerRunning ? "Pause workout timer" : "Start workout timer"}
          >
            {workoutTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          </button>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-2">
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
        <div className="relative flex items-center gap-2 shrink-0">
          {moreOpen && (
            <div className="absolute left-0 top-11 z-20 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl" role="menu">
              <button onClick={duplicateAsTemplate} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" role="menuitem">
                <Copy className="h-4 w-4 text-neutral-400" /> Save as template
              </button>
              <button onClick={() => { setRestDuration(defaultRestSeconds); setMoreOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50" role="menuitem">
                <RotateCcw className="h-4 w-4 text-neutral-400" /> Reset rest timer
              </button>
            </div>
          )}
        </div>
        <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Workout progress</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">{completedSets}/{totalSets} sets completed</p>
          </div>
          <p className="text-sm font-semibold text-neutral-900">{progressPercent}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Rest timer</p>
            <TimerReset className="w-4 h-4 text-neutral-300" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-3xl font-semibold text-neutral-900">{formatTimer(restSeconds)}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={startRestTimer} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white hover:bg-neutral-800">
                <Play className="w-3.5 h-3.5 fill-current" />
                Start
              </button>
              <button onClick={stopRestTimer} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                <Pause className="w-3.5 h-3.5" />
                Stop
              </button>
              <button onClick={restartRestTimer} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                <RotateCcw className="w-3.5 h-3.5" />
                Restart
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[60, 120, 180, 240, 300].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setRestDuration(seconds)}
                className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  restDurationSeconds === seconds
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {seconds / 60}m
              </button>
            ))}
            <div className="flex h-8 items-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <input
                value={customRestInput}
                onChange={(event) => setCustomRestInput(event.target.value)}
                onBlur={applyCustomRestTime}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyCustomRestTime();
                  }
                }}
                placeholder="1:57"
                className="h-full w-16 px-2 text-xs font-medium text-neutral-900 outline-none"
                aria-label="Custom rest timer"
              />
              <button onClick={applyCustomRestTime} className="h-full border-l border-neutral-200 px-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
                Set
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Exercises</p>
          <p className="text-2xl font-semibold text-neutral-900">{exerciseCount}</p>
          <p className="text-xs text-neutral-500 mt-1">{completedSets}/{totalSets} sets completed</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Total volume</p>
          <p className="text-2xl font-semibold text-neutral-900">{totalVolume.toLocaleString()}</p>
          <p className="text-xs text-neutral-500 mt-1">lbs · {totalSets} sets</p>
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
        </div>
      </div>

      <div className="space-y-3">
        {loggedExercises.map((exercise, exerciseIndex) => {
          const exerciseKey = getExerciseKey(exercise, exerciseIndex);
          const isExpanded = expandedExercises.has(exerciseIndex);
          const swipeOffset =
            exerciseSwipeState?.exerciseKey === exerciseKey
              ? exerciseSwipeState.deltaX
              : swipedExerciseKey === exerciseKey
                ? -92
                : 0;
          const deleteVisible = swipeOffset < -8 || swipedExerciseKey === exerciseKey;
          return (
          <div
            key={exerciseKey}
            id={`exercise-card-${exerciseIndex}`}
            className="relative overflow-hidden rounded-2xl"
            onTouchStart={(event) => handleExerciseSwipeStart(event, exerciseKey)}
            onTouchMove={(event) => handleExerciseSwipeMove(event, exerciseKey)}
            onTouchEnd={() => handleExerciseSwipeEnd(exerciseKey)}
            onTouchCancel={() => handleExerciseSwipeEnd(exerciseKey)}
          >
            <button
              type="button"
              onClick={() => removeExercise(exerciseIndex)}
              className={`absolute inset-y-0 right-0 z-20 flex w-24 items-center justify-center gap-1.5 rounded-2xl border border-red-100 bg-white text-sm font-semibold text-red-600 shadow-sm transition-opacity ${
                deleteVisible ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-label={`Delete ${exercise.name}`}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <div
              className="relative z-10 overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-transform duration-200 ease-out"
              style={{ transform: `translateX(${swipeOffset}px)` }}
            >
            {(() => {
              const lastPerformance = getLastExercisePerformance(previousWorkouts, exercise.name, {
                beforeDate: displayWorkout.date,
                excludeWorkoutId: id,
              });
              const pr = prByExercise.get(exercise.name);
              const setCount = (exercise.sets || []).length;
              const completedExerciseSets = (exercise.sets || []).filter((set) => set.completed).length;
              return (
                <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleExerciseExpanded(exerciseIndex)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={isExpanded}
                    aria-controls={`exercise-sets-${exerciseIndex}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-neutral-900">{exercise.name}</p>
                        {pr && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-900">
                            <Trophy className="h-3 w-3" /> New PR
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">{completedExerciseSets}/{setCount} Done</p>
                      <p className="mt-1 hidden text-xs text-neutral-500 sm:block">
                        Last time: {formatSetPerformance(lastPerformance?.bestSet)} · {getTryTodaySuggestion(lastPerformance)}
                      </p>
                    </div>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    onClick={() => toggleFavorite(exercise.name)}
                    className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                    aria-label={`Favorite ${exercise.name}`}
                  >
                    <Star className={`w-4 h-4 ${favoriteExercises.includes(exercise.name) ? "fill-neutral-900 text-neutral-900" : ""}`} />
                  </button>
                </div>
              );
            })()}
            <div
              id={`exercise-sets-${exerciseIndex}`}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
              aria-hidden={!isExpanded}
              inert={isExpanded ? undefined : ""}
            >
              <div className="overflow-hidden">
                <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  <span>Set</span>
                  <span>Weight</span>
                  <span>Reps</span>
                  <span className="sr-only">Done</span>
                </div>
                <div className="divide-y divide-neutral-50">
                  {(exercise.sets || []).map((set, setIndex) => (
                    <div
                      key={setIndex}
                      className={`grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2 px-4 py-3 transition-colors ${
                        set.completed ? "bg-neutral-50/90" : ""
                      }`}
                    >
                      <div className={`min-w-0 text-sm text-neutral-500 ${set.completed ? "line-through decoration-2 opacity-55" : ""}`}>
                        <span>Set {setIndex + 1}</span>
                        {prByExercise.get(exercise.name)?.setIndex === setIndex && (
                          <span className="mt-1 block w-fit rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-900">PR</span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={set.weight ?? ""}
                        onChange={(event) => updateSetValue(exerciseIndex, setIndex, "weight", event.target.value)}
                        className={`h-10 min-w-0 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 focus:border-neutral-400 focus:outline-none ${
                          set.completed ? "line-through opacity-55" : ""
                        }`}
                        aria-label={`${exercise.name} set ${setIndex + 1} weight`}
                      />
                      <input
                        type="number"
                        min="0"
                        value={set.reps ?? ""}
                        onChange={(event) => updateSetValue(exerciseIndex, setIndex, "reps", event.target.value)}
                        className={`h-10 min-w-0 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 focus:border-neutral-400 focus:outline-none ${
                          set.completed ? "line-through opacity-55" : ""
                        }`}
                        aria-label={`${exercise.name} set ${setIndex + 1} reps`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleSet(exerciseIndex, setIndex)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                          set.completed
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-neutral-200 bg-white text-neutral-300 hover:border-blue-500 hover:text-blue-600"
                        }`}
                        aria-label={`${set.completed ? "Uncheck" : "Complete"} ${exercise.name} set ${setIndex + 1}`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3">
                  <button
                    onClick={() => addSet(exerciseIndex)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
                  >
                    <Plus className="w-4 h-4" />
                    Add Set
                  </button>
                  {(exercise.sets || []).length > 1 && (
                    <button
                      onClick={() => removeSet(exerciseIndex, (exercise.sets || []).length - 1)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                      Remove last
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
          );
        })}
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
                  <span className="block text-xs text-neutral-400">{exercise.equipment || "Any equipment"}</span>
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

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Ready to wrap up?</p>
            <p className="mt-1 text-sm text-neutral-500">{completedSets}/{totalSets} sets completed.</p>
          </div>
          <button onClick={finishWorkout} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">
            <Check className="w-4 h-4" />
            Finish Workout
          </button>
        </div>
      </div>

      {finishSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Workout Complete</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-900">{finishSummary.workout.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">You showed up and completed {finishSummary.completedSets} sets.</p>
              </div>
              <button onClick={() => setFinishSummary(null)} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900" aria-label="Close workout summary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">Duration</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{formatDuration(finishSummary.duration)}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">Sets</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{finishSummary.completedSets}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">Exercises</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{finishSummary.exercises}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">PRs</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">{finishSummary.prs.length}</p>
              </div>
            </div>
            {finishSummary.prs.length > 0 && (
              <div className="mt-5 rounded-xl border border-neutral-100 p-4">
                <p className="text-sm font-semibold text-neutral-900">New PRs</p>
                <div className="mt-2 space-y-2">
                  {finishSummary.prs.map((pr) => (
                    <p key={`${pr.exercise}-${pr.weight}-${pr.reps}`} className="text-sm text-neutral-600">
                      {pr.exercise} — {formatSetPerformance(pr)}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 rounded-xl bg-neutral-50 p-4">
              <p className="text-sm font-medium text-neutral-900">Weekly consistency</p>
              <p className="mt-1 text-sm text-neutral-500">{finishSummary.consistency} workout{finishSummary.consistency !== 1 ? "s" : ""} completed this week.</p>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button onClick={() => navigate("/workouts")} className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800">
                Done
              </button>
              <button onClick={() => navigate("/progress")} className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                View Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
