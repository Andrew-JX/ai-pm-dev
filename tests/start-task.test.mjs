import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = join(repoRoot, 'scripts', 'start-task.mjs');

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
    const output = runCli(['--task', '我想开始实现登录功能，请先给技术计划']);
    assert.match(output, /Selected Skill: dev-planner/);
    assert.match(output, /skills\/dev-planner\/SKILL\.md/);
    assert.match(output, /先给 Plan/);
  }

  {
    const output = runCli(['--type', 'bug', '--task', '页面提交后报 500']);
    assert.match(output, /Selected Skill: bug-fixer/);
    assert.match(output, /先收集证据/);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-start-'));
    tempRoots.push(target);
    const output = runCli(['--task', '准备发布这个版本', '--save', '--target', target]);
    const promptPath = join(target, 'memory', 'current-task-prompt.md');

    assert.match(output, /Saved prompt:/);
    assert.equal(existsSync(promptPath), true);
    assert.match(readFileSync(promptPath, 'utf8'), /Selected Skill: release-builder/);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
