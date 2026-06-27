import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Dumbbell, LogOut, Save } from "lucide-react";

export default function Settings() {
  const { user, settings, logout, updateUserProfile } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] || "User";
  const initial = (user?.full_name || user?.email || "U")[0]?.toUpperCase();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [unitsSystem, setUnitsSystem] = useState(settings?.units_system || "imperial");
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState(settings?.weekly_workout_goal || 4);
  const [saving, setSaving] = useState(false);

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
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-6">Settings</h1>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 mb-4">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Profile</h2>
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
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-neutral-200 p-5 mb-4">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Saved Data</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fullName">Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="units">Units</Label>
            <select
              id="units"
              value={unitsSystem}
              onChange={(event) => setUnitsSystem(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="imperial">Imperial</option>
              <option value="metric">Metric</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weeklyGoal">Weekly workout goal</Label>
            <Input
              id="weeklyGoal"
              type="number"
              min="1"
              max="14"
              value={weeklyWorkoutGoal}
              onChange={(event) => setWeeklyWorkoutGoal(event.target.value)}
            />
          </div>
        </div>
        <Button type="submit" className="mt-5" disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </form>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 mb-4">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Account</h2>
        <button onClick={() => logout()} className="flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors w-full">
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">About</h2>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-neutral-900 rounded-lg flex items-center justify-center">
            <Dumbbell className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-neutral-900">FitTrack</span>
        </div>
        <p className="text-xs text-neutral-500">Version 1.0 — Track your fitness journey.</p>
      </div>
    </div>
  );
}
