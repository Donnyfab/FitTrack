import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { calculateWorkoutVolume, formatDateLong } from "@/lib/workoutUtils";
import { ArrowLeft, Pencil, Trash2, Dumbbell } from "lucide-react";

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkout();
  }, [id]);

  const loadWorkout = async () => {
    try {
      const data = await base44.entities.Workout.get(id);
      setWorkout(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this workout? This cannot be undone.")) return;
    await base44.entities.Workout.delete(id);
    navigate("/workouts");
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-5 w-20 bg-neutral-100 rounded-lg mb-4" />
        <div className="h-8 w-48 bg-neutral-100 rounded-lg mb-3" />
        <div className="h-4 w-32 bg-neutral-50 rounded-lg mb-8" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-neutral-50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">Workout not found.</p>
        <Link to="/workouts" className="text-sm text-neutral-900 font-medium hover:underline mt-2 inline-block">
          Back to workouts
        </Link>
      </div>
    );
  }

  const totalVolume = calculateWorkoutVolume(workout);

  return (
    <div className="animate-fade-in">
      <Link to="/workouts" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Workouts
      </Link>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight break-words">{workout.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm text-neutral-500">{formatDateLong(workout.date)}</span>
            {workout.muscleGroup && (<><span className="text-neutral-300">·</span><span className="text-sm text-neutral-500">{workout.muscleGroup}</span></>)}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/workouts/${id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
          <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
      {workout.exercises && workout.exercises.length > 0 ? (
        <div className="space-y-3 mb-6">
          {workout.exercises.map((exercise, exIdx) => (
            <div key={exIdx} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100">
                <p className="font-medium text-neutral-900">{exercise.name}</p>
              </div>
              <div className="divide-y divide-neutral-50">
                {exercise.sets?.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-neutral-400 font-medium">Set {setIdx + 1}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-neutral-900 font-medium">{set.reps || 0} <span className="text-neutral-400 font-normal">reps</span></span>
                      <span className="text-neutral-300">×</span>
                      <span className="text-neutral-900 font-medium">{set.weight || 0} <span className="text-neutral-400 font-normal">lbs</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center mb-6">
          <Dumbbell className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-500">No exercises logged.</p>
        </div>
      )}
      {totalVolume > 0 && (
        <div className="flex items-center justify-between bg-neutral-50 rounded-xl px-4 py-3 mb-6">
          <span className="text-sm text-neutral-500">Total Volume</span>
          <span className="text-sm font-semibold text-neutral-900">{totalVolume.toLocaleString()} lbs</span>
        </div>
      )}
      {workout.notes && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{workout.notes}</p>
        </div>
      )}
    </div>
  );
}
