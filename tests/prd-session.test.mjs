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
    assert.equal(existsSync(join(sessionPath, 'follow-up-questions.md')), true);
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
    const followUps = readFileSync(join(sessionPath, 'follow-up-questions.md'), 'utf8');
    assert.match(followUps, /No LLM API was called/);

    const codexPrompt = runCli(['prd', 'handoff', '--to', 'codex', '--target', target]);
    assert.match(codexPrompt, /Codex Implementation Handoff/);
    assert.match(codexPrompt, /AI fitness logging tool/);
    assert.match(codexPrompt, /scope\.md/);
    assert.match(codexPrompt, /acceptance-tests\.md/);
    assert.match(codexPrompt, /No social features in v1/);

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
    assert.match(checkOutput, /PASS Project scope matches latest PRD/);
    assert.match(checkOutput, /PASS Acceptance tests cover latest PRD/);
    assert.match(checkOutput, /PASS Handoffs reference PRD gates/);
    const sessionRoot = join(target, '.ai-pm-dev', 'prd-sessions');
    const sessionName = readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8');
    assert.match(sessionName, /ai-fitness-logging-tool/);
    assert.match(checkOutput, /Report:/);

    const dashboardOutput = runCli(['dashboard', '--target', target]);
    assert.match(dashboardOutput, /Dashboard written/);
    const dashboard = readFileSync(join(target, '.ai-pm-dev', 'dashboard.html'), 'utf8');
    assert.match(dashboard, /AI fitness logging tool/);
    assert.match(dashboard, /Gate: <span class="pass">PASS/);
    assert.match(dashboard, /Workout logging/);
  }

  {
    // prd check --strict fails when project docs drift away from the latest PRD.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-drift-'));
    tempRoots.push(target);

    const answers = [
      'AI fitness logging tool',
      'Fitness beginners',
      'They cannot tell whether training improves',
      'Scattered notes',
      'Log workout, review progress, receive AI summary',
      'Workout logging, progress trend, weekly summary',
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
    writeFileSync(join(target, 'docs', 'scope.md'), '# Scope\n\nA stale scope for something else.\n', 'utf8');
    writeFileSync(join(target, 'docs', 'acceptance-tests.md'), '# Acceptance Tests\n\nA stale test plan.\n', 'utf8');

    let failed = false;
    let out = '';
    try {
      runCli(['prd', 'check', '--strict', '--target', target]);
    } catch (error) {
      failed = true;
      out = error.stdout || '';
    }
    assert.equal(failed, true, 'strict check should fail when docs drift from the latest PRD');
    assert.match(out, /FAIL Project scope matches latest PRD/);
    assert.match(out, /FAIL Acceptance tests cover latest PRD/);
  }

  {
    // --type consumer skips AI-specific questions and records them as not applicable.
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

    const session = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    const answersJson = JSON.parse(readFileSync(join(session, 'answers.json'), 'utf8'));
    assert.equal(answersJson.deterministicRules, 'Not applicable (non-AI product type).');
    assert.equal(answersJson.aiBoundaries, 'Not applicable (non-AI product type).');
    assert.equal(answersJson.trustMechanism, 'Not applicable (non-AI product type).');
    const prd = readFileSync(join(session, 'ai-prd.md'), 'utf8');
    assert.match(prd, /## AI Usage Boundaries/);
    assert.match(prd, /Not applicable \(non-AI product type\)\./);

    const checkOutput = runCli(['prd', 'check', '--target', target]);
    assert.doesNotMatch(checkOutput, /WARN AI boundary declared/);
    assert.doesNotMatch(checkOutput, /WARN Deterministic rules declared/);
    assert.match(checkOutput, /PASS AI boundary declared/);
    assert.match(checkOutput, /PASS Deterministic rules declared/);
  }

  {
    // --type ai-tool keeps AI-specific questions active; blanks stay blank.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-ai-type-'));
    tempRoots.push(target);
    const answers = [
      'AI fitness logging tool',
      'Fitness beginners',
      'They cannot tell whether training improves',
      'Scattered notes',
      'Log workout, review progress, receive AI summary',
      'Workout logging; progress trend; weekly summary',
      'Workout logging',
      'No social features in v1',
      'Workout sets, reps, weight',
      '',
      '',
      '',
      'Protect health data',
      'A beginner understands weekly progress within five minutes',
    ].join('\n');

    const output = runCli(['prd', '--target', target, '--type', 'ai-tool'], { input: `${answers}\n` });
    assert.match(output, /10\. Which calculations or decisions must be deterministic/);
    assert.match(output, /11\. What should AI do/);
    const session = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    const answersJson = JSON.parse(readFileSync(join(session, 'answers.json'), 'utf8'));
    assert.equal(answersJson.deterministicRules, '');
    assert.equal(answersJson.aiBoundaries, '');
    assert.equal(answersJson.trustMechanism, '');

    const checkOutput = runCli(['prd', 'check', '--target', target]);
    assert.match(checkOutput, /WARN AI boundary declared/);
    assert.match(checkOutput, /WARN Deterministic rules declared/);
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
    assert.match(openQuestions, /List exactly 1-3 v1 must-haves/);

    const sessionDir = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    const followUps = readFileSync(join(sessionDir, 'follow-up-questions.md'), 'utf8');
    assert.match(followUps, /Adaptive Follow-up Questions/);
    assert.match(followUps, /List exactly 1-3 v1 must-haves/);
    assert.match(followUps, /If only one feature shipped this week/);
  }

  {
    // --json accepts full keyed PRD input and fills missing canonical fields.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-json-'));
    tempRoots.push(target);

    const input = JSON.stringify({
      idea: 'AI fitness logging tool',
      targetUsers: 'Fitness beginners',
      painPoints: 'They cannot tell whether training improves',
      coreWorkflow: 'Log workout, review progress, receive AI summary',
      mvpScope: 'Workout logging; progress trend; weekly summary',
      oneThing: 'Workout logging',
      nonGoals: 'No social features in v1',
      dataModel: 'Workout sets, reps, weight',
      deterministicRules: 'Volume must be deterministic',
      aiBoundaries: 'AI only summarizes',
      trustMechanism: 'Show the workouts used',
      risks: 'Protect health data',
      acceptanceCriteria: 'A beginner understands weekly progress within five minutes',
    });

    const output = runCli(['prd', '--target', target, '--json'], { input });
    assert.match(output, /Interactive PRD session complete/);
    const session = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    const answers = JSON.parse(readFileSync(join(session, 'answers.json'), 'utf8'));
    assert.equal(answers.idea, 'AI fitness logging tool');
    assert.equal(answers.currentWorkaround, '');
    assert.equal(answers.aiBoundaries, 'AI only summarizes');

    const checkOutput = runCli(['prd', 'check', '--target', target]);
    assert.match(checkOutput, /Overall: PASS/);
  }

  {
    // Full JSON mode fails loud on malformed JSON and unknown fields.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-json-bad-'));
    tempRoots.push(target);

    let failed = false;
    let stderr = '';
    try {
      runCli(['prd', '--target', target, '--json'], { input: '{"idea":' });
    } catch (error) {
      failed = true;
      stderr = error.stderr || '';
    }
    assert.equal(failed, true, 'bad full PRD JSON should fail cleanly');
    assert.match(stderr, /Invalid JSON stdin for full PRD input/);

    failed = false;
    stderr = '';
    try {
      runCli(['prd', '--target', target, '--json'], { input: '{"idea":"Tool","extra":"nope"}' });
    } catch (error) {
      failed = true;
      stderr = error.stderr || '';
    }
    assert.equal(failed, true, 'unknown full PRD JSON keys should fail cleanly');
    assert.match(stderr, /Unknown PRD JSON field\(s\): extra/);

    failed = false;
    stderr = '';
    try {
      runCli(['prd', '--target', target, '--json'], { input: '{"idea":["Tool"]}' });
    } catch (error) {
      failed = true;
      stderr = error.stderr || '';
    }
    assert.equal(failed, true, 'array full PRD JSON values should fail cleanly');
    assert.match(stderr, /PRD JSON field "idea" must be a scalar value/);
  }

  {
    // Non-json line mode keeps treating JSON-looking text as the first line answer.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-line-json-looking-'));
    tempRoots.push(target);
    const answers = [
      '{"idea":"Literal JSON-looking idea"}',
      'Users',
      'Pain',
    ].join('\n');

    runCli(['prd', '--target', target], { input: `${answers}\n` });
    const session = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    const answersJson = JSON.parse(readFileSync(join(session, 'answers.json'), 'utf8'));
    assert.equal(answersJson.idea, '{"idea":"Literal JSON-looking idea"}');
  }

  {
    // --quick keeps accepting keyed JSON for its existing three-field path.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-quick-json-'));
    tempRoots.push(target);
    const output = runCli(['prd', '--target', target, '--quick'], {
      input: JSON.stringify({
        idea: 'A small tool',
        targetUsers: 'Knowledge workers',
        painPoints: 'Manual work is slow',
      }),
    });
    assert.match(output, /Quick mode: this PRD is intentionally thin/);
    const session = JSON.parse(readFileSync(join(target, '.ai-pm-dev', 'state.json'), 'utf8')).prdSessionPath;
    const answers = JSON.parse(readFileSync(join(session, 'answers.json'), 'utf8'));
    assert.equal(answers.idea, 'A small tool');
    assert.equal(answers.targetUsers, 'Knowledge workers');
    assert.equal(answers.painPoints, 'Manual work is slow');
  }

  {
    // --quick and --json are distinct input contracts.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-quick-json-error-'));
    tempRoots.push(target);
    let failed = false;
    let stderr = '';
    try {
      runCli(['prd', '--target', target, '--quick', '--json'], { input: '{}' });
    } catch (error) {
      failed = true;
      stderr = error.stderr || '';
    }
    assert.equal(failed, true, '--quick --json should fail as a usage error');
    assert.match(stderr, /cannot be combined with --quick/);
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
    const followUps = readFileSync(join(sessionDir, 'follow-up-questions.md'), 'utf8');
    assert.match(followUps, /Current workaround/);
    assert.match(followUps, /Core workflow/);
  }

  {
    // A single must-have containing a comma is one item when separated by semicolons,
    // so the "<=3 must-haves" gate does not false-fail. (Before: comma-split = 4 items.)
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-count-'));
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
    assert.match(checkOutput, /PASS Must-haves prioritized \(<=3\)/);
    assert.match(checkOutput, /PASS Project scope matches latest PRD/);

    // The comma-bearing must-have survives as a single item in scope.md.
    const scope = readFileSync(join(target, 'docs', 'scope.md'), 'utf8');
    assert.match(scope, /- Log weight, steps and sleep/);
  }

  {
    // The scope gate matches per-item, so a hand-reformatted scope.md (reordered,
    // re-bulleted, multi-item non-goals split) still PASSes as long as every
    // must-have / non-goal / metric is still present.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-reformat-'));
    tempRoots.push(target);

    const answers = [
      'AI fitness logging tool',
      'Fitness beginners',
      'They cannot tell whether training improves',
      'Scattered notes',
      'Log workout, review progress, receive AI summary',
      'Workout logging; progress trend; weekly summary',
      'Workout logging',
      'No social features; no offline mode',
      'Sets, reps, weight',
      'Volume must be deterministic',
      'AI only summarizes',
      'Show the workouts used',
      'Protect health data',
      'A beginner understands weekly progress within five minutes',
    ].join('\n');
    runCli(['prd', '--target', target], { input: `${answers}\n` });

    // Rewrite scope.md by hand: different layout/order, non-goals split into bullets.
    // Every item is still present, just reworded around.
    writeFileSync(join(target, 'docs', 'scope.md'), `# Project Scope (hand-edited)

## What we ship first
- weekly summary
- progress trend
- Workout logging

The single thing that proves it: Workout logging

## Deliberately not doing
- no offline mode
- No social features

Success signal: A beginner understands weekly progress within five minutes
`, 'utf8');

    const checkOutput = runCli(['prd', 'check', '--target', target]);
    assert.match(checkOutput, /PASS Project scope matches latest PRD/);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
