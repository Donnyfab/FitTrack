import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Bell,
  Dumbbell,
  LogOut,
  Save,
  Shield,
  SlidersHorizontal,
  User,
} from "lucide-react";

const tabs = ["Profile", "Preferences", "Notifications", "Account"];
const labelClass = "block text-sm font-medium text-neutral-900";
const inputClass = "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2";

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4">
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500 mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-neutral-900" : "bg-neutral-200"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const { user, settings, logout, updateUserProfile } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] || "User";
  const initial = (user?.full_name || user?.email || "U")[0]?.toUpperCase();
  const [activeTab, setActiveTab] = useState("Profile");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [unitsSystem, setUnitsSystem] = useState(settings?.units_system || "imperial");
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState(settings?.weekly_workout_goal || 4);
  const [defaultRestTimer, setDefaultRestTimer] = useState(90);
  const [setSummary, setSetSummary] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [theme, setTheme] = useState("System");
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    workoutReminders: true,
    goalProgress: true,
    weeklySummary: false,
  });

  useEffect(() => {
    setFullName(user?.full_name || "");
    setUnitsSystem(settings?.units_system || "imperial");
    setWeeklyWorkoutGoal(settings?.weekly_workout_goal || 4);
  }, [user?.full_name, settings?.units_system, settings?.weekly_workout_goal]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({ fullName, unitsSystem, weeklyWorkoutGoal });
      toast({ title: "Settings saved", description: "Your profile data was updated." });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error.message || "Could not update your settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage profile, workout preferences, notifications, and account controls.</p>
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

      <form onSubmit={handleSave} className="space-y-4">
        {activeTab === "Profile" && (
          <>
            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                  <span className="text-lg font-semibold text-neutral-500">{initial}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">{user?.full_name || firstName}</p>
                  <p className="text-sm text-neutral-500 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-neutral-400" />
                <h2 className="text-base font-semibold text-neutral-900">Profile</h2>
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="fullName">Name</label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                  className={inputClass}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "Preferences" && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center gap-2 mb-5">
              <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
              <h2 className="text-base font-semibold text-neutral-900">Preferences</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className={labelClass} htmlFor="units">Units</label>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-neutral-100 p-1">
                  {["imperial", "metric"].map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setUnitsSystem(unit)}
                      className={`h-9 rounded-md text-sm font-medium capitalize transition-colors ${
                        unitsSystem === unit ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
                      }`}
                    >
                      {unit === "imperial" ? "Imperial" : "Metric"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="weeklyGoal">Weekly workout goal</label>
                <input
                  id="weeklyGoal"
                  type="number"
                  min="1"
                  max="14"
                  value={weeklyWorkoutGoal}
                  onChange={(event) => setWeeklyWorkoutGoal(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="restTimer">Default rest timer</label>
                <select
                  id="restTimer"
                  value={defaultRestTimer}
                  onChange={(event) => setDefaultRestTimer(Number(event.target.value))}
                  className={inputClass}
                >
                  <option value={60}>60 seconds</option>
                  <option value={90}>90 seconds</option>
                  <option value={120}>120 seconds</option>
                  <option value={180}>180 seconds</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="theme">Theme</label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  className={inputClass}
                >
                  <option>System</option>
                  <option>Light</option>
                  <option>Dark</option>
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <ToggleRow label="Set summary" description="Show a summary after each completed exercise." checked={setSummary} onChange={setSetSummary} />
              <ToggleRow label="Auto-save workouts" description="Save workout edits while logging." checked={autoSave} onChange={setAutoSave} />
            </div>
          </div>
        )}

        {activeTab === "Notifications" && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-4 h-4 text-neutral-400" />
              <h2 className="text-base font-semibold text-neutral-900">Notification Preferences</h2>
            </div>
            <div className="space-y-3">
              <ToggleRow
                label="Workout reminders"
                description="Remind me before scheduled workouts."
                checked={notifications.workoutReminders}
                onChange={(value) => setNotifications({ ...notifications, workoutReminders: value })}
              />
              <ToggleRow
                label="Goal progress updates"
                description="Notify me when a goal is close or complete."
                checked={notifications.goalProgress}
                onChange={(value) => setNotifications({ ...notifications, goalProgress: value })}
              />
              <ToggleRow
                label="Weekly summary"
                description="Send a weekly recap of workouts and volume."
                checked={notifications.weeklySummary}
                onChange={(value) => setNotifications({ ...notifications, weeklySummary: value })}
              />
            </div>
          </div>
        )}

        {activeTab === "Account" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-neutral-400" />
                <h2 className="text-base font-semibold text-neutral-900">Account Management</h2>
              </div>
              <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  Export workout data <span className="text-xs text-neutral-400">CSV</span>
                </button>
                <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  Manage connected accounts <span className="text-xs text-neutral-400">None</span>
                </button>
                <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                  Delete account <span className="text-xs text-red-300">Danger zone</span>
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Session</h2>
              <button onClick={() => logout()} type="button" className="flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors w-full">
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save settings"}
          </button>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <div className="w-7 h-7 bg-neutral-900 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
            FitTrack Version 1.0
          </div>
        </div>
      </form>
    </div>
  );
}
