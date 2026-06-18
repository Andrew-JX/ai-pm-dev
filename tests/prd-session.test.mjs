import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
      'Workout logging, progress trend, weekly summary',
      'Workout logging',
      'No social features in v1',
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
    assert.match(prd, /## Non-Goals \(explicitly not doing\)/);
    assert.match(prd, /Every AI summary must show the workouts and metrics it used/);

    // Forcing artifacts: scope.md in the session and in docs/.
    assert.equal(existsSync(join(sessionPath, 'scope.md')), true);
    const scope = readFileSync(join(target, 'docs', 'scope.md'), 'utf8');
    assert.match(scope, /## The one thing/);
    assert.match(scope, /Workout logging/);

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
      'Logging, trend, summary',
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

    // prd auto-records a checkpoint in the session timeline.
    const timeline = runCli(['timeline', '--target', target]);
    assert.match(timeline, /prd/);

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
      'Date picker, food picker, activity picker',
      'Generate a shareable date plan',
      'No accounts or backend in v1',
      'No backend; can bind to phone calendar',
      'Keep it lighthearted; avoid pressuring users',
      'Within three minutes two people get a plan',
    ].join('\n');
    const output = runCli(['prd', '--target', target, '--type', 'consumer'], { input: `${answers}\n` });
    assert.match(output, /Interactive PRD session complete/);

    const checkOutput = runCli(['prd', 'check', '--target', target]);
    assert.match(checkOutput, /WARN AI boundary declared/);
  }

  {
    // prd check --strict fails (exit 1) when prioritization is missing.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-strict-'));
    tempRoots.push(target);
    runCli(['prd', '--target', target], { input: 'A small tool\nSome users\nA real pain\n' });

    let failed = false;
    let out = '';
    try {
      runCli(['prd', 'check', '--strict', '--target', target]);
    } catch (error) {
      failed = true;
      out = error.stdout || '';
    }
    assert.equal(failed, true, 'strict check should exit non-zero when required checks fail');
    assert.match(out, /FAIL Non-goals declared/);
    assert.match(out, /FAIL The one thing chosen/);
    assert.equal(existsSync(join(target, 'docs', 'scope.md')), true);
  }

  {
    // --quick asks only who/what/why and hands the rest to the LLM PM challenge.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-quick-'));
    tempRoots.push(target);

    const output = runCli(['prd', '--target', target, '--quick'], {
      input: 'A small tool\nKnowledge workers\nManual work is slow\n',
    });
    assert.match(output, /3\. What is the sharpest user pain/);
    assert.doesNotMatch(output, /\n4\. /);
    assert.match(output, /Quick mode: this PRD is intentionally thin/);

    const openQuestions = readFileSync(join(target, 'docs', 'open-questions.md'), 'utf8');
    assert.match(openQuestions, /Non-goals:/);
    assert.match(openQuestions, /The one thing:/);
  }

  {
    // --from-note pre-fills the idea from a file and saves the raw note.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-note-'));
    tempRoots.push(target);
    const notePath = join(target, 'idea.md');
    writeFileSync(notePath, '# Floating prompt assistant\n\nA desktop helper that turns selected text into a refined prompt.\n', 'utf8');

    const remaining = ['Knowledge workers', 'Rewriting prompts by hand is slow'].join('\n');
    const output = runCli(['prd', '--target', target, '--from-note', notePath], { input: `${remaining}\n` });
    assert.match(output, /Idea \(from note\): Floating prompt assistant/);

    const session = readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8');
    assert.match(session, /floating-prompt-assistant/);

    const sessionDir = JSON.parse(session).prdSessionPath;
    assert.equal(existsSync(join(sessionDir, 'source-note.md')), true);
    const answers = JSON.parse(readFileSync(join(sessionDir, 'answers.json'), 'utf8'));
    assert.equal(answers.idea, 'Floating prompt assistant');
    assert.equal(answers.targetUsers, 'Knowledge workers');
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
