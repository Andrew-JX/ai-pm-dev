import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    runCli(['pitfall', 'Animation pauses on a hidden tab', '--fix', 'resume on visibilitychange', '--target', target]);
    runCli(['note', 'finished the end-to-end happy path', '--target', target]);

    const decisionLog = readFileSync(join(target, 'docs', 'decision-log.md'), 'utf8');
    assert.match(decisionLog, /Ship web-only for v1 \| fastest demo path \| you/);
    assert.doesNotMatch(decisionLog, /_\(to be filled\)_/);

    const trouble = readFileSync(join(target, 'docs', 'troubleshooting.md'), 'utf8');
    assert.match(trouble, /Animation pauses on a hidden tab/);

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
