import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = join(repoRoot, 'bin', 'ai-pm-dev.mjs');

function runCli(args, options = {}) {
  return execFileSync('node', [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: options.input ?? '',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      AI_PM_DEV_FIXED_TIME: '2026-06-09T10:00:00.000Z',
      ...options.env,
    },
  });
}

const tempRoots = [];

try {
  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-prd-'));
    tempRoots.push(target);

    const answers = [
      'AI fitness logging tool',
      'Fitness beginners who train three times per week',
      'They cannot tell whether their training is improving',
      'They use scattered notes and screenshots',
      'Log workout, review progress, receive AI summary',
      'MVP includes workout logging, progress trend, AI weekly summary; excludes social features',
      'Workout sets, reps, weight, RPE, session notes',
      'Volume, completion rate, and progress trend must be deterministic',
      'AI summarizes patterns and suggests next focus only',
      'Every AI summary must show the workouts and metrics it used',
      'Avoid medical advice and protect private health data',
      'A beginner can log a workout and understand weekly progress within five minutes',
    ].join('\n');

    const output = runCli(['prd', '--target', target], { input: `${answers}\n` });
    const sessionRoot = join(target, '.ai-pm-dev', 'prd-sessions');
    const sessionPath = join(sessionRoot, '2026-06-09-100000-ai-fitness-logging-tool');

    assert.match(output, /Interactive PRD session complete/);
    assert.equal(existsSync(sessionPath), true);
    assert.equal(existsSync(join(sessionPath, 'answers.json')), true);
    assert.equal(existsSync(join(sessionPath, 'ai-prd.md')), true);
    assert.equal(existsSync(join(sessionPath, 'prototype-brief.md')), true);
    assert.equal(existsSync(join(sessionPath, 'handoff-codex.md')), true);
    assert.equal(existsSync(join(sessionPath, 'handoff-v0.md')), true);
    assert.equal(existsSync(join(sessionPath, 'handoff-figma.md')), true);
    assert.equal(existsSync(join(target, 'memory', 'current-ai-prd.md')), true);

    // prd fills the project operating-layer docs.
    const brief = readFileSync(join(target, 'docs', 'PROJECT_BRIEF.md'), 'utf8');
    assert.match(brief, /AI fitness logging tool/);
    assert.doesNotMatch(brief, /\*\*Status:\*\* TODO/);
    assert.match(output, /Project docs updated/);
    assert.equal(existsSync(join(target, 'docs', 'acceptance-tests.md')), true);
    const decisionLog = readFileSync(join(target, 'docs', 'decision-log.md'), 'utf8');
    assert.match(decisionLog, /MVP scope set from PRD interview/);

    const answersJson = JSON.parse(readFileSync(join(sessionPath, 'answers.json'), 'utf8'));
    assert.equal(answersJson.idea, 'AI fitness logging tool');
    assert.equal(answersJson.deterministicRules, 'Volume, completion rate, and progress trend must be deterministic');

    const prd = readFileSync(join(sessionPath, 'ai-prd.md'), 'utf8');
    assert.match(prd, /# AI-PRD: AI fitness logging tool/);
    assert.match(prd, /## AI Usage Boundaries/);
    assert.match(prd, /Every AI summary must show the workouts and metrics it used/);

    const codexPrompt = runCli(['prd', 'handoff', '--to', 'codex', '--target', target]);
    assert.match(codexPrompt, /Codex Implementation Handoff/);
    assert.match(codexPrompt, /AI fitness logging tool/);

    const status = runCli(['prd', 'status', '--target', target]);
    assert.match(status, /Latest PRD Session/);
    assert.match(status, /ai-fitness-logging-tool/);
  }

  {
    // Non-latin idea + many blanks: session name stays clean, blanks seed open-questions.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-prd-zh-'));
    tempRoots.push(target);

    const answers = [
      '我要做一个有趣的约会计划小程序 yes no next',
      '年轻人',
      '快速得到双方满意的约会计划',
    ].join('\n');

    runCli(['prd', '--target', target], { input: `${answers}\n` });

    const sessionPath = join(target, '.ai-pm-dev', 'prd-sessions', '2026-06-09-100000-session');
    assert.equal(existsSync(sessionPath), true, 'non-latin idea should produce a clean session name');

    const openQuestions = readFileSync(join(target, 'docs', 'open-questions.md'), 'utf8');
    assert.match(openQuestions, /Left blank in PRD interview/);
  }

  {
    // prd check produces a quality report and an overall verdict.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-check-'));
    tempRoots.push(target);

    const answers = [
      'AI fitness logging tool',
      'Fitness beginners',
      'They cannot tell whether training improves',
      'Scattered notes',
      'Log, review, summary',
      'MVP: logging and trend; excludes social',
      'Sets, reps, weight',
      'Volume must be deterministic',
      'AI only summarizes',
      'Show the workouts used',
      'Protect health data',
      'A beginner understands weekly progress within five minutes',
    ].join('\n');
    runCli(['prd', '--target', target], { input: `${answers}\n` });

    const checkOutput = runCli(['prd', 'check', '--target', target]);
    assert.match(checkOutput, /PRD Quality Check/);
    assert.match(checkOutput, /Overall: PASS/);
    const sessionRoot = join(target, '.ai-pm-dev', 'prd-sessions');
    const sessionName = readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8');
    assert.match(sessionName, /ai-fitness-logging-tool/);
    assert.match(checkOutput, /Report:/);
  }

  {
    // --type consumer skips AI-specific questions; missing AI boundary becomes a warning.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-type-'));
    tempRoots.push(target);

    const answers = [
      'A playful dating plan mini-app',
      'Young people who want to date',
      'Quickly agree on a fun date plan',
      'Chatting on WeChat',
      'Pick date, time, food, activity',
      'Whole flow must work; polish later',
      'No backend; can bind to phone calendar',
      'Keep it lighthearted; avoid pressuring users',
      'Within three minutes two people get a plan',
    ].join('\n');
    const output = runCli(['prd', '--target', target, '--type', 'consumer'], { input: `${answers}\n` });
    assert.match(output, /Interactive PRD session complete/);

    const checkOutput = runCli(['prd', 'check', '--target', target]);
    assert.match(checkOutput, /WARN AI boundary declared/);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
