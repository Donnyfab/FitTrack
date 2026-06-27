import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { GOAL_TYPES, GOAL_STATUSES, getGoalTypeLabel, getGoalStatusLabel } from "@/lib/constants";
import { formatDate } from "@/lib/workoutUtils";
import EmptyState from "@/components/EmptyState";
import { Plus, Target, X, Pencil, Trash2 } from "lucide-react";

const emptyGoal = { title: "", type: "build_muscle", target: "", deadline: "", status: "active", progress: 0, notes: "" };
const inputClass = "w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-neutral-400 transition-colors";
const labelClass = "block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyGoal);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  const loadGoals = async () => {
    try { setGoals(await base44.entities.Goal.list("-created_date", 100)); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setForm(emptyGoal); setEditingId(null); setShowForm(true); };
  const openEdit = (goal) => { setForm({ ...goal }); setEditingId(goal.id); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, progress: Number(form.progress) || 0 };
    try {
      if (editingId) await base44.entities.Goal.update(editingId, data);
      else await base44.entities.Goal.create(data);
      setShowForm(false);
      loadGoals();
    } finally { setSaving(false); }
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
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-neutral-50 rounded-2xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Goals</h1>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">{editingId ? "Edit Goal" : "New Goal"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className={labelClass}>Goal Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Bench 225 lbs" required className={inputClass} /></div>
              <div><label className={labelClass}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>{GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div><label className={labelClass}>Target</label><input value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="e.g. Gain 10 lbs of muscle" className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Deadline</label><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>Progress</label><div className="flex items-center gap-2 h-11"><input type="range" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} className="flex-1 accent-neutral-900" /><span className="text-sm font-medium text-neutral-900 w-10 text-right">{form.progress}%</span></div></div>
              </div>
              <div><label className={labelClass}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>{GOAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              <div><label className={labelClass}>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows="2" placeholder="Additional notes..." className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:border-neutral-400 transition-colors" /></div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving || !form.title} className="flex-1 h-11 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50">{saving ? "Saving..." : editingId ? "Save Changes" : "Create Goal"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="h-11 px-6 border border-neutral-200 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={Target} title="No goals yet" description="Set fitness goals to stay motivated and track your progress." action={<button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"><Plus className="w-4 h-4" /> New Goal</button>} />
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">{goal.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{getGoalTypeLabel(goal.type)}</span>
                    {goal.status !== "active" && <span className={`text-xs px-2 py-0.5 rounded-full ${goal.status === "completed" ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>{getGoalStatusLabel(goal.status)}</span>}
                    {goal.deadline && <span className="text-xs text-neutral-400">{formatDate(goal.deadline)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(goal)} className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(goal.id)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {goal.target && <p className="text-sm text-neutral-600 mb-3">{goal.target}</p>}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full bg-neutral-900 rounded-full transition-all" style={{ width: `${goal.progress || 0}%` }} /></div>
                <span className="text-xs font-medium text-neutral-600">{goal.progress || 0}%</span>
              </div>
              {goal.notes && <p className="text-xs text-neutral-500 mt-3">{goal.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
