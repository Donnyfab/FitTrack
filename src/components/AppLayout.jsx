import { useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getUserFirstName } from "@/lib/userDisplay";
import {
  Activity,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  Target,
  TrendingUp,
  Settings as SettingsIcon,
  LogOut,
  CirclePlus,
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
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/workouts", label: "Workouts", icon: Dumbbell, end: false },
  { to: "/workouts/new", label: "Start", icon: CirclePlus, end: true },
  { to: "/progress", label: "Progress", icon: TrendingUp, end: false },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, end: false },
];

const profileLinks = [
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/exercise", label: "Exercises Library", icon: Activity },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const firstName = getUserFirstName(user, "User");
  const initial = (user?.full_name || user?.email || "U")[0]?.toUpperCase();
  const avatarUrl = user?.avatar_url;

  return (
    <div className="min-h-screen text-neutral-900">
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 flex-col p-4 z-30">
        <div className="flex h-full flex-col rounded-[2rem] border border-white/60 bg-white/55 shadow-[0_24px_80px_-48px_rgba(29,29,31,0.48)] backdrop-blur-2xl">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-[0_12px_30px_-18px_rgba(23,120,242,0.75)]">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="block font-semibold text-neutral-900 text-lg tracking-tight">
                  FitTrack
                </span>
                <span className="block text-xs text-neutral-500">Daily training</span>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-neutral-900 text-white shadow-[0_16px_36px_-24px_rgba(23,120,242,0.9)]"
                      : "text-neutral-600 hover:bg-white/70 hover:text-neutral-900"
                  }`
                }
              >
                <item.icon className="w-4 h-4" strokeWidth={2} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-3">
            <div className="rounded-[1.4rem] bg-white/70 p-3 mb-2 shadow-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 overflow-hidden rounded-2xl bg-neutral-100 flex items-center justify-center text-sm font-semibold text-neutral-600">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{firstName}</p>
                  <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium text-neutral-600 hover:bg-white/70 hover:text-neutral-900 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-white/60">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-neutral-900 rounded-2xl flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-neutral-900 tracking-tight">
              FitTrack
            </span>
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            className="w-9 h-9 overflow-hidden rounded-2xl bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-500"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </button>
          {profileOpen && (
            <div className="absolute right-5 top-14 z-50 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl" role="menu">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-neutral-900">{firstName}</p>
                <p className="truncate text-xs text-neutral-500">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-neutral-100" />
              {profileLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  role="menuitem"
                >
                  <item.icon className="h-4 w-4 text-neutral-400" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => logout()}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="lg:ml-72 min-h-screen">
        <div className="w-full max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 sm:py-8 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-12">
          <Outlet />
        </div>
      </main>

      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/70 bg-white/82 backdrop-blur-2xl shadow-[0_-12px_34px_-30px_rgba(29,29,31,0.75)]">
        <div className="grid grid-cols-5 h-[calc(3.9rem+env(safe-area-inset-bottom))] px-2 pt-1 pb-[env(safe-area-inset-bottom)]">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors ${
                  isActive ? "text-blue-600" : "text-neutral-400 hover:text-neutral-700"
                }`
              }
            >
              <item.icon className="h-[23px] w-[23px]" strokeWidth={2.1} />
              <span className="truncate leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
