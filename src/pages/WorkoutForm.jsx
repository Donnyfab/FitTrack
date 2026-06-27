import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MUSCLE_GROUPS } from "@/lib/constants";
import { ArrowLeft, X, Trash2 } from "lucide-react";

const emptyExercise = () => ({ name: "", sets: [{ reps: "", weight: "" }] });

export default function WorkoutForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [muscleGroup, setMuscleGroup] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState([emptyExercise()]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isEdit) loadWorkout(); }, [id]);

  const loadWorkout = async () => {
    try {
      const workout = await base44.entities.Workout.get(id);
      setName(workout.name);
      setDate(workout.date);
      setMuscleGroup(workout.muscleGroup || "");
      setNotes(workout.notes || "");
      setExercises(workout.exercises?.length ? workout.exercises.map((ex) => ({
        name: ex.name || "",
        sets: ex.sets?.length ? ex.sets.map((s) => ({ reps: s.reps?.toString() || "", weight: s.weight?.toString() || "" })) : [{ reps: "", weight: "" }],
      })) : [emptyExercise()]);
    } finally { setLoading(false); }
  };

  const addExercise = () => setExercises([...exercises, emptyExercise()]);
  const removeExercise = (idx) => setExercises(exercises.filter((_, i) => i !== idx));
  const updateExerciseName = (idx, value) => setExercises(exercises.map((ex, i) => (i === idx ? { ...ex, name: value } : ex)));
  const addSet = (exIdx) => setExercises(exercises.map((ex, i) => (i === exIdx ? { ...ex, sets: [...ex.sets, { reps: "", weight: "" }] } : ex)));
  const removeSet = (exIdx, setIdx) => setExercises(exercises.map((ex, i) => (i === exIdx ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) } : ex)));
  const updateSet = (exIdx, setIdx, field, value) => setExercises(exercises.map((ex, i) => (i === exIdx ? { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s)) } : ex)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      name, date, muscleGroup, notes,
      exercises: exercises.filter((ex) => ex.name.trim()).map((ex) => ({
        name: ex.name,
        sets: ex.sets.filter((s) => s.reps || s.weight).map((s) => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 })),
      })),
    };
    try {
      if (isEdit) await base44.entities.Workout.update(id, data);
      else await base44.entities.Workout.create(data);
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
            <div><label className={labelClass}>Date</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-11" /></div>
            <div><label className={labelClass}>Muscle Group</label><select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} className={selectClass}><option value="">Select...</option>{MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold text-neutral-900 mb-3">Exercises</h2>
          <div className="space-y-3">
            {exercises.map((exercise, exIdx) => (
              <div key={exIdx} className="bg-white rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Input value={exercise.name} onChange={(e) => updateExerciseName(exIdx, e.target.value)} placeholder="Exercise name (e.g. Bench Press)" className="h-10 flex-1" />
                  {exercises.length > 1 && <button type="button" onClick={() => removeExercise(exIdx)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>}
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
