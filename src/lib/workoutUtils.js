import { format, parseISO } from "date-fns";

export function calculateStreak(workouts) {
  if (!workouts || workouts.length === 0) return 0;
  const dateSet = new Set(workouts.map((w) => w.date));
  let streak = 0;
  let currentDate = new Date();
  const todayStr = currentDate.toISOString().split("T")[0];
  if (!dateSet.has(todayStr)) {
    currentDate = new Date(Date.now() - 86400000);
  }
  while (true) {
    const dateStr = currentDate.toISOString().split("T")[0];
    if (dateSet.has(dateStr)) {
      streak++;
      currentDate = new Date(currentDate.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

export function calculateWorkoutVolume(workout) {
  if (!workout?.exercises) return 0;
  return workout.exercises.reduce((total, ex) => {
    return (
      total +
      (ex.sets || []).reduce((setTotal, set) => {
        return setTotal + (Number(set.reps) || 0) * (Number(set.weight) || 0);
      }, 0)
    );
  }, 0);
}

export function getPersonalRecords(workouts) {
  const records = {};
  workouts.forEach((workout) => {
    (workout.exercises || []).forEach((ex) => {
      if (!ex.name) return;
      (ex.sets || []).forEach((set) => {
        const weight = Number(set.weight) || 0;
        if (!records[ex.name] || weight > records[ex.name].weight) {
          records[ex.name] = {
            weight,
            reps: Number(set.reps) || 0,
            date: workout.date,
          };
        }
      });
    });
  });
  return records;
}

export function getWeeklyVolume(workouts) {
  const weeklyData = {};
  workouts.forEach((workout) => {
    const date = new Date(workout.date + "T00:00:00");
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];
    weeklyData[weekKey] = (weeklyData[weekKey] || 0) + calculateWorkoutVolume(workout);
  });
  return Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, volume]) => ({ week, volume }));
}

export function getWorkoutsPerWeek(workouts) {
  const weeklyData = {};
  workouts.forEach((workout) => {
    const date = new Date(workout.date + "T00:00:00");
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];
    weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
  });
  return Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function formatDateLong(dateStr) {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "EEEE, MMMM d");
  } catch {
    return dateStr;
  }
}

export function formatWeek(weekStr) {
  if (!weekStr) return "";
  try {
    return format(parseISO(weekStr), "MMM d");
  } catch {
    return weekStr;
  }
}
