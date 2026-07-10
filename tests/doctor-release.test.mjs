import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    assert.match(output, /1\. Open your product project/);
    assert.match(output, /ai-pm-dev init/);
    assert.match(output, /ai-pm-dev prd/);
    assert.match(output, /prd handoff --to codex/);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-doctor-empty-'));
    tempRoots.push(target);
    const output = runCli(['doctor', '--target', target]);
    assert.match(output, /Target initialized: FAIL/);
    assert.match(output, /Operating layer \(AGENTS\.md \+ docs\/\): FAIL/);
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
    assert.match(output, /Operating layer \(AGENTS\.md \+ docs\/\): PASS/);
    assert.match(output, /Task prompt: PASS/);
    assert.match(output, /Task state: PASS/);
  }

  {
    // doctor warns when a separate CHANGELOG.md exists while decision-log is still empty.
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-doctor-changelog-'));
    tempRoots.push(target);
    runCli(['init', target]);
    writeFileSync(join(target, 'CHANGELOG.md'), '# Changelog\n', 'utf8');

    const warned = runCli(['doctor', '--target', target]);
    assert.match(warned, /CHANGELOG\.md exists but docs\/decision-log\.md is empty/);

    runCli(['decide', 'use the operating layer', '--why', 'single record source', '--target', target]);
    const cleared = runCli(['doctor', '--target', target]);
    assert.doesNotMatch(cleared, /CHANGELOG\.md exists but/);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-doctor-stale-ref-'));
    tempRoots.push(target);
    runCli(['init', target]);
    writeFileSync(
      join(target, 'docs', 'progress.md'),
      '# Progress\n\nSee `docs/missing.md` and `docs/PROJECT_BRIEF.md:9999`.\n',
      'utf8',
    );

    const output = runCli(['doctor', '--target', target]);
    assert.match(output, /Stale references: WARN/);
    assert.match(output, /docs\/missing\.md \(file not found\)/);
    assert.match(output, /docs\/PROJECT_BRIEF\.md:9999 \(line out of range/);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-doctor-valid-ref-'));
    tempRoots.push(target);
    runCli(['init', target]);
    writeFileSync(
      join(target, 'docs', 'progress.md'),
      '# Progress\n\nSee `docs/PROJECT_BRIEF.md:1`.\n',
      'utf8',
    );

    const output = runCli(['doctor', '--target', target]);
    assert.match(output, /Stale references: PASS/);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-doctor-ref-guards-'));
    tempRoots.push(target);
    runCli(['init', target]);
    writeFileSync(
      join(target, 'docs', 'progress.md'),
      [
        '# Progress',
        '',
        'External docs live at https://example.com/docs/missing.md.',
        '',
        '```md',
        'docs/missing.md',
        '```',
        '',
        '~~~md',
        'docs/tilde-fenced-missing.md',
        '~~~',
        '',
        '    docs/indented-missing.md',
        '',
        'A real stale link still reports docs/missing2.md.',
        '',
      ].join('\n'),
      'utf8',
    );

    const output = runCli(['doctor', '--target', target]);
    assert.match(output, /Stale references: WARN/);
    assert.doesNotMatch(output, /docs\/missing\.md/);
    assert.doesNotMatch(output, /docs\/tilde-fenced-missing\.md/);
    assert.doesNotMatch(output, /docs\/indented-missing\.md/);
    assert.match(output, /docs\/missing2\.md \(file not found\)/);
  }

  {
    const output = runCli(['release-check']);
    assert.match(output, /Release Check/);
    assert.match(output, /npm test/);
    assert.match(output, /npm pack --dry-run/);
  }

  {
    const output = runNpm(['pack', '--dry-run']);
    assert.match(output, /ai-pm-dev-1\.7\.0\.tgz/);
    const packJson = JSON.parse(runNpm(['pack', '--dry-run', '--json']));
    const packFiles = packJson[0].files.map((file) => file.path);
    assert.ok(packFiles.includes('workflow-core/index.mjs'));
    assert.equal(packFiles.some((path) => path.includes('node_modules')), false);
    assert.equal(packFiles.some((path) => path.includes('.vite')), false);
    assert.equal(packFiles.some((path) => path.startsWith('apps/web/dist/')), false);
    for (const memoryPath of ['memory/feedback-log.md', 'memory/rule-candidates.md', 'memory/skill-improvement-log.md']) {
      const source = readFileSync(join(repoRoot, memoryPath), 'utf8');
      assert.doesNotMatch(source, /E:\\studyspace/i);
      assert.doesNotMatch(source, /quickDate/i);
    }
    assert.equal(existsSync(join(repoRoot, 'ai-pm-dev-1.7.0.tgz')), false);
  }
} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
  rmSync(join(repoRoot, '.npm-cache-test'), { recursive: true, force: true });
}
