import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { chatJSON } from "@/api/openaiClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getCompletedSetCount,
  getSetCount,
  getWorkoutDurationMinutes,
} from "@/lib/trainingInsights";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Loader2,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";

const QUESTIONS = [
  {
    id: "goal",
    label: "Goal",
    prompt: "What are you trying to accomplish first?",
    placeholder: "Build muscle, lose fat, get stronger...",
    options: ["Build muscle", "Lose fat", "Get stronger", "Improve athletic performance"],
  },
  {
    id: "level",
    label: "Fitness level",
    prompt: "What is your current training level?",
    placeholder: "Beginner, intermediate, advanced...",
    options: ["Beginner", "Intermediate", "Advanced", "Returning after a break"],
  },
  {
    id: "schedule",
    label: "Schedule",
    prompt: "How many days per week can you train, and which days work best?",
    placeholder: "4 days: Monday, Tuesday, Thursday, Friday",
    options: ["3 days per week", "4 days per week", "5 days per week", "6 days per week"],
  },
  {
    id: "equipment",
    label: "Equipment",
    prompt: "What equipment do you have available?",
    placeholder: "Full gym, dumbbells, bodyweight, bands...",
    options: ["Full gym", "Dumbbells only", "Bodyweight only", "Home gym"],
  },
  {
    id: "injuries",
    label: "Injuries",
    prompt: "Any injuries, pain, or movements you need to avoid?",
    placeholder: "No injuries, or list what to avoid",
    options: ["No injuries", "Knee issues", "Shoulder issues", "Lower back issues"],
  },
  {
    id: "preferences",
    label: "Preferences",
    prompt: "Anything you prefer or dislike?",
    placeholder: "Prefer PPL, short workouts, no running...",
    options: ["Push Pull Legs", "Full body", "Short sessions", "No cardio"],
  },
];

const DAY_INDEX = new Map([
  ["sunday", 0],
  ["monday", 1],
  ["tuesday", 2],
  ["wednesday", 3],
  ["thursday", 4],
  ["friday", 5],
  ["saturday", 6],
]);

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function cleanText(value, fallback = "") {
  return String(value || "").trim() || fallback;
}

function toDateKey(date) {
  return date.toISOString().split("T")[0];
}

function dateForDay(dayName, index = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalized = String(dayName || "").toLowerCase();
  const targetDay = DAY_INDEX.has(normalized) ? DAY_INDEX.get(normalized) : (today.getDay() + index) % 7;
  const diff = (targetDay - today.getDay() + 7) % 7;
  const date = new Date(today);
  date.setDate(today.getDate() + diff);
  return toDateKey(date);
}

function normalizeDay(value, index) {
  const normalized = String(value || "").toLowerCase();
  if (DAY_INDEX.has(normalized)) return DAY_NAMES[DAY_INDEX.get(normalized)];
  if (Number.isInteger(value) && value >= 0 && value <= 6) return DAY_NAMES[value];
  return DAY_NAMES[(new Date().getDay() + index) % 7];
}

function normalizeSet(set = {}) {
  return {
    reps: String(clampNumber(set.reps ?? set.targetReps, 1, 60, 10)),
    weight: set.weight == null || set.weight === "" ? "" : String(clampNumber(set.weight, 0, 1000, 0)),
    restSeconds: clampNumber(set.restSeconds ?? set.rest, 30, 300, 90),
    completed: false,
  };
}

function normalizeExercise(exercise = {}) {
  const rawSets = Array.isArray(exercise.sets) && exercise.sets.length
    ? exercise.sets
    : Array.from({ length: clampNumber(exercise.setCount, 1, 6, 3) }, () => ({
        reps: exercise.reps || 10,
        restSeconds: exercise.restSeconds || 90,
      }));

  return {
    name: cleanText(exercise.name, "Exercise"),
    sets: rawSets.slice(0, 6).map(normalizeSet),
  };
}

