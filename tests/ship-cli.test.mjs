import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = join(repoRoot, 'bin', 'ai-pm-dev.mjs');

function runCli(args, options = {}) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: options.input ?? '',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      AI_PM_DEV_FIXED_TIME: '2026-06-09T10:00:00.000Z',
    },
  });
}

function prdInput() {
  return `${[
    'AI fitness logging tool',
    'Fitness beginners',
    'They cannot tell whether training improves',
    'Scattered notes',
    'Log workout, review progress, receive AI summary',
    'Workout logging; progress trend; weekly summary',
    'Workout logging',
    'No social features in v1; no medical advice',
    'Sets, reps, weight',
    'Volume must be deterministic',
    'AI only summarizes',
    'Show the workouts used',
    'Protect health data',
    'A beginner understands weekly progress within five minutes',
  ].join('\n')}\n`;
}

function validPlanInput() {
  return `${JSON.stringify({
    goal: 'Build the smallest fitness logging MVP',
    constraints: ['Keep AI inside summaries'],
    currentState: ['PRD complete'],
    technicalApproach: 'Use deterministic workout calculations and the existing app shell.',
    slices: [
      {
        id: 'slice-1',
        title: 'Workout logging',
        mappedMustHaves: ['Workout logging'],
        provesOneThing: 'Workout logging',
        summary: 'Create the entry-to-value logging path.',
        plannedFiles: ['src/app.ts', 'src/workouts.ts'],
        verification: 'npm test and manual workout logging smoke',
        humanDecisions: ['Confirm logged workout fields'],
        docsUpdates: ['docs/dev-plan.md'],
        risks: ['Protect health data'],
      },
      {
        id: 'slice-2',
        title: 'Progress trend and weekly summary',
        mappedMustHaves: ['progress trend', 'weekly summary'],
        provesOneThing: 'Workout logging remains the anchor',
        summary: 'Add the remaining PRD must-haves after logging works.',
        plannedFiles: ['src/summary.ts'],
        verification: 'npm test summary',
        humanDecisions: [],
        docsUpdates: [],
        risks: [],
      },
    ],
    excludedNonGoals: ['No social features in v1', 'no medical advice'],
    openQuestions: [],
  })}\n`;
}

function validShipInput(extra = {}) {
  return `${JSON.stringify({
    prdSessionPath: 'C:\\stale\\prd-session',
    devPlanPath: 'C:\\stale\\dev-plan.json',
    idea: 'stale idea',
    oneThing: 'stale one thing',
    goal: 'Confirm the fitness MVP can ship',
    releaseScope: 'Ship workout logging, progress trend, and weekly summary.',
    targetEnvironment: 'local handoff',
    changes: ['Workout logging delivered', 'Progress trend delivered', 'Weekly summary delivered'],
    verification: [
      {
        command: 'npm test',
        passed: true,
        evidence: 'All CLI and workflow tests passed.',
      },
    ],
    acceptanceEvidence: [
      {
        criterion: 'A beginner understands weekly progress within five minutes',
        passed: true,
        evidence: 'Manual smoke showed weekly progress in under five minutes.',
      },
    ],
    mustHavesShipped: [
      {
        mustHave: 'Workout logging',
        slice: 'slice-1',
        status: 'shipped',
        evidence: 'Manual smoke created and saved a workout.',
      },
      {
        mustHave: 'progress trend',
        slice: 'slice-2',
        status: 'shipped',
        evidence: 'Progress trend rendered from saved workouts.',
      },
      {
        mustHave: 'weekly summary',
        slice: 'slice-2',
        status: 'shipped',
        evidence: 'Weekly summary rendered from saved workouts.',
      },
    ],
    deferredMustHaves: [],
    nonGoalsHeld: ['No social features in v1', 'no medical advice'],
    rollback: 'Revert the release commit and restore the previous static build.',
    openBlockers: [],
    docsUpdates: ['docs/release-checklist.md'],
    ...extra,
  })}\n`;
}

function preparePlannedTarget(prefix) {
  const target = mkdtempSync(join(tmpdir(), prefix));
  runCli(['prd', '--target', target], { input: prdInput() });
  const sessionPath = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
  runCli(['plan', 'materialize', '--target', target], { input: validPlanInput() });
  runCli(['plan', 'check', '--strict', '--target', target]);
  return { target, sessionPath };
}

const tempRoots = [];

