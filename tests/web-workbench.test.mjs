import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from '../apps/web/server/api.mjs';
import { docStatus, readProjectState } from '../apps/web/server/project-state.mjs';

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

const tempRoots = [];

function fullPrdInput() {
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

function validDevPlanInput() {
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

function validShipInput() {
  return `${JSON.stringify({
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
  })}\n`;
}

function consumerPrdInput() {
  return `${[
    'A playful dating plan mini-app',
    'Young people who want to date',
    'Quickly agree on a fun date plan',
    'Chatting on WeChat',
    'Pick date, time, food, activity',
    'Date picker; food picker; activity picker',
    'Generate a shareable date plan',
    'No accounts or backend in v1',
    'No backend; can bind to phone calendar',
    'Keep it lighthearted; avoid pressuring users',
    'Within three minutes two people get a plan',
  ].join('\n')}\n`;
}

function consumerWarnPrdInput() {
  return `${[
    'A playful dating plan mini-app',
    'Young people who want to date',
    'Quickly agree on a fun date plan',
    'Chatting on WeChat',
    'Pick date, time, food, activity',
    'Date picker; food picker; activity picker',
    'Generate a shareable date plan',
    'No accounts or backend in v1',
    'No backend; can bind to phone calendar',
    'Keep it lighthearted; avoid pressuring users',
    'People feel confident about the plan',
  ].join('\n')}\n`;
}

try {
  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-empty-'));
    tempRoots.push(target);

    const state = readProjectState(target);
    assert.equal(state.projectInitialized, false);
    assert.equal(state.latestSession, null);
    assert.equal(state.qualityGate.overall, 'UNKNOWN');
    assert.equal(state.shipGate.overall, 'UNKNOWN');
    assert.equal(state.iterateGate.overall, 'UNKNOWN');
    assert.equal(state.nextAction.command, 'ai-pm-dev init .');
    assert.ok(state.artifacts.some((artifact) => artifact.relativePath === 'docs/scope.md' && artifact.status === 'missing'));
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-docs-'));
    tempRoots.push(target);
    runCli(['init', target]);

    const briefPath = join(target, 'docs', 'PROJECT_BRIEF.md');
    assert.equal(docStatus(briefPath), 'stub');

    writeFileSync(briefPath, '# Project Brief\n\nA filled product brief.\n', 'utf8');
    assert.equal(docStatus(briefPath), 'filled');

    const state = readProjectState(target);
    const brief = state.artifacts.find((artifact) => artifact.id === 'brief');
    assert.equal(brief.status, 'filled');
    assert.equal(state.projectInitialized, true);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-api-'));
    tempRoots.push(target);
    runCli(['init', target]);

    const projectBefore = await handleApiRequest({
      method: 'GET',
      url: `/api/project?target=${encodeURIComponent(target)}`,
      body: '',
    });
    assert.equal(projectBefore.status, 200);
    assert.equal(projectBefore.body.projectInitialized, true);
    assert.equal(projectBefore.body.latestSession, null);

    const missingIdea = await handleApiRequest({
      method: 'POST',
      url: '/api/prd',
      body: JSON.stringify({ target }),
    });
    assert.equal(missingIdea.status, 400);
    assert.match(missingIdea.body.error, /idea is required/);

    const prd = await handleApiRequest({
      method: 'POST',
      url: '/api/prd',
      body: JSON.stringify({
        target,
        idea: 'AI fitness logging tool',
        targetUsers: 'Fitness beginners',
        painPoints: 'They cannot see weekly progress',
      }),
    });
    assert.equal(prd.status, 200);
    assert.match(prd.body.project.latestSession.name, /\d{4}-\d{2}-\d{2}-\d{6}-ai-fitness-logging-tool/);
    assert.equal(existsSync(join(target, 'docs', 'scope.md')), true);
    const answers = JSON.parse(readFileSync(join(prd.body.project.latestSession.path, 'answers.json'), 'utf8'));
    assert.equal(answers.targetUsers, 'Fitness beginners');
    assert.equal(answers.painPoints, 'They cannot see weekly progress');

    const check = await handleApiRequest({
      method: 'POST',
      url: '/api/check',
      body: JSON.stringify({ target }),
    });
    assert.equal(check.status, 200);
    assert.notEqual(check.body.project.qualityGate.overall, 'UNKNOWN');
    assert.match(check.body.result.stdout, /PRD Quality Check/);

    const checkpoint = await handleApiRequest({
      method: 'POST',
      url: '/api/checkpoint',
      body: JSON.stringify({ target, phase: 'build', note: 'web smoke path verified' }),
    });
    assert.equal(checkpoint.status, 200);
    const timeline = readFileSync(join(target, '.ai-pm-dev', 'timeline.json'), 'utf8');
    assert.match(timeline, /web smoke path verified/);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-plan-'));
    tempRoots.push(target);
    runCli(['prd', '--target', target], { input: fullPrdInput() });
    runCli(['prd', 'check', '--target', target]);

    const beforePlan = readProjectState(target);
    assert.equal(beforePlan.qualityGate.overall, 'PASS');
    assert.equal(beforePlan.devPlanGate.overall, 'UNKNOWN');
    assert.equal(beforePlan.phases.find((phase) => phase.id === 'plan')?.status, 'current');
    assert.match(beforePlan.nextAction.command, /dev-planner/);
    assert.match(beforePlan.nextAction.command, /ai-pm-dev plan materialize/);
    assert.match(beforePlan.nextAction.command, /ai-pm-dev plan check --strict/);

    runCli(['plan', 'materialize', '--target', target], { input: validDevPlanInput() });

    const withUngatedPlan = readProjectState(target);
    assert.equal(withUngatedPlan.devPlanGate.overall, 'UNKNOWN');
    assert.equal(withUngatedPlan.artifacts.find((artifact) => artifact.id === 'dev-plan')?.status, 'filled');
    assert.doesNotMatch(withUngatedPlan.nextAction.command, /release-builder/);
    assert.doesNotMatch(withUngatedPlan.nextAction.command, /ship materialize/);

    runCli(['plan', 'check', '--strict', '--target', target]);

    const afterPlan = readProjectState(target);
    assert.equal(afterPlan.devPlanGate.overall, 'PASS');
    assert.equal(afterPlan.shipGate.overall, 'UNKNOWN');
    assert.equal(afterPlan.phases.find((phase) => phase.id === 'plan')?.status, 'done');
    assert.equal(afterPlan.artifacts.find((artifact) => artifact.id === 'dev-plan')?.status, 'filled');
    assert.equal(afterPlan.artifacts.find((artifact) => artifact.id === 'dev-plan-gate-report')?.status, 'filled');
    assert.match(afterPlan.artifacts.find((artifact) => artifact.id === 'dev-plan')?.preview || '', /Dev Plan: AI fitness logging tool/);
    assert.match(afterPlan.nextAction.command, /release-builder/);
    assert.match(afterPlan.nextAction.command, /ai-pm-dev ship materialize/);
    assert.match(afterPlan.nextAction.command, /ai-pm-dev ship check --strict/);

    const project = await handleApiRequest({
      method: 'GET',
      url: `/api/project?target=${encodeURIComponent(target)}`,
      body: '',
    });
    assert.equal(project.status, 200);
    assert.equal(project.body.devPlanGate.overall, 'PASS');
    assert.equal(project.body.artifacts.find((artifact) => artifact.id === 'dev-plan')?.status, 'filled');

    runCli(['ship', 'materialize', '--target', target], { input: validShipInput() });
    runCli(['ship', 'check', '--strict', '--target', target]);

    const afterShip = readProjectState(target);
    assert.equal(afterShip.shipGate.overall, 'PASS');
    assert.equal(afterShip.iterateGate.overall, 'UNKNOWN');
    assert.equal(afterShip.phases.find((phase) => phase.id === 'ship')?.status, 'done');
    assert.equal(afterShip.artifacts.find((artifact) => artifact.id === 'ship-check')?.status, 'filled');
    assert.equal(afterShip.artifacts.find((artifact) => artifact.id === 'ship-gate-report')?.status, 'filled');
    assert.match(afterShip.artifacts.find((artifact) => artifact.id === 'ship-check')?.preview || '', /Ship Check: AI fitness logging tool/);
    assert.equal(afterShip.nextAction.command, 'Ship complete');

    const shippedProject = await handleApiRequest({
      method: 'GET',
      url: `/api/project?target=${encodeURIComponent(target)}`,
      body: '',
    });
    assert.equal(shippedProject.status, 200);
    assert.equal(shippedProject.body.shipGate.overall, 'PASS');
    assert.equal(shippedProject.body.artifacts.find((artifact) => artifact.id === 'ship-check')?.status, 'filled');
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-next-action-'));
    tempRoots.push(target);
    runCli(['prd', '--target', target, '--type', 'consumer'], { input: consumerPrdInput() });
    runCli(['prd', 'check', '--target', target]);

    const state = readProjectState(target);
    assert.equal(state.qualityGate.overall, 'PASS');
    assert.equal(state.currentPhase?.id, 'plan');
    assert.equal(state.nextAction.command, 'dev-planner -> ai-pm-dev plan materialize -> ai-pm-dev plan check --strict');
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-warn-next-action-'));
    tempRoots.push(target);
    runCli(['prd', '--target', target, '--type', 'consumer'], { input: consumerWarnPrdInput() });
    runCli(['prd', 'check', '--target', target]);

    const state = readProjectState(target);
    assert.equal(state.qualityGate.overall, 'WARN');
    assert.equal(state.currentPhase?.id, 'plan');
    assert.equal(state.nextAction.command, `ai-pm-dev checkpoint "${state.currentPhase.id}"`);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-clarify-'));
    tempRoots.push(target);
    runCli(['init', target]);

    const previousKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = '';
    let clarify;
    try {
      clarify = await handleApiRequest({
        method: 'POST',
        url: '/api/prd/clarify',
        body: JSON.stringify({
          target,
          idea: 'AI meeting notes assistant',
          userInput: 'AI meeting notes assistant',
        }),
      });
    } finally {
      if (previousKey === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      } else {
        process.env.ANTHROPIC_API_KEY = previousKey;
      }
    }

    assert.equal(clarify.status, 200);
    assert.equal(clarify.body.clarification.status, 'degraded');
    assert.match(clarify.body.clarification.reason, /ANTHROPIC_API_KEY/);
    assert.equal(existsSync(clarify.body.clarification.sessionPath), true);
    assert.equal(existsSync(clarify.body.clarification.callsPath), true);
    assert.equal(clarify.body.project.latestSession.idea, 'AI meeting notes assistant');
    const calls = readFileSync(clarify.body.clarification.callsPath, 'utf8');
    assert.match(calls, /ANTHROPIC_API_KEY is not set/);
  }
} finally {
  for (const dir of tempRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
}