function normalizePlan(rawPlan, answers) {
  const workouts = Array.isArray(rawPlan?.workouts) ? rawPlan.workouts : [];
  const normalizedWorkouts = workouts.slice(0, 7).map((workout, index) => {
    const day = normalizeDay(workout.day || workout.dayOfWeek, index);
    const exercises = Array.isArray(workout.exercises)
      ? workout.exercises.slice(0, 7).map(normalizeExercise)
      : [];

    return {
      name: cleanText(workout.name, `${answers.goal || "Training"} Day ${index + 1}`),
      day,
      muscleGroup: cleanText(
        Array.isArray(workout.muscleGroups) ? workout.muscleGroups.join(", ") : workout.muscleGroup,
        "Full Body"
      ),
      durationMinutes: clampNumber(workout.durationMinutes, 15, 90, 45),
      notes: cleanText(workout.notes || workout.focus, "AI-generated plan. Adjust exercises, sets, reps, and rest times as needed."),
      exercises: exercises.length ? exercises : fallbackExercisesForGoal(answers.goal),
    };
  });

  const fallback = buildFallbackPlan(answers);
  return {
    summary: cleanText(rawPlan?.summary, fallback.summary),
    focusAreas: Array.isArray(rawPlan?.focusAreas) && rawPlan.focusAreas.length
      ? rawPlan.focusAreas.slice(0, 5).map((item) => cleanText(item)).filter(Boolean)
      : fallback.focusAreas,
    progressRecommendations: Array.isArray(rawPlan?.progressRecommendations) && rawPlan.progressRecommendations.length
      ? rawPlan.progressRecommendations.slice(0, 5).map((item) => cleanText(item)).filter(Boolean)
      : fallback.progressRecommendations,
    adjustments: Array.isArray(rawPlan?.adjustments) && rawPlan.adjustments.length
      ? rawPlan.adjustments.slice(0, 5).map((item) => cleanText(item)).filter(Boolean)
      : fallback.adjustments,
    workouts: normalizedWorkouts.length ? normalizedWorkouts : fallback.workouts,
  };
}

function fallbackExercisesForGoal(goal = "") {
  const text = goal.toLowerCase();
  if (text.includes("loss") || text.includes("fat")) {
    return [
      { name: "Treadmill Walk", sets: [{ reps: "1", weight: "", restSeconds: 60, completed: false }] },
      { name: "Bodyweight Squat", sets: Array.from({ length: 3 }, () => ({ reps: "12", weight: "", restSeconds: 60, completed: false })) },
      { name: "Push-Up", sets: Array.from({ length: 3 }, () => ({ reps: "8", weight: "", restSeconds: 60, completed: false })) },
    ];
  }
  return [
    { name: "Bench Press", sets: Array.from({ length: 3 }, () => ({ reps: "8", weight: "", restSeconds: 120, completed: false })) },
    { name: "Lat Pulldown", sets: Array.from({ length: 3 }, () => ({ reps: "10", weight: "", restSeconds: 90, completed: false })) },
    { name: "Goblet Squat", sets: Array.from({ length: 3 }, () => ({ reps: "10", weight: "", restSeconds: 90, completed: false })) },
  ];
}

function buildFallbackPlan(answers = {}) {
  const schedule = String(answers.schedule || "").toLowerCase();
  const days = schedule.includes("6")
    ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : schedule.includes("5")
      ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      : schedule.includes("4")
        ? ["Monday", "Tuesday", "Thursday", "Friday"]
        : ["Monday", "Wednesday", "Friday"];

  const split = days.length >= 5
    ? [
        ["Push Day", "Chest, Shoulders, Triceps", ["Dumbbell Bench Press", "Dumbbell Shoulder Press", "Cable Triceps Pushdown"]],
        ["Pull Day", "Back, Biceps", ["Lat Pulldown", "Seated Cable Row", "Dumbbell Curl"]],
        ["Leg Day", "Quadriceps, Hamstrings, Glutes", ["Goblet Squat", "Romanian Deadlift", "Walking Lunge"]],
      ]
    : [
        ["Full Body Strength", "Full Body", ["Goblet Squat", "Push-Up", "Lat Pulldown", "Plank"]],
        ["Conditioning and Core", "Full Body, Cardio, Abs", ["Treadmill Walk", "Bodyweight Squat", "Mountain Climber", "Dead Bug"]],
        ["Strength Progression", "Full Body", ["Bench Press", "Seated Cable Row", "Dumbbell Romanian Deadlift"]],
      ];

  return {
    summary: "A balanced starter plan based on your answers. It is ready to edit, repeat weekly, and track in FitTrack.",
    focusAreas: ["Build consistency", "Track completed sets", "Improve one lift at a time"],
    progressRecommendations: ["Review completed sets weekly", "Add reps before adding weight", "Adjust volume if recovery drops"],
    adjustments: ["Swap any painful movement", "Keep 1 to 2 reps in reserve", "Use rest days for walking or mobility"],
    workouts: days.map((day, index) => {
      const template = split[index % split.length];
      return {
        name: template[0],
        day,
        muscleGroup: template[1],
        durationMinutes: 35,
        notes: "Fallback plan generated locally because AI was unavailable. You can edit this before training.",
        exercises: template[2].map((name) => ({
          name,
          sets: Array.from({ length: 3 }, () => ({ reps: "10", weight: "", restSeconds: 90, completed: false })),
        })),
      };
    }),
  };
}

