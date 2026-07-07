#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { exerciseCatalog } from "../src/lib/fittrackDemoData.js";
import {
  createImportConfig,
  createSupabaseRest,
  fetchExerciseDetailById,
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

function createEmptyReport(extraMode = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mode: {
      dryRun: args.dryRun,
      jsonOnly: args.jsonOnly,
      limit: args.limit,
      name: args.name,
      ...extraMode,
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
}

function mediaFlagsFor(exercise) {
  return {
    image: Boolean(exercise.image_url),
    video: Boolean(exercise.video_url),
    gif: Boolean(exercise.gif_url),
  };
}

function readImportReport(reportPath) {
  if (!reportPath) {
    throw new Error("Missing --from-report path");
  }

  const absolutePath = path.resolve(reportPath);
  const report = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  return { absolutePath, report };
}

function filterReportMatches(matches) {
  let filtered = (matches || []).filter((match) => match?.apiExerciseId);

  if (args.name) {
    const nameFilter = normalizeKey(args.name);
    filtered = filtered.filter((match) =>
      normalizeKey(`${match.name || ""} ${match.apiName || ""}`).includes(nameFilter),
    );
  }

  if (args.limit) {
    filtered = filtered.slice(0, args.limit);
  }

  return filtered;
}

function uniqueReportMatches(matches) {
  const seen = new Map();
  const uniqueMatches = [];
  const duplicateAliases = [];

  matches.forEach((match) => {
    if (!seen.has(match.apiExerciseId)) {
      seen.set(match.apiExerciseId, match);
      uniqueMatches.push(match);
      return;
    }

    duplicateAliases.push({
      ...match,
      sourceName: seen.get(match.apiExerciseId)?.name || match.apiExerciseId,
    });
  });

  return { uniqueMatches, duplicateAliases };
}

function catalogExerciseFromReportMatch(match) {
  return {
    name: match.apiName || match.name || match.apiExerciseId,
    apiName: match.apiName,
    muscleGroup: match.localMuscleGroup || "",
    equipment: match.localEquipment || "",
  };
}

function reportExpectedMediaMissing(sourceMatch, actualMedia) {
  return Boolean(
    (sourceMatch.media?.image && !actualMedia.image) ||
      (sourceMatch.media?.video && !actualMedia.video) ||
      (sourceMatch.media?.gif && !actualMedia.gif),
  );
}

function createRuntime() {
  const dryRun = args.dryRun || args.jsonOnly;
  const config = createImportConfig({
    requireRapidApi: true,
    requireSupabase: !dryRun,
  });
  const supabaseRest = dryRun ? null : createSupabaseRest(config);

  return { dryRun, config, supabaseRest };
}

async function runCatalogImport() {
  const { dryRun, config, supabaseRest } = createRuntime();
  const catalog = filterCatalog(exerciseCatalog);
  const report = createEmptyReport();

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
          rowId: save.row?.id || null,
          media: mediaFlagsFor(match.exercise),
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
}

async function runReportImport() {
  const { dryRun, config, supabaseRest } = createRuntime();
  const { absolutePath, report: sourceReport } = readImportReport(args.fromReport);
  const sourceMatches = filterReportMatches(sourceReport.matched || []);
  const { uniqueMatches, duplicateAliases } = uniqueReportMatches(sourceMatches);
  const report = createEmptyReport({
    fromReport: absolutePath,
    sourceGeneratedAt: sourceReport.generatedAt || null,
    sourceMatchedRows: sourceMatches.length,
    uniqueApiIds: uniqueMatches.length,
    duplicateAliases: duplicateAliases.length,
  });

  duplicateAliases.forEach((alias) => {
    report.totals.skipped += 1;
    report.skipped.push({
      name: alias.name,
      localMuscleGroup: alias.localMuscleGroup,
      localEquipment: alias.localEquipment,
      apiExerciseId: alias.apiExerciseId,
      apiName: alias.apiName,
      status: "skipped",
      reason: "Duplicate API exercise ID already represented by another confident report match",
      sourceName: alias.sourceName,
    });
  });

  console.log(
    `Processing ${uniqueMatches.length} unique API exercise${uniqueMatches.length === 1 ? "" : "s"} from ${sourceMatches.length} saved match${sourceMatches.length === 1 ? "" : "es"}${dryRun ? " without writes" : ""}.`,
  );
  if (duplicateAliases.length) {
    console.log(`Skipping ${duplicateAliases.length} duplicate alias${duplicateAliases.length === 1 ? "" : "es"} to avoid duplicate global imports.`);
  }

  for (const match of uniqueMatches) {
    report.totals.processed += 1;
    process.stdout.write(`- ${match.name}... `);

    try {
      const { exercise } = await fetchExerciseDetailById(
        match.apiExerciseId,
        config,
        catalogExerciseFromReportMatch(match),
      );
      const media = mediaFlagsFor(exercise);

      if (reportExpectedMediaMissing(match, media)) {
        throw new Error(
          `Report expected media missing after detail fetch. Expected ${JSON.stringify(match.media)}, got ${JSON.stringify(media)}`,
        );
      }

      const save = await saveImportedExercise(exercise, supabaseRest, { dryRun });

      report.totals.matched += 1;
      report.matched.push({
        name: match.name,
        localMuscleGroup: match.localMuscleGroup,
        localEquipment: match.localEquipment,
        apiExerciseId: exercise.api_exercise_id,
        apiName: exercise.name,
        score: match.score,
        reasons: match.reasons || [],
        action: save.action,
        rowId: save.row?.id || null,
        media,
      });
      console.log(`${save.action} (${match.score || "report"})`);
    } catch (error) {
      report.totals.failed += 1;
      report.failed.push({
        name: match.name,
        localMuscleGroup: match.localMuscleGroup,
        localEquipment: match.localEquipment,
        apiExerciseId: match.apiExerciseId,
        apiName: match.apiName,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      });
      console.log("failed");
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const reportPaths = writeExerciseImportReport(report, {
    basename: "exercise-library-import-from-report",
  });

  console.log("");
  console.log("Exercise library report import complete.");
  console.log(`Matched: ${report.totals.matched}`);
  console.log(`Skipped: ${report.totals.skipped}`);
  console.log(`Failed: ${report.totals.failed}`);
  console.log(`Report: ${reportPaths.markdownPath}`);
  console.log(`JSON: ${reportPaths.jsonPath}`);
}

if (args.fromReport) {
  await runReportImport();
} else {
  await runCatalogImport();
}
