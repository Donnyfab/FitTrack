import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { GOAL_STATUSES, GOAL_TYPES, getGoalStatusLabel, getGoalTypeLabel } from "@/lib/constants";
import { daysUntil } from "@/lib/fittrackDemoData";
import { formatDate, getPersonalRecords } from "@/lib/workoutUtils";
import EmptyState from "@/components/EmptyState";
import {
  CheckCircle2,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";

const emptyGoal = {
  title: "",
  type: "workout_consistency",
  target: "",
  deadline: "",
  status: "active",
  progress: 0,
  notes: "",
};
const inputClass = "w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400 transition-colors";
const labelClass = "block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2";

const typeLabel = (type) => {
  const labels = {
    workout_consistency: "Workout consistency",
    strength_goal: "Strength goal",
    weight_goal: "Weight goal",
    body_fat_goal: "Body fat goal",
  };
  return labels[type] || getGoalTypeLabel(type);
};

const clampProgress = (value) => Math.min(100, Math.max(0, Number(value) || 0));

function parseTargetNumber(goal) {
  const match = `${goal.title || ""} ${goal.target || ""} ${goal.notes || ""}`.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function autoGoalProgress(goal, workouts, weeklyGoal) {
  const targetNumber = parseTargetNumber(goal);
  if (goal.type === "workout_consistency" || goal.type === "improve_consistency") {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(today.getDate() - today.getDay());
    const completed = workouts.filter((workout) => {
      const date = new Date(`${workout.date}T00:00:00`);
      return (workout.status || "completed") === "completed" && date >= weekStart && date <= today;
    }).length;
    const target = targetNumber || weeklyGoal || 4;
    return {
      progress: clampProgress(Math.round((completed / target) * 100)),
      current: `${completed} workouts this week`,
      target: `${target} workouts`,
      note: "Auto-updated from completed workouts.",
    };
  }

  if (goal.type === "strength_goal" && targetNumber) {
    const records = getPersonalRecords(workouts);
    const query = `${goal.title || ""} ${goal.target || ""}`.toLowerCase();
    const matchingRecord = Object.entries(records).find(([name]) => query.includes(name.toLowerCase()))?.[1];
    const bestWeight = matchingRecord?.weight || 0;
    return {
      progress: clampProgress(Math.round((bestWeight / targetNumber) * 100)),
      current: bestWeight ? `${bestWeight} lb best set` : "No matching lift yet",
      target: `${targetNumber} lb`,
      note: "Auto-updates when a matching lift beats your best.",
    };
  }

  return null;
}

export default function Goals() {
  const { settings } = useAuth();
  const [goals, setGoals] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Active Goals");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyGoal);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const [goalRows, workoutRows] = await Promise.all([
        base44.entities.Goal.list("-created_date", 100),
        base44.entities.Workout.list("-date", 500),
      ]);
      setGoals(goalRows);
      setWorkouts(workoutRows);
    } finally {
      setLoading(false);
    }
  };

  const filteredGoals = goals.filter((goal) =>
    activeTab === "Active Goals" ? goal.status !== "completed" : goal.status === "completed"
  );

  const openCreate = () => {
    setForm(emptyGoal);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (goal) => {
    setForm({
      ...emptyGoal,
      ...goal,
      target: goal.target || goal.description || "",
      notes: goal.notes || goal.description || "",
    });
    setEditingId(goal.id);
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const data = { ...form, progress: clampProgress(form.progress) };
    try {
      if (editingId) await base44.entities.Goal.update(editingId, data);
      else await base44.entities.Goal.create(data);
      setShowForm(false);
      loadGoals();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    await base44.entities.Goal.delete(id);
    loadGoals();
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-7 w-24 bg-neutral-100 rounded-lg mb-6" />
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-neutral-50 rounded-2xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Goals</h1>
          <p className="text-sm text-neutral-500 mt-1">Track consistency, strength, weight, and body fat targets.</p>
        </div>
        <button onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["Active Goals", "Completed Goals"].map((tab) => (
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

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">{editingId ? "Edit Goal" : "New Goal"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="goalTitle">Goal Title</label>
                <input id="goalTitle" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Train 5 days per week" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="goalType">Type</label>
                <select id="goalType" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className={inputClass}>
                  {GOAL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="goalTarget">Target Progress</label>
                <input id="goalTarget" value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} placeholder="e.g. Complete 5 workouts weekly" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="goalDeadline">End Date</label>
                  <input id="goalDeadline" type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="goalProgress">Progress</label>
                  <div className="flex items-center gap-2 h-11">
                    <input id="goalProgress" type="range" min="0" max="100" value={form.progress} onChange={(event) => setForm({ ...form, progress: clampProgress(event.target.value) })} className="flex-1 accent-neutral-900" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.progress}
                      onChange={(event) => setForm({ ...form, progress: clampProgress(event.target.value) })}
                      className="h-9 w-16 rounded-lg border border-neutral-200 px-2 text-right text-sm font-medium text-neutral-900 focus:outline-none focus:border-neutral-400"
                      aria-label="Goal progress percentage"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="goalStatus">Status</label>
                <select id="goalStatus" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={inputClass}>
                  {GOAL_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="goalNotes">Goal Description</label>
                <textarea id="goalNotes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} placeholder="Why this goal matters..." className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:border-neutral-400 transition-colors" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving || !form.title} className="flex-1 h-11 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50">
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Goal"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="h-11 px-6 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filteredGoals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState
            icon={Target}
            title="No goals in this tab"
            description="Create goals to track progress against clear fitness targets."
            action={<button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"><Plus className="w-4 h-4" /> New Goal</button>}
          />
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredGoals.map((goal) => {
            const target = goal.target || "Not set";
            const automatic = autoGoalProgress(goal, workouts, Number(settings?.weekly_workout_goal) || 4);
            const progress = Math.max(Number(goal.progress) || 0, automatic?.progress || 0);
            const days = daysUntil(goal.deadline);
            const completed = goal.status === "completed";
            return (
              <div key={goal.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {completed && <CheckCircle2 className="w-4 h-4 text-neutral-500" />}
                      <p className="font-semibold text-neutral-900 truncate">{goal.title}</p>
                    </div>
                    <p className="text-sm text-neutral-600 mt-2">{goal.description || goal.notes || goal.target}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(goal)} className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(goal.id)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{typeLabel(goal.type)}</span>
                  <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{getGoalStatusLabel(goal.status || "active")}</span>
                  {goal.deadline && <span className="text-xs text-neutral-400">Ends {formatDate(goal.deadline)}</span>}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Current</p>
                    <p className="text-sm font-semibold text-neutral-900 mt-1">{automatic?.current || `${progress}%`}</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Target</p>
                    <p className="text-sm font-semibold text-neutral-900 mt-1 truncate">{automatic?.target || target}</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Days left</p>
                    <p className="text-sm font-semibold text-neutral-900 mt-1">{days === null ? "Open" : Math.max(days, 0)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-neutral-600">Percentage complete</span>
                    <span className="font-semibold text-neutral-900">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-neutral-900 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  {automatic?.note && <p className="mt-2 text-xs text-neutral-500">{automatic.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
