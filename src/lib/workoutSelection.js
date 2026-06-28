export const WORKOUT_SELECTION_STORAGE_KEY = "fittrack-selected-exercises";

export function readSelectedWorkoutExercises() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(WORKOUT_SELECTION_STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeSelectedWorkoutExercises(exercises) {
  if (typeof window === "undefined") return;
  const names = [...new Set((exercises || []).filter(Boolean))];
  window.sessionStorage.setItem(WORKOUT_SELECTION_STORAGE_KEY, JSON.stringify(names));
}

export function clearSelectedWorkoutExercises() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(WORKOUT_SELECTION_STORAGE_KEY);
}
