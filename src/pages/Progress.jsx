import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  calculateStreak,
  calculateWorkoutVolume,
  formatWeek,
  getPersonalRecords,
  getWeeklyVolume,
} from "@/lib/workoutUtils";
import { countSets } from "@/lib/fittrackDemoData";
import {
  detectWorkoutPRs,
  formatSetPerformance,
  getConsistencyByWeek,
} from "@/lib/trainingInsights";
import {
  Activity,
  Dumbbell,
  Flame,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tabs = ["Overview", "Volume", "Strength", "Body Stats"];
const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#0A0A0A",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

export default function Progress() {
  const [workouts, setWorkouts] = useState([]);
  const [bodyStats, setBodyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [range, setRange] = useState("this-month");
  const [bodyStatForm, setBodyStatForm] = useState({
    recordedAt: new Date().toISOString().split("T")[0],
    weight: "",
    bodyFatPercentage: "",
    notes: "",
  });

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const [workoutRows, bodyStatRows] = await Promise.all([
        base44.entities.Workout.list("-date", 500),
        base44.entities.BodyStat.list("-recorded_at", 100),
      ]);
      setWorkouts(workoutRows);
      setBodyStats(bodyStatRows);
    } finally {
      setLoading(false);
    }
  };

  const saveBodyStat = async (event) => {
    event.preventDefault();
    await base44.entities.BodyStat.upsert(bodyStatForm, { onConflict: "user_id,recorded_at" });
    setBodyStatForm({
      recordedAt: new Date().toISOString().split("T")[0],
      weight: "",
      bodyFatPercentage: "",
      notes: "",
    });
    const bodyStatRows = await base44.entities.BodyStat.list("-recorded_at", 100);
    setBodyStats(bodyStatRows);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-7 w-24 bg-neutral-100 rounded-lg mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-neutral-50 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const today = new Date();
  const rangeStart = new Date(today);
  rangeStart.setHours(0, 0, 0, 0);
  let filteredWorkouts;
  let filteredBodyStats;
  if (range === "last-month") {
    rangeStart.setMonth(rangeStart.getMonth() - 1, 1);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setMonth(rangeEnd.getMonth() + 1, 0);
    rangeEnd.setHours(23, 59, 59, 999);
    filteredWorkouts = workouts.filter((workout) => {
      const date = new Date(`${workout.date}T00:00:00`);
      return date >= rangeStart && date <= rangeEnd;
    });
    filteredBodyStats = bodyStats.filter((stat) => {
      const date = new Date(`${stat.recordedAt}T00:00:00`);
      return date >= rangeStart && date <= rangeEnd;
    });
  } else {
    if (range === "last-90-days") rangeStart.setDate(rangeStart.getDate() - 89);
    else rangeStart.setDate(1);
    filteredWorkouts = workouts.filter((workout) => new Date(`${workout.date}T00:00:00`) >= rangeStart);
    filteredBodyStats = bodyStats.filter((stat) => new Date(`${stat.recordedAt}T00:00:00`) >= rangeStart);
  }

  const totalVolume = filteredWorkouts.reduce((sum, workout) => sum + calculateWorkoutVolume(workout), 0);
  const totalSets = filteredWorkouts.reduce((sum, workout) => sum + countSets(workout), 0);
  const streak = calculateStreak(workouts);
  const prList = Object.entries(getPersonalRecords(filteredWorkouts))
    .sort(([, a], [, b]) => b.weight - a.weight)
    .slice(0, 8);
  const weeklyVolume = getWeeklyVolume(filteredWorkouts).slice(-12);
  const muscleBreakdown = Object.entries(
    filteredWorkouts.reduce((map, workout) => {
      const group = workout.muscleGroup?.split(",")[0] || "Other";
      map[group] = (map[group] || 0) + calculateWorkoutVolume(workout);
      return map;
    }, {})
  ).map(([group, volume]) => ({ group, volume }));
  const strengthData = prList.slice(0, 5).map(([name, record]) => ({
    name,
    weight: record.weight,
  }));
  const consistencyData = getConsistencyByWeek(workouts, 6);
  const prTimeline = filteredWorkouts
    .flatMap((workout) =>
      detectWorkoutPRs(workout, workouts.filter((item) => item.id !== workout.id)).map((pr) => ({
        ...pr,
        date: workout.date,
        workoutName: workout.name,
      }))
    )
    .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))
    .slice(0, 6);
  const hasVolumeData = weeklyVolume.some((item) => Number(item.volume) > 0);
  const hasMuscleData = muscleBreakdown.length > 0;
  const hasStrengthData = strengthData.length > 0;
  const bodyStatsChartData = [...filteredBodyStats].reverse().map((stat) => ({
    recordedAt: stat.recordedAt,
    weight: stat.weight,
    bodyFat: stat.bodyFatPercentage,
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Progress</h1>
          <p className="text-sm text-neutral-500 mt-1">Track volume, strength, body stats, and personal records.</p>
        </div>
        <select
          value={range}
          onChange={(event) => setRange(event.target.value)}
          className="h-10 w-full sm:w-40 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 focus:outline-none focus:border-neutral-400"
          aria-label="Progress time range"
        >
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="last-90-days">Last 90 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
          {[
          { label: "Total Volume", icon: TrendingUp, value: Math.round(totalVolume).toLocaleString(), sub: "lbs lifted" },
          { label: "Total Workouts", icon: Activity, value: filteredWorkouts.length, sub: "sessions" },
          { label: "Total Sets", icon: Dumbbell, value: totalSets.toLocaleString(), sub: "completed" },
          { label: "Streak", icon: Flame, value: `${streak}d`, sub: "current run" },
        ].map(({ label, icon: Icon, value, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{label}</span>
              <Icon className="w-4 h-4 text-neutral-300" />
            </div>
            <p className="text-2xl font-semibold text-neutral-900 tracking-tight">{value}</p>
            <p className="text-xs text-neutral-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

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

      {(activeTab === "Overview" || activeTab === "Volume") && (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">Volume Over Time</h2>
            {hasVolumeData ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weeklyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="week" tickFormatter={formatWeek} stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Math.round(Number(value)).toLocaleString()} lbs`, "Volume"]} labelFormatter={formatWeek} />
                  <Line type="monotone" dataKey="volume" stroke="#0A0A0A" strokeWidth={2} dot={{ fill: "#0A0A0A", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center rounded-xl bg-neutral-50 text-center">
                <div>
                  <p className="text-sm font-medium text-neutral-900">No volume history yet</p>
                  <p className="mt-1 text-xs text-neutral-500">Volume trends will appear after workouts are logged.</p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">Muscle Group Breakdown</h2>
            {hasMuscleData ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={muscleBreakdown} dataKey="volume" nameKey="group" innerRadius={58} outerRadius={90} paddingAngle={3}>
                      {muscleBreakdown.map((entry, index) => (
                        <Cell key={entry.group} fill={["#171717", "#525252", "#737373", "#a3a3a3", "#d4d4d4"][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Math.round(Number(value)).toLocaleString()} lbs`, "Volume"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {muscleBreakdown.map((item) => (
                    <div key={item.group} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600">{item.group}</span>
                      <span className="font-medium text-neutral-900">{Math.round(item.volume).toLocaleString()} lb</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[240px] items-center justify-center rounded-xl bg-neutral-50 text-center">
                <div>
                  <p className="text-sm font-medium text-neutral-900">No muscle group data</p>
                  <p className="mt-1 text-xs text-neutral-500">Breakdowns will appear after workouts are logged.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "Overview" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">Weekly Consistency</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={consistencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} workouts`, "Completed"]} />
                <Bar dataKey="workouts" fill="#171717" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">PR Timeline</h2>
            {prTimeline.length > 0 ? (
              <div className="space-y-2">
                {prTimeline.map((pr) => (
                  <div key={`${pr.date}-${pr.exercise}-${pr.weight}-${pr.reps}`} className="rounded-xl border border-neutral-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{pr.exercise}</p>
                        <p className="mt-1 text-xs text-neutral-500">{pr.workoutName} · {pr.date}</p>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900">{formatSetPerformance(pr)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-neutral-50 p-4 text-center">
                <p className="text-sm font-medium text-neutral-900">No PR timeline yet</p>
                <p className="mt-1 text-xs text-neutral-500">PRs appear when a logged set beats your previous best.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {(activeTab === "Overview" || activeTab === "Strength") && (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">Strength Leaders</h2>
            {hasStrengthData ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={strengthData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={110} stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} lbs`, "PR"]} />
                  <Bar dataKey="weight" fill="#171717" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-xl bg-neutral-50 text-center">
                <div>
                  <p className="text-sm font-medium text-neutral-900">No strength records yet</p>
                  <p className="mt-1 text-xs text-neutral-500">Strength leaders will appear after weighted sets are logged.</p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-neutral-400" />
                <h2 className="text-base font-semibold text-neutral-900">Personal Records</h2>
              </div>
              <Link to="/exercise" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">View all PRs</Link>
            </div>
            <div className="space-y-0">
              {prList.length > 0 ? (
                prList.slice(0, 5).map(([name, record]) => (
                  <div key={name} className="flex items-center justify-between py-2.5 border-b border-neutral-50 last:border-0">
                    <span className="text-sm font-medium text-neutral-900">{name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-500">{record.reps} reps</span>
                      <span className="text-sm font-semibold text-neutral-900">{record.weight} lbs</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-neutral-50 p-4 text-center">
                  <p className="text-sm font-medium text-neutral-900">No PRs recorded</p>
                  <p className="mt-1 text-xs text-neutral-500">Personal records will appear after logged sets.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Body Stats" && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-neutral-400" />
            <h2 className="text-base font-semibold text-neutral-900">Body Stats</h2>
          </div>
          <form onSubmit={saveBodyStat} className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
            <label className="space-y-1">
              <span className="text-xs font-medium text-neutral-500">Date</span>
              <input
                type="date"
                value={bodyStatForm.recordedAt}
                onChange={(event) => setBodyStatForm({ ...bodyStatForm, recordedAt: event.target.value })}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:border-neutral-400"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-neutral-500">Weight</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={bodyStatForm.weight}
                onChange={(event) => setBodyStatForm({ ...bodyStatForm, weight: event.target.value })}
                placeholder="Weight"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:border-neutral-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-neutral-500">Body fat %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={bodyStatForm.bodyFatPercentage}
                onChange={(event) => setBodyStatForm({ ...bodyStatForm, bodyFatPercentage: event.target.value })}
                placeholder="Body fat %"
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:border-neutral-400"
              />
            </label>
            <button type="submit" className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800">
              Save
            </button>
          </form>
          {bodyStatsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={bodyStatsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="recordedAt" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="weight" stroke="#171717" strokeWidth={2} dot={{ fill: "#171717", r: 3 }} />
                <Line type="monotone" dataKey="bodyFat" stroke="#a3a3a3" strokeWidth={2} dot={{ fill: "#a3a3a3", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[320px] items-center justify-center rounded-xl bg-neutral-50 text-center">
              <div>
                <p className="text-sm font-medium text-neutral-900">No body stats recorded</p>
                <p className="mt-1 text-xs text-neutral-500">Weight and body fat charts will appear after body stats are added.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
