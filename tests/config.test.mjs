import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = join(repoRoot, 'bin', 'ai-pm-dev.mjs');

function runCli(args, env = {}) {
  return execFileSync('node', [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ...env,
    },
  });
}

function runCliResult(args, env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ...env,
    },
  });
}

const tempRoots = [];

try {
  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-config-target-'));
    const configHome = mkdtempSync(join(tmpdir(), 'ai-pm-dev-config-home-'));
    tempRoots.push(target, configHome);
    const env = { AI_PM_DEV_HOME: configHome };

    runCli(['config', 'set', 'target', target], env);
    const output = runCli(['config', 'get'], env);
    const configPath = join(configHome, 'config.json');

    assert.match(output, /Default target:/);
    assert.match(output, /ai-pm-dev-config-target-/);
    assert.equal(existsSync(configPath), true);

    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    assert.equal(config.defaultTarget, resolve(target));
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-config-start-'));
    const configHome = mkdtempSync(join(tmpdir(), 'ai-pm-dev-config-home-'));
    tempRoots.push(target, configHome);
    const env = { AI_PM_DEV_HOME: configHome };

    runCli(['init', target], env);
    runCli(['config', 'set', 'target', target], env);
    const output = runCli(['start', '准备发布这个版本', '--save'], env);

    assert.match(output, /Selected Skill: release-builder/);
    assert.equal(existsSync(join(target, 'memory', 'current-task-prompt.md')), true);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-config-status-'));
    const configHome = mkdtempSync(join(tmpdir(), 'ai-pm-dev-config-home-'));
    tempRoots.push(target, configHome);
    const env = { AI_PM_DEV_HOME: configHome };

    runCli(['init', target], env);
    runCli(['config', 'set', 'target', target], env);
    runCli(['start', '页面提交后报 500', '--type', 'bug', '--save'], env);
    const status = runCli(['status'], env);
    const doctor = runCli(['doctor'], env);

    assert.match(status, /Current Skill: bug-fixer/);
    assert.match(doctor, /Target initialized: PASS/);
  }

  {
    const configHome = mkdtempSync(join(tmpdir(), 'ai-pm-dev-config-home-'));
    tempRoots.push(configHome);
    const env = { AI_PM_DEV_HOME: configHome };

    runCli(['config', 'set', 'target', repoRoot], env);
    runCli(['config', 'clear'], env);
    const output = runCli(['config', 'get'], env);

    assert.match(output, /No default target configured/);
  }

  {
    const configHome = mkdtempSync(join(tmpdir(), 'ai-pm-dev-config-home-'));
    tempRoots.push(configHome);
    const env = { AI_PM_DEV_HOME: configHome };
    const configPath = join(configHome, 'config.json');
    writeFileSync(configPath, '{bad json', 'utf8');

    const result = runCliResult(['config', 'get'], env);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /No default target configured/);
    assert.match(result.stderr, /Warning: invalid AI PM Dev config/);
    assert.match(result.stderr, new RegExp(configPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  {
    const configHome = mkdtempSync(join(tmpdir(), 'ai-pm-dev-config-home-'));
    tempRoots.push(configHome);
    const env = { AI_PM_DEV_HOME: configHome };
    const configPath = join(configHome, 'config.json');
    writeFileSync(configPath, '{bad json', 'utf8');

    const cleared = runCliResult(['config', 'clear'], env);
    const output = runCli(['config', 'get'], env);

    assert.equal(cleared.status, 0);
    assert.equal(cleared.stderr, '');
    assert.match(cleared.stdout, /AI PM Dev config cleared/);
    assert.match(output, /No default target configured/);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
