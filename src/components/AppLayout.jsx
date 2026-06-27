import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  Activity,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  Target,
  TrendingUp,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/workouts", label: "Workouts", icon: Dumbbell, end: false },
  { to: "/exercise", label: "Exercise", icon: Activity, end: false },
  { to: "/goals", label: "Goals", icon: Target, end: false },
  { to: "/progress", label: "Progress", icon: TrendingUp, end: false },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, end: false },
  { to: "/settings", label: "Settings", icon: SettingsIcon, end: false },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] || "User";
  const initial = (user?.full_name || user?.email || "U")[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-white">
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col border-r border-neutral-200 bg-neutral-50/50 z-30">
        <div className="p-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-neutral-900 text-lg tracking-tight">
              FitTrack
            </span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900"
                }`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-neutral-200">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-600">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{firstName}</p>
                <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-200">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-neutral-900 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-neutral-900 tracking-tight">
              FitTrack
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-500">
              {initial}
            </div>
        </div>
      </header>

      <main className="lg:ml-64 min-h-screen">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 sm:py-8 pb-28 lg:pb-12">
          <Outlet />
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-neutral-200 z-40">
        <div className="flex items-center justify-start gap-1 overflow-x-auto h-16 px-2 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `min-w-[64px] flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${
                  isActive ? "text-neutral-900 bg-neutral-100" : "text-neutral-400"
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
