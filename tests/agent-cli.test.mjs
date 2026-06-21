import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = join(repoRoot, 'bin', 'ai-pm-dev.mjs');

function runCli(args, cwd = repoRoot) {
  return execFileSync('node', [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const tempRoots = [];

try {
  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-agent-init-'));
    tempRoots.push(target);

    const output = runCli(['init', target]);

    assert.match(output, /AI PM Dev Agent v0\.2 initialized/);
    assert.equal(existsSync(join(target, 'CLAUDE.md')), true);
  }

  {
    // Regression: `init .` must install into the user's cwd, not the package root.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-init-dot-'));
    tempRoots.push(target);

    const output = runCli(['init', '.'], target);

    assert.match(output, new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(existsSync(join(target, 'AGENTS.md')), true);
    assert.equal(existsSync(join(target, 'docs', 'PROJECT_BRIEF.md')), true);
    // The package root must not have gained a backup from being overwritten.
    assert.equal(existsSync(join(repoRoot, 'CLAUDE.ai-pm-dev-backup.md')), false);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-agent-start-'));
    tempRoots.push(target);

    const output = runCli(['start', '我想开始实现登录功能，请先给技术计划', '--target', target, '--save']);
    const statePath = join(target, '.ai-pm-dev', 'state.json');

    assert.match(output, /Selected Skill: dev-planner/);
    assert.equal(existsSync(statePath), true);

    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    assert.equal(state.skill, 'dev-planner');
    assert.equal(state.phase, 'Dev Plan');
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-agent-status-'));
    tempRoots.push(target);

    runCli(['start', '页面提交后报 500', '--type', 'bug', '--target', target, '--save']);
    const output = runCli(['status', '--target', target]);

    assert.match(output, /Current Skill: bug-fixer/);
    assert.match(output, /Current Phase: Bug Fix/);
    assert.match(output, /Next Step:/);
  }

  {
    // Quick-append commands and the doctor stub nudge.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-append-'));
    tempRoots.push(target);
    runCli(['init', target]);

    const before = runCli(['doctor', '--target', target]);
    assert.match(before, /Docs still empty stubs:.*decision-log\.md/);

    runCli(['decide', 'Ship web-only for v1', '--why', 'fastest demo path', '--target', target]);
    const recordOutput = runCli([
      'decision-record',
      'Add strict PRD gate',
      '--why',
      'large gate behavior needs explicit rollback',
      '--goals',
      '- Block drift before implementation',
      '--non-goals',
      '- No workflow runtime',
      '--test',
      '- npm test',
      '--rollback',
      '- Remove the gate command',
      '--target',
      target,
    ]);
    const bugOutput = runCli([
      'bug',
      'Submit returns 500',
      '--actual',
      'The submit page returns HTTP 500 after saving',
      '--expected',
      'The user sees a saved confirmation',
      '--repro',
      '1. Open submit page 2. Fill form 3. Click save',
      '--impact',
      'Blocks the core submission workflow',
      '--verify',
      'npm test and manual submit flow',
      '--env',
      'Node 20 on Windows',
      '--target',
      target,
    ]);
    runCli(['pitfall', 'Animation pauses on a hidden tab', '--fix', 'resume on visibilitychange', '--target', target]);
    runCli(['note', 'finished the end-to-end happy path', '--target', target]);

    const decisionLog = readFileSync(join(target, 'docs', 'decision-log.md'), 'utf8');
    assert.match(decisionLog, /Ship web-only for v1 \| fastest demo path \| you/);
    assert.match(decisionLog, /Decision record: Add strict PRD gate/);
    assert.doesNotMatch(decisionLog, /_\(to be filled\)_/);

    assert.match(recordOutput, /Wrote decision record/);
    const recordName = readdirSync(join(target, 'docs', 'decision-records')).find((name) => name.endsWith('-add-strict-prd-gate.md'));
    assert.ok(recordName, 'decision record file should include a slugified title');
    const recordPath = join(target, 'docs', 'decision-records', recordName);
    assert.equal(existsSync(recordPath), true);
    const record = readFileSync(recordPath, 'utf8');
    assert.match(record, /# Decision Record: Add strict PRD gate/);
    assert.match(record, /## Goals/);
    assert.match(record, /Block drift before implementation/);
    assert.match(record, /## Non-Goals/);
    assert.match(record, /No workflow runtime/);
    assert.match(record, /## Test Plan/);
    assert.match(record, /npm test/);
    assert.match(record, /## Rollback Plan/);

    const trouble = readFileSync(join(target, 'docs', 'troubleshooting.md'), 'utf8');
    assert.match(trouble, /Animation pauses on a hidden tab/);
    assert.match(trouble, /Submit returns 500/);

    assert.match(bugOutput, /Wrote bug report/);
    const bugName = readdirSync(join(target, 'docs', 'bugs')).find((name) => name.endsWith('-submit-returns-500.md'));
    assert.ok(bugName, 'bug report file should include a slugified title');
    const bug = readFileSync(join(target, 'docs', 'bugs', bugName), 'utf8');
    assert.match(bug, /# Bug Report: Submit returns 500/);
    assert.match(bug, /## Actual Behavior/);
    assert.match(bug, /The submit page returns HTTP 500/);
    assert.match(bug, /## Expected Behavior/);
    assert.match(bug, /## Minimal Reproduction/);
    assert.match(bug, /Blocks the core submission workflow/);
    assert.match(bug, /npm test and manual submit flow/);

    const progress = readFileSync(join(target, 'docs', 'progress.md'), 'utf8');
    assert.match(progress, /finished the end-to-end happy path/);

    runCli(['keyword', 'AOP', '--explain', 'insert logic around methods without touching business code', '--example', 'log request timing via an aspect', '--target', target]);
    runCli(['learned', 'login request flows controller -> service -> token', '--target', target]);
    const keywords = readFileSync(join(target, 'docs', 'keywords.md'), 'utf8');
    assert.match(keywords, /### AOP/);
    assert.match(keywords, /Example: log request timing via an aspect/);
    const learning = readFileSync(join(target, 'docs', 'learning-log.md'), 'utf8');
    assert.match(learning, /login request flows controller -> service -> token/);

    const after = runCli(['doctor', '--target', target]);
    assert.doesNotMatch(after, /decision-log\.md/);
    assert.doesNotMatch(after, /troubleshooting\.md/);
    assert.doesNotMatch(after, /progress\.md/);
  }

  {
    // bug requires enough context to reproduce and verify before writing a report.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-bug-required-'));
    tempRoots.push(target);
    let refused = false;
    try {
      runCli(['bug', 'Missing repro', '--actual', 'fails', '--target', target]);
    } catch (error) {
      refused = true;
      assert.match(error.stderr || '', /--expected/);
      assert.match(error.stderr || '', /--repro/);
    }
    assert.equal(refused, true, 'bug should require expected, repro, impact, and verify fields');
    assert.equal(existsSync(join(target, 'docs', 'bugs')), false);
  }

  {
    // ask / checkpoint / timeline / brief collaboration commands.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-collab-'));
    tempRoots.push(target);
    runCli(['init', target]);

    runCli(['ask', 'websocket or polling for notifications?', '--target', target]);
    const openQuestions = readFileSync(join(target, 'docs', 'open-questions.md'), 'utf8');
    assert.match(openQuestions, /websocket or polling for notifications\?/);

    runCli(['checkpoint', 'build', '--note', 'crud done', '--target', target]);
    const timeline = runCli(['timeline', '--target', target]);
    assert.match(timeline, /build — crud done/);

    runCli(['decide', 'ship web first', '--why', 'speed', '--target', target]);
    const brief = runCli(['brief', '--target', target]);
    assert.match(brief, /Project brief/);
    assert.match(brief, /ship web first/);
    assert.match(brief, /websocket or polling/);
  }

  {
    // install-ownership writes local owner routes; review-route maps paths to checks.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-ownership-'));
    tempRoots.push(target);

    const out = runCli(['install-ownership', '--target', target]);
    const ownershipPath = join(target, 'docs', 'ownership.md');
    const ownersJsonPath = join(target, '.ai-pm-dev', 'owners.json');
    assert.match(out, /Installed ownership routing/);
    assert.equal(existsSync(ownershipPath), true);
    assert.equal(existsSync(ownersJsonPath), true);
    const ownership = readFileSync(ownershipPath, 'utf8');
    assert.match(ownership, /AI PM Dev Agent ownership routing/);
    assert.match(ownership, /Product scope \/ PRD boundary/);
    assert.match(ownership, /CLI\/runtime behavior/);
    const owners = JSON.parse(readFileSync(ownersJsonPath, 'utf8'));
    assert.equal(owners.generatedBy, 'AI PM Dev Agent ownership routing');
    assert.equal(owners.rules.some((rule) => rule.id === 'acceptance-gate'), true);

    const route = runCli(['review-route', '--target', target, '--paths', 'docs/scope.md,bin/ai-pm-dev.mjs']);
    assert.match(route, /Product scope \/ PRD boundary/);
    assert.match(route, /ai-pm-dev prd check --strict/);
    assert.match(route, /CLI\/runtime behavior/);
    assert.match(route, /node --check bin\/ai-pm-dev\.mjs/);

    writeFileSync(ownershipPath, 'custom ownership\n', 'utf8');
    let refused = false;
    try {
      runCli(['install-ownership', '--target', target]);
    } catch (error) {
      refused = true;
      assert.match(error.stderr || '', /Ownership doc already exists/);
    }
    assert.equal(refused, true, 'install-ownership should refuse to overwrite a foreign ownership doc');
    assert.equal(readFileSync(ownershipPath, 'utf8'), 'custom ownership\n');

    runCli(['install-ownership', '--target', target, '--force']);
    assert.match(readFileSync(ownershipPath, 'utf8'), /AI PM Dev Agent ownership routing/);
  }

  {
    // workflow check / skill lint make the development skill guardrails machine-checkable.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-workflow-check-'));
    tempRoots.push(target);
    runCli(['init', target]);

    const workflow = runCli(['workflow', 'check', '--target', target, '--strict']);
    assert.match(workflow, /Workflow Check \(strict\)/);
    assert.match(workflow, /Overall: PASS \(25\/25 guardrail checks passed\)/);
    assert.match(workflow, /PASS dev-builder/);
    assert.match(workflow, /rollback: Rollback path is named/);

    const skillLint = runCli(['skill', 'lint', '--target', target, '--strict']);
    assert.match(skillLint, /Skill Lint \(strict\)/);
    assert.match(skillLint, /Overall: PASS/);

    const builderPath = join(target, 'skills', 'dev-builder', 'SKILL.md');
    writeFileSync(builderPath, readFileSync(builderPath, 'utf8').replace(/rollback/gi, 'backout'), 'utf8');
    let refused = false;
    try {
      runCli(['workflow', 'check', '--target', target, '--strict']);
    } catch (error) {
      refused = true;
      assert.match(error.stdout || '', /Overall: FAIL/);
      assert.match(error.stdout || '', /FAIL rollback/);
      assert.match(error.stdout || '', /Strict mode: exiting non-zero/);
    }
    assert.equal(refused, true, 'workflow check --strict should fail when a required guardrail is missing');
  }

  {
    // install-pr-template writes a GitHub PR gate and protects existing user templates.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-pr-template-'));
    tempRoots.push(target);

    const out = runCli(['install-pr-template', '--target', target]);
    const templatePath = join(target, '.github', 'PULL_REQUEST_TEMPLATE.md');
    assert.match(out, /Installed GitHub PR template gate/);
    assert.equal(existsSync(templatePath), true);
    const template = readFileSync(templatePath, 'utf8');
    assert.match(template, /AI PM Dev Agent PR template gate/);
    assert.match(template, /Latest PRD session/);
    assert.match(template, /Must-have this PR implements/);
    assert.match(template, /Non-goal check/);
    assert.match(template, /How Did You Test This Change/);
    assert.match(template, /release-note/);

    writeFileSync(templatePath, 'custom user template\n', 'utf8');
    let refused = false;
    try {
      runCli(['install-pr-template', '--target', target]);
    } catch (error) {
      refused = true;
      assert.match(error.stderr || '', /already exists and was not created by ai-pm-dev/);
    }
    assert.equal(refused, true, 'install-pr-template should refuse to overwrite a foreign template');
    assert.equal(readFileSync(templatePath, 'utf8'), 'custom user template\n');

    runCli(['install-pr-template', '--target', target, '--force']);
    assert.match(readFileSync(templatePath, 'utf8'), /AI PM Dev Agent PR template gate/);
  }

  {
    // install-hook writes a git pre-commit gate; uninstall removes it; foreign hooks are protected.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-hook-'));
    tempRoots.push(target);
    mkdirSync(join(target, '.git'));

    const out = runCli(['install-hook', '--target', target]);
    const hookPath = join(target, '.git', 'hooks', 'pre-commit');
    assert.match(out, /Installed git pre-commit gate/);
    assert.equal(existsSync(hookPath), true);
    const hook = readFileSync(hookPath, 'utf8');
    assert.match(hook, /AI PM Dev Agent pre-commit gate/);
    assert.match(hook, /commit blocked/);

    const removed = runCli(['uninstall-hook', '--target', target]);
    assert.match(removed, /Removed ai-pm-dev pre-commit gate/);
    assert.equal(existsSync(hookPath), false);

    // A foreign pre-commit hook must not be clobbered.
    mkdirSync(join(target, '.git', 'hooks'), { recursive: true });
    writeFileSync(hookPath, '#!/bin/sh\necho mine\n', 'utf8');
    let refused = false;
    try {
      runCli(['install-hook', '--target', target]);
    } catch (error) {
      refused = true;
      assert.match(error.stderr || '', /already exists and was not created by ai-pm-dev/);
    }
    assert.equal(refused, true, 'install-hook should refuse to overwrite a foreign hook');
    assert.equal(readFileSync(hookPath, 'utf8'), '#!/bin/sh\necho mine\n');
  }

  {
    // install-hook outside a git repo errors clearly.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-hook-nogit-'));
    tempRoots.push(target);
    let errored = false;
    try {
      runCli(['install-hook', '--target', target]);
    } catch (error) {
      errored = true;
      assert.match(error.stderr || '', /Not a git repository/);
    }
    assert.equal(errored, true);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
