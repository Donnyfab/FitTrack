import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { calculateWorkoutVolume, calculateStreak, getPersonalRecords, getWeeklyVolume, getWorkoutsPerWeek, formatWeek } from "@/lib/workoutUtils";
import EmptyState from "@/components/EmptyState";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp, Dumbbell, Flame, Trophy, Activity, Plus } from "lucide-react";

const tooltipStyle = { backgroundColor: "#fff", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "12px", color: "#0A0A0A", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };

export default function Progress() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWorkouts(); }, []);

  const loadWorkouts = async () => {
    try { setWorkouts(await base44.entities.Workout.list("-date", 500)); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-7 w-24 bg-neutral-100 rounded-lg mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-neutral-50 rounded-2xl" />)}</div>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-6">Progress</h1>
        <div className="bg-white rounded-2xl border border-neutral-200">
          <EmptyState icon={Activity} title="No progress data yet" description="Log workouts to see your progress, personal records, and volume trends over time." action={<Link to="/workouts/new" className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"><Plus className="w-4 h-4" /> New Workout</Link>} />
        </div>
      </div>
    );
  }

  const totalVolume = workouts.reduce((sum, w) => sum + calculateWorkoutVolume(w), 0);
  const totalSets = workouts.reduce((sum, w) => sum + (w.exercises?.reduce((s, ex) => s + (ex.sets?.length || 0), 0) || 0), 0);
  const streak = calculateStreak(workouts);
  const prList = Object.entries(getPersonalRecords(workouts)).sort(([, a], [, b]) => b.weight - a.weight);
  const weeklyVolume = getWeeklyVolume(workouts).slice(-12);
  const workoutsPerWeek = getWorkoutsPerWeek(workouts).slice(-12);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-6">Progress</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        {[
          { label: "Total Volume", icon: TrendingUp, value: Math.round(totalVolume).toLocaleString(), sub: "lbs lifted" },
          { label: "Total Sets", icon: Dumbbell, value: totalSets.toLocaleString(), sub: "all time" },
          { label: "Streak", icon: Flame, value: streak, sub: "days" },
          { label: "Workouts", icon: Activity, value: workouts.length, sub: "logged" },
        ].map(({ label, icon: Icon, value, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{label}</span><Icon className="w-4 h-4 text-neutral-300" /></div>
            <p className="text-2xl font-semibold text-neutral-900 tracking-tight">{value}</p>
            <p className="text-xs text-neutral-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>
      {weeklyVolume.length > 1 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 mb-4">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">Volume Over Time</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weeklyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="week" tickFormatter={formatWeek} stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Math.round(v).toLocaleString()} lbs`, "Volume"]} labelFormatter={formatWeek} />
              <Line type="monotone" dataKey="volume" stroke="#0A0A0A" strokeWidth={2} dot={{ fill: "#0A0A0A", r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {workoutsPerWeek.length > 1 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 mb-4">
          <h2 className="text-base font-semibold text-neutral-900 mb-4">Workout Consistency</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={workoutsPerWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="week" tickFormatter={formatWeek} stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} workout${v !== 1 ? "s" : ""}`, "Count"]} labelFormatter={formatWeek} />
              <Bar dataKey="count" fill="#0A0A0A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <div className="flex items-center gap-2 mb-4"><Trophy className="w-4 h-4 text-neutral-400" /><h2 className="text-base font-semibold text-neutral-900">Personal Records</h2></div>
        {prList.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4 text-center">No personal records yet. Log workouts with exercises to track your PRs.</p>
        ) : (
          <div className="space-y-0">
            {prList.map(([name, record]) => (
              <div key={name} className="flex items-center justify-between py-2.5 border-b border-neutral-50 last:border-0">
                <span className="text-sm font-medium text-neutral-900">{name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-500">{record.reps} reps</span>
                  <span className="text-sm font-semibold text-neutral-900">{record.weight} lbs</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
