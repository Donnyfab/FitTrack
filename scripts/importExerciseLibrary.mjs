#!/usr/bin/env node
import { exerciseCatalog } from "../src/lib/fittrackDemoData.js";
import {
  createImportConfig,
  createSupabaseRest,
  findConfidentExerciseMatch,
  normalizeKey,
  parseImportArgs,
  printExerciseImportHelp,
  saveImportedExercise,
  sleep,
  writeExerciseImportReport,
} from "./exerciseApiUtils.mjs";

const COMMAND_NAME = "npm run import:exercise-library";
const REQUEST_DELAY_MS = 80;

const args = parseImportArgs();

if (args.help) {
  printExerciseImportHelp(COMMAND_NAME);
  process.exit(0);
}

function uniqueCatalogExercises(catalog) {
  const seen = new Set();
  return catalog.filter((exercise) => {
    const key = normalizeKey(
      `${exercise.name || ""}:${exercise.equipment || ""}:${exercise.muscleGroup || ""}`,
    );
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterCatalog(catalog) {
  let filtered = uniqueCatalogExercises(catalog);
  if (args.name) {
    const nameFilter = normalizeKey(args.name);
    filtered = filtered.filter((exercise) =>
      normalizeKey(exercise.name).includes(nameFilter),
    );
  }
  if (args.limit) {
    filtered = filtered.slice(0, args.limit);
  }
  return filtered;
}

const dryRun = args.dryRun || args.jsonOnly;
const config = createImportConfig({
  requireRapidApi: true,
  requireSupabase: !dryRun,
});
const supabaseRest = dryRun ? null : createSupabaseRest(config);
const catalog = filterCatalog(exerciseCatalog);

const report = {
  generatedAt: new Date().toISOString(),
  mode: {
    dryRun: args.dryRun,
    jsonOnly: args.jsonOnly,
    limit: args.limit,
    name: args.name,
  },
  totals: {
    processed: 0,
    matched: 0,
    skipped: 0,
    unsupported: 0,
    ambiguous: 0,
    failed: 0,
  },
  matched: [],
  skipped: [],
  unsupported: [],
  ambiguous: [],
  failed: [],
};

console.log(
  `Processing ${catalog.length} FitTrack exercise${catalog.length === 1 ? "" : "s"}${dryRun ? " without writes" : ""}.`,
);

for (const exercise of catalog) {
  report.totals.processed += 1;
  process.stdout.write(`- ${exercise.name}... `);

  try {
    const match = await findConfidentExerciseMatch(exercise, config);

    if (match.status === "matched") {
      const save = await saveImportedExercise(match.exercise, supabaseRest, {
        dryRun,
      });
      report.totals.matched += 1;
      report.matched.push({
        name: exercise.name,
        localMuscleGroup: exercise.muscleGroup,
        localEquipment: exercise.equipment,
        apiExerciseId: match.exercise.api_exercise_id,
        apiName: match.exercise.name,
        score: match.score.score,
        reasons: match.score.reasons,
        action: save.action,
        media: {
          image: Boolean(match.exercise.image_url),
          video: Boolean(match.exercise.video_url),
          gif: Boolean(match.exercise.gif_url),
        },
      });
      console.log(`${save.action} (${match.score.score})`);
    } else if (match.status === "ambiguous") {
      report.totals.ambiguous += 1;
      report.ambiguous.push({
        name: exercise.name,
        status: match.status,
        reason: "No confident match",
        candidates: match.candidates,
        triedUrls: match.triedUrls,
      });
      console.log("ambiguous");
    } else if (match.status === "unsupported") {
      report.totals.unsupported += 1;
      report.unsupported.push({
        name: exercise.name,
        status: match.status,
        reason: "No API candidates returned",
        triedUrls: match.triedUrls,
      });
      console.log("unsupported");
    } else {
      report.totals.failed += 1;
      report.failed.push({
        name: exercise.name,
        status: match.status,
        reason: "API request failed",
        failures: match.failures,
        triedUrls: match.triedUrls,
      });
      console.log("failed");
    }
  } catch (error) {
    report.totals.failed += 1;
    report.failed.push({
      name: exercise.name,
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
    });
    console.log("failed");
  }

  await sleep(REQUEST_DELAY_MS);
}

const reportPaths = writeExerciseImportReport(report);

console.log("");
console.log("Exercise library import complete.");
console.log(`Matched: ${report.totals.matched}`);
console.log(`Ambiguous: ${report.totals.ambiguous}`);
console.log(`Unsupported: ${report.totals.unsupported}`);
console.log(`Failed: ${report.totals.failed}`);
console.log(`Report: ${reportPaths.markdownPath}`);
console.log(`JSON: ${reportPaths.jsonPath}`);
