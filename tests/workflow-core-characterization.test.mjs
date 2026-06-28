import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { docStatus, readProjectState } from '../apps/web/server/project-state.mjs';
import { buildBuildHandoff, buildDevPlanMarkdown, validateDevPlanStructure } from '../workflow-core/dev-plan.mjs';
import { evaluateDevPlan, evaluatePrd, scoreChecks } from '../workflow-core/prd-gates.mjs';

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

try {
  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-core-type-'));
    tempRoots.push(target);
    const answers = [
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
    ].join('\n');

    const output = runCli(['prd', '--target', target, '--type', 'consumer'], { input: `${answers}\n` });
    assert.match(output, /11\. One measurable signal/);
    assert.doesNotMatch(output, /What should AI do/);
    const session = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    const answersJson = JSON.parse(readFileSync(join(session, 'answers.json'), 'utf8'));
    assert.equal(answersJson.aiBoundaries, '');
    assert.equal(answersJson.deterministicRules, '');
    assert.equal(answersJson.trustMechanism, '');
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-core-gate-'));
    tempRoots.push(target);
    const answers = [
      'AI fitness logging tool',
      'Fitness beginners',
      'They cannot tell whether training improves',
      'Scattered notes',
      'Log workout, review progress, receive AI summary',
      'Log weight, steps and sleep; weekly summary; reminders',
      'Workout logging',
      'No social features in v1',
      'Sets, reps, weight',
      'Volume must be deterministic',
      'AI only summarizes',
      'Show the workouts used',
      'Protect health data',
      'A beginner understands weekly progress within five minutes',
    ].join('\n');
    runCli(['prd', '--target', target], { input: `${answers}\n` });

    const checkOutput = runCli(['prd', 'check', '--target', target]);
    assert.match(checkOutput, /Overall: PASS \(required 15\/15, recommended 6\/6\)/);
    assert.match(checkOutput, /PASS Product idea present/);
    assert.match(checkOutput, /PASS Must-haves prioritized \(<=3\)/);
    assert.match(checkOutput, /PASS Handoffs carry non-goals/);

    const session = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    const report = readFileSync(join(session, 'quality-report.md'), 'utf8');
    assert.match(report, /Overall: PASS \(required 15\/15, recommended 6\/6\)/);
    assert.match(report, /\| PASS \| required \| Project scope matches latest PRD \|  \|/);
    assert.equal(existsSync(join(session, 'quality-report.json')), true);
    const scope = readFileSync(join(target, 'docs', 'scope.md'), 'utf8');
    assert.match(scope, /- Log weight, steps and sleep/);

    rmSync(join(session, 'quality-report.json'), { force: true });
    assert.equal(readProjectState(target).qualityGate.overall, 'UNKNOWN');
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-core-stub-'));
    tempRoots.push(target);
    runCli(['init', target]);
    const briefPath = join(target, 'docs', 'PROJECT_BRIEF.md');
    assert.equal(docStatus(briefPath), 'stub');
    writeFileSync(briefPath, '# Project Brief\n\nActual content.\n', 'utf8');
    assert.equal(docStatus(briefPath), 'filled');
    assert.equal(docStatus(join(target, 'docs', 'missing.md')), 'missing');
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-bad-json-'));
    tempRoots.push(target);
    let failed = false;
    let stderr = '';
    try {
      runCli(['prd', '--target', target, '--quick'], { input: '{"idea":' });
    } catch (error) {
      failed = true;
      stderr = error.stderr || '';
    }
    assert.equal(failed, true, 'bad quick PRD JSON should fail cleanly');
    assert.match(stderr, /Invalid JSON stdin for quick PRD input/);
    assert.doesNotMatch(stderr, /SyntaxError/);
  }

  {
    const target = join(tmpdir(), 'ai-pm-dev-core-spy-project');
    const sessionPath = join(target, '.ai-pm-dev', 'prd-sessions', '2026-06-09-100000-spy');
    const accessed = [];
    const expected = [
      join(target, 'docs', 'scope.md'),
      join(target, 'docs', 'acceptance-tests.md'),
      join(sessionPath, 'handoff-codex.md'),
      join(sessionPath, 'handoff-v0.md'),
      join(sessionPath, 'handoff-figma.md'),
    ];
    const answers = {
      idea: 'Spy project',
      targetUsers: 'Users',
      painPoints: 'Pain',
      coreWorkflow: 'Start to finish',
      mvpScope: 'One thing',
      oneThing: 'One thing',
      nonGoals: 'No extras',
      dataModel: 'Data',
      deterministicRules: 'Rules',
      aiBoundaries: 'AI summarizes',
      risks: 'Risks',
      acceptanceCriteria: 'Within five minutes',
    };
    evaluatePrd(answers, {
      sessionPath,
      exists(path) {
        accessed.push(path);
        return true;
      },
      readFile(path) {
        accessed.push(path);
        if (path.endsWith('scope.md')) return 'One thing\nNo extras\nWithin five minutes';
        if (path.endsWith('acceptance-tests.md')) return 'Within five minutes\nStart to finish';
        return 'ai-prd.md scope.md acceptance-tests.md No extras';
      },
    });
    for (const path of expected) {
      assert.ok(accessed.includes(path), `expected evaluatePrd to access ${path}`);
    }
  }

  {
    const answers = {
      idea: 'AI fitness logging tool',
      targetUsers: 'Fitness beginners',
      painPoints: 'They cannot tell whether training improves',
      coreWorkflow: 'Log workout, review progress, receive AI summary',
      mvpScope: 'Workout logging; weekly summary; progress trend',
      oneThing: 'Workout logging',
      nonGoals: 'No social features; no medical advice',
      acceptanceCriteria: 'A beginner understands weekly progress within five minutes',
    };
    const rawPlan = {
      goal: 'Build the MVP slice for AI fitness logging',
      constraints: ['Keep AI inside summaries'],
      currentState: ['PRD complete'],
      technicalApproach: 'Use the existing app shell and deterministic workout calculations.',
      slices: [
        {
          id: 'slice-1',
          title: 'Workout logging first',
          mappedMustHaves: ['Ship workout logging with enough shape to support progress'],
          provesOneThing: 'Workout logging is usable end to end',
          summary: 'Create the first entry-to-value path.',
          plannedFiles: ['src/app.ts', 'src/workouts.ts'],
          verification: 'npm test and manual log-workout smoke',
          humanDecisions: ['Confirm data fields'],
          docsUpdates: ['docs/dev-plan.md'],
          risks: ['Health data privacy'],
        },
        {
          id: 'slice-2',
          title: 'Summary and trend',
          mappedMustHaves: ['weekly summary', 'progress trend'],
          provesOneThing: 'Workout logging remains the first proof point',
          summary: 'Add the two remaining must-haves after logging works.',
          plannedFiles: ['src/summary.ts'],
          verification: 'npm test summary',
          humanDecisions: [],
          docsUpdates: [],
          risks: [],
        },
      ],
      excludedNonGoals: ['No social features in v1', 'No medical advice from AI'],
      openQuestions: [],
    };
    const validation = validateDevPlanStructure(rawPlan);
    assert.equal(validation.ok, true);
    const plan = {
      ...validation.plan,
      prdSessionPath: 'C:\\project\\.ai-pm-dev\\prd-sessions\\latest',
      idea: answers.idea,
      oneThing: answers.oneThing,
      mustHaves: ['Workout logging', 'weekly summary', 'progress trend'],
      nonGoals: ['No social features', 'no medical advice'],
      acceptanceCriteria: answers.acceptanceCriteria,
    };
    const checks = evaluateDevPlan(plan, {
      answers,
      sessionPath: plan.prdSessionPath,
      latestSessionPath: plan.prdSessionPath,
      exists() {
        return true;
      },
      readFile(path) {
        if (path.endsWith('handoff-build.md')) {
          return 'Read ai-prd.md, scope.md, acceptance-tests.md, and dev-plan.md first.';
        }
        return 'dev plan content';
      },
    });
    assert.equal(scoreChecks(checks).overall, 'PASS');
    assert.match(buildDevPlanMarkdown(plan), /# Dev Plan: AI fitness logging tool/);
    assert.match(buildBuildHandoff(plan), /Read `ai-prd.md`, `scope.md`, `acceptance-tests.md`, and `dev-plan.md` first/);
  }

  {
    const invalid = validateDevPlanStructure({ goal: 'Broken', slices: [] });
    assert.equal(invalid.ok, false);
    assert.match(invalid.errors.join('\n'), /slices/);
    assert.match(invalid.errors.join('\n'), /constraints/);
  }

  {
    const answers = {
      mvpScope: 'Workout logging; weekly summary',
      oneThing: 'Workout logging',
      nonGoals: 'No social features',
    };
    const basePlan = validateDevPlanStructure({
      goal: 'Build',
      constraints: [],
      currentState: [],
      technicalApproach: '',
      slices: [{
        id: 'slice-1',
        title: 'Too broad',
        mappedMustHaves: ['Workout logging'],
        provesOneThing: '',
        summary: '',
        plannedFiles: ['a', 'b', 'c', 'd', 'e', 'f'],
        verification: '',
        humanDecisions: [],
        docsUpdates: [],
        risks: [],
      }],
      excludedNonGoals: [],
      openQuestions: [],
    }).plan;
    const checks = evaluateDevPlan(basePlan, {
      answers,
      sessionPath: 'latest',
      latestSessionPath: 'latest',
      exists() {
        return false;
      },
      readFile() {
        return '';
      },
    });
    const failures = checks.filter((check) => !check.pass).map((check) => check.name);
    assert.ok(failures.includes('First slice proves the one thing'));
    assert.ok(failures.includes('Every PRD must-have maps to a slice'));
    assert.ok(failures.includes('PRD non-goals stay excluded'));
    assert.ok(failures.includes('Every slice has verification'));
    assert.ok(failures.includes('Slices stay reviewable'));
  }
} finally {
  for (const dir of tempRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
}