function summarizeProgress(workouts = []) {
  const completed = workouts.filter((workout) => (workout.status || "completed") === "completed");
  const scheduled = workouts.filter((workout) => workout.status === "scheduled" || workout.status === "planned");
  const muscleCounts = new Map();

  completed.forEach((workout) => {
    String(workout.muscleGroup || "Full Body")
      .split(",")
      .map((group) => group.trim())
      .filter(Boolean)
      .forEach((group) => muscleCounts.set(group, (muscleCounts.get(group) || 0) + 1));
  });

  const completedSets = completed.reduce((sum, workout) => sum + getCompletedSetCount(workout), 0);
  const plannedSets = workouts.reduce((sum, workout) => sum + getSetCount(workout), 0);
  const durationMinutes = completed.reduce((sum, workout) => sum + getWorkoutDurationMinutes(workout), 0);
  const recentWorkouts = completed.slice(0, 5).map((workout) => ({
    name: workout.name,
    date: workout.date,
    muscleGroup: workout.muscleGroup,
    setsCompleted: getCompletedSetCount(workout),
  }));

  return {
    completedWorkouts: completed.length,
    scheduledWorkouts: scheduled.length,
    completedSets,
    plannedSets,
    trainingMinutes: durationMinutes,
    strongestHistory: recentWorkouts,
    mostTrainedMuscleGroups: [...muscleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([group, count]) => `${group}: ${count}`),
  };
}

function buildPlanPrompt(answers, progressContext) {
  return JSON.stringify({
    userAnswers: answers,
    fitTrackProgress: progressContext,
    requirements: [
      "Ask no follow-up questions. Generate a complete plan from the current answers.",
      "Use safe, common exercises that match the user's equipment.",
      "Use weekly workout days with day names like Monday.",
      "Return 3 to 6 workouts unless the schedule clearly asks for more.",
      "Each workout must include 3 to 6 exercises.",
      "Each exercise must include sets with reps, optional weight, and restSeconds.",
      "Include focusAreas, progressRecommendations, and adjustments based on progress.",
      "If injuries or pain are listed, avoid risky movements and mention swaps.",
    ],
    outputShape: {
      summary: "short plan overview",
      focusAreas: ["area to improve"],
      progressRecommendations: ["how FitTrack should guide progress"],
      adjustments: ["when to change the plan"],
      workouts: [
        {
          name: "Push Strength",
          day: "Monday",
          muscleGroup: "Chest, Shoulders, Triceps",
          durationMinutes: 45,
          notes: "how to run this workout",
          exercises: [
            {
              name: "Dumbbell Bench Press",
              sets: [
                { reps: 10, weight: 0, restSeconds: 90 },
                { reps: 10, weight: 0, restSeconds: 90 },
              ],
            },
          ],
        },
      ],
    },
  });
}

