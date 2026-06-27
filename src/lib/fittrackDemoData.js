const DAY = 86400000;

const isoDaysAgo = (days) => {
  const date = new Date(Date.now() - days * DAY);
  return date.toISOString().split("T")[0];
};

const isoDaysFromNow = (days) => {
  const date = new Date(Date.now() + days * DAY);
  return date.toISOString().split("T")[0];
};

export const exerciseCatalog = [
  { name: "Bench Press", muscleGroup: "Chest", icon: "chest", favorite: true, custom: false, pr: "225 lb x 3", last: "205 lb x 6", tip: "Keep shoulder blades pinned and touch the same point each rep." },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest", icon: "chest", favorite: false, custom: false, pr: "80 lb x 8", last: "75 lb x 8", tip: "Use a moderate incline and control the lower half." },
  { name: "Pull-Up", muscleGroup: "Back", icon: "back", favorite: true, custom: false, pr: "45 lb x 5", last: "Bodyweight x 10", tip: "Start each rep from a dead hang and drive elbows down." },
  { name: "Barbell Row", muscleGroup: "Back", icon: "back", favorite: false, custom: false, pr: "185 lb x 8", last: "175 lb x 8", tip: "Brace before each pull and keep the bar close." },
  { name: "Overhead Press", muscleGroup: "Shoulders", icon: "shoulders", favorite: true, custom: false, pr: "135 lb x 4", last: "125 lb x 5", tip: "Squeeze glutes and press through a vertical bar path." },
  { name: "Lateral Raise", muscleGroup: "Shoulders", icon: "shoulders", favorite: false, custom: false, pr: "30 lb x 12", last: "25 lb x 15", tip: "Lead with elbows and stop before shrugging takes over." },
  { name: "EZ-Bar Curl", muscleGroup: "Arms", icon: "arms", favorite: false, custom: true, pr: "95 lb x 8", last: "85 lb x 10", tip: "Keep elbows still and avoid swinging through the bottom." },
  { name: "Back Squat", muscleGroup: "Legs", icon: "legs", favorite: true, custom: false, pr: "315 lb x 2", last: "295 lb x 5", tip: "Brace hard before descending and keep knees tracking over toes." },
  { name: "Romanian Deadlift", muscleGroup: "Glutes", icon: "glutes", favorite: false, custom: false, pr: "275 lb x 6", last: "255 lb x 8", tip: "Push hips back until hamstrings load, then stand tall." },
  { name: "Hanging Knee Raise", muscleGroup: "Core", icon: "core", favorite: false, custom: false, pr: "18 reps", last: "3 sets of 14", tip: "Curl the pelvis instead of swinging the legs." },
  { name: "Zone 2 Run", muscleGroup: "Cardio", icon: "cardio", favorite: false, custom: true, pr: "42 min", last: "35 min", tip: "Stay conversational and finish with room to continue." },
];

export const exerciseCategories = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Glutes",
  "Core",
  "Cardio",
];

