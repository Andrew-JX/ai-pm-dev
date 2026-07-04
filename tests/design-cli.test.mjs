import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function validDesignInput(extra = {}) {
  return `${JSON.stringify({
    prdSessionPath: 'C:\\stale\\prd-session',
    idea: 'Stale host idea',
    oneThing: 'Stale one thing',
    mustHaves: ['Stale must-have'],
    nonGoals: ['Stale non-goal'],
    coreWorkflow: 'Stale workflow',
    goal: 'Design the smallest page structure for AI fitness logging',
    screens: [
      {
        id: 'home',
        name: 'Home dashboard',
        purpose: 'Entry point for the core flow: Log workout, review progress, receive AI summary. Clarifies that No social features in v1 stay out of scope.',
        coversMustHaves: [],
        keyElements: ['today summary', 'log workout action', 'no social entry points'],
        entry: true,
      },
      {
        id: 'log-workout',
        name: 'Log workout',
        purpose: 'Let beginners record workouts.',
        coversMustHaves: ['Workout logging'],
        keyElements: ['exercise input', 'sets reps weight fields'],
        entry: false,
      },
      {
        id: 'progress',
        name: 'Progress review',
        purpose: 'Let beginners review progress and receive an AI summary.',
        coversMustHaves: ['progress trend', 'weekly summary'],
        keyElements: ['volume trend', 'weekly summary panel', 'AI summary'],
        entry: false,
      },
    ],
    workflowScreens: ['home', 'log-workout', 'progress'],
    supportingScreens: ['home'],
    excludedNonGoals: ['No social features in v1', 'no medical advice'],
    openQuestions: [],
    ...extra,
  })}\n`;
}

const tempRoots = [];

