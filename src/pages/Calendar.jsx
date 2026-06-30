import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isGoogleCalendarConfigured, syncEventsToGoogleCalendar } from "@/lib/googleCalendarSync";
import { formatDate } from "@/lib/workoutUtils";
import { toast } from "@/hooks/use-toast";
import {
  getDateKey,
} from "@/lib/fittrackDemoData";
import {
  detectWorkoutPRs,
  formatDuration,
  getCompletedSetCount,
  getSetCount,
  getStarterRoutine,
  getWorkoutDurationMinutes,
  writeWorkoutDraft,
} from "@/lib/trainingInsights";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Dumbbell,
  ListChecks,
  Loader2,
  Play,
  Repeat,
  Trash2,
  XCircle,
} from "lucide-react";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const planDays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const monthLabel = (date) =>
  date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

function buildCalendarDays(activeMonth) {
  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function eventTone(type) {
  if (type === "missed") return "bg-red-400";
  if (type === "scheduled" || type === "planned") return "bg-blue-500";
  return "bg-emerald-500";
}

function getEventStatusLabel(event) {
  if (!event) return "Rest";
  if (isActiveEvent(event)) return "In progress";
  if (event.type === "missed") return "Missed";
  if (event.type === "scheduled") return "Scheduled";
  if (event.type === "planned") return "Planned";
  return "Completed";
}

function getEventStatusClass(event) {
  if (!event) return "bg-neutral-100 text-neutral-500";
  if (isActiveEvent(event)) return "bg-blue-50 text-blue-700";
  if (event.type === "missed") return "bg-red-50 text-red-600";
  if (event.type === "scheduled" || event.type === "planned") return "bg-blue-50 text-blue-700";
  return "bg-emerald-50 text-emerald-700";
}

function isActiveEvent(event) {
  return Boolean(event && event.completedSets > 0 && event.plannedSets > event.completedSets && event.type !== "missed");
}

function getEventProgress(event) {
  if (!event?.plannedSets) return 0;
  return Math.round((event.completedSets / event.plannedSets) * 100);
}

function getEventHref(event) {
  return event?.workout?.id ? `/workouts/${event.workout.id}` : "/workouts/new";
}

function getPrimaryEvent(events = []) {
  return (
    events.find(isActiveEvent) ||
    events.find((event) => ["scheduled", "planned"].includes(event.type)) ||
    events.find((event) => event.type === "completed") ||
    events[0] ||
    null
  );
}

function getShortDayLabel(dateKey, todayKey) {
  if (dateKey === todayKey) return "Today";
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

function getEstimatedMinutesRemaining(event) {
  if (!event?.plannedSets || event.completedSets >= event.plannedSets) return 0;
  const duration = event.duration || 0;
  const remainingSets = event.plannedSets - event.completedSets;
  if (duration) return Math.max(1, Math.round(duration * (remainingSets / event.plannedSets)));
  return Math.max(1, remainingSets * 2);
}

function scheduleAppliesToDate(schedule, date) {
  const key = getDateKey(date);
  return (
    schedule.active &&
    Number(schedule.dayOfWeek) === date.getDay() &&
    key >= schedule.startDate &&
    (!schedule.endDate || key <= schedule.endDate)
  );
}

function getEventExercises(event) {
  return event?.workout?.exercises || event?.schedule?.exercises || [];
}

function getCompletedExerciseCount(event) {
  const exercises = getEventExercises(event);
  if (!exercises.length && event?.plannedSets && event.completedSets >= event.plannedSets) {
    return event.exercises || 0;
  }
  return exercises.filter((exercise) => {
    const sets = exercise.sets || [];
    return sets.length > 0 && sets.every((set) => set.completed);
  }).length;
}

function pluralize(value, singular, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function CalendarDayButton({ date, activeMonth, dayEvents, selected, isToday, onSelect }) {
  const inMonth = date.getMonth() === activeMonth.getMonth();
  const completed = dayEvents.some((event) => event.type === "completed");
  const planned = dayEvents.some((event) => event.type === "scheduled" || event.type === "planned");
  const missed = dayEvents.some((event) => event.type === "missed");
  const active = dayEvents.some(isActiveEvent);
  const quietRest = !dayEvents.length && inMonth;

  return (
    <button
      onClick={onSelect}
      className={`relative min-h-[48px] rounded-2xl border px-1.5 py-2 text-center transition-all sm:min-h-[58px] ${
        selected
          ? "border-blue-500 bg-blue-50 shadow-[0_10px_28px_rgba(37,99,235,0.12)]"
          : "border-transparent bg-white hover:border-neutral-100 hover:bg-neutral-50"
      } ${!inMonth ? "opacity-35" : ""}`}
    >
      <span
        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
          isToday
            ? "bg-neutral-950 text-white shadow-sm"
            : selected
              ? "text-blue-700"
              : quietRest
                ? "text-neutral-400"
                : "text-neutral-800"
        }`}
      >
        {date.getDate()}
      </span>
      <div className="mt-1.5 flex h-2 items-center justify-center gap-1">
        {active && <span className="h-1.5 w-7 rounded-full bg-blue-600" />}
        {!active && completed && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
        {!active && planned && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
        {!active && missed && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
      </div>
    </button>
  );
}

function MonthCalendar({ activeMonth, days, eventsByDate, selectedDate, todayKey, onSelectDate }) {
  return (
    <section className="rounded-[1.6rem] border border-neutral-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Training calendar</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">{monthLabel(activeMonth)}</h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-[11px] font-medium text-neutral-500">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Done</span>
          <span className="inline-flex items-center gap-1"><CircleDashed className="h-3.5 w-3.5 text-blue-500" /> Plan</span>
          <span className="inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-400" /> Missed</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((day) => (
          <div key={day} className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {day.slice(0, 1)}
          </div>
        ))}
        {days.map((date) => {
          const key = getDateKey(date);
          return (
            <CalendarDayButton
              key={key}
              date={date}
              activeMonth={activeMonth}
              dayEvents={eventsByDate[key] || []}
              selected={selectedDate === key}
              isToday={todayKey === key}
              onSelect={() => onSelectDate(key)}
            />
          );
        })}
      </div>
    </section>
  );
}

function TodayStrip({ event, onSchedule, onStartRecurring }) {
  const statusLabel = getEventStatusLabel(event);
  const isActive = isActiveEvent(event);
  const actionLabel = isActive ? "Resume" : event ? "Start" : "Schedule";
  const strip = (
    <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-blue-100 bg-blue-50/80 px-4 py-3 text-left shadow-[0_10px_25px_rgba(37,99,235,0.08)]">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Today</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-neutral-950">
          {event?.name || "No workout scheduled"}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {event ? `${event.muscleGroup} · ${statusLabel}` : "Plan your next session"}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
        {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );

  if (!event) {
    return <button onClick={onSchedule} className="block w-full">{strip}</button>;
  }
  if (event.virtual) {
    return <button onClick={() => onStartRecurring(event)} className="block w-full">{strip}</button>;
  }
  return <Link to={getEventHref(event)} className="block">{strip}</Link>;
}

function SelectedDayHero({
  event,
  selectedDate,
  todayKey,
  onSchedule,
  onStartNow,
  onStartRecurring,
  onRepeat,
  onEndWorkout,
  endingWorkoutId,
}) {
  const selectedLabel = selectedDate === todayKey ? "Today" : formatDate(selectedDate);
  const eventProgress = getEventProgress(event);
  const exerciseTotal = event?.exercises || getEventExercises(event).length || 0;
  const completedExercises = getCompletedExerciseCount(event);
  const remainingExercises = Math.max(0, exerciseTotal - completedExercises);
  const remainingSets = Math.max(0, (event?.plannedSets || 0) - (event?.completedSets || 0));
  const active = isActiveEvent(event);

  if (!event) {
    return (
      <section className="rounded-[1.8rem] border border-neutral-100 bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">{selectedLabel}</p>
        <div className="mt-5 rounded-[1.35rem] bg-neutral-50 p-5 text-center">
          <Dumbbell className="mx-auto h-7 w-7 text-neutral-300" />
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">No workout scheduled</h2>
          <p className="mt-1 text-sm text-neutral-500">Make this a training day or keep it as recovery.</p>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
          <button onClick={onSchedule} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)] hover:bg-blue-700">
            <CalendarPlus className="h-4 w-4" /> Schedule Workout
          </button>
          <button onClick={onStartNow} className="inline-flex h-12 items-center justify-center rounded-2xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            Start now
          </button>
        </div>
      </section>
    );
  }

  if (active) {
    const minutesRemaining = getEstimatedMinutesRemaining(event);
    const ending = endingWorkoutId === event.workout?.id;
    return (
      <section className="rounded-[1.8rem] border border-blue-100 bg-white p-5 shadow-[0_22px_55px_rgba(37,99,235,0.13)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Workout in progress</p>
            <h2 className="mt-2 truncate text-2xl font-semibold tracking-tight text-neutral-950">{event.name}</h2>
            <p className="mt-1 truncate text-sm text-neutral-500">{event.muscleGroup}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tracking-tight text-neutral-950">{eventProgress}%</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Complete</p>
          </div>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${eventProgress}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-neutral-50 p-3">
            <Dumbbell className="h-4 w-4 text-neutral-400" />
            <p className="mt-2 text-base font-semibold text-neutral-950">{completedExercises} / {exerciseTotal}</p>
            <p className="text-xs text-neutral-500">Exercises</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-3">
            <ListChecks className="h-4 w-4 text-neutral-400" />
            <p className="mt-2 text-base font-semibold text-neutral-950">{event.completedSets} / {event.plannedSets}</p>
            <p className="text-xs text-neutral-500">Sets</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-3">
            <Clock3 className="h-4 w-4 text-neutral-400" />
            <p className="mt-2 text-base font-semibold text-neutral-950">{minutesRemaining} min</p>
            <p className="text-xs text-neutral-500">Remaining</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
          <Link to={getEventHref(event)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)] hover:bg-blue-700">
            <Play className="h-4 w-4" /> Resume Workout
          </Link>
          <button
            onClick={() => onEndWorkout(event)}
            disabled={ending}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {ending ? "Ending..." : "End"}
          </button>
        </div>
      </section>
    );
  }

  const primaryLabel = event.type === "completed" ? "View Workout" : event.type === "missed" ? "Log Workout" : "Start Workout";
  const primaryAction = event.virtual ? (
    <button onClick={() => onStartRecurring(event)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)] hover:bg-blue-700">
      <Play className="h-4 w-4" /> {primaryLabel}
    </button>
  ) : (
    <Link to={getEventHref(event)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)] hover:bg-blue-700">
      <Play className="h-4 w-4" /> {primaryLabel}
    </Link>
  );

  return (
    <section className="rounded-[1.8rem] border border-neutral-100 bg-white p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">{selectedLabel}</p>
          <h2 className="mt-3 truncate text-2xl font-semibold tracking-tight text-neutral-950">{event.name}</h2>
          <p className="mt-1 truncate text-sm text-neutral-500">{event.muscleGroup}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${getEventStatusClass(event)}`}>
          {getEventStatusLabel(event)}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-neutral-50 p-3">
          <Clock3 className="h-4 w-4 text-neutral-400" />
          <p className="mt-2 text-base font-semibold text-neutral-950">{formatDuration(event.duration)}</p>
          <p className="text-xs text-neutral-500">Duration</p>
        </div>
        <div className="rounded-2xl bg-neutral-50 p-3">
          <Dumbbell className="h-4 w-4 text-neutral-400" />
          <p className="mt-2 text-base font-semibold text-neutral-950">{exerciseTotal}</p>
          <p className="text-xs text-neutral-500">Exercises</p>
        </div>
        <div className="rounded-2xl bg-neutral-50 p-3">
          <ListChecks className="h-4 w-4 text-neutral-400" />
          <p className="mt-2 text-base font-semibold text-neutral-950">{event.completedSets}/{event.plannedSets}</p>
          <p className="text-xs text-neutral-500">Sets</p>
        </div>
      </div>
      <div className="mt-4">{primaryAction}</div>
      {!event.virtual && (
        <button onClick={() => onRepeat(event)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          <Repeat className="h-4 w-4" /> Repeat next week
        </button>
      )}
      {(remainingExercises > 0 || remainingSets > 0) && event.type !== "completed" && (
        <p className="mt-3 text-center text-xs font-medium text-neutral-500">
          {pluralize(remainingExercises, "exercise")} left · {pluralize(remainingSets, "set")} remaining
        </p>
      )}
    </section>
  );
}

function UpcomingWorkouts({ events, todayKey, onStartRecurring }) {
  const upcoming = events
    .filter((event) => event.date >= todayKey && event.type !== "missed")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  if (upcoming.length === 0) {
    return null;
  }

  const renderCard = (event, index) => {
    const isToday = event.date === todayKey;
    const card = (
      <div className={`relative min-h-[126px] w-[164px] rounded-[1.35rem] border p-4 text-left shadow-sm transition-all ${
        isToday
          ? "border-neutral-950 bg-neutral-950 text-white shadow-[0_18px_34px_rgba(15,23,42,0.18)]"
          : "border-neutral-100 bg-white text-neutral-950 hover:border-neutral-200"
      }`}>
        <span className={`absolute right-4 top-4 h-2 w-2 rounded-full ${eventTone(event.type)}`} />
        <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${isToday ? "text-white/70" : "text-neutral-400"}`}>
          {getShortDayLabel(event.date, todayKey)}
        </p>
        <p className="mt-4 line-clamp-2 text-sm font-semibold leading-tight">{event.name}</p>
        <p className={`mt-2 text-xs ${isToday ? "text-white/60" : "text-neutral-500"}`}>
          {formatDuration(event.duration)} · {event.exercises} exercises
        </p>
        <p className={`mt-3 text-[11px] font-semibold ${isToday ? "text-white/70" : "text-neutral-400"}`}>
          {getEventStatusLabel(event)}
        </p>
      </div>
    );

    if (event.virtual) {
      return (
        <button key={`${event.id}-${index}`} onClick={() => onStartRecurring(event)} className="shrink-0">
          {card}
        </button>
      );
    }
    return (
      <Link key={`${event.id}-${index}`} to={getEventHref(event)} className="shrink-0">
        {card}
      </Link>
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">Upcoming</h2>
        <Link to="/workouts" className="text-sm font-semibold text-blue-600">View all</Link>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {upcoming.map(renderCard)}
      </div>
    </section>
  );
}

function WeeklySummaryCard({ completedCount, weeklyGoal, setsCompleted, missedCount }) {
  const progress = weeklyGoal ? Math.min(100, Math.round((completedCount / weeklyGoal) * 100)) : 0;

  return (
    <section className="rounded-[1.6rem] border border-neutral-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">This week</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{completedCount} / {weeklyGoal} workouts</h2>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{progress}%</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-neutral-50 p-3">
          <p className="text-base font-semibold text-neutral-950">{setsCompleted}</p>
          <p className="mt-1 text-xs text-neutral-500">Sets done</p>
        </div>
        <div className="rounded-2xl bg-neutral-50 p-3">
          <p className="text-base font-semibold text-neutral-950">{progress}%</p>
          <p className="mt-1 text-xs text-neutral-500">Of goal</p>
        </div>
        <div className="rounded-2xl bg-neutral-50 p-3">
          <p className={`text-base font-semibold ${missedCount > 0 ? "text-red-500" : "text-neutral-950"}`}>{missedCount}</p>
          <p className="mt-1 text-xs text-neutral-500">Missed</p>
        </div>
      </div>
    </section>
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { settings } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(new Date()));
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [endingWorkoutId, setEndingWorkoutId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(() => ({
    dayOfWeek: 1,
    templateWorkoutId: "",
    startDate: getDateKey(new Date()),
    endDate: "",
  }));

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      const [workoutRows, scheduleRows] = await Promise.all([
        base44.entities.Workout.list("-date", 300),
        base44.entities.RecurringSchedule.list("dayOfWeek", 100),
      ]);
      setWorkouts(workoutRows);
      setRecurringSchedules(scheduleRows);
    } finally {
      setLoading(false);
    }
  };

  const days = buildCalendarDays(activeMonth);

  const events = useMemo(() => {
    const actualEvents = workouts.map((workout) => {
      const completedSets = getCompletedSetCount(workout);
      const plannedSets = getSetCount(workout);
      return {
        id: workout.id,
        date: workout.date,
        name: workout.name,
        muscleGroup: workout.muscleGroup || "Workout",
        type: (() => {
          const status = workout.status || "completed";
          if (plannedSets > 0 && completedSets >= plannedSets) return "completed";
          const eventDate = new Date(`${workout.date}T00:00:00`);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if ((status === "planned" || status === "scheduled") && eventDate < today) return "missed";
          return status;
        })(),
        exercises: workout.exercises?.length || 0,
        completedSets,
        plannedSets,
        duration: getWorkoutDurationMinutes(workout),
        hasPr: detectWorkoutPRs(workout, workouts.filter((item) => item.id !== workout.id)).length > 0,
        virtual: false,
        workout,
      };
    });

    const actualScheduleDates = new Set(
      actualEvents
        .filter((event) => event.workout?.recurringScheduleId)
        .map((event) => `${event.workout.recurringScheduleId}:${event.date}`)
    );

    const virtualEvents = days.flatMap((date) => {
      const dateKey = getDateKey(date);
      return recurringSchedules
        .filter((schedule) => scheduleAppliesToDate(schedule, date))
        .filter((schedule) => !actualScheduleDates.has(`${schedule.id}:${dateKey}`))
        .map((schedule) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const eventDate = new Date(`${dateKey}T00:00:00`);
          return {
            id: `recurring-${schedule.id}-${dateKey}`,
            date: dateKey,
            name: schedule.name,
            muscleGroup: schedule.muscleGroup || "Workout",
            type: eventDate < today ? "missed" : "scheduled",
            exercises: schedule.exercises?.length || 0,
            completedSets: 0,
            plannedSets: getSetCount(schedule),
            duration: getWorkoutDurationMinutes(schedule),
            hasPr: false,
            virtual: true,
            schedule,
          };
        });
    });

    return [...actualEvents, ...virtualEvents];
  }, [days, recurringSchedules, workouts]);

  const eventsByDate = useMemo(
    () =>
      events.reduce((map, event) => {
        map[event.date] = [...(map[event.date] || []), event];
        return map;
      }, {}),
    [events]
  );

  const selectedEvents = eventsByDate[selectedDate] || [];
  const selectedPrimaryEvent = getPrimaryEvent(selectedEvents);
  const workoutTemplates = workouts.filter((workout) => (workout.exercises || []).length > 0);
  const visibleMonthEvents = events.filter((event) => {
    const eventDate = new Date(`${event.date}T00:00:00`);
    return (
      eventDate.getFullYear() === activeMonth.getFullYear() &&
      eventDate.getMonth() === activeMonth.getMonth()
    );
  });

  const today = new Date();
  const todayKey = getDateKey(today);
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weeklyCompleted = events.filter((event) => {
    const date = new Date(`${event.date}T00:00:00`);
    return event.type === "completed" && date >= weekStart && date <= weekEnd;
  });
  const weeklyMissed = events.filter((event) => {
    const date = new Date(`${event.date}T00:00:00`);
    return event.type === "missed" && date >= weekStart && date <= weekEnd;
  }).length;
  const weeklySets = weeklyCompleted.reduce((sum, event) => sum + event.completedSets, 0);
  const weeklyGoal = Number(settings?.weekly_workout_goal) || 5;
  const todayPrimaryEvent = getPrimaryEvent(eventsByDate[todayKey] || []);

  const openWorkoutDraft = (status, dateOverride = selectedDate) => {
    writeWorkoutDraft({
      name: status === "scheduled" ? "Scheduled Workout" : "New Workout",
      date: dateOverride,
      muscleGroup: "",
      notes: "",
      status,
      exercises: [{ name: "", sets: [{ reps: "", weight: "", completed: false }] }],
    });
    navigate("/workouts/new");
  };

  const createWorkoutFromRecurring = async (event, status = "planned") => {
    if (!event?.schedule) return null;
    const created = await base44.entities.Workout.create({
      name: event.schedule.name,
      date: event.date,
      muscleGroup: event.schedule.muscleGroup,
      notes: "Created from recurring weekly plan.",
      status,
      exercises: (event.schedule.exercises || []).map((exercise) => ({
        ...exercise,
        sets: (exercise.sets || []).map((set) => ({ ...set, completed: false })),
      })),
      recurringScheduleId: event.schedule.id,
      scheduledFor: event.date,
    });
    await loadCalendarData();
    return created;
  };

  const startRecurringEvent = async (event) => {
    const created = await createWorkoutFromRecurring(event, "planned");
    if (created?.id) navigate(`/workouts/${created.id}`);
  };

  const repeatNextWeek = async (event) => {
    if (!event?.workout) return;
    const nextDate = new Date(`${event.date}T00:00:00`);
    nextDate.setDate(nextDate.getDate() + 7);
    await base44.entities.Workout.create({
      ...event.workout,
      date: getDateKey(nextDate),
      status: "scheduled",
      recurringScheduleId: event.workout.recurringScheduleId,
      scheduledFor: getDateKey(nextDate),
      exercises: (event.workout.exercises || []).map((exercise) => ({
        ...exercise,
        sets: (exercise.sets || []).map((set) => ({ ...set, completed: false })),
      })),
    });
    loadCalendarData();
  };

  const endWorkout = async (event) => {
    const workout = event?.workout;
    if (!workout?.id) return;

    const completedExercises = (workout.exercises || []).map((exercise) => ({
      ...exercise,
      sets: (exercise.sets || []).map((set) => ({ ...set, completed: true })),
    }));

    setEndingWorkoutId(workout.id);
    setWorkouts((current) =>
      current.map((item) =>
        item.id === workout.id
          ? { ...item, status: "completed", exercises: completedExercises }
          : item
      )
    );

    try {
      await base44.entities.Workout.update(workout.id, {
        status: "completed",
        exercises: completedExercises,
      });
      await loadCalendarData();
    } catch (error) {
      console.error("Failed to end workout from calendar", error);
      toast({
        title: "Could not end workout",
        description: "FitTrack could not save the workout status. Please try again.",
        variant: "destructive",
      });
      loadCalendarData();
    } finally {
      setEndingWorkoutId(null);
    }
  };

  const addRecurringSchedule = async (event) => {
    event.preventDefault();
    const source = workouts.find((workout) => workout.id === scheduleForm.templateWorkoutId);
    if (!source) return;
    await base44.entities.RecurringSchedule.create({
      dayOfWeek: scheduleForm.dayOfWeek,
      name: source.name,
      muscleGroup: source.muscleGroup,
      exercises: source.exercises || [],
      templateWorkoutId: source.id,
      startDate: scheduleForm.startDate || todayKey,
      endDate: scheduleForm.endDate || null,
      active: true,
    });
    setScheduleForm((current) => ({ ...current, templateWorkoutId: "" }));
    setShowPlanBuilder(false);
    loadCalendarData();
  };

  const createPplSchedule = async () => {
    await Promise.all(recurringSchedules.map((schedule) => base44.entities.RecurringSchedule.delete(schedule.id)));
    const plan = [
      { dayOfWeek: 1, day: "Push" },
      { dayOfWeek: 2, day: "Pull" },
      { dayOfWeek: 3, day: "Legs" },
      { dayOfWeek: 4, day: "Push" },
      { dayOfWeek: 5, day: "Pull" },
      { dayOfWeek: 6, day: "Legs" },
    ];
    await Promise.all(plan.map(({ dayOfWeek, day }) => {
      const routine = getStarterRoutine(settings?.workout_split_preference, day);
      return base44.entities.RecurringSchedule.create({
        dayOfWeek,
        name: routine.name,
        muscleGroup: routine.muscleGroup,
        exercises: routine.exercises,
        startDate: todayKey,
        endDate: null,
        active: true,
      });
    }));
    loadCalendarData();
  };

  const toggleRecurringSchedule = async (schedule) => {
    await base44.entities.RecurringSchedule.update(schedule.id, { active: !schedule.active });
    loadCalendarData();
  };

  const deleteRecurringSchedule = async (schedule) => {
    if (!window.confirm(`Delete ${schedule.name} from the weekly plan?`)) return;
    await base44.entities.RecurringSchedule.delete(schedule.id);
    loadCalendarData();
  };

  const syncVisibleMonthToGoogle = async () => {
    if (!isGoogleCalendarConfigured()) {
      toast({
        title: "Google Calendar is not connected",
        description: "Add VITE_GOOGLE_CLIENT_ID in Vercel, then reload FitTrack.",
        variant: "destructive",
      });
      return;
    }

    setGoogleSyncing(true);
    try {
      const result = await syncEventsToGoogleCalendar(visibleMonthEvents);
      toast({
        title: "Google Calendar synced",
        description: `${result.created} created, ${result.updated} updated for ${monthLabel(activeMonth)}.`,
      });
    } catch (error) {
      toast({
        title: "Google sync failed",
        description: error.message || "Could not sync FitTrack to Google Calendar.",
        variant: "destructive",
      });
    } finally {
      setGoogleSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-7 w-32 bg-neutral-100 rounded-lg mb-6" />
        <div className="h-[520px] bg-neutral-50 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Calendar</h1>
          <p className="text-sm text-neutral-500 mt-1">Review logged workouts, scheduled sessions, missed plans, and rest days.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncVisibleMonthToGoogle}
            disabled={googleSyncing || visibleMonthEvents.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50"
          >
            {googleSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
            <span className="hidden sm:inline">{googleSyncing ? "Syncing..." : "Sync Google"}</span>
            <span className="sm:hidden">Google</span>
          </button>
          <button
            onClick={() => setShowPlanBuilder((value) => !value)}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Weekly Plan
          </button>
          <button
            onClick={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1))}
            className="h-10 w-10 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            aria-label="Previous month"
          >
            <ArrowLeft className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={() => {
              const next = new Date();
              setActiveMonth(next);
              setSelectedDate(getDateKey(next));
            }}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Today
          </button>
          <button
            onClick={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1))}
            className="h-10 w-10 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            aria-label="Next month"
          >
            <ArrowRight className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      {showPlanBuilder && (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Recurring Weekly Plan</p>
                <h2 className="mt-2 text-lg font-semibold text-neutral-900">Schedule workouts automatically</h2>
                <p className="mt-1 text-sm text-neutral-500">Pick a day and a saved workout/template. Future calendar days will show it until you pause or delete the rule.</p>
              </div>
              <button onClick={createPplSchedule} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800">
                <Repeat className="h-4 w-4" /> Build PPL x2
              </button>
            </div>

            <form onSubmit={addRecurringSchedule} className="mt-5 grid gap-3 md:grid-cols-[160px_1fr_160px_160px_auto]">
              <label className="space-y-1">
                <span className="text-xs font-medium text-neutral-500">Day</span>
                <select
                  value={scheduleForm.dayOfWeek}
                  onChange={(event) => setScheduleForm({ ...scheduleForm, dayOfWeek: Number(event.target.value) })}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:border-neutral-400"
                >
                  {planDays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-neutral-500">Workout/template</span>
                <select
                  value={scheduleForm.templateWorkoutId}
                  onChange={(event) => setScheduleForm({ ...scheduleForm, templateWorkoutId: event.target.value })}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:border-neutral-400"
                  required
                >
                  <option value="">Choose workout</option>
                  {workoutTemplates.map((workout) => (
                    <option key={workout.id} value={workout.id}>{workout.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-neutral-500">Start date</span>
                <input
                  type="date"
                  value={scheduleForm.startDate}
                  onChange={(event) => setScheduleForm({ ...scheduleForm, startDate: event.target.value })}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:border-neutral-400"
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-neutral-500">End date</span>
                <input
                  type="date"
                  value={scheduleForm.endDate}
                  onChange={(event) => setScheduleForm({ ...scheduleForm, endDate: event.target.value })}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:border-neutral-400"
                />
              </label>
              <button type="submit" className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 md:mt-6">
                <CalendarPlus className="h-4 w-4" /> Add
              </button>
            </form>
            {workoutTemplates.length === 0 && (
              <p className="mt-3 text-sm text-neutral-500">Create or save a workout first, or use Build PPL x2 to create a starter recurring plan.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Current Plan</p>
            <div className="mt-4 space-y-2">
              {recurringSchedules.length > 0 ? recurringSchedules.map((schedule) => (
                <div key={schedule.id} className="rounded-xl border border-neutral-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{weekdayLabels[schedule.dayOfWeek]} · {schedule.name}</p>
                      <p className="mt-1 text-xs text-neutral-500">{schedule.muscleGroup || "Workout"} · starts {schedule.startDate}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleRecurringSchedule(schedule)} className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50">
                        {schedule.active ? "Pause" : "Resume"}
                      </button>
                      <button onClick={() => deleteRecurringSchedule(schedule)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${schedule.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl bg-neutral-50 p-4 text-center">
                  <p className="text-sm font-medium text-neutral-900">No recurring plan yet</p>
                  <p className="mt-1 text-xs text-neutral-500">Add a day manually or build Push/Pull/Legs twice per week.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
        <div className="space-y-4">
          <TodayStrip
            event={todayPrimaryEvent}
            onSchedule={() => {
              setSelectedDate(todayKey);
              openWorkoutDraft("scheduled", todayKey);
            }}
            onStartRecurring={startRecurringEvent}
          />

          <MonthCalendar
            activeMonth={activeMonth}
            days={days}
            eventsByDate={eventsByDate}
            selectedDate={selectedDate}
            todayKey={todayKey}
            onSelectDate={setSelectedDate}
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <SelectedDayHero
            event={selectedPrimaryEvent}
            selectedDate={selectedDate}
            todayKey={todayKey}
            onSchedule={() => openWorkoutDraft("scheduled")}
            onStartNow={() => openWorkoutDraft("planned")}
            onStartRecurring={startRecurringEvent}
            onRepeat={repeatNextWeek}
            onEndWorkout={endWorkout}
            endingWorkoutId={endingWorkoutId}
          />
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4">
        <UpcomingWorkouts
          events={events}
          todayKey={todayKey}
          onStartRecurring={startRecurringEvent}
        />

        <WeeklySummaryCard
          completedCount={weeklyCompleted.length}
          weeklyGoal={weeklyGoal}
          setsCompleted={weeklySets}
          missedCount={weeklyMissed}
        />
      </div>
    </div>
  );
}
