export const OWNERSHIP_MARKER = 'AI PM Dev Agent ownership routing';

export const ownershipRules = [
  {
    id: 'product-scope',
    name: 'Product scope / PRD boundary',
    patterns: ['docs/PROJECT_BRIEF.md', 'docs/scope.md', '.ai-pm-dev/prd-sessions/*/ai-prd.md', '.ai-pm-dev/prd-sessions/*/scope.md'],
    owner: 'prd-generator / product-spec-builder',
    review: 'Product boundary review: must-have, one thing, non-goals, metric.',
    docs: ['docs/PROJECT_BRIEF.md', 'docs/scope.md', 'docs/open-questions.md'],
    checks: ['ai-pm-dev prd check --strict', 'ai-pm-dev dashboard'],
  },
  {
    id: 'acceptance-gate',
    name: 'Acceptance and quality gate',
    patterns: ['docs/acceptance-tests.md', '.ai-pm-dev/prd-sessions/*/acceptance-tests.md', '.ai-pm-dev/prd-sessions/*/quality-report.md'],
    owner: 'prd-generator / code-review',
    review: 'Verification review: acceptance criteria, testability, drift from scope.',
    docs: ['docs/acceptance-tests.md', 'docs/scope.md'],
    checks: ['ai-pm-dev prd check --strict', 'npm test'],
  },
  {
    id: 'cli-runtime',
    name: 'CLI/runtime behavior',
    patterns: ['bin/*', 'scripts/*', 'package.json'],
    owner: 'dev-builder / code-review',
    review: 'CLI behavior review: command UX, path safety, Windows compatibility, no unwanted overwrites.',
    docs: ['README.md', 'CHANGELOG.md', 'docs/progress.md'],
    checks: ['node --check bin/ai-pm-dev.mjs', 'npm test'],
  },
  {
    id: 'workflow-rules',
    name: 'Workflow rules and skills',
    patterns: ['skills/*/SKILL.md', 'templates/*', 'operating-layer/*', 'operating-layer/docs/*'],
    owner: 'dev-planner / code-review',
    review: 'Operating-layer review: does the rule reduce drift without adding workflow bloat?',
    docs: ['AGENTS.md', 'docs/decision-log.md'],
    checks: ['npm test', 'ai-pm-dev doctor'],
  },
  {
    id: 'decision-memory',
    name: 'Decision and learning memory',
    patterns: ['docs/decision-log.md', 'docs/decision-records/*', 'docs/progress.md', 'docs/troubleshooting.md', 'docs/open-questions.md'],
    owner: 'all skills',
    review: 'Traceability review: decision, why, risk, and follow-up remain discoverable.',
    docs: ['docs/decision-log.md', 'docs/open-questions.md', 'docs/progress.md'],
    checks: ['ai-pm-dev dashboard', 'ai-pm-dev doctor'],
  },
  {
    id: 'github-gates',
    name: 'GitHub / local gates',
    patterns: ['.github/*', '.github/PULL_REQUEST_TEMPLATE.md', '.git/hooks/*'],
    owner: 'release-builder / code-review',
    review: 'Gate review: make sure the template/hook asks for PRD, scope, tests, and docs without blocking normal work unfairly.',
    docs: ['README.md', 'CHANGELOG.md'],
    checks: ['npm test'],
  },
];

export function ownershipJson() {
  return `${JSON.stringify({
    generatedBy: OWNERSHIP_MARKER,
    rules: ownershipRules,
  }, null, 2)}\n`;
}

export function ownershipMarkdown() {
  const rows = ownershipRules.map((rule) => `| ${rule.name} | \`${rule.patterns.join('`, `')}\` | ${rule.owner} | ${rule.checks.map((check) => `\`${check}\``).join('<br>')} |`).join('\n');
  return `# Ownership and Review Routing

<!-- ${OWNERSHIP_MARKER}: installed by ai-pm-dev install-ownership -->

Use this as a local OWNERS map. It does not assign people; it routes changes to the right
skill lens, docs, and gates so the project does not drift from its PRD.

| Area | Paths | Owner / skill lens | Required checks |
| --- | --- | --- | --- |
${rows}

## How to use

Run:

\`\`\`bash
ai-pm-dev review-route --paths "docs/scope.md,bin/ai-pm-dev.mjs"
\`\`\`

Before implementation, read the routed docs. Before review, run the routed checks and paste
the output or evidence into the PR template.
`;
}

function normalizeRoutePath(value) {
  return (value || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

export function patternToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const globstar = '__AI_PM_DEV_GLOBSTAR__';
  return new RegExp(`^${escaped.replace(/\*\*/g, globstar).replace(/\*/g, '[^/]*').replaceAll(globstar, '.*')}$`);
}

export function ruleMatchesPath(rule, path) {
  const normalized = normalizeRoutePath(path);
  return rule.patterns.some((pattern) => patternToRegex(pattern).test(normalized));
}
