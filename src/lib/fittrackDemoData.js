const DAY = 86400000;

export const exerciseCatalog = [
  { name: "Bench Press", muscleGroup: "Chest", icon: "chest", favorite: false, custom: false, tip: "Keep shoulder blades pinned and touch the same point each rep." },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest", icon: "chest", favorite: false, custom: false, tip: "Use a moderate incline and control the lower half." },
  { name: "Pull-Up", muscleGroup: "Back", icon: "back", favorite: false, custom: false, tip: "Start each rep from a dead hang and drive elbows down." },
  { name: "Barbell Row", muscleGroup: "Back", icon: "back", favorite: false, custom: false, tip: "Brace before each pull and keep the bar close." },
  { name: "Overhead Press", muscleGroup: "Shoulders", icon: "shoulders", favorite: false, custom: false, tip: "Squeeze glutes and press through a vertical bar path." },
  { name: "Lateral Raise", muscleGroup: "Shoulders", icon: "shoulders", favorite: false, custom: false, tip: "Lead with elbows and stop before shrugging takes over." },
  { name: "EZ-Bar Curl", muscleGroup: "Arms", icon: "arms", favorite: false, custom: false, tip: "Keep elbows still and avoid swinging through the bottom." },
  { name: "Back Squat", muscleGroup: "Legs", icon: "legs", favorite: false, custom: false, tip: "Brace hard before descending and keep knees tracking over toes." },
  { name: "Romanian Deadlift", muscleGroup: "Glutes", icon: "glutes", favorite: false, custom: false, tip: "Push hips back until hamstrings load, then stand tall." },
  { name: "Hanging Knee Raise", muscleGroup: "Core", icon: "core", favorite: false, custom: false, tip: "Curl the pelvis instead of swinging the legs." },
  { name: "Zone 2 Run", muscleGroup: "Cardio", icon: "cardio", favorite: false, custom: false, tip: "Stay conversational and finish with room to continue." },
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

export function countSets(workout) {
  return (workout?.exercises || []).reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0);
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
