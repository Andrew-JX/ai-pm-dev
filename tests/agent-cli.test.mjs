import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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

    const after = runCli(['doctor', '--target', target]);
    assert.doesNotMatch(after, /decision-log\.md/);
    assert.doesNotMatch(after, /troubleshooting\.md/);
    assert.doesNotMatch(after, /progress\.md/);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
