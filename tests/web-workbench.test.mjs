import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from '../apps/web/server/api.mjs';
import { docStatus, readProjectState } from '../apps/web/server/project-state.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = join(repoRoot, 'bin', 'ai-pm-dev.mjs');

function runCli(args, options = {}) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: options.input ?? '',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      AI_PM_DEV_FIXED_TIME: '2026-06-09T10:00:00.000Z',
    },
  });
}

const tempRoots = [];

try {
  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-empty-'));
    tempRoots.push(target);

    const state = readProjectState(target);
    assert.equal(state.projectInitialized, false);
    assert.equal(state.latestSession, null);
    assert.equal(state.qualityGate.overall, 'UNKNOWN');
    assert.equal(state.nextAction.command, 'ai-pm-dev init .');
    assert.ok(state.artifacts.some((artifact) => artifact.relativePath === 'docs/scope.md' && artifact.status === 'missing'));
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-docs-'));
    tempRoots.push(target);
    runCli(['init', target]);

    const briefPath = join(target, 'docs', 'PROJECT_BRIEF.md');
    assert.equal(docStatus(briefPath), 'stub');

    writeFileSync(briefPath, '# Project Brief\n\nA filled product brief.\n', 'utf8');
    assert.equal(docStatus(briefPath), 'filled');

    const state = readProjectState(target);
    const brief = state.artifacts.find((artifact) => artifact.id === 'brief');
    assert.equal(brief.status, 'filled');
    assert.equal(state.projectInitialized, true);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-web-api-'));
    tempRoots.push(target);
    runCli(['init', target]);

    const projectBefore = await handleApiRequest({
      method: 'GET',
      url: `/api/project?target=${encodeURIComponent(target)}`,
      body: '',
    });
    assert.equal(projectBefore.status, 200);
    assert.equal(projectBefore.body.projectInitialized, true);
    assert.equal(projectBefore.body.latestSession, null);

    const prd = await handleApiRequest({
      method: 'POST',
      url: '/api/prd',
      body: JSON.stringify({
        target,
        idea: 'AI fitness logging tool',
        targetUsers: 'Fitness beginners',
        painPoints: 'They cannot see weekly progress',
      }),
    });
    assert.equal(prd.status, 200);
    assert.match(prd.body.project.latestSession.name, /\d{4}-\d{2}-\d{2}-\d{6}-ai-fitness-logging-tool/);
    assert.equal(existsSync(join(target, 'docs', 'scope.md')), true);

    const check = await handleApiRequest({
      method: 'POST',
      url: '/api/check',
      body: JSON.stringify({ target }),
    });
    assert.equal(check.status, 200);
    assert.notEqual(check.body.project.qualityGate.overall, 'UNKNOWN');
    assert.match(check.body.result.stdout, /PRD Quality Check/);

    const checkpoint = await handleApiRequest({
      method: 'POST',
      url: '/api/checkpoint',
      body: JSON.stringify({ target, phase: 'build', note: 'web smoke path verified' }),
    });
    assert.equal(checkpoint.status, 200);
    const timeline = readFileSync(join(target, '.ai-pm-dev', 'timeline.json'), 'utf8');
    assert.match(timeline, /web smoke path verified/);
  }
} finally {
  for (const dir of tempRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
}
