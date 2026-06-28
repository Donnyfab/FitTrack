export const MUSCLE_GROUPS = [
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
  "Full Body",
];

export const GOAL_TYPES = [
  { value: "workout_consistency", label: "Workout Consistency" },
  { value: "strength_goal", label: "Strength Goal" },
  { value: "weight_goal", label: "Weight Goal" },
  { value: "body_fat_goal", label: "Body Fat Goal" },
];

export const GOAL_STATUSES = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
];

export const getGoalTypeLabel = (value) =>
  GOAL_TYPES.find((t) => t.value === value)?.label || value;

export const getGoalStatusLabel = (value) =>
  GOAL_STATUSES.find((s) => s.value === value)?.label || value;
