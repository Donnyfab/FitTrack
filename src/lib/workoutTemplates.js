const todayKey = () => new Date().toISOString().split("T")[0];

const set = (reps, restSeconds = 90, weight = "") => ({
  reps: String(reps),
  weight,
  restSeconds,
  completed: false,
});

const exercise = (name, reps, sets = 3, restSeconds = 90) => ({
  name,
  sets: Array.from({ length: sets }, () => set(reps, restSeconds)),
});

export const DEFAULT_WORKOUT_TEMPLATES = [
  {
    id: "weight-loss-plan",
    name: "Weight Loss Plan",
    focus: "Cardio + full-body strength",
    level: "Beginner",
    duration: "30-40 min",
    schedule: "3 strength days + 2 cardio days",
    restDays: "Wednesday and Sunday",
    muscleGroup: "Full Body, Cardio",
    notes: "Beginner-friendly plan focused on consistency, short cardio work, and full-body strength. Rest days: Wednesday and Sunday.",
    exercises: [
      exercise("Treadmill Walk (20 min)", 1, 1, 60),
      exercise("Bodyweight Squat", 12, 3, 60),
      exercise("Push-Up", 8, 3, 60),
      exercise("Seated Cable Row", 12, 3, 75),
      exercise("Plank (30 sec)", 1, 3, 45),
    ],
  },
  {
    id: "muscle-gain-plan",
    name: "Muscle Gain Plan",
    focus: "Strength split + progressive overload",
    level: "Intermediate",
    duration: "45-60 min",
    schedule: "Push, Pull, Legs, rest, repeat",
    restDays: "Thursday and Sunday",
    muscleGroup: "Chest, Back, Quadriceps, Hamstrings",
    notes: "Strength split built for progressive overload. Add weight or reps when all sets feel controlled. Rest days: Thursday and Sunday.",
    exercises: [
      exercise("Bench Press", 8, 4, 120),
      exercise("Barbell Bent-Over Row", 8, 4, 120),
      exercise("Barbell Back Squat", 8, 4, 150),
      exercise("Romanian Deadlift", 10, 3, 120),
      exercise("Dumbbell Shoulder Press", 10, 3, 90),
    ],
  },
  {
    id: "home-workout-plan",
    name: "Home Workout Plan",
    focus: "No-equipment daily sessions",
    level: "Beginner",
    duration: "18-25 min",
    schedule: "Short daily sessions",
    restDays: "Sunday",
    muscleGroup: "Full Body, Abs",
    notes: "No-equipment plan for small spaces. Keep rests short and focus on smooth reps. Rest day: Sunday.",
    exercises: [
      exercise("Bodyweight Squat", 15, 3, 45),
      exercise("Push-Up", 10, 3, 45),
      exercise("Reverse Lunge", 10, 3, 45),
      exercise("Mountain Climber", 30, 3, 45),
      exercise("Dead Bug", 10, 3, 45),
    ],
  },
  {
    id: "beginner-fitness-plan",
    name: "Beginner Fitness Plan",
    focus: "Simple low-intensity progression",
    level: "Beginner",
    duration: "25-35 min",
    schedule: "Monday, Wednesday, Friday",
    restDays: "Tuesday, Thursday, Saturday, Sunday",
    muscleGroup: "Full Body",
    notes: "Simple weekly structure with low-intensity progression. Add one set or a few reps when the workout feels easy.",
    exercises: [
      exercise("Goblet Squat", 10, 3, 75),
      exercise("Incline Push-Up", 10, 3, 60),
      exercise("Lat Pulldown", 12, 3, 75),
      exercise("Dumbbell Romanian Deadlift", 10, 3, 90),
      exercise("Plank (20 sec)", 1, 3, 45),
    ],
  },
  {
    id: "athletic-performance-plan",
    name: "Athletic Performance Plan",
    focus: "Strength, mobility, conditioning",
    level: "Advanced",
    duration: "45-55 min",
    schedule: "3 performance days + recovery work",
    restDays: "Wednesday and Sunday",
    muscleGroup: "Full Body, Cardio",
    notes: "Performance plan with explosive movement, strength, mobility, and recovery. Move fast, but keep form sharp.",
    exercises: [
      exercise("Jump Squat", 5, 4, 90),
      exercise("Trap Bar Deadlift", 5, 4, 150),
      exercise("Push Press", 6, 4, 120),
      exercise("Box Jump", 5, 4, 90),
      exercise("Rowing Machine (8 min)", 1, 1, 60),
    ],
  },
];

export function createDraftFromDefaultTemplate(template, options = {}) {
  return {
    name: options.name || template.name,
    date: options.date || todayKey(),
    muscleGroup: template.muscleGroup,
    notes: options.notes ?? template.notes,
    status: options.status || "planned",
    favorite: false,
    template: Boolean(options.template),
    calories: "",
    exercises: template.exercises.map((item) => ({
      name: item.name,
      sets: item.sets.map((row) => ({ ...row, completed: false })),
    })),
  };
}