export const demoWorkouts = [
  {
    id: "demo-push",
    name: "Push Strength",
    date: isoDaysAgo(0),
    muscleGroup: "Chest, Shoulders",
    favorite: true,
    template: false,
    calories: 520,
    status: "completed",
    exercises: [
      { name: "Bench Press", sets: [{ weight: 185, reps: 8 }, { weight: 205, reps: 6 }, { weight: 215, reps: 4 }] },
      { name: "Overhead Press", sets: [{ weight: 105, reps: 8 }, { weight: 115, reps: 6 }, { weight: 125, reps: 5 }] },
      { name: "Lateral Raise", sets: [{ weight: 25, reps: 15 }, { weight: 25, reps: 14 }, { weight: 20, reps: 16 }] },
    ],
  },
  {
    id: "demo-lower",
    name: "Lower Power",
    date: isoDaysAgo(2),
    muscleGroup: "Legs, Glutes",
    favorite: false,
    template: true,
    calories: 680,
    status: "completed",
    exercises: [
      { name: "Back Squat", sets: [{ weight: 255, reps: 6 }, { weight: 275, reps: 5 }, { weight: 295, reps: 3 }] },
      { name: "Romanian Deadlift", sets: [{ weight: 225, reps: 8 }, { weight: 245, reps: 8 }, { weight: 255, reps: 6 }] },
    ],
  },
  {
    id: "demo-pull",
    name: "Pull Hypertrophy",
    date: isoDaysAgo(4),
    muscleGroup: "Back, Arms",
    favorite: true,
    template: false,
    calories: 460,
    status: "completed",
    exercises: [
      { name: "Pull-Up", sets: [{ weight: 0, reps: 10 }, { weight: 25, reps: 6 }, { weight: 25, reps: 5 }] },
      { name: "Barbell Row", sets: [{ weight: 155, reps: 10 }, { weight: 165, reps: 8 }, { weight: 175, reps: 8 }] },
      { name: "EZ-Bar Curl", sets: [{ weight: 75, reps: 12 }, { weight: 85, reps: 10 }] },
    ],
  },
  {
    id: "demo-cardio",
    name: "Zone 2 Engine",
    date: isoDaysAgo(7),
    muscleGroup: "Cardio, Core",
    favorite: false,
    template: true,
    calories: 390,
    status: "completed",
    exercises: [
      { name: "Zone 2 Run", sets: [{ weight: 0, reps: 35 }] },
      { name: "Hanging Knee Raise", sets: [{ weight: 0, reps: 14 }, { weight: 0, reps: 14 }, { weight: 0, reps: 12 }] },
    ],
  },
];

export const demoGoals = [
  { id: "goal-consistency", title: "Train 5 days per week", type: "workout_consistency", description: "Build a reliable weekly rhythm before adding more volume.", current: 4, target: 5, progress: 80, deadline: isoDaysFromNow(18), status: "active" },
  { id: "goal-strength", title: "Bench press 225 lb", type: "strength_goal", description: "Hit a clean 225 lb single without grinding.", current: 215, target: 225, progress: 72, deadline: isoDaysFromNow(42), status: "active" },
  { id: "goal-weight", title: "Reach 185 lb bodyweight", type: "weight_goal", description: "Slow bulk while keeping conditioning steady.", current: 181, target: 185, progress: 68, deadline: isoDaysFromNow(56), status: "active" },
  { id: "goal-cut", title: "Drop to 14% body fat", type: "body_fat_goal", description: "Completed recomposition phase.", current: 14, target: 14, progress: 100, deadline: isoDaysAgo(10), status: "completed" },
];

export const bodyStats = [
  { label: "May 27", weight: 180.6, bodyFat: 16.2 },
  { label: "Jun 3", weight: 181.1, bodyFat: 15.9 },
  { label: "Jun 10", weight: 181.5, bodyFat: 15.7 },
  { label: "Jun 17", weight: 181.8, bodyFat: 15.4 },
  { label: "Jun 24", weight: 182.0, bodyFat: 15.2 },
];

export const calendarEvents = [
  { date: isoDaysAgo(0), name: "Push Strength", muscleGroup: "Chest", type: "completed", exercises: 3, volume: 7485 },
  { date: isoDaysAgo(2), name: "Lower Power", muscleGroup: "Legs", type: "completed", exercises: 2, volume: 11750 },
  { date: isoDaysAgo(4), name: "Pull Hypertrophy", muscleGroup: "Back", type: "completed", exercises: 3, volume: 6615 },
  { date: isoDaysAgo(1), name: "Mobility Reset", muscleGroup: "Core", type: "missed", exercises: 4, volume: 0 },
  { date: isoDaysFromNow(2), name: "Upper Volume", muscleGroup: "Shoulders", type: "scheduled", exercises: 5, volume: 0 },
  { date: isoDaysFromNow(4), name: "Long Run", muscleGroup: "Cardio", type: "scheduled", exercises: 1, volume: 0 },
];

export function mergeWithDemoWorkouts(workouts = []) {
  return workouts.length ? workouts : demoWorkouts;
}

export function mergeWithDemoGoals(goals = []) {
  return goals.length ? goals : demoGoals;
}

export function countSets(workout) {
  return (workout.exercises || []).reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0);
}

export function getDateKey(date) {
  return date.toISOString().split("T")[0];
}

export function daysUntil(dateString) {
  if (!dateString) return null;
  const end = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / DAY);
}
