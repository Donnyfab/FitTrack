import { useEffect, useRef, useState } from "react";
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
  Plus,
  SkipForward,
  X,
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

const formatHeaderTimer = (seconds) => {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
};

const triggerHaptic = (pattern = 10) => {
  if (typeof window === "undefined") return;
  try {
    window.navigator?.vibrate?.(pattern);
  } catch {
    // Haptics are best-effort and unsupported in some browsers.
  }
};

function RestProgressRing({
  seconds = 0,
  duration = 1,
  size = 36,
  strokeWidth = 3,
  trackClassName = "text-neutral-100",
  progressClassName = "text-blue-600",
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, Number(seconds) / Math.max(1, Number(duration) || 1)));
  const dashOffset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className={trackClassName}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        className={`${progressClassName} transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [restTimerHeader, setRestTimerHeader] = useState(null);
  const [restTimerExpanded, setRestTimerExpanded] = useState(false);
  const [restTimerPanelMounted, setRestTimerPanelMounted] = useState(false);
  const [restTimerClosing, setRestTimerClosing] = useState(false);
  const restTimerCloseTimeoutRef = useRef(null);
  const firstName = getUserFirstName(user, "User");
  const initial = (user?.full_name || user?.email || "U")[0]?.toUpperCase();
  const avatarUrl = user?.avatar_url;
  const restTimerSeconds = Math.max(0, Number(restTimerHeader?.seconds) || 0);
  const restTimerDuration = Math.max(1, Number(restTimerHeader?.durationSeconds) || restTimerSeconds || 1);
  const restTimerTime = formatHeaderTimer(restTimerSeconds);
  const restTimerNext = restTimerHeader?.nextExerciseName
    ? `Next: ${restTimerHeader.nextExerciseName}`
    : "Next set is ready";
  const restTimerFinalCountdown = restTimerSeconds > 0 && restTimerSeconds <= 10;
  const showExpandedRestTimer = restTimerHeader && (restTimerExpanded || restTimerPanelMounted);

  const collapseRestTimer = () => {
    if (!restTimerExpanded && !restTimerPanelMounted) return;
    triggerHaptic(8);
    window.clearTimeout(restTimerCloseTimeoutRef.current);
    setRestTimerClosing(true);
    setRestTimerExpanded(false);
    restTimerCloseTimeoutRef.current = window.setTimeout(() => {
      setRestTimerPanelMounted(false);
      setRestTimerClosing(false);
    }, 240);
  };

  const expandRestTimer = () => {
    triggerHaptic(8);
    window.clearTimeout(restTimerCloseTimeoutRef.current);
    setProfileOpen(false);
    setRestTimerClosing(false);
    setRestTimerPanelMounted(true);
    setRestTimerExpanded(true);
  };

  useEffect(() => {
    const handleRestTimerHeader = (event) => {
      const detail = event.detail || {};
      if (!detail.visible) {
        window.clearTimeout(restTimerCloseTimeoutRef.current);
        setRestTimerHeader(null);
        setRestTimerExpanded(false);
        setRestTimerPanelMounted(false);
        setRestTimerClosing(false);
        return;
      }
      setRestTimerHeader(detail);
      if (!detail.running && Number(detail.seconds) <= 0) {
        window.clearTimeout(restTimerCloseTimeoutRef.current);
        setRestTimerExpanded(false);
        setRestTimerPanelMounted(false);
        setRestTimerClosing(false);
      }
    };

    window.addEventListener("fittrack:rest-timer-header", handleRestTimerHeader);
    return () => {
      window.clearTimeout(restTimerCloseTimeoutRef.current);
      window.removeEventListener("fittrack:rest-timer-header", handleRestTimerHeader);
    };
  }, []);

  const dispatchRestTimerAction = (action, payload = {}) => {
    window.dispatchEvent(new CustomEvent("fittrack:rest-timer-action", { detail: { action, ...payload } }));
    if (action === "skip") collapseRestTimer();
  };

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

      {showExpandedRestTimer && (
        <button
          type="button"
          aria-label="Collapse rest timer"
          onClick={collapseRestTimer}
          className={`fixed inset-0 z-30 bg-neutral-950/10 backdrop-blur-[14px] transition-opacity duration-300 ease-out motion-reduce:transition-none ${
            restTimerClosing ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      <header
        className={`lg:hidden sticky top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300 ease-out ${
          showExpandedRestTimer
            ? "border-b border-transparent bg-transparent shadow-none"
            : "border-b border-white/60 bg-white/78 shadow-[0_14px_38px_-34px_rgba(29,29,31,0.65)] backdrop-blur-2xl"
        }`}
      >
        {showExpandedRestTimer ? (
          <div className="px-3 py-2">
            <div
              role="button"
              tabIndex={0}
              onClick={collapseRestTimer}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  collapseRestTimer();
                }
              }}
              className={`rest-timer-panel relative flex h-[112px] items-center gap-3 overflow-hidden rounded-[1.55rem] bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-3.5 text-white shadow-[0_24px_58px_-34px_rgba(37,99,235,0.98)] ${
                restTimerClosing ? "rest-timer-panel-out" : "rest-timer-panel-in"
              } ${restTimerFinalCountdown && !restTimerClosing ? "rest-timer-final-pulse" : ""}`}
              aria-label="Collapse rest timer controls"
            >
              <span className="rest-timer-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 rotate-12 bg-white/20 blur-2xl" />
              <span className="pointer-events-none absolute inset-0 rounded-[1.55rem] bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.26),transparent_34%),linear-gradient(90deg,rgba(255,255,255,0.08),transparent)]" />

              <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/90">
                <X className="h-5 w-5" />
              </span>

              <div className="relative flex h-[62px] w-[62px] shrink-0 items-center justify-center text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.42)]">
                <RestProgressRing
                  seconds={restTimerSeconds}
                  duration={restTimerDuration}
                  size={60}
                  strokeWidth={5}
                  trackClassName="text-white/25"
                  progressClassName="text-white"
                />
              </div>

              <div className="relative min-w-0 flex-1">
                <p className="text-3xl font-semibold leading-none tracking-tight">{restTimerTime}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Rest Time</p>
                <p className="mt-1 truncate text-xs font-medium text-white/78">{restTimerNext}</p>
              </div>

              <div className="relative flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatchRestTimerAction("skip");
                  }}
                  className="flex w-12 flex-col items-center gap-1 text-[10px] font-semibold text-white/90"
                  aria-label="Skip rest"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/65 bg-white/10">
                    <SkipForward className="h-4 w-4" />
                  </span>
                  <span>Skip</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatchRestTimerAction("add-seconds", { seconds: 15 });
                  }}
                  className="flex w-12 flex-col items-center gap-1 text-[10px] font-semibold text-white/90"
                  aria-label="Add 15 seconds"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/65 bg-white/10">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span>15s</span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatchRestTimerAction("add-seconds", { seconds: 30 });
                  }}
                  className="flex w-12 flex-col items-center gap-1 text-[10px] font-semibold text-white/90"
                  aria-label="Add 30 seconds"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/65 bg-white/10">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span>30s</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-14 items-center justify-between px-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-neutral-900 rounded-2xl flex items-center justify-center">
                <Dumbbell className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-neutral-900 tracking-tight">
                FitTrack
              </span>
            </div>
            {restTimerHeader && (
              <button
                type="button"
                onClick={expandRestTimer}
                className={`mx-2 inline-flex min-w-0 flex-1 max-w-[9.5rem] -translate-x-4 items-center justify-center gap-2 rounded-full border border-neutral-200/80 bg-white/90 px-2.5 py-1.5 text-left shadow-[0_10px_30px_-24px_rgba(29,29,31,0.7)] transition-all duration-300 ease-out active:scale-[0.98] motion-reduce:transition-none ${
                  restTimerFinalCountdown ? "rest-timer-compact-final-pulse" : ""
                }`}
                aria-expanded={restTimerExpanded}
                aria-label="Open rest timer controls"
              >
                <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center text-blue-600 drop-shadow-[0_0_10px_rgba(23,120,242,0.22)]">
                  <RestProgressRing seconds={restTimerSeconds} duration={restTimerDuration} size={28} strokeWidth={2.5} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold leading-none text-blue-600">{restTimerTime}</span>
                  <span className="mt-0.5 block truncate text-[10px] font-medium leading-none text-neutral-500">
                    Rest Time
                  </span>
                </span>
              </button>
            )}
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
        )}
      </header>

      <main className="lg:ml-72 min-h-screen">
        <div className="w-full max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 sm:py-8 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-12">
          <Outlet />
        </div>
      </main>

      <nav
        className={`lg:hidden fixed inset-x-0 bottom-0 border-t border-neutral-200/70 bg-white/82 backdrop-blur-2xl shadow-[0_-12px_34px_-30px_rgba(29,29,31,0.75)] ${
          showExpandedRestTimer ? "z-20" : "z-40"
        }`}
      >
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
