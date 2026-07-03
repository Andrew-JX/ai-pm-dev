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
      AI_PM_DEV_FIXED_TIME: options.fixedTime || '2026-06-09T10:00:00.000Z',
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
        plannedFiles: ['src/app.ts'],
        verification: 'npm test and manual workout logging smoke',
        humanDecisions: [],
        docsUpdates: [],
        risks: [],
      },
      {
        id: 'slice-2',
        title: 'Progress trend and weekly summary',
        mappedMustHaves: ['progress trend', 'weekly summary'],
        provesOneThing: 'Workout logging remains the anchor',
        summary: 'Add the remaining must-haves.',
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
        evidence: 'All tests passed.',
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
    rollback: 'Revert the release commit.',
    openBlockers: [],
    docsUpdates: ['docs/release-checklist.md'],
  })}\n`;
}

function validIterate(overrides = {}) {
  return `${JSON.stringify({
    triage: [
      {
        feedbackId: 'fb-0001',
        disposition: 'candidate',
        reason: 'Users want this after trying the shipped flow.',
      },
    ],
    mustHaveCandidates: [
      {
        text: 'Export weekly progress as CSV',
        sourceFeedbackId: 'fb-0001',
        rationale: 'Repeated post-ship request.',
      },
    ],
    carriedNonGoals: ['No social features in v1', 'no medical advice'],
    promotedNonGoals: [],
    seed: {
      idea: 'AI fitness logging tool next iteration',
    },
    ...overrides,
  })}\n`;
}

function prepareShippedTarget(prefix) {
  const target = mkdtempSync(join(tmpdir(), prefix));
  runCli(['prd', '--target', target], { input: prdInput() });
  const sessionPath = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
  runCli(['plan', 'materialize', '--target', target], { input: validPlanInput() });
  runCli(['plan', 'check', '--strict', '--target', target]);
  runCli(['ship', 'materialize', '--target', target], { input: validShipInput() });
  runCli(['ship', 'check', '--strict', '--target', target]);
  return { target, sessionPath };
}

function readFeedbackLog(target) {
  return JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'feedback', 'product-feedback.json'), 'utf8'));
}

const tempRoots = [];

try {
  {
    const { target, sessionPath } = prepareShippedTarget('ai-pm-dev-iterate-happy-');
    tempRoots.push(target);

    const feedbackOutput = runCli(['feedback', 'add', 'Users asked for CSV export after weekly review', '--source', 'support ticket', '--kind', 'request', '--target', target]);
    assert.match(feedbackOutput, /Captured product feedback/);
    const feedbackLog = readFeedbackLog(target);
    assert.equal(feedbackLog.feedback[0].id, 'fb-0001');
    assert.equal(feedbackLog.feedback[0].status, 'open');
    assert.equal(feedbackLog.feedback[0].shipSessionPath, sessionPath);

    const materialize = runCli(['iterate', 'materialize', '--target', target], { input: validIterate() });
    assert.match(materialize, /Iterate packet materialized/);
    assert.match(materialize, /Triaged open feedback marked dispositioned/);
    assert.equal(existsSync(join(sessionPath, 'iterate.json')), true);
    assert.equal(existsSync(join(sessionPath, 'iterate.md')), true);
    assert.equal(existsSync(join(target, '.ai-pm-dev', 'feedback', 'iterate-seed.json')), true);

    const updatedLog = readFeedbackLog(target);
    assert.equal(updatedLog.feedback[0].status, 'dispositioned');
    assert.equal(updatedLog.feedback[0].disposition, 'candidate');
    assert.equal(updatedLog.feedback[0].dispositionedByIteratePath, join(sessionPath, 'iterate.json'));

    const check = runCli(['iterate', 'check', '--strict', '--target', target]);
    assert.match(check, /Iterate Quality Check \(strict\)/);
    assert.match(check, /Overall: PASS/);

    const seed = JSON.parse(runCli(['iterate', 'seed', '--target', target]));
    assert.equal(seed.mvpScope, 'Export weekly progress as CSV');
    assert.equal(seed.oneThing, 'Export weekly progress as CSV');
    assert.equal(seed.nonGoals, 'No social features in v1; no medical advice');
    const prdOutput = runCli(['prd', '--json', '--target', target], { input: JSON.stringify(seed) });
    assert.match(prdOutput, /Interactive PRD session complete/);
  }

  {
    const { target } = prepareShippedTarget('ai-pm-dev-iterate-rounds-');
    tempRoots.push(target);
    runCli(['feedback', 'add', 'Users asked for CSV export', '--source', 'support', '--target', target]);
    runCli(['iterate', 'materialize', '--target', target], { input: validIterate() });
    runCli(['iterate', 'check', '--strict', '--target', target]);
    runCli(['feedback', 'add', 'Users want a printable weekly summary', '--source', 'interview', '--target', target], {
      fixedTime: '2026-06-10T10:00:00.000Z',
    });

    const secondRound = {
      triage: [
        {
          feedbackId: 'fb-0002',
          disposition: 'candidate',
          reason: 'New open feedback after round one.',
        },
      ],
      mustHaveCandidates: [
        {
          text: 'Printable weekly summary',
          sourceFeedbackId: 'fb-0002',
          rationale: 'New post-ship user request.',
        },
      ],
      carriedNonGoals: ['No social features in v1', 'no medical advice'],
      promotedNonGoals: [],
    };
    runCli(['iterate', 'materialize', '--target', target], { input: `${JSON.stringify(secondRound)}\n` });
    const check = runCli(['iterate', 'check', '--strict', '--target', target]);
    assert.match(check, /Overall: PASS/);
    const state = JSON.parse(readFileSync(join(JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath, 'iterate.json'), 'utf8'));
    assert.deepEqual(state.openFeedbackIdsAtMaterialize, ['fb-0002']);
  }

  {
    const { target } = prepareShippedTarget('ai-pm-dev-iterate-missing-triage-');
    tempRoots.push(target);
    runCli(['feedback', 'add', 'Users asked for CSV export', '--source', 'support', '--target', target]);
    runCli(['iterate', 'materialize', '--target', target], {
      input: validIterate({
        triage: [],
        mustHaveCandidates: [
          {
            text: 'Export weekly progress as CSV',
            exploration: true,
            rationale: 'Exploratory candidate.',
          },
        ],
      }),
    });

    let failed = false;
    let stdout = '';
    try {
      runCli(['iterate', 'check', '--strict', '--target', target]);
    } catch (error) {
      failed = true;
      stdout = error.stdout || '';
    }
    assert.equal(failed, true);
    assert.match(stdout, /FAIL Every open feedback item is triaged exactly once/);
    assert.equal(readFeedbackLog(target).feedback[0].status, 'open');
  }

  {
    const { target } = prepareShippedTarget('ai-pm-dev-iterate-gates-');
    tempRoots.push(target);
    runCli(['feedback', 'add', 'Users asked for CSV export', '--source', 'support', '--target', target]);

    const cases = [
      {
        input: validIterate({
          mustHaveCandidates: [{ text: 'Untraced candidate', rationale: 'No source.' }],
        }),
        expected: /FAIL Each next must-have candidate is traceable/,
      },
      {
        input: validIterate({ carriedNonGoals: ['No social features in v1'] }),
        expected: /FAIL Previous non-goals carry forward/,
      },
      {
        input: validIterate({
          carriedNonGoals: ['No social features in v1'],
          promotedNonGoals: [{ nonGoal: 'no medical advice', feedbackId: '', rationale: '' }],
        }),
        expected: /FAIL Promoted non-goals are backed by triaged feedback/,
      },
      {
        input: validIterate({
          mustHaveCandidates: [
            { text: 'A', sourceFeedbackId: 'fb-0001', rationale: 'r' },
            { text: 'B', sourceFeedbackId: 'fb-0001', rationale: 'r' },
            { text: 'C', sourceFeedbackId: 'fb-0001', rationale: 'r' },
            { text: 'D', sourceFeedbackId: 'fb-0001', rationale: 'r' },
          ],
        }),
        expected: /FAIL Next must-have candidates stay prioritized/,
      },
    ];

    for (const item of cases) {
      runCli(['iterate', 'materialize', '--target', target], { input: item.input });
      let failed = false;
      let stdout = '';
      try {
        runCli(['iterate', 'check', '--strict', '--target', target]);
      } catch (error) {
        failed = true;
        stdout = error.stdout || '';
      }
      assert.equal(failed, true);
      assert.match(stdout, item.expected);
    }
  }

  {
    const { target } = prepareShippedTarget('ai-pm-dev-iterate-derived-seed-');
    tempRoots.push(target);
    runCli(['feedback', 'add', 'Users asked for CSV export', '--source', 'support', '--target', target]);
    const raw = JSON.parse(validIterate());
    raw.nextPrdSeed = {
      mvpScope: 'Host supplied mismatch',
      nonGoals: 'Host supplied mismatch',
    };
    runCli(['iterate', 'materialize', '--target', target], { input: `${JSON.stringify(raw)}\n` });
    const seed = JSON.parse(runCli(['iterate', 'seed', '--target', target]));
    assert.equal(seed.mvpScope, 'Export weekly progress as CSV');
    assert.equal(seed.nonGoals, 'No social features in v1; no medical advice');

    let failed = false;
    let stderr = '';
    raw.seed = { mvpScope: 'Host cannot supply this' };
    try {
      runCli(['iterate', 'materialize', '--target', target], { input: `${JSON.stringify(raw)}\n` });
    } catch (error) {
      failed = true;
      stderr = error.stderr || '';
    }
    assert.equal(failed, true);
    assert.match(stderr, /Seed field\(s\) cannot be supplied by the host: mvpScope/);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
