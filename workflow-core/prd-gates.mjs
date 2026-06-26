import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { countItems, listItems } from './items.mjs';

function normalizeForSearch(value) {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function includesMeaningfulSnippet(content, value) {
  const snippet = normalizeForSearch(value);
  if (!snippet || snippet === 'not specified.') {
    return true;
  }
  return normalizeForSearch(content).includes(snippet);
}

export function allSnippetsPresent(content, values) {
  return values.filter((value) => (value || '').trim()).every((value) => includesMeaningfulSnippet(content, value));
}

function defaultReadFile(path) {
  return readFileSync(path, 'utf8');
}

function resolveContext(context) {
  const base = typeof context === 'string' ? { sessionPath: context } : (context || {});
  const sessionPath = base.sessionPath;
  const targetRoot = base.targetRoot || dirname(dirname(dirname(sessionPath)));
  const docsDir = base.docsDir || join(targetRoot, 'docs');
  const exists = base.exists || existsSync;
  const readFile = base.readFile || defaultReadFile;
  const readIfExists = (path) => (exists(path) ? readFile(path) : '');
  return { ...base, sessionPath, targetRoot, docsDir, exists, readFile, readIfExists };
}

const required = (id, name, predicate, fixHint) => ({ id, name, severity: 'required', predicate, fixHint });
const recommended = (id, name, predicate, fixHint) => ({ id, name, severity: 'recommended', predicate, fixHint });

export const PRD_GATE_RULES = [
  required('product-idea-present', 'Product idea present', (ctx) => ctx.has('idea'), 'A one-sentence product idea is mandatory.'),
  required('target-users-named', 'Target users named', (ctx) => ctx.has('targetUsers'), 'State the first user group.'),
  required('pain-point-stated', 'Pain point stated', (ctx) => ctx.has('painPoints'), 'Describe the sharpest user pain.'),
  required('must-haves-present', 'Must-haves present', (ctx) => ctx.has('mvpScope'), 'List the v1 must-haves.'),
  required('primary-metric-present', 'Primary metric present', (ctx) => ctx.has('acceptanceCriteria'), 'State one measurable success signal.'),
  required(
    'must-haves-prioritized',
    'Must-haves prioritized (<=3)',
    (ctx) => ctx.has('mvpScope') && countItems(ctx.text('mvpScope')) <= 3,
    (ctx) => `Cut to at most 3 must-haves (you listed ${countItems(ctx.text('mvpScope'))}); defer the rest in scope.md.`,
  ),
  required('non-goals-declared', 'Non-goals declared (something cut)', (ctx) => ctx.has('nonGoals'), 'Name at least one thing v1 is deliberately NOT doing.'),
  required('one-thing-chosen', 'The one thing chosen', (ctx) => ctx.has('oneThing'), 'Pick the single feature that proves the idea if you could ship only one.'),
  recommended(
    'acceptance-verifiable',
    'Acceptance looks verifiable',
    (ctx) => ctx.has('acceptanceCriteria') && /\d|%|min|sec|within|less than|分钟|秒|百分|至少|次|完成/.test(ctx.text('acceptanceCriteria')),
    'Prefer measurable/observable acceptance over vague statements.',
  ),
  recommended('core-workflow-described', 'Core workflow described', (ctx) => ctx.has('coreWorkflow'), 'Describe entry-to-value flow.'),
  recommended('data-model-described', 'Data model described', (ctx) => ctx.has('dataModel'), 'State what data is recorded or generated, or mark not-applicable.'),
  recommended('ai-boundary-declared', 'AI boundary declared', (ctx) => ctx.has('aiBoundaries'), 'Say what AI may do and must never decide — or mark not-applicable if the product uses no AI.'),
  recommended('deterministic-rules-declared', 'Deterministic rules declared', (ctx) => ctx.has('deterministicRules'), 'List rules that must be deterministic — or mark not-applicable.'),
  recommended('risks-guardrails', 'Risks & guardrails', (ctx) => ctx.has('risks'), 'Name privacy/safety/misleading-output risks.'),
  required('project-scope-doc-exists', 'Project scope doc exists', (ctx) => ctx.exists(ctx.scopePath), 'Run ai-pm-dev prd to write docs/scope.md.'),
  required(
    'project-scope-matches',
    'Project scope matches latest PRD',
    (ctx) => {
      if (!ctx.exists(ctx.scopePath)) {
        return true;
      }
      const mustHaveItems = listItems(ctx.text('mvpScope')).slice(0, 3);
      const expectedScope = [
        ...mustHaveItems,
        ctx.text('oneThing'),
        ...listItems(ctx.text('nonGoals')),
        ...listItems(ctx.text('acceptanceCriteria')),
      ];
      return allSnippetsPresent(ctx.scopeDoc, expectedScope);
    },
    'Regenerate or update docs/scope.md so must-haves, the one thing, non-goals, and metric match the latest PRD.',
  ),
  required('project-acceptance-tests-doc-exists', 'Project acceptance tests doc exists', (ctx) => ctx.exists(ctx.acceptancePath), 'Run ai-pm-dev prd to write docs/acceptance-tests.md.'),
  required(
    'acceptance-tests-cover-prd',
    'Acceptance tests cover latest PRD',
    (ctx) => {
      if (!ctx.exists(ctx.acceptancePath)) {
        return true;
      }
      return allSnippetsPresent(ctx.acceptanceDoc, [
        ...listItems(ctx.text('acceptanceCriteria')),
        ctx.text('coreWorkflow'),
      ]);
    },
    'Update docs/acceptance-tests.md so it covers the primary metric and core workflow.',
  ),
  required('all-handoff-files-exist', 'All handoff files exist', (ctx) => ctx.allHandoffsExist, 'Regenerate PRD handoffs with ai-pm-dev prd.'),
  required(
    'handoffs-reference-prd-gates',
    'Handoffs reference PRD gates',
    (ctx) => !ctx.allHandoffsExist || ctx.handoffFiles.every((file) => {
      const content = ctx.readFile(file.path);
      return /ai-prd\.md/.test(content) && /scope\.md/.test(content) && /acceptance-tests\.md/.test(content);
    }),
    'Each handoff must reference ai-prd.md, scope.md, and acceptance-tests.md.',
  ),
  required(
    'handoffs-carry-non-goals',
    'Handoffs carry non-goals',
    (ctx) => !ctx.allHandoffsExist || !ctx.has('nonGoals') || ctx.handoffFiles.every((file) => includesMeaningfulSnippet(ctx.readFile(file.path), ctx.text('nonGoals'))),
    'Each handoff must carry explicit non-goals so downstream tools do not expand v1 silently.',
  ),
];

export function evaluatePrd(answers, context) {
  const resolved = resolveContext(context);
  const text = (key) => (answers[key] || '').trim();
  const has = (key) => text(key).length > 0;
  const scopePath = join(resolved.docsDir, 'scope.md');
  const acceptancePath = join(resolved.docsDir, 'acceptance-tests.md');
  const handoffFiles = ['codex', 'v0', 'figma'].map((name) => ({
    name,
    path: join(resolved.sessionPath, `handoff-${name}.md`),
  }));
  const ctx = {
    ...resolved,
    answers,
    text,
    has,
    scopePath,
    acceptancePath,
    scopeDoc: resolved.readIfExists(scopePath),
    acceptanceDoc: resolved.readIfExists(acceptancePath),
    handoffFiles,
    allHandoffsExist: handoffFiles.every((file) => resolved.exists(file.path)),
  };

  return PRD_GATE_RULES.map((rule) => {
    const pass = rule.predicate(ctx);
    const hint = typeof rule.fixHint === 'function' ? rule.fixHint(ctx) : rule.fixHint;
    return { name: rule.name, severity: rule.severity, pass, hint };
  });
}

export function scoreChecks(checks) {
  const req = checks.filter((c) => c.severity === 'required');
  const rec = checks.filter((c) => c.severity === 'recommended');
  const requiredPass = req.filter((c) => c.pass).length;
  const recommendedPass = rec.filter((c) => c.pass).length;
  const overall = requiredPass < req.length ? 'FAIL' : (recommendedPass < rec.length ? 'WARN' : 'PASS');
  return {
    overall,
    requiredPass,
    requiredTotal: req.length,
    recommendedPass,
    recommendedTotal: rec.length,
  };
}