try {
  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-design-happy-'));
    tempRoots.push(target);
    runCli(['prd', '--target', target], { input: prdInput() });
    const sessionPath = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    writeFileSync(join(target, 'docs', 'UI_SPEC.md'), '# UI Spec\n\nHand edited content that design materialize should replace.\n', 'utf8');

    const materialize = runCli(['design', 'materialize', '--target', target], { input: validDesignInput() });
    assert.match(materialize, /Design materialized/);
    assert.equal(existsSync(join(sessionPath, 'design.json')), true);
    assert.equal(existsSync(join(sessionPath, 'design.md')), true);
    assert.equal(existsSync(join(sessionPath, 'handoff-design.md')), true);

    const design = JSON.parse(readFileSync(join(sessionPath, 'design.json'), 'utf8'));
    assert.equal(design.prdSessionPath, sessionPath);
    assert.equal(design.idea, 'AI fitness logging tool');
    assert.equal(design.oneThing, 'Workout logging');
    assert.deepEqual(design.mustHaves, ['Workout logging', 'progress trend', 'weekly summary']);
    assert.deepEqual(design.nonGoals, ['No social features in v1', 'no medical advice']);
    assert.equal(design.coreWorkflow, 'Log workout, review progress, receive AI summary');

    const designMarkdown = readFileSync(join(sessionPath, 'design.md'), 'utf8');
    assert.equal(readFileSync(join(target, 'docs', 'UI_SPEC.md'), 'utf8'), designMarkdown);
    const handoff = readFileSync(join(sessionPath, 'handoff-design.md'), 'utf8');
    assert.equal(readFileSync(join(target, 'memory', 'current-task-prompt.md'), 'utf8'), handoff);
    const handoffStdout = runCli(['design', 'handoff', '--target', target]);
    assert.equal(handoffStdout, handoff);

    const state = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8'));
    assert.equal(state.skill, 'design-maker');
    assert.equal(state.phase, 'Design');
    assert.equal(state.prdSessionPath, sessionPath);

    const timeline = runCli(['timeline', '--target', target]);
    assert.match(timeline, /prd/);
    assert.match(timeline, /design/);

    const designCheck = runCli(['design', 'check', '--strict', '--target', target]);
    assert.match(designCheck, /Design Quality Check \(strict\)/);
    assert.match(designCheck, /Overall: PASS/);
    const designReport = readFileSync(join(sessionPath, 'design-quality-report.md'), 'utf8');
    assert.equal(designReport.split('\n')[0], '# Design Quality Report: AI fitness logging tool');
    assert.match(designReport, /^Generated by `ai-pm-dev design check`\.$/m);
    const designReportJson = JSON.parse(readFileSync(join(sessionPath, 'design-quality-report.json'), 'utf8'));
    assert.equal(designReportJson.generatedBy, 'ai-pm-dev design check');
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-design-structure-'));
    tempRoots.push(target);
    runCli(['prd', '--target', target], { input: prdInput() });
    const sessionPath = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;

    let failed = false;
    let stderr = '';
    try {
      runCli(['design', 'materialize', '--target', target], {
        input: '{"goal":"Broken","screens":[],"workflowScreens":["missing"],"supportingScreens":[],"excludedNonGoals":[],"openQuestions":[]}\n',
      });
    } catch (error) {
      failed = true;
      stderr = error.stderr || '';
    }
    assert.equal(failed, true, 'materialize should fail through the main catch on bad structure');
    assert.match(stderr, /Invalid design structure/);
    assert.equal(existsSync(join(sessionPath, 'design.json')), false);
    assert.equal(existsSync(join(sessionPath, 'design.md')), false);
    assert.equal(existsSync(join(sessionPath, 'handoff-design.md')), false);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-design-content-'));
    tempRoots.push(target);
    runCli(['prd', '--target', target], { input: prdInput() });
    const sessionPath = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    runCli(['design', 'materialize', '--target', target], {
      input: validDesignInput({
        screens: [
          {
            id: 'home',
            name: 'Home',
            purpose: 'Mentions No social features in v1 only as a clarification.',
            coversMustHaves: [],
            keyElements: ['No social features in v1 are not linked from this screen'],
            entry: true,
          },
          {
            id: 'summary',
            name: 'Summary',
            purpose: 'Shows summary.',
            coversMustHaves: ['weekly summary', 'No social features in v1'],
            keyElements: ['summary'],
            entry: false,
          },
        ],
        workflowScreens: ['home', 'summary'],
        supportingScreens: [],
        excludedNonGoals: [],
      }),
    });

    let failed = false;
    let stdout = '';
    try {
      runCli(['design', 'check', '--strict', '--target', target]);
    } catch (error) {
      failed = true;
      stdout = error.stdout || '';
    }
    assert.equal(failed, true, 'design check --strict should fail when required checks fail');
    assert.match(stdout, /FAIL Every PRD must-have maps to a screen/);
    assert.match(stdout, /FAIL PRD one thing appears in the core workflow/);
    assert.match(stdout, /FAIL Every screen is covered or explicitly supporting/);
    assert.match(stdout, /FAIL PRD non-goals stay excluded/);
    assert.match(stdout, /FAIL Screens do not claim PRD non-goals as delivered/);
    assert.equal(existsSync(join(sessionPath, 'design-quality-report.md')), true);
    assert.equal(existsSync(join(sessionPath, 'design-quality-report.json')), true);

    const designPath = join(sessionPath, 'design.json');
    const staleDesign = JSON.parse(readFileSync(designPath, 'utf8'));
    writeFileSync(designPath, `${JSON.stringify({ ...staleDesign, prdSessionPath: 'C:\\stale\\prd-session' }, null, 2)}\n`, 'utf8');
    failed = false;
    stdout = '';
    try {
      runCli(['design', 'check', '--strict', '--target', target]);
    } catch (error) {
      failed = true;
      stdout = error.stdout || '';
    }
    assert.equal(failed, true, 'stale design should fail strict check');
    assert.match(stdout, /FAIL Design source is latest PRD/);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
