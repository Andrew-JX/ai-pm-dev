import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('README.md', 'utf8');
const readmeZh = readFileSync('README.zh-CN.md', 'utf8');
const hardenedSkills = [
  'skills/dev-planner/SKILL.md',
  'skills/dev-builder/SKILL.md',
  'skills/bug-fixer/SKILL.md',
  'skills/code-review/SKILL.md',
  'skills/release-builder/SKILL.md',
];

assert.equal(pkg.version, '1.1.0');
assert.equal(pkg.description, 'Local Idea-to-Build workflow CLI for AI-assisted product development.');
assert.equal(pkg.private, undefined);
assert.equal(pkg.type, 'module');
assert.deepEqual(pkg.workspaces, ['apps/web']);
assert.equal(pkg.bin['ai-pm-dev'], './bin/ai-pm-dev.mjs');
assert.equal(pkg.scripts.web, 'npm run web --workspace apps/web');
assert.equal(pkg.scripts['web:build'], 'npm run web:build --workspace apps/web');
assert.ok(pkg.files.includes('apps'));
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
assert.match(readme, /not a general-purpose agent platform/);
assert.match(readme, /Dify \/ Coze replacement/);
assert.match(readme, /Idea-to-Build workflow CLI/);
assert.match(readmeZh, /不是通用 Agent 平台/);
assert.match(readmeZh, /Idea-to-Build workflow CLI/);

for (const skillPath of hardenedSkills) {
  const skill = readFileSync(skillPath, 'utf8');
  assert.match(skill, /## AI Collaboration Hardening/);
}

assert.match(readFileSync('skills/dev-planner/SKILL.md', 'utf8'), /review-route/);
assert.match(readFileSync('skills/dev-builder/SKILL.md', 'utf8'), /decision-record/);
assert.match(readFileSync('skills/bug-fixer/SKILL.md', 'utf8'), /actual\/expected\/repro\/impact\/verify/);
assert.match(readFileSync('skills/code-review/SKILL.md', 'utf8'), /Review as a gate/);
assert.match(readFileSync('skills/release-builder/SKILL.md', 'utf8'), /prd check --strict/);
