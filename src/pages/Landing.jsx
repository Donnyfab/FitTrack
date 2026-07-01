import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Activity,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Dumbbell,
  LibraryBig,
  Play,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  Zap,
} from "lucide-react";
import FitTrackLogo from "@/components/FitTrackLogo";

const previewModes = [
  {
    key: "plan",
    label: "Plan",
    title: "AI plan ready",
    subtitle: "Push, Pull, Legs built around 5 training days",
    progress: 32,
    metric: "5 days",
    accent: "bg-emerald-500",
  },
  {
    key: "train",
    label: "Train",
    title: "Push Day",
    subtitle: "Chest, Shoulders, Triceps",
    progress: 75,
    metric: "12 / 16 sets",
    accent: "bg-blue-600",
  },
  {
    key: "track",
    label: "Track",
    title: "Strength is climbing",
    subtitle: "Bench press up 5 lb from last session",
    progress: 68,
    metric: "+5 lb",
    accent: "bg-neutral-950",
  },
  {
    key: "recover",
    label: "Recover",
    title: "Rest timer",
    subtitle: "Next: Incline Dumbbell Press",
    progress: 58,
    metric: "00:45",
    accent: "bg-sky-500",
  },
];

const demoExercises = [
  { name: "Dumbbell Bench Press", sets: "2/2", weight: "60 lb", reps: "12", done: true },
  { name: "Incline Dumbbell Press", sets: "1/2", weight: "50 lb", reps: "12", done: false },
  { name: "Seated Shoulder Press", sets: "0/2", weight: "45 lb", reps: "10", done: false },
];

const calendarDays = [
  { day: "MON", title: "Push", status: "done" },
  { day: "TUE", title: "Pull", status: "done" },
  { day: "WED", title: "Legs", status: "planned" },
  { day: "THU", title: "Rest", status: "rest" },
  { day: "FRI", title: "Push", status: "planned" },
];

const faqs = [
  {
    question: "Does the landing page use my real workout data?",
    answer:
      "No. The public preview uses static demo data only. Your actual workouts stay inside the authenticated app.",
  },
  {
    question: "Can FitTrack build a workout plan for me?",
    answer:
      "Yes. The AI planner asks about goals, schedule, equipment, injuries, and preferences before turning the plan into editable workouts.",
  },
  {
    question: "Can I repeat workouts on a schedule?",
    answer:
      "FitTrack supports weekly workout planning, so recurring routines can show up on the calendar and stay connected to your training flow.",
  },
  {
    question: "Is this for beginners or advanced lifters?",
    answer:
      "Both. Beginners can start with templates and guided plans, while experienced lifters can track sets, PRs, progression, rest, and goals.",
  },
];

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener?.("change", updatePreference);
    return () => media.removeEventListener?.("change", updatePreference);
  }, []);

  return reducedMotion;
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="landing-reveal mx-auto max-w-3xl text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#1778f2]">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-neutral-600 sm:text-lg">{description}</p>
    </div>
  );
}

function PrimaryButton({ to, children, className = "" }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1778f2] px-6 text-sm font-semibold text-white shadow-[0_20px_50px_-26px_rgba(23,120,242,0.9)] transition hover:bg-[#0968df] ${className}`}
    >
      {children}
    </Link>
  );
}

