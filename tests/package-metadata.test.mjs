import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('README.md', 'utf8');
const readmeZh = readFileSync('README.zh-CN.md', 'utf8');

assert.equal(pkg.version, '1.0.0');
assert.equal(pkg.private, undefined);
assert.equal(pkg.type, 'module');
assert.equal(pkg.bin['ai-pm-dev'], './bin/ai-pm-dev.mjs');
assert.ok(pkg.files.includes('bin'));
assert.ok(pkg.files.includes('scripts'));
assert.ok(pkg.files.includes('skills'));
assert.ok(pkg.files.includes('templates'));
assert.ok(pkg.files.includes('memory'));
assert.ok(pkg.files.includes('operating-layer'));
assert.ok(pkg.files.includes('CLAUDE.md'));
assert.ok(pkg.files.includes('README.md'));
assert.ok(pkg.files.includes('README.zh-CN.md'));
assert.ok(pkg.files.includes('CHANGELOG.md'));
assert.equal(pkg.engines.node, '>=18');

assert.doesNotMatch(readme, /C:\\Users|Desktop\\my-product|15942/);
assert.doesNotMatch(readmeZh, /C:\\Users|Desktop\\my-product|15942/);
assert.match(readme, /ai-pm-dev init \./);
assert.match(readmeZh, /ai-pm-dev init \./);
assert.match(readme, /AGENTS\.md/);
assert.match(readmeZh, /AGENTS\.md/);
