import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

assert.equal(pkg.version, '0.8.0');
assert.equal(pkg.private, undefined);
assert.equal(pkg.type, 'module');
assert.equal(pkg.bin['ai-pm-dev'], './bin/ai-pm-dev.mjs');
assert.ok(pkg.files.includes('bin'));
assert.ok(pkg.files.includes('scripts'));
assert.ok(pkg.files.includes('skills'));
assert.ok(pkg.files.includes('templates'));
assert.ok(pkg.files.includes('memory'));
assert.ok(pkg.files.includes('CLAUDE.md'));
assert.ok(pkg.files.includes('README.md'));
assert.ok(pkg.files.includes('README.zh-CN.md'));
assert.ok(pkg.files.includes('CHANGELOG.md'));
