import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = join(repoRoot, 'apps', 'web', 'dist');
const npmCacheRoot = join(repoRoot, '.npm-cache-web-bundle-security');
const textBundleExtensions = new Set(['.css', '.html', '.js']);
const leakPattern = /anthropic|sk-ant/i;

function runNpm(args) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return execFileSync(npmCommand, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      npm_config_cache: npmCacheRoot,
    },
  });
}

function* bundleTextFiles(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      yield* bundleTextFiles(entryPath);
      continue;
    }

    if (entry.isFile() && textBundleExtensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      yield entryPath;
    }
  }
}

try {
  runNpm(['run', 'web:build']);

  assert.equal(existsSync(distRoot), true, 'web build should create apps/web/dist');
  assert.equal(statSync(distRoot).isDirectory(), true, 'apps/web/dist should be a directory');

  const scannedFiles = [...bundleTextFiles(distRoot)];
  assert.ok(scannedFiles.length > 0, 'web build should emit text assets to scan');

  for (const filePath of scannedFiles) {
    const contents = readFileSync(filePath, 'utf8');
    assert.doesNotMatch(
      contents,
      leakPattern,
      `${relative(repoRoot, filePath)} should not contain Anthropic imports or API key fragments`,
    );
  }
} finally {
  rmSync(npmCacheRoot, { recursive: true, force: true });
}
