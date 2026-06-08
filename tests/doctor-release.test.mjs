import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
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

function runNpm(args) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return execFileSync(npmCommand, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      npm_config_cache: join(repoRoot, '.npm-cache-test'),
    },
  });
}

const tempRoots = [];

try {
  {
    const output = runCli(['onboarding']);
    assert.match(output, /1\. Initialize a project/);
    assert.match(output, /ai-pm-dev init/);
    assert.match(output, /memory\/current-task-prompt\.md/);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-doctor-empty-'));
    tempRoots.push(target);
    const output = runCli(['doctor', '--target', target]);
    assert.match(output, /Target initialized: FAIL/);
    assert.match(output, /Fix: ai-pm-dev init/);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-doctor-ready-'));
    tempRoots.push(target);
    runCli(['init', target]);
    runCli(['start', '准备发布这个版本', '--target', target, '--save']);
    const output = runCli(['doctor', '--target', target]);

    assert.match(output, /Package assets: PASS/);
    assert.match(output, /Target initialized: PASS/);
    assert.match(output, /Task prompt: PASS/);
    assert.match(output, /Task state: PASS/);
  }

  {
    const output = runCli(['release-check']);
    assert.match(output, /Release Check/);
    assert.match(output, /npm test/);
    assert.match(output, /npm pack --dry-run/);
  }

  {
    const output = runNpm(['pack', '--dry-run']);
    assert.match(output, /ai-pm-dev-0\.7\.0\.tgz/);
    assert.equal(existsSync(join(repoRoot, 'ai-pm-dev-0.7.0.tgz')), false);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
  rmSync(join(repoRoot, '.npm-cache-test'), { recursive: true, force: true });
}
