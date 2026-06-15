import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = join(repoRoot, 'scripts', 'init-ai-pm-dev.mjs');

function runCli(args, cwd = repoRoot) {
  return execFileSync('node', [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function makeTarget() {
  return mkdtempSync(join(tmpdir(), 'ai-pm-dev-init-'));
}

const tempRoots = [];

try {
  {
    const target = makeTarget();
    tempRoots.push(target);

    const output = runCli(['--target', target]);

    assert.match(output, /AI PM Dev Agent v0\.2 initialized/);
    assert.ok(existsSync(join(target, 'CLAUDE.md')));
    assert.ok(existsSync(join(target, 'AGENTS.md')));
    assert.match(readFileSync(join(target, 'CLAUDE.md'), 'utf8'), /AGENTS\.md/);
    assert.match(readFileSync(join(target, 'AGENTS.md'), 'utf8'), /Docs manifest/);
    assert.ok(existsSync(join(target, 'docs', 'PROJECT_BRIEF.md')));
    assert.ok(existsSync(join(target, 'docs', 'acceptance-tests.md')));
    assert.ok(existsSync(join(target, 'docs', 'decision-log.md')));
    assert.ok(existsSync(join(target, 'docs', 'open-questions.md')));
    assert.ok(existsSync(join(target, 'docs', 'progress.md')));
    assert.ok(existsSync(join(target, 'docs', 'troubleshooting.md')));
    assert.ok(existsSync(join(target, 'docs', 'UI_SPEC.md')));
    assert.ok(existsSync(join(target, 'skills', 'prd-generator', 'SKILL.md')));
    assert.ok(existsSync(join(target, 'skills', 'dev-planner', 'SKILL.md')));
    assert.ok(existsSync(join(target, 'templates', 'ai-prd-template.md')));
    assert.ok(existsSync(join(target, 'templates', 'dev-plan-template.md')));
    assert.ok(existsSync(join(target, 'memory', 'feedback-log.md')));
  }

  {
    // Existing user docs are preserved, not overwritten by stubs.
    const target = makeTarget();
    tempRoots.push(target);
    runCli(['--target', target]);
    writeFileSync(join(target, 'docs', 'progress.md'), 'real progress\n', 'utf8');

    runCli(['--target', target]);

    assert.equal(readFileSync(join(target, 'docs', 'progress.md'), 'utf8'), 'real progress\n');
  }

  {
    const target = makeTarget();
    tempRoots.push(target);
    writeFileSync(join(target, 'CLAUDE.md'), 'existing project rules\n', 'utf8');

    runCli(['--target', target]);

    assert.equal(readFileSync(join(target, 'CLAUDE.ai-pm-dev-backup.md'), 'utf8'), 'existing project rules\n');
    assert.match(readFileSync(join(target, 'CLAUDE.md'), 'utf8'), /AI PM Dev Agent/);
  }

  {
    const target = makeTarget();
    tempRoots.push(target);
    runCli(['--target', target]);
    writeFileSync(join(target, 'memory', 'feedback-log.md'), 'user memory\n', 'utf8');

    runCli(['--target', target]);

    assert.equal(readFileSync(join(target, 'memory', 'feedback-log.md'), 'utf8'), 'user memory\n');
  }

  {
    const target = makeTarget();
    tempRoots.push(target);

    const output = runCli(['--target', target, '--dry-run']);

    assert.match(output, /Dry run/);
    assert.equal(existsSync(join(target, 'CLAUDE.md')), false);
    assert.equal(existsSync(join(target, 'AGENTS.md')), false);
    assert.equal(existsSync(join(target, 'docs', 'PROJECT_BRIEF.md')), false);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
