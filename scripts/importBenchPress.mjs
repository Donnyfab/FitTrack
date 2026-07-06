#!/usr/bin/env node
import {
  createImportConfig,
  createSupabaseRest,
  findConfidentExerciseMatch,
  parseImportArgs,
  printExerciseImportHelp,
  saveImportedExercise,
} from "./exerciseApiUtils.mjs";

const COMMAND_NAME = "npm run import:bench-press";
const BENCH_PRESS_EXERCISE = {
  name: "Bench Press",
  muscleGroup: "Chest",
  equipment: "Barbell",
  icon: "chest",
  tip: "Keep your shoulder blades set, control the bar path, and press with stable wrists.",
};

const args = parseImportArgs();

if (args.help) {
  printExerciseImportHelp(COMMAND_NAME);
  process.exit(0);
}

const jsonOnly =
  args.jsonOnly || process.env.BENCH_PRESS_IMPORT_OUTPUT === "json";
const dryRun = args.dryRun || jsonOnly;
const config = createImportConfig({
  requireRapidApi: true,
  requireSupabase: !dryRun,
});
const extraUrls = process.env.EXERCISEDB_BENCH_PRESS_URL
  ? [process.env.EXERCISEDB_BENCH_PRESS_URL]
  : [];

const result = await findConfidentExerciseMatch(BENCH_PRESS_EXERCISE, config, {
  extraUrls,
});

if (result.status !== "matched") {
  const candidates = result.candidates?.length
    ? ` Candidates: ${result.candidates
        .map((candidate) => `${candidate.name || "unknown"} (${candidate.score})`)
        .join("; ")}`
    : "";
  throw new Error(
    `Could not confidently import Bench Press (${result.status}). Tried ${
      result.triedUrls?.length || 0
    } endpoints.${candidates}`,
  );
}

if (jsonOnly) {
  console.log(JSON.stringify(result.exercise, null, 2));
} else {
  const supabaseRest = dryRun ? null : createSupabaseRest(config);
  const save = await saveImportedExercise(result.exercise, supabaseRest, {
    dryRun,
  });

  console.log(`Bench Press ${save.action}: ${save.row?.id || "dry run"}`);
  console.log(
    `Media: image=${Boolean(result.exercise.image_url)} video=${Boolean(
      result.exercise.video_url,
    )} gif=${Boolean(result.exercise.gif_url)}`,
  );
}
