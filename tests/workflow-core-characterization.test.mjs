import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { docStatus } from '../apps/web/server/project-state.mjs';

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
    const scope = readFileSync(join(target, 'docs', 'scope.md'), 'utf8');
    assert.match(scope, /- Log weight, steps and sleep/);
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
} finally {
  for (const dir of tempRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
}