function SecondaryButton({ to, children, className = "" }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-6 text-sm font-semibold text-neutral-950 shadow-[0_16px_45px_-32px_rgba(29,29,31,0.45)] transition hover:border-neutral-300 hover:bg-white ${className}`}
    >
      {children}
    </Link>
  );
}

function ProgressRing({ progress }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(23,120,242,0.12)" strokeWidth="6" />
      <circle
        className="preview-ring"
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke="#1778f2"
        strokeLinecap="round"
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}

function ProductPreview({ activeMode, setActiveMode, reducedMotion }) {
  const active = previewModes[activeMode];
  const modeKey = active.key;

  return (
    <div className="landing-reveal relative mx-auto w-full max-w-[440px]">
      <div className="absolute -left-8 top-16 hidden h-28 w-28 rounded-full bg-[#1778f2]/10 blur-3xl sm:block" />
      <div className="rounded-[2.4rem] border border-white/80 bg-white/80 p-3 shadow-[0_35px_90px_-55px_rgba(29,29,31,0.55)] backdrop-blur-xl">
        <div className="overflow-hidden rounded-[1.9rem] border border-neutral-100 bg-[#f7f8fb]">
          <div className="flex items-center justify-between border-b border-neutral-200/70 bg-white/80 px-5 py-4">
            <FitTrackLogo compact />
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-[#1778f2] to-[#9da7ff]">
              <div className="h-full w-full bg-[radial-gradient(circle_at_55%_35%,rgba(255,255,255,0.55),transparent_28%)]" />
            </div>
          </div>

          <div className="preview-stage p-5">
            <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
              {previewModes.map((mode, index) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setActiveMode(index)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    active.key === mode.key
                      ? "bg-[#1778f2] text-white"
                      : "bg-white text-neutral-600 shadow-[0_10px_35px_-30px_rgba(29,29,31,0.5)]"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div
              className="rounded-[1.6rem] border border-white/80 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(29,29,31,0.6)]"
              style={{
                background:
                  modeKey === "train"
                    ? "radial-gradient(circle at top right, rgba(23,120,242,0.14), transparent 34%), #ffffff"
                    : "#ffffff",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#1778f2]">
                    {modeKey === "train" ? "Workout in progress" : active.label}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{active.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-neutral-600">{active.subtitle}</p>
                </div>
                <div className="shrink-0 text-right">
                  {modeKey === "recover" ? (
                    <ProgressRing progress={active.progress} />
                  ) : (
                    <p className="text-3xl font-semibold tracking-tight text-neutral-950">{active.progress}%</p>
                  )}
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="preview-bar-fill h-full origin-left rounded-full bg-[#1778f2]"
                  style={{ width: `${active.progress}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["Exercises", modeKey === "plan" ? "6" : "4 / 5"],
                  ["Sets", active.metric],
                  ["Time", modeKey === "recover" ? "Resting" : "45 min"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-neutral-100/80 p-3">
                    <p className="text-base font-semibold text-neutral-950">{value}</p>
                    <p className="mt-1 text-xs text-neutral-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {demoExercises.map((exercise, index) => (
                <div
                  key={exercise.name}
                  className="preview-live-row flex items-center gap-3 rounded-2xl border border-white/80 bg-white px-3.5 py-3 shadow-[0_18px_50px_-42px_rgba(29,29,31,0.5)]"
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      exercise.done ? "bg-[#1778f2] text-white" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {exercise.done ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-950">{exercise.name}</p>
                    <p className="text-xs text-neutral-500">
                      {exercise.sets} Done - {exercise.weight} x {exercise.reps}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-300" />
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="preview-panel rounded-[1.35rem] bg-neutral-950 p-4 text-white shadow-[0_20px_65px_-48px_rgba(29,29,31,0.8)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">AI plan</span>
                  <Sparkles className="h-4 w-4 text-[#74a9ff]" />
                </div>
                <p className="preview-type mt-3 text-sm leading-5 text-white/85">
                  {modeKey === "plan"
                    ? "Build muscle with a 5 day Push Pull Legs split."
                    : "Next adjustment: add reps before increasing weight."}
                </p>
              </div>
              <div className="preview-panel rounded-[1.35rem] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Calendar</span>
                  <CalendarDays className="h-4 w-4 text-[#1778f2]" />
                </div>
                <div className="mt-3 flex gap-1.5">
                  {calendarDays.map((day) => (
                    <div
                      key={day.day}
                      className={`flex-1 rounded-xl px-1.5 py-2 text-center ${
                        day.status === "planned"
                          ? "bg-blue-50 text-[#1778f2]"
                          : day.status === "done"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      <p className="text-[10px] font-bold">{day.day}</p>
                      <p className="mt-1 truncate text-[11px]">{day.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className={`preview-rest mt-4 flex items-center justify-between rounded-[1.5rem] bg-[#1778f2] p-4 text-white ${
                reducedMotion ? "" : "shadow-[0_24px_55px_-35px_rgba(23,120,242,0.9)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <ProgressRing progress={42} />
                <div>
                  <p className="text-xl font-semibold tracking-tight">00:45</p>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Rest time</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
                  <Play className="h-4 w-4 fill-current" />
                </button>
                <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-sm font-bold">
                  +30
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="landing-reveal rounded-[1.6rem] border border-white/80 bg-white/80 p-6 shadow-[0_22px_70px_-52px_rgba(29,29,31,0.55)] backdrop-blur-xl">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#1778f2]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-neutral-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
    </div>
  );
}

function AppMoment({ icon: Icon, title, description, children }) {
  return (
    <div className="landing-reveal grid gap-8 rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[0_28px_90px_-62px_rgba(29,29,31,0.6)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
      <div className="flex flex-col justify-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1778f2] text-white">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">{title}</h3>
        <p className="mt-3 text-base leading-7 text-neutral-600">{description}</p>
      </div>
      <div className="rounded-[1.6rem] border border-neutral-100 bg-[#f7f8fb] p-4">{children}</div>
    </div>
  );
}

function Landing() {
  const rootRef = useRef(null);
  const previewRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const [activeMode, setActiveMode] = useState(0);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const interval = window.setInterval(() => {
      setActiveMode((current) => (current + 1) % previewModes.length);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return undefined;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.utils.toArray(".landing-reveal").forEach((element) => {
        gsap.fromTo(
          element,
          { y: 18 },
          {
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 84%",
              once: true,
            },
          },
        );
      });
    }, rootRef);

    return () => context.revert();
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !previewRef.current) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(".preview-stage", { autoAlpha: 0.85, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" });
      gsap.fromTo(".preview-live-row", { autoAlpha: 0, x: 14 }, { autoAlpha: 1, x: 0, duration: 0.42, stagger: 0.06, ease: "power2.out" });
      gsap.fromTo(".preview-panel", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.46, stagger: 0.08, ease: "power2.out" });
      gsap.fromTo(".preview-bar-fill", { scaleX: 0.2 }, { scaleX: 1, transformOrigin: "left center", duration: 0.75, ease: "power3.out" });
      gsap.fromTo(".preview-ring", { strokeDashoffset: 150 }, { strokeDashoffset: 76, duration: 0.8, ease: "power2.out" });
      gsap.fromTo(".preview-rest", { scale: 0.98 }, { scale: 1, duration: 0.5, ease: "back.out(1.7)" });
    }, previewRef);

    return () => context.revert();
  }, [activeMode, reducedMotion]);

  return (
    <main ref={rootRef} className="min-h-screen overflow-hidden bg-[#f6f8fb] text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <FitTrackLogo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-600 md:flex">
            <a href="#ai-planner" className="transition hover:text-neutral-950">
              AI planner
            </a>
            <a href="#tracking" className="transition hover:text-neutral-950">
              Tracking
            </a>
            <a href="#calendar" className="transition hover:text-neutral-950">
              Calendar
            </a>
            <a href="#faq" className="transition hover:text-neutral-950">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:text-neutral-950 sm:inline-flex">
              Log in
            </Link>
            <PrimaryButton to="/register" className="min-h-10 px-4">
              Start free
            </PrimaryButton>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(23,120,242,0.16),transparent_30%),radial-gradient(circle_at_85%_25%,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="landing-reveal max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-2 text-sm font-semibold text-[#1778f2] shadow-[0_16px_45px_-38px_rgba(23,120,242,0.8)]">
              <Sparkles className="h-4 w-4" />
              Built for the workout you are doing right now
            </div>
            <h1 className="mt-7 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-neutral-950 sm:text-6xl lg:text-7xl">
              Your training plan, workout log, and progress coach in one app.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600 sm:text-xl">
              FitTrack helps you know what to train today, what you did last time, and whether you improved without turning your workout into a spreadsheet.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton to="/register">
                Start building your plan
                <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
              <SecondaryButton to="/login">Log in</SecondaryButton>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["18 sets", "tracked live"],
                ["5 days", "planned weekly"],
                ["00:45", "rest timer"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-white/70 p-4">
                  <p className="text-lg font-semibold text-neutral-950">{value}</p>
                  <p className="mt-1 text-xs font-medium text-neutral-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div ref={previewRef}>
            <ProductPreview activeMode={activeMode} setActiveMode={setActiveMode} reducedMotion={reducedMotion} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={Zap}
            title="Start faster"
            description="Today’s workout, next set, and repeat actions stay front and center so users can start training in seconds."
          />
          <FeatureCard
            icon={Activity}
            title="Beat last time"
            description="Set rows keep prior performance, completed sets, progress, and rest timing close to the actual workout flow."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Stay consistent"
            description="Schedules, templates, and weekly goals help turn workouts into a repeatable training rhythm."
          />
        </div>
      </section>

      <section id="ai-planner" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <SectionHeader
          eyebrow="Plan with AI"
          title="A plan that starts with your real life."
          description="The planner asks about your goal, level, schedule, equipment, injuries, and preferences, then turns the answer into workouts you can edit."
        />
        <div className="mt-10">
          <AppMoment
            icon={Bot}
            title="Chat through the plan, then create it in FitTrack."
            description="The assistant focuses on practical details: what days you can train, what equipment you have, and how much volume you can recover from."
          >
            <div className="space-y-3">
              <div className="rounded-2xl bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1778f2] text-white">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-950">FitTrack Assistant</p>
                    <p className="text-sm text-neutral-500">Ready to plan</p>
                  </div>
                </div>
                <p className="mt-4 rounded-[1.2rem] bg-neutral-100 p-4 text-sm leading-6 text-neutral-800">
                  I can build a 5 day muscle gain plan around dumbbells, cables, and your preferred Push Pull Legs split.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {["Goal: Build muscle", "Schedule: 5 days", "Equipment: Dumbbells", "Injuries: None"].map((item) => (
                  <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-neutral-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </AppMoment>
        </div>
      </section>

      <section id="tracking" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <AppMoment
            icon={Dumbbell}
            title="Workout tracking that stays out of the way."
            description="Expandable exercise cards let users check off sets, see what is left, and move through the workout without extra dashboard clutter."
          >
            <div className="space-y-3">
              {demoExercises.map((exercise, index) => (
                <div key={exercise.name} className="rounded-[1.25rem] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700">{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-950">{exercise.name}</p>
                      <p className="text-sm text-neutral-500">{exercise.sets} Done</p>
                    </div>
                    <CircleCheck className={`h-5 w-5 ${exercise.done ? "text-[#1778f2]" : "text-neutral-300"}`} />
                  </div>
                </div>
              ))}
            </div>
          </AppMoment>

          <AppMoment
            icon={TrendingUp}
            title="Progress that shows improvement, not noise."
            description="Volume, strength leaders, personal records, and goals live where users expect them: on the Progress and Goals pages."
          >
            <div className="rounded-[1.25rem] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Strength leaders</p>
                  <h4 className="mt-2 text-xl font-semibold text-neutral-950">This month</h4>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">+12%</span>
              </div>
              <div className="mt-5 space-y-4">
                {[
                  ["Barbell Row", 92],
                  ["Lat Pulldown", 78],
                  ["Dumbbell Press", 56],
                  ["Hammer Curl", 42],
                ].map(([name, value]) => (
                  <div key={name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-neutral-600">{name}</span>
                      <span className="font-semibold text-neutral-950">{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100">
                      <div className="preview-chart h-full rounded-full bg-neutral-950" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AppMoment>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <AppMoment
            icon={LibraryBig}
            title="Exercise library"
            description="Filter by muscle group and equipment, favorite movements, and add multiple exercises into a plan."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {["Chest", "Biceps", "Triceps", "Back", "Shoulders"].map((chip, index) => (
                  <span key={chip} className={`rounded-full px-3 py-2 text-sm font-semibold ${index === 0 ? "bg-[#1778f2] text-white" : "bg-white text-neutral-600"}`}>
                    {chip}
                  </span>
                ))}
              </div>
              <div className="grid gap-3">
                {["Bench Press", "Incline Dumbbell Press", "Cable Fly"].map((name) => (
                  <div key={name} className="rounded-2xl bg-white p-4">
                    <p className="font-semibold text-neutral-950">{name}</p>
                    <p className="mt-1 text-sm text-neutral-500">Chest - Dumbbell</p>
                  </div>
                ))}
              </div>
            </div>
          </AppMoment>

          <AppMoment
            icon={CalendarDays}
            title="Calendar scheduling"
            description="Plan recurring training days and keep your schedule clear, including Google Calendar sync."
          >
            <div className="grid grid-cols-5 gap-2">
              {calendarDays.map((day) => (
                <div key={day.day} className="rounded-2xl bg-white p-3 text-center">
                  <p className="text-xs font-bold text-neutral-400">{day.day}</p>
                  <div
                    className={`mx-auto mt-3 h-10 w-10 rounded-full ${
                      day.status === "done" ? "bg-emerald-100" : day.status === "planned" ? "bg-blue-100" : "bg-neutral-100"
                    }`}
                  />
                  <p className="mt-3 text-xs font-semibold text-neutral-700">{day.title}</p>
                </div>
              ))}
            </div>
          </AppMoment>

          <AppMoment
            icon={TimerReset}
            title="Rest and recovery"
            description="The rest timer lives in the header, alerts users before it ends, and keeps the workout list visible."
          >
            <div className="rounded-[1.5rem] bg-[#1778f2] p-5 text-white">
              <div className="flex items-center gap-4">
                <ProgressRing progress={62} />
                <div>
                  <p className="text-3xl font-semibold tracking-tight">01:30</p>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Rest time</p>
                  <p className="mt-1 text-sm text-white/80">Next: Incline Press</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                {["Skip", "+15s", "+30s"].map((control) => (
                  <span key={control} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                    {control}
                  </span>
                ))}
              </div>
            </div>
          </AppMoment>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Built for real training, not generic dashboards."
          description="A few details about how the public preview, planning flow, and workout features fit together."
        />
        <div className="mt-10 grid gap-3">
          {faqs.map((faq) => (
            <div key={faq.question} className="landing-reveal rounded-[1.4rem] border border-white/80 bg-white/80 p-5 shadow-[0_18px_55px_-45px_rgba(29,29,31,0.55)]">
              <h3 className="text-base font-semibold text-neutral-950">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:pb-24">
        <div className="landing-reveal overflow-hidden rounded-[2.2rem] bg-neutral-950 p-8 text-white shadow-[0_35px_90px_-60px_rgba(29,29,31,0.9)] sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#74a9ff]">Start today</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Know what to train next before you even open your gym bag.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                Create a plan, log the workout, follow the rest timer, and let FitTrack turn the data into your next best move.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <PrimaryButton to="/register" className="bg-white text-neutral-950 hover:bg-neutral-100">
                Create account
                <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
              <SecondaryButton to="/login" className="border-white/15 bg-white/10 text-white hover:bg-white/15">
                Log in
              </SecondaryButton>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/70 bg-white/60 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <FitTrackLogo compact />
          <div className="flex flex-wrap gap-4">
            <span>AI planning</span>
            <span>Workout tracking</span>
            <span>Calendar sync</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default Landing;
