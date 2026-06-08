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
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
