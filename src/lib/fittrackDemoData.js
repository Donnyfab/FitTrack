const DAY = 86400000;

export const exerciseCatalog = [
  { name: "Bench Press", muscleGroup: "Chest", icon: "chest", favorite: false, custom: false, tip: "Keep shoulder blades pinned and touch the same point each rep." },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest", icon: "chest", favorite: false, custom: false, tip: "Use a moderate incline and control the lower half." },
  { name: "Cable Fly", muscleGroup: "Chest", icon: "chest", favorite: false, custom: false, tip: "Keep a soft bend in your elbows and squeeze through the midline." },
  { name: "Pull-Up", muscleGroup: "Back", icon: "back", favorite: false, custom: false, tip: "Start each rep from a dead hang and drive elbows down." },
  { name: "Barbell Row", muscleGroup: "Back", icon: "back", favorite: false, custom: false, tip: "Brace before each pull and keep the bar close." },
  { name: "Lat Pulldown", muscleGroup: "Back", icon: "back", favorite: false, custom: false, tip: "Pull your elbows toward your ribs without leaning far back." },
  { name: "Overhead Press", muscleGroup: "Shoulders", icon: "shoulders", favorite: false, custom: false, tip: "Squeeze glutes and press through a vertical bar path." },
  { name: "Lateral Raise", muscleGroup: "Shoulders", icon: "shoulders", favorite: false, custom: false, tip: "Lead with elbows and stop before shrugging takes over." },
  { name: "Rear Delt Fly", muscleGroup: "Shoulders", icon: "shoulders", favorite: false, custom: false, tip: "Reach wide and keep traps relaxed through the top." },
  { name: "EZ-Bar Curl", muscleGroup: "Biceps", icon: "biceps", favorite: false, custom: false, tip: "Keep elbows still and avoid swinging through the bottom." },
  { name: "Incline Dumbbell Curl", muscleGroup: "Biceps", icon: "biceps", favorite: false, custom: false, tip: "Let the arm fully lengthen, then curl without moving your shoulder forward." },
  { name: "Cable Triceps Pushdown", muscleGroup: "Triceps", icon: "triceps", favorite: false, custom: false, tip: "Pin your elbows to your sides and lock out under control." },
  { name: "Overhead Triceps Extension", muscleGroup: "Triceps", icon: "triceps", favorite: false, custom: false, tip: "Keep your ribs down and let the elbows bend deeply." },
  { name: "Back Squat", muscleGroup: "Quadriceps", icon: "quadriceps", favorite: false, custom: false, tip: "Brace hard before descending and keep knees tracking over toes." },
  { name: "Leg Press", muscleGroup: "Quadriceps", icon: "quadriceps", favorite: false, custom: false, tip: "Control the lower half and avoid locking knees aggressively." },
  { name: "Romanian Deadlift", muscleGroup: "Hamstrings", icon: "hamstrings", favorite: false, custom: false, tip: "Push hips back until hamstrings load, then stand tall." },
  { name: "Seated Leg Curl", muscleGroup: "Hamstrings", icon: "hamstrings", favorite: false, custom: false, tip: "Pause briefly in the curled position before returning slowly." },
  { name: "Hip Thrust", muscleGroup: "Hips", icon: "hips", favorite: false, custom: false, tip: "Tuck your pelvis slightly and squeeze through the top." },
  { name: "Cable Hip Abduction", muscleGroup: "Hips", icon: "hips", favorite: false, custom: false, tip: "Move from the hip and keep your torso quiet." },
  { name: "Hanging Knee Raise", muscleGroup: "Abs", icon: "abs", favorite: false, custom: false, tip: "Curl the pelvis instead of swinging the legs." },
  { name: "Cable Crunch", muscleGroup: "Abs", icon: "abs", favorite: false, custom: false, tip: "Round through your upper back and bring ribs toward hips." },
  { name: "Standing Calf Raise", muscleGroup: "Calves", icon: "calves", favorite: false, custom: false, tip: "Use a full stretch at the bottom and pause at the top." },
  { name: "Seated Calf Raise", muscleGroup: "Calves", icon: "calves", favorite: false, custom: false, tip: "Keep reps controlled and avoid bouncing through the stretch." },
  { name: "Wrist Curl", muscleGroup: "Forearms", icon: "forearms", favorite: false, custom: false, tip: "Move through the wrist only and keep the forearm supported." },
  { name: "Farmer Carry", muscleGroup: "Forearms", icon: "forearms", favorite: false, custom: false, tip: "Walk tall, keep shoulders packed, and hold until grip fades." },
  { name: "Neck Flexion", muscleGroup: "Neck", icon: "neck", favorite: false, custom: false, tip: "Use light resistance and move slowly through a pain-free range." },
  { name: "Neck Extension", muscleGroup: "Neck", icon: "neck", favorite: false, custom: false, tip: "Keep reps controlled and stop before strain or discomfort." },
  { name: "Zone 2 Run", muscleGroup: "Cardio", icon: "cardio", favorite: false, custom: false, tip: "Stay conversational and finish with room to continue." },
  { name: "Treadmill Walk", muscleGroup: "Cardio", icon: "cardio", favorite: false, custom: false, tip: "Use a pace and incline you can sustain without holding the rails." },
];

export const exerciseCategories = [
  "Chest",
  "Biceps",
  "Triceps",
  "Back",
  "Shoulders",
  "Abs",
  "Quadriceps",
  "Hamstrings",
  "Hips",
  "Calves",
  "Forearms",
  "Neck",
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
