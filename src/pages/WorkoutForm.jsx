import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MUSCLE_GROUPS } from "@/lib/constants";
import { clearSelectedWorkoutExercises, readSelectedWorkoutExercises, writeSelectedWorkoutExercises } from "@/lib/workoutSelection";
import { clearWorkoutDraft, readWorkoutDraft, writeWorkoutDraft } from "@/lib/trainingInsights";
import { ArrowLeft, CalendarDays, Repeat, X, Trash2 } from "lucide-react";

const weekdayOptions = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

function parseMuscleGroups(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeExercise(exercise) {
  return {
    name: exercise.name || "",
    sets: exercise.sets?.length ? exercise.sets.map((set) => ({
      reps: set.reps?.toString() || "",
      weight: set.weight?.toString() || "",
      completed: Boolean(set.completed),
    })) : [{ reps: "", weight: "", completed: false }],
  };
}

function mergeSelectedExercises(existingExercises, selectedExerciseNames) {
  const current = existingExercises.map(normalizeExercise);
  const existingNames = new Set(current.map((exercise) => exercise.name).filter(Boolean));
  selectedExerciseNames.forEach((exerciseName) => {
    if (!existingNames.has(exerciseName)) {
      current.push({ name: exerciseName, sets: [{ reps: "", weight: "", completed: false }] });
      existingNames.add(exerciseName);
    }
  });
  return current;
}

export default function WorkoutForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("completed");
  const [calories, setCalories] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [template, setTemplate] = useState(false);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState(new Date().getDay());
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadWorkout();
      return;
    }
    const selectedExercises = readSelectedWorkoutExercises();
    const draft = readWorkoutDraft();
    if (draft) {
      setName(draft.name || "New Workout");
      setDate(draft.date || new Date().toISOString().split("T")[0]);
      setMuscleGroups(parseMuscleGroups(draft.muscleGroups || draft.muscleGroup));
      setNotes(draft.notes || "");
      setStatus(draft.status || "planned");
      setCalories(draft.calories?.toString() || "");
      setFavorite(Boolean(draft.favorite));
      setTemplate(Boolean(draft.template));
      setRepeatWeekly(Boolean(draft.repeatWeekly));
      setRepeatDayOfWeek(Number.isInteger(draft.repeatDayOfWeek) ? draft.repeatDayOfWeek : new Date(`${draft.date || new Date().toISOString().split("T")[0]}T00:00:00`).getDay());
      setExercises(mergeSelectedExercises(draft.exercises || [], selectedExercises));
      clearWorkoutDraft();
      clearSelectedWorkoutExercises();
      return;
    }
    if (selectedExercises.length > 0) {
      setExercises(selectedExercises.map((exerciseName) => ({ name: exerciseName, sets: [{ reps: "", weight: "", completed: false }] })));
      setName("New Workout");
      clearSelectedWorkoutExercises();
    }
  }, [id]);

  const loadWorkout = async () => {
    try {
      const workout = await base44.entities.Workout.get(id);
      setName(workout.name);
      setDate(workout.date);
      setMuscleGroups(parseMuscleGroups(workout.muscleGroup));
      setNotes(workout.notes || "");
      setStatus(workout.status || "completed");
      setCalories(workout.calories?.toString() || "");
      setFavorite(Boolean(workout.favorite));
      setTemplate(Boolean(workout.template));
      setExercises(workout.exercises?.length ? workout.exercises.map(normalizeExercise) : []);
    } finally { setLoading(false); }
  };

  const muscleGroupLabel = muscleGroups.join(", ");
  const toggleMuscleGroup = (group) => {
    setMuscleGroups((groups) =>
      groups.includes(group) ? groups.filter((item) => item !== group) : [...groups, group]
    );
  };
  const handleDateChange = (nextDate) => {
    setDate(nextDate);
    if (nextDate) setRepeatDayOfWeek(new Date(`${nextDate}T00:00:00`).getDay());
  };
  const currentDraft = () => ({
    name,
    date,
    muscleGroup: muscleGroupLabel,
    muscleGroups,
    notes,
    status,
    calories,
    favorite,
    template,
    repeatWeekly,
    repeatDayOfWeek,
    exercises,
  });
  const addExercise = () => {
    writeWorkoutDraft(currentDraft());
    writeSelectedWorkoutExercises(exercises.map((exercise) => exercise.name).filter(Boolean));
    navigate("/exercise?mode=workout-builder");
  };
  const removeExercise = (idx) => setExercises(exercises.filter((_, i) => i !== idx));
  const addSet = (exIdx) => setExercises(exercises.map((ex, i) => (i === exIdx ? { ...ex, sets: [...ex.sets, { reps: "", weight: "", completed: false }] } : ex)));
  const removeSet = (exIdx, setIdx) => setExercises(exercises.map((ex, i) => (i === exIdx ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) } : ex)));
  const updateSet = (exIdx, setIdx, field, value) => setExercises(exercises.map((ex, i) => (i === exIdx ? { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s)) } : ex)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const cleanedExercises = exercises.filter((ex) => ex.name.trim()).map((ex) => ({
      name: ex.name,
      sets: ex.sets.filter((s) => s.reps || s.weight).map((s) => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0, completed: Boolean(s.completed) })),
    }));
    const data = {
      name, date, muscleGroup: muscleGroupLabel, notes, status, calories, favorite, template,
      exercises: cleanedExercises,
    };
    try {
      const savedWorkout = isEdit
        ? await base44.entities.Workout.update(id, data)
        : await base44.entities.Workout.create(data);
      if (repeatWeekly && savedWorkout?.id) {
        const schedule = await base44.entities.RecurringSchedule.create({
          dayOfWeek: repeatDayOfWeek,
          name,
          muscleGroup: muscleGroupLabel,
          exercises: cleanedExercises,
          templateWorkoutId: savedWorkout.id,
          startDate: date,
          endDate: null,
          active: true,
        });
        await base44.entities.Workout.update(savedWorkout.id, {
          recurringScheduleId: schedule.id,
          scheduledFor: date,
        });
      }
      clearSelectedWorkoutExercises();
      clearWorkoutDraft();
      navigate(isEdit ? `/workouts/${id}` : "/workouts");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-7 w-40 bg-neutral-100 rounded-lg mb-4" />
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-neutral-50 rounded-xl" />)}</div>
      </div>
    );
  }

  const selectClass = "w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400 transition-colors";
  const labelClass = "block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2";

  return (
    <div className="animate-fade-in">
      <Link to={isEdit ? `/workouts/${id}` : "/workouts"} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> {isEdit ? "Workout" : "Workouts"}
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-8">{isEdit ? "Edit Workout" : "New Workout"}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
          <div><label className={labelClass}>Workout Name</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day, Leg Day, Upper Body" required className="h-11" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Date</label><Input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} required className="h-11" /></div>
            <div><label className={labelClass}>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}><option value="completed">Completed</option><option value="scheduled">Scheduled</option><option value="planned">Planned</option><option value="missed">Missed</option></select></div>
          </div>
          <div>
            <label className={labelClass}>Muscle Groups</label>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => toggleMuscleGroup(group)}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    muscleGroups.includes(group)
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Calories</label><Input type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Optional" className="h-11" /></div>
            <div>
              <label className={labelClass}>Repeat</label>
              <button
                type="button"
                onClick={() => {
                  const nextRepeat = !repeatWeekly;
                  setRepeatWeekly(nextRepeat);
                  if (nextRepeat && status === "completed") setStatus("scheduled");
                }}
                className={`flex h-11 w-full items-center justify-between rounded-lg border px-3 text-sm font-medium transition-colors ${
                  repeatWeekly ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700"
                }`}
              >
                <span className="inline-flex items-center gap-2"><Repeat className="h-4 w-4" /> Weekly plan</span>
                <span>{repeatWeekly ? "On" : "Off"}</span>
              </button>
            </div>
          </div>
          {repeatWeekly && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <label className={labelClass}>Repeat Every</label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <select value={repeatDayOfWeek} onChange={(e) => setRepeatDayOfWeek(Number(e.target.value))} className={selectClass}>
                  {weekdayOptions.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
                <div className="hidden items-center gap-2 rounded-lg bg-white px-3 text-sm text-neutral-500 sm:flex">
                  <CalendarDays className="h-4 w-4" />
                  Starts {date}
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                FitTrack will show this workout on the calendar every {weekdayOptions.find((day) => day.value === repeatDayOfWeek)?.label}.
              </p>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700">
              Favorite
              <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 accent-neutral-900" />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700">
              Save as template
              <input type="checkbox" checked={template} onChange={(e) => setTemplate(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 accent-neutral-900" />
            </label>
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold text-neutral-900 mb-3">Exercises</h2>
          <div className="space-y-3">
            {exercises.map((exercise, exIdx) => (
              <div key={exIdx} className="bg-white rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-900">{exercise.name}</p>
                    <p className="text-xs text-neutral-500">Edit sets, reps, and weight after adding from the library.</p>
                  </div>
                  <button type="button" onClick={() => removeExercise(exIdx)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1"><span className="text-[11px] text-neutral-400 font-medium w-8">Set</span><span className="text-[11px] text-neutral-400 font-medium flex-1">Reps</span><span className="text-[11px] text-neutral-400 font-medium flex-1">Weight (lbs)</span><span className="w-8" /></div>
                  {exercise.sets.map((set, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 font-medium w-8 text-center">{setIdx + 1}</span>
                      <Input type="number" value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)} placeholder="0" className="h-9 flex-1" min="0" />
                      <Input type="number" value={set.weight} onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)} placeholder="0" className="h-9 flex-1" min="0" step="0.5" />
                      <button type="button" onClick={() => exercise.sets.length > 1 && removeSet(exIdx, setIdx)} className={`w-8 p-1.5 rounded-lg transition-colors ${exercise.sets.length > 1 ? "text-neutral-400 hover:text-red-600 hover:bg-red-50" : "text-neutral-200"}`}><X className="w-4 h-4 mx-auto" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addSet(exIdx)} className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors mt-1">+ Add Set</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addExercise} className="w-full mt-3 py-3 border border-dashed border-neutral-300 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:border-neutral-400 transition-colors">+ Add Exercise</button>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <label className={labelClass}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did the workout feel? Any PRs?" rows="3" className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:border-neutral-400 transition-colors" />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !name} className="h-11 px-6 flex-1 sm:flex-none">{saving ? "Saving..." : isEdit ? "Save Changes" : "Create Workout"}</Button>
          <Link to={isEdit ? `/workouts/${id}` : "/workouts"}><Button type="button" variant="outline" className="h-11 px-6">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
