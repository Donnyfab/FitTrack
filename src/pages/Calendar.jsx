import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatDate } from "@/lib/workoutUtils";
import {
  getDateKey,
} from "@/lib/fittrackDemoData";
import {
  detectWorkoutPRs,
  formatDuration,
  getCompletedSetCount,
  getMissedWorkoutCount,
  getSetCount,
  getStarterRoutine,
  getWorkoutDurationMinutes,
  writeWorkoutDraft,
} from "@/lib/trainingInsights";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Dumbbell,
  Play,
  Plus,
  Repeat,
  Trash2,
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
  if (type === "missed") return "bg-neutral-400";
  if (type === "scheduled" || type === "planned") return "bg-neutral-300";
  return "bg-neutral-900";
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

export default function CalendarPage() {
  const navigate = useNavigate();
  const { settings } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(new Date()));
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
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
    const actualEvents = workouts.map((workout) => ({
      id: workout.id,
      date: workout.date,
      name: workout.name,
      muscleGroup: workout.muscleGroup || "Workout",
      type: (() => {
        const status = workout.status || "completed";
        const eventDate = new Date(`${workout.date}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if ((status === "planned" || status === "scheduled") && eventDate < today) return "missed";
        return status;
      })(),
      exercises: workout.exercises?.length || 0,
      completedSets: getCompletedSetCount(workout),
      plannedSets: getSetCount(workout),
      duration: getWorkoutDurationMinutes(workout),
      hasPr: detectWorkoutPRs(workout, workouts.filter((item) => item.id !== workout.id)).length > 0,
      virtual: false,
      workout,
    }));

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
  const selectedHasEvents = selectedEvents.length > 0;
  const workoutTemplates = workouts.filter((workout) => (workout.exercises || []).length > 0);

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
  const weeklySets = weeklyCompleted.reduce((sum, event) => sum + event.completedSets, 0);
  const weeklyGoal = Number(settings?.weekly_workout_goal) || 5;
  const missedWorkouts = getMissedWorkoutCount(workouts);
  const missedRecurring = events.filter((event) => event.virtual && event.type === "missed").length;

  const openWorkoutDraft = (status) => {
    writeWorkoutDraft({
      name: status === "scheduled" ? "Scheduled Workout" : "New Workout",
      date: selectedDate,
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

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">{monthLabel(activeMonth)}</h2>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-900" /> Completed</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-300" /> Scheduled</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-400" /> Missed</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdayLabels.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const key = getDateKey(date);
              const inMonth = date.getMonth() === activeMonth.getMonth();
              const dayEvents = eventsByDate[key] || [];
              const selected = selectedDate === key;
              const isToday = todayKey === key;
              const isPastRest = date < today && dayEvents.length === 0 && inMonth;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-[86px] rounded-xl border p-2 text-left transition-colors ${
                    selected
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50"
                  } ${!inMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isToday ? "text-neutral-900" : "text-neutral-600"}`}>
                      {date.getDate()}
                    </span>
                    {isToday && <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {dayEvents.slice(0, 3).map((event, index) => (
                      <span key={`${event.name}-${index}`} className={`h-1.5 w-1.5 rounded-full ${eventTone(event.type)}`} />
                    ))}
                  </div>
                  {isPastRest && <p className="mt-3 text-[10px] text-neutral-400">Rest</p>}
                  {dayEvents[0] && <p className="mt-2 truncate text-[11px] text-neutral-500">{dayEvents[0].name}</p>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Selected Day</p>
                <h2 className="text-lg font-semibold text-neutral-900 mt-2">{formatDate(selectedDate)}</h2>
              </div>
              <CalendarDays className="w-5 h-5 text-neutral-300" />
            </div>

            {selectedHasEvents ? (
              <div className="space-y-2">
                {selectedEvents.map((event, index) => event.virtual ? (
                  <button
                    key={`${event.name}-${index}`}
                    onClick={() => startRecurringEvent(event)}
                    className="block w-full rounded-xl border border-neutral-200 p-4 text-left hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-neutral-900">{event.name}</p>
                        <p className="text-xs text-neutral-500 mt-1">{event.muscleGroup} · recurring</p>
                      </div>
                      <span className="text-[11px] font-medium capitalize text-neutral-500">{event.type}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-semibold text-neutral-900">{event.exercises || event.workout?.exercises?.length || 0}</p>
                        <p className="text-xs text-neutral-500">Exercises</p>
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">{event.completedSets} / {event.plannedSets}</p>
                        <p className="text-xs text-neutral-500">Sets completed</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                      <span>{formatDuration(event.duration)}</span>
                      <span>Tap to start/log</span>
                    </div>
                  </button>
                ) : (
                  <Link
                    key={`${event.name}-${index}`}
                    to={event.workout?.id ? `/workouts/${event.workout.id}` : "/workouts/new"}
                    className="block rounded-xl border border-neutral-200 p-4 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-neutral-900">{event.name}</p>
                        <p className="text-xs text-neutral-500 mt-1">{event.muscleGroup}</p>
                      </div>
                      <span className="text-[11px] font-medium capitalize text-neutral-500">{event.type}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-semibold text-neutral-900">{event.exercises || event.workout?.exercises?.length || 0}</p>
                        <p className="text-xs text-neutral-500">Exercises</p>
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">{event.completedSets} / {event.plannedSets}</p>
                        <p className="text-xs text-neutral-500">Sets completed</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                      <span>{formatDuration(event.duration)}</span>
                      <span>{event.hasPr ? "PR achieved" : "No PR logged"}</span>
                    </div>
                  </Link>
                ))}
                {selectedEvents.some((event) => !event.virtual) && (
                  <button
                    onClick={() => repeatNextWeek(selectedEvents.find((event) => !event.virtual))}
                    className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Repeat weekly
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-neutral-50 p-5 text-center">
                <Dumbbell className="w-7 h-7 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-neutral-900">Rest day</p>
                <p className="text-xs text-neutral-500 mt-1">No workout is logged or scheduled.</p>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => openWorkoutDraft("scheduled")} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                <Plus className="w-4 h-4" /> Schedule
              </button>
              <button onClick={() => openWorkoutDraft("planned")} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800">
                <Play className="w-4 h-4" /> Start
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Weekly Summary</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Workouts completed</span>
                <span className="text-sm font-semibold text-neutral-900">{weeklyCompleted.length}</span>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-neutral-600">Weekly goal progress</span>
                  <span className="font-semibold text-neutral-900">{weeklyCompleted.length} / {weeklyGoal}</span>
                </div>
                <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full rounded-full bg-neutral-900" style={{ width: `${Math.min(100, (weeklyCompleted.length / weeklyGoal) * 100)}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Sets completed</span>
                <span className="text-sm font-semibold text-neutral-900">{weeklySets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Missed planned workouts</span>
                <span className="text-sm font-semibold text-neutral-900">{missedWorkouts + missedRecurring}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