try {
  {
    const { target, sessionPath } = preparePlannedTarget('ai-pm-dev-ship-happy-');
    tempRoots.push(target);
    const latestDevPlanPath = join(sessionPath, 'dev-plan.json');

    const materialize = runCli(['ship', 'materialize', '--target', target], { input: validShipInput() });
    assert.match(materialize, /Ship check materialized/);
    assert.equal(existsSync(join(sessionPath, 'ship-check.json')), true);
    assert.equal(existsSync(join(sessionPath, 'ship-check.md')), true);
    assert.equal(existsSync(join(sessionPath, 'handoff-release.md')), true);
    assert.equal(existsSync(join(target, 'docs', 'release-checklist.md')), true);

    const shipCheck = JSON.parse(readFileSync(join(sessionPath, 'ship-check.json'), 'utf8'));
    assert.equal(shipCheck.prdSessionPath, sessionPath);
    assert.equal(shipCheck.devPlanPath, latestDevPlanPath);
    assert.equal(shipCheck.idea, 'AI fitness logging tool');
    assert.equal(shipCheck.oneThing, 'Workout logging');

    const handoff = readFileSync(join(sessionPath, 'handoff-release.md'), 'utf8');
    assert.equal(readFileSync(join(target, 'memory', 'current-task-prompt.md'), 'utf8'), handoff);
    const handoffStdout = runCli(['ship', 'handoff', '--target', target]);
    assert.equal(handoffStdout, handoff);

    const state = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8'));
    assert.equal(state.skill, 'release-builder');
    assert.equal(state.phase, 'Ship');
    assert.equal(state.prdSessionPath, sessionPath);

    const timeline = runCli(['timeline', '--target', target]);
    assert.match(timeline, /ship/);

    const shipCheckOutput = runCli(['ship', 'check', '--strict', '--target', target]);
    assert.match(shipCheckOutput, /Ship Quality Check \(strict\)/);
    assert.match(shipCheckOutput, /Overall: PASS/);
    const shipReport = readFileSync(join(sessionPath, 'ship-quality-report.md'), 'utf8');
    assert.equal(shipReport.split('\n')[0], '# Ship Quality Report: AI fitness logging tool');
    assert.match(shipReport, /^Generated by `ai-pm-dev ship check`\.$/m);
    const shipReportJson = JSON.parse(readFileSync(join(sessionPath, 'ship-quality-report.json'), 'utf8'));
    assert.equal(shipReportJson.generatedBy, 'ai-pm-dev ship check');
  }

  {
    const { target, sessionPath } = preparePlannedTarget('ai-pm-dev-ship-structure-');
    tempRoots.push(target);

    let failed = false;
    let stderr = '';
    try {
      runCli(['ship', 'materialize', '--target', target], { input: '{"goal":"Broken","changes":[]}\n' });
    } catch (error) {
      failed = true;
      stderr = error.stderr || '';
    }
    assert.equal(failed, true, 'ship materialize should fail through the main catch on bad structure');
    assert.match(stderr, /Invalid ship check structure/);
    assert.equal(existsSync(join(sessionPath, 'ship-check.json')), false);
    assert.equal(existsSync(join(sessionPath, 'ship-check.md')), false);
    assert.equal(existsSync(join(sessionPath, 'handoff-release.md')), false);
  }

  {
    const { target, sessionPath } = preparePlannedTarget('ai-pm-dev-ship-content-');
    tempRoots.push(target);
    runCli(['ship', 'materialize', '--target', target], {
      input: validShipInput({
        mustHavesShipped: [
          {
            mustHave: 'progress trend',
            slice: 'slice-2',
            status: 'shipped',
            evidence: 'Progress trend rendered from saved workouts.',
          },
          {
            mustHave: 'weekly summary',
            slice: 'slice-2',
            status: 'shipped',
            evidence: 'Weekly summary rendered from saved workouts.',
          },
        ],
        deferredMustHaves: [
          {
            mustHave: 'Workout logging',
            reason: 'Deferred for release owner review.',
            waiver: 'Release owner accepted this test waiver.',
          },
        ],
      }),
    });

    let failed = false;
    let stdout = '';
    try {
      runCli(['ship', 'check', '--strict', '--target', target]);
    } catch (error) {
      failed = true;
      stdout = error.stdout || '';
    }
    assert.equal(failed, true, 'ship check --strict should fail when required checks fail');
    assert.match(stdout, /FAIL PRD one thing is shipped/);
    assert.match(stdout, /Strict mode: exiting non-zero because required checks failed/);
    assert.equal(existsSync(join(sessionPath, 'ship-quality-report.md')), true);
    assert.equal(existsSync(join(sessionPath, 'ship-quality-report.json')), true);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