export default function AIPlan() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      content: "I can build a FitTrack plan around your goal, schedule, equipment, and limits. Start with your main goal.",
    },
  ]);
  const [draftMessage, setDraftMessage] = useState("");
  const [workouts, setWorkouts] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadProgress() {
      try {
        const data = await base44.entities.Workout.list("-date", 200);
        if (isMounted) setWorkouts(data);
      } finally {
        if (isMounted) setLoadingProgress(false);
      }
    }
    loadProgress();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentQuestion = QUESTIONS.find((question) => !answers[question.id]);
  const progressContext = useMemo(() => summarizeProgress(workouts), [workouts]);
  const allAnswered = QUESTIONS.every((question) => cleanText(answers[question.id]));

  const answerQuestion = (question, value) => {
    const answer = cleanText(value);
    if (!answer) return;
    const nextAnswers = { ...answers, [question.id]: answer };
    const nextQuestion = QUESTIONS.find((item) => !nextAnswers[item.id]);
    setAnswers(nextAnswers);
    setMessages((items) => [
      ...items,
      { role: "user", content: answer },
      {
        role: "assistant",
        content: nextQuestion
          ? nextQuestion.prompt
          : "I have enough to build your plan. Tap Generate plan when you are ready.",
      },
    ]);
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = cleanText(draftMessage);
    if (!text) return;
    setDraftMessage("");
    if (currentQuestion) {
      answerQuestion(currentQuestion, text);
      return;
    }

    setAnswers((items) => ({
      ...items,
      preferences: cleanText(`${items.preferences || ""}\n${text}`, text),
    }));
    setMessages((items) => [
      ...items,
      { role: "user", content: text },
      { role: "assistant", content: "Got it. I will include that when I generate or update the plan." },
    ]);
  };

  const generatePlan = async () => {
    if (!allAnswered || generating) return;
    setGenerating(true);
    setGeneratedPlan(null);
    setUsedFallback(false);
    setMessages((items) => [
      ...items,
      { role: "assistant", content: "Building a personalized plan and checking it against your FitTrack history." },
    ]);

    const systemPrompt = [
      "You are FitTrack's AI fitness planning assistant.",
      "Generate practical workout plans that can be edited and tracked in a fitness app.",
      "Avoid medical diagnosis. If injuries are mentioned, use conservative substitutions and tell the user to avoid painful movements.",
      "Return strict JSON only.",
    ].join(" ");

    try {
      const rawPlan = await chatJSON(systemPrompt, buildPlanPrompt(answers, progressContext), {
        model: "gpt-4o-mini",
        temperature: 0.35,
      });
      const nextPlan = normalizePlan(rawPlan, answers);
      setGeneratedPlan(nextPlan);
      setMessages((items) => [
        ...items,
        { role: "assistant", content: "Your plan is ready. Review it, then create it in FitTrack." },
      ]);
    } catch (error) {
      const fallback = buildFallbackPlan(answers);
      setGeneratedPlan(fallback);
      setUsedFallback(true);
      setMessages((items) => [
        ...items,
        { role: "assistant", content: "AI was unavailable, so I built a local starter plan you can still edit and save." },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  const createPlan = async () => {
    if (!generatedPlan || creating) return;
    setCreating(true);
    try {
      const created = await Promise.all(
        generatedPlan.workouts.map(async (workout, index) => {
          const date = dateForDay(workout.day, index);
          const dayOfWeek = DAY_INDEX.get(workout.day.toLowerCase());
          const payload = {
            name: workout.name,
            date,
            muscleGroup: workout.muscleGroup,
            notes: `${generatedPlan.summary}\n\n${workout.notes}`,
            status: "scheduled",
            favorite: false,
            template: true,
            calories: "",
            exercises: workout.exercises,
          };
          const savedWorkout = await base44.entities.Workout.create(payload);
          const schedule = await base44.entities.RecurringSchedule.create({
            dayOfWeek,
            name: workout.name,
            muscleGroup: workout.muscleGroup,
            exercises: workout.exercises,
            templateWorkoutId: savedWorkout.id,
            startDate: date,
            endDate: null,
            active: true,
          });
          await base44.entities.Workout.update(savedWorkout.id, {
            recurringScheduleId: schedule.id,
            scheduledFor: date,
          });
          return savedWorkout;
        })
      );

      toast({
        title: "AI plan created",
        description: `${created.length} workouts were added to your calendar and templates.`,
      });
      navigate("/calendar");
    } catch (error) {
      toast({
        title: "Could not create plan",
        description: error?.message || "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <Link to="/workouts" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Workouts
      </Link>

      <div className="flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Sparkles className="h-3.5 w-3.5" />
          Plan with AI
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Build a plan that fits you</h1>
        <p className="max-w-2xl text-sm text-neutral-500">
          Chat through your goal, schedule, equipment, and preferences. FitTrack will turn the result into editable workouts and a weekly calendar plan.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm shadow-neutral-950/[0.03]">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">FitTrack Assistant</p>
                <p className="text-xs text-neutral-500">{loadingProgress ? "Loading your progress" : "Ready to plan"}</p>
              </div>
            </div>
            {generating && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          </div>

          <div className="max-h-[30rem] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-100 text-neutral-800"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          {currentQuestion && (
            <div className="border-t border-neutral-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{currentQuestion.label}</p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{currentQuestion.prompt}</p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answerQuestion(currentQuestion, option)}
                    className="h-9 shrink-0 rounded-full border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-neutral-100 p-4">
            <input
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder={currentQuestion?.placeholder || "Add any extra preference"}
              className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:border-blue-300 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white hover:bg-neutral-800"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-950/[0.03]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Plan status</p>
            <div className="mt-3 space-y-2">
              {QUESTIONS.map((question) => (
                <div key={question.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2">
                  <span className="text-sm font-medium text-neutral-700">{question.label}</span>
                  <span className={`max-w-[11rem] truncate text-right text-xs ${answers[question.id] ? "text-neutral-900" : "text-neutral-400"}`}>
                    {answers[question.id] || "Needed"}
                  </span>
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={generatePlan}
              disabled={!allAnswered || generating}
              className="mt-4 h-11 w-full rounded-xl"
            >
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate plan
            </Button>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-950/[0.03]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">FitTrack progress</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-lg font-semibold text-neutral-900">{progressContext.completedWorkouts}</p>
                <p className="text-xs text-neutral-500">Completed</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-lg font-semibold text-neutral-900">{progressContext.completedSets}</p>
                <p className="text-xs text-neutral-500">Sets done</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              The AI uses this history to recommend focus areas and adjustments. New users will get a beginner-safe baseline.
            </p>
          </div>
        </aside>
      </div>

      {generatedPlan && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-950/[0.03]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-neutral-900">Your personalized plan</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{generatedPlan.summary}</p>
                {usedFallback && (
                  <p className="mt-2 text-xs text-amber-700">
                    AI was unavailable, so FitTrack generated a local starter plan. Check the OpenAI key on Supabase if this keeps happening.
                  </p>
                )}
              </div>
              <Button type="button" onClick={createPlan} disabled={creating} className="h-11 rounded-xl sm:min-w-44">
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
                Create in FitTrack
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <InsightList title="Focus areas" items={generatedPlan.focusAreas} />
            <InsightList title="Recommendations" items={generatedPlan.progressRecommendations} />
            <InsightList title="Adjustments" items={generatedPlan.adjustments} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {generatedPlan.workouts.map((workout, index) => (
              <article key={`${workout.name}-${index}`} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-950/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{workout.day}</p>
                    <h3 className="mt-1 text-base font-semibold text-neutral-900">{workout.name}</h3>
                    <p className="mt-1 text-sm text-neutral-500">{workout.muscleGroup}</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
                  <span className="rounded-full bg-neutral-100 px-2 py-1">{workout.durationMinutes} min</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-1">{workout.exercises.length} exercises</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-1">Repeats weekly</span>
                </div>
                <div className="mt-4 space-y-2">
                  {workout.exercises.map((exercise) => (
                    <div key={exercise.name} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2">
                      <span className="min-w-0 truncate text-sm font-medium text-neutral-800">{exercise.name}</span>
                      <span className="shrink-0 text-xs text-neutral-500">{exercise.sets.length} sets</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InsightList({ title, items }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-neutral-950/[0.03]">
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <ul className="mt-3 space-y-2">
        {(items || []).map((item) => (
          <li key={item} className="flex gap-2 text-sm text-neutral-600">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
