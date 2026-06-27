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

const mobileNavItems = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/workouts", label: "Workouts", icon: Dumbbell, end: false },
  { to: "/exercise", label: "Exercises", icon: Activity, end: false },
  { to: "/progress", label: "Progress", icon: TrendingUp, end: false },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, end: false },
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
          <NavLink
            to="/settings"
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-500"
            aria-label="Open settings"
          >
            {initial}
          </NavLink>
        </div>
      </header>

      <main className="lg:ml-64 min-h-screen">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 sm:py-8 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-12">
          <Outlet />
        </div>
      </main>

      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/80 backdrop-blur-xl shadow-[0_-10px_30px_-28px_rgba(15,23,42,0.55)]"
        aria-label="Primary"
      >
        <div className="grid h-[calc(49px+env(safe-area-inset-bottom))] grid-cols-5 items-start px-1.5 pb-[env(safe-area-inset-bottom)] pt-1">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium leading-none tracking-normal transition-colors ${
                  isActive ? "text-[#007AFF]" : "text-neutral-400 hover:text-neutral-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="h-[23px] w-[23px]" strokeWidth={isActive ? 2.25 : 2} />
                  <span className="truncate text-[10px] leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
