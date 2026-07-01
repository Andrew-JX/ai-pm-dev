import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  excludedNonGoalText,
  mappedMustHaveText,
  prdMustHaveItems,
  prdNonGoalItems,
} from './dev-plan.mjs';
import { countItems, listItems } from './items.mjs';
import {
  coveredMustHaveText,
  nonGoalsHeldText,
  passedAcceptanceCriterionText,
} from './ship-check.mjs';

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
  const sessionPath = base.sessionPath || '';
  const targetRoot = base.targetRoot || (sessionPath ? dirname(dirname(dirname(sessionPath))) : process.cwd());
  const docsDir = base.docsDir || join(targetRoot, 'docs');
  const exists = base.exists || existsSync;
  const readFile = base.readFile || defaultReadFile;
  const readIfExists = (path) => (exists(path) ? readFile(path) : '');
  return { ...base, sessionPath, targetRoot, docsDir, exists, readFile, readIfExists };
}

const required = (scope, id, name, predicate, fixHint) => ({ id, name, scope, severity: 'required', predicate, fixHint });
const recommended = (scope, id, name, predicate, fixHint) => ({ id, name, scope, severity: 'recommended', predicate, fixHint });

export const PRD_GATE_RULES = [
  required('answers', 'product-idea-present', 'Product idea present', (ctx) => ctx.has('idea'), 'A one-sentence product idea is mandatory.'),
  required('answers', 'target-users-named', 'Target users named', (ctx) => ctx.has('targetUsers'), 'State the first user group.'),
  required('answers', 'pain-point-stated', 'Pain point stated', (ctx) => ctx.has('painPoints'), 'Describe the sharpest user pain.'),
  required('answers', 'must-haves-present', 'Must-haves present', (ctx) => ctx.has('mvpScope'), 'List the v1 must-haves.'),
  required('answers', 'primary-metric-present', 'Primary metric present', (ctx) => ctx.has('acceptanceCriteria'), 'State one measurable success signal.'),
  required(
    'answers',
    'must-haves-prioritized',
    'Must-haves prioritized (<=3)',
    (ctx) => ctx.has('mvpScope') && countItems(ctx.text('mvpScope')) <= 3,
    (ctx) => `Cut to at most 3 must-haves (you listed ${countItems(ctx.text('mvpScope'))}); defer the rest in scope.md.`,
  ),
  required('answers', 'non-goals-declared', 'Non-goals declared (something cut)', (ctx) => ctx.has('nonGoals'), 'Name at least one thing v1 is deliberately NOT doing.'),
  required('answers', 'one-thing-chosen', 'The one thing chosen', (ctx) => ctx.has('oneThing'), 'Pick the single feature that proves the idea if you could ship only one.'),
  recommended(
    'answers',
    'acceptance-verifiable',
    'Acceptance looks verifiable',
    (ctx) => ctx.has('acceptanceCriteria') && /\d|%|min|sec|within|less than|分钟|秒|百分|至少|次|完成/.test(ctx.text('acceptanceCriteria')),
    'Prefer measurable/observable acceptance over vague statements.',
  ),
  recommended('answers', 'core-workflow-described', 'Core workflow described', (ctx) => ctx.has('coreWorkflow'), 'Describe entry-to-value flow.'),
  recommended('answers', 'data-model-described', 'Data model described', (ctx) => ctx.has('dataModel'), 'State what data is recorded or generated, or mark not-applicable.'),
  recommended('answers', 'ai-boundary-declared', 'AI boundary declared', (ctx) => ctx.has('aiBoundaries'), 'Say what AI may do and must never decide — or mark not-applicable if the product uses no AI.'),
  recommended('answers', 'deterministic-rules-declared', 'Deterministic rules declared', (ctx) => ctx.has('deterministicRules'), 'List rules that must be deterministic — or mark not-applicable.'),
  recommended('answers', 'risks-guardrails', 'Risks & guardrails', (ctx) => ctx.has('risks'), 'Name privacy/safety/misleading-output risks.'),
  required('project', 'project-scope-doc-exists', 'Project scope doc exists', (ctx) => ctx.exists(ctx.scopePath), 'Run ai-pm-dev prd to write docs/scope.md.'),
  required(
    'project',
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
  required('project', 'project-acceptance-tests-doc-exists', 'Project acceptance tests doc exists', (ctx) => ctx.exists(ctx.acceptancePath), 'Run ai-pm-dev prd to write docs/acceptance-tests.md.'),
  required(
    'project',
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
  required('project', 'all-handoff-files-exist', 'All handoff files exist', (ctx) => ctx.allHandoffsExist, 'Regenerate PRD handoffs with ai-pm-dev prd.'),
  required(
    'project',
    'handoffs-reference-prd-gates',
    'Handoffs reference PRD gates',
    (ctx) => !ctx.allHandoffsExist || ctx.handoffFiles.every((file) => {
      const content = ctx.readFile(file.path);
      return /ai-prd\.md/.test(content) && /scope\.md/.test(content) && /acceptance-tests\.md/.test(content);
    }),
    'Each handoff must reference ai-prd.md, scope.md, and acceptance-tests.md.',
  ),
  required(
    'project',
    'handoffs-carry-non-goals',
    'Handoffs carry non-goals',
    (ctx) => !ctx.allHandoffsExist || !ctx.has('nonGoals') || ctx.handoffFiles.every((file) => includesMeaningfulSnippet(ctx.readFile(file.path), ctx.text('nonGoals'))),
    'Each handoff must carry explicit non-goals so downstream tools do not expand v1 silently.',
  ),
];

export const DEV_PLAN_GATE_RULES = [
  required('answers', 'dev-plan-slices-present', 'Dev plan has at least one slice', (ctx) => ctx.plan.slices.length > 0, 'Add at least one vertical implementation slice.'),
  required(
    'answers',
    'dev-plan-first-slice-proves-one-thing',
    'First slice proves the one thing',
    (ctx) => ctx.plan.slices.length > 0 && includesMeaningfulSnippet(ctx.plan.slices[0].provesOneThing, ctx.text('oneThing')),
    'Make the first slice explicitly prove the PRD one thing.',
  ),
  required(
    'answers',
    'dev-plan-maps-must-haves',
    'Every PRD must-have maps to a slice',
    (ctx) => allSnippetsPresent(mappedMustHaveText(ctx.plan), prdMustHaveItems(ctx.answers)),
    'Map every PRD must-have into at least one dev-plan slice.',
  ),
  required(
    'answers',
    'dev-plan-excludes-non-goals',
    'PRD non-goals stay excluded',
    (ctx) => allSnippetsPresent(excludedNonGoalText(ctx.plan), prdNonGoalItems(ctx.answers)),
    'Copy every PRD non-goal into excludedNonGoals so build work does not expand v1.',
  ),
  required(
    'answers',
    'dev-plan-slices-have-verification',
    'Every slice has verification',
    (ctx) => ctx.plan.slices.length > 0 && ctx.plan.slices.every((slice) => slice.verification.trim().length > 0),
    'Each slice needs a command, test, or manual flow that proves it is done.',
  ),
  required(
    'answers',
    'dev-plan-slices-small-enough',
    'Slices stay reviewable',
    (ctx) => ctx.plan.slices.every((slice) => slice.plannedFiles.length <= 5 || slice.splitReason.trim().length > 0),
    'Slices touching more than 5 files need a splitReason.',
  ),
  required('project', 'dev-plan-latest-prd-session-exists', 'Latest PRD session exists', (ctx) => Boolean(ctx.latestSessionPath), 'Run ai-pm-dev prd before materializing a dev plan.'),
  required(
    'project',
    'dev-plan-linked-to-latest-prd',
    'Dev plan source is latest PRD',
    (ctx) => Boolean(ctx.latestSessionPath) && ctx.plan.prdSessionPath === ctx.latestSessionPath,
    'Regenerate the dev plan from the latest PRD session.',
  ),
  required('project', 'dev-plan-session-json-exists', 'Session dev-plan.json exists', (ctx) => ctx.exists(ctx.devPlanJsonPath), 'Run ai-pm-dev plan materialize.'),
  required('project', 'dev-plan-session-markdown-exists', 'Session dev-plan.md exists', (ctx) => ctx.exists(ctx.devPlanMarkdownPath), 'Run ai-pm-dev plan materialize.'),
  required('project', 'dev-plan-project-doc-exists', 'Project docs/dev-plan.md exists', (ctx) => ctx.exists(ctx.projectDevPlanPath), 'Run ai-pm-dev plan materialize.'),
  required('project', 'dev-plan-build-handoff-exists', 'Build handoff exists', (ctx) => ctx.exists(ctx.buildHandoffPath), 'Run ai-pm-dev plan materialize.'),
  required(
    'project',
    'dev-plan-handoff-references-sources',
    'Build handoff references PRD and dev plan sources',
    (ctx) => {
      if (!ctx.exists(ctx.buildHandoffPath)) {
        return true;
      }
      const content = ctx.readFile(ctx.buildHandoffPath);
      return /ai-prd\.md/.test(content) && /scope\.md/.test(content) && /acceptance-tests\.md/.test(content) && /dev-plan\.md/.test(content);
    },
    'handoff-build.md must reference ai-prd.md, scope.md, acceptance-tests.md, and dev-plan.md.',
  ),
];

export const SHIP_CHECK_GATE_RULES = [
  required('project', 'ship-latest-prd-session-exists', 'Latest PRD session exists', (ctx) => Boolean(ctx.latestSessionPath), 'Run ai-pm-dev prd before preparing a ship check.'),
  required('project', 'ship-latest-dev-plan-exists', 'Latest dev plan exists', (ctx) => ctx.exists(ctx.latestDevPlanPath), 'Run ai-pm-dev plan materialize before preparing a ship check.'),
  required(
    'project',
    'ship-linked-to-latest-prd',
    'Ship check source is latest PRD',
    (ctx) => Boolean(ctx.latestSessionPath) && ctx.check.prdSessionPath === ctx.latestSessionPath,
    'Regenerate the ship check from the latest PRD session.',
  ),
  required(
    'project',
    'ship-linked-to-latest-dev-plan',
    'Ship check source is latest dev plan',
    (ctx) => ctx.exists(ctx.latestDevPlanPath) && ctx.check.devPlanPath === ctx.latestDevPlanPath,
    'Regenerate the ship check from the latest dev-plan.json.',
  ),
  required(
    'answers',
    'ship-one-thing-shipped',
    'PRD one thing is shipped',
    (ctx) => ctx.has('oneThing') && ctx.check.mustHavesShipped.some((item) => item.status === 'shipped' && includesMeaningfulSnippet(item.mustHave, ctx.text('oneThing'))),
    'The PRD oneThing must appear in mustHavesShipped with status "shipped"; waiver or deferral is not accepted.',
  ),
  required(
    'answers',
    'ship-covers-must-haves',
    'Every PRD must-have is shipped or explicitly deferred',
    (ctx) => allSnippetsPresent(coveredMustHaveText(ctx.check), prdMustHaveItems(ctx.answers)),
    'Cover every PRD must-have in mustHavesShipped or deferredMustHaves.',
  ),
  required(
    'answers',
    'ship-deferred-have-waivers',
    'Deferred must-haves include reason and waiver',
    (ctx) => ctx.check.deferredMustHaves.every((item) => item.reason.trim().length > 0 && item.waiver.trim().length > 0),
    'Every deferred must-have needs both a reason and an explicit waiver.',
  ),
  required(
    'answers',
    'ship-acceptance-evidence-present',
    'Every PRD acceptance criterion has passing evidence',
    (ctx) => allSnippetsPresent(passedAcceptanceCriterionText(ctx.check), listItems(ctx.text('acceptanceCriteria'))),
    'Each PRD acceptance criterion needs passed evidence with a non-empty evidence field.',
  ),
  required(
    'answers',
    'ship-verification-evidence-present',
    'Verification ran and has evidence',
    (ctx) => ctx.check.verification.length > 0 && ctx.check.verification.every((item) => item.command.trim().length > 0 && item.evidence.trim().length > 0 && item.passed === true),
    'Add at least one passed verification entry with command and evidence.',
  ),
  required(
    'answers',
    'ship-non-goals-held',
    'PRD non-goals remain unbuilt',
    (ctx) => allSnippetsPresent(nonGoalsHeldText(ctx.check), prdNonGoalItems(ctx.answers)),
    'Copy every PRD non-goal into nonGoalsHeld.',
  ),
  required(
    'answers',
    'ship-rollback-present',
    'Rollback or recovery plan exists',
    (ctx) => ctx.check.rollback.trim().length > 0,
    'Add a concrete rollback or recovery plan.',
  ),
  required(
    'answers',
    'ship-open-blockers-waived',
    'No unresolved blockers without waiver',
    (ctx) => ctx.check.openBlockers.every((item) => item.waiver.trim().length > 0),
    'Clear openBlockers or add an explicit waiver for each blocker.',
  ),
];

function buildPrdContext(answers, context = {}, options = {}) {
  const resolved = resolveContext(context);
  const includeProjectState = options.includeProjectState ?? true;
  const text = (key) => (answers[key] || '').trim();
  const has = (key) => text(key).length > 0;
  const scopePath = join(resolved.docsDir, 'scope.md');
  const acceptancePath = join(resolved.docsDir, 'acceptance-tests.md');
  const handoffFiles = ['codex', 'v0', 'figma'].map((name) => ({
    name,
    path: join(resolved.sessionPath, `handoff-${name}.md`),
  }));
  return {
    ...resolved,
    answers,
    text,
    has,
    scopePath,
    acceptancePath,
    scopeDoc: includeProjectState ? resolved.readIfExists(scopePath) : '',
    acceptanceDoc: includeProjectState ? resolved.readIfExists(acceptancePath) : '',
    handoffFiles,
    allHandoffsExist: includeProjectState ? handoffFiles.every((file) => resolved.exists(file.path)) : false,
  };
}

function buildDevPlanContext(plan, context = {}, options = {}) {
  const resolved = resolveContext(context);
  const includeProjectState = options.includeProjectState ?? true;
  const answers = context.answers || {};
  const text = (key) => (answers[key] || '').trim();
  const latestSessionPath = context.latestSessionPath || resolved.sessionPath || '';
  const devPlanJsonPath = join(resolved.sessionPath, 'dev-plan.json');
  const devPlanMarkdownPath = join(resolved.sessionPath, 'dev-plan.md');
  const buildHandoffPath = join(resolved.sessionPath, 'handoff-build.md');
  const projectDevPlanPath = join(resolved.docsDir, 'dev-plan.md');
  return {
    ...resolved,
    answers,
    plan,
    text,
    latestSessionPath,
    devPlanJsonPath,
    devPlanMarkdownPath,
    buildHandoffPath,
    projectDevPlanPath,
    devPlanMarkdown: includeProjectState ? resolved.readIfExists(devPlanMarkdownPath) : '',
    buildHandoff: includeProjectState ? resolved.readIfExists(buildHandoffPath) : '',
    projectDevPlan: includeProjectState ? resolved.readIfExists(projectDevPlanPath) : '',
  };
}

function buildShipCheckContext(check, context = {}) {
  const resolved = resolveContext(context);
  const answers = context.answers || {};
  const text = (key) => (answers[key] || '').trim();
  const has = (key) => text(key).length > 0;
  const latestSessionPath = context.latestSessionPath || resolved.sessionPath || '';
  const latestDevPlanPath = context.latestDevPlanPath || join(resolved.sessionPath, 'dev-plan.json');
  return {
    ...resolved,
    answers,
    check,
    text,
    has,
    latestSessionPath,
    latestDevPlanPath,
  };
}

function evaluateRules(rules, ctx) {
  return rules.map((rule) => {
    const pass = rule.predicate(ctx);
    const hint = typeof rule.fixHint === 'function' ? rule.fixHint(ctx) : rule.fixHint;
    return { name: rule.name, severity: rule.severity, pass, hint };
  });
}

export function evaluatePrd(answers, context) {
  return evaluateRules(PRD_GATE_RULES, buildPrdContext(answers, context));
}

export function evaluateAnswerGates(answers) {
  const rules = PRD_GATE_RULES.filter((rule) => rule.scope === 'answers' && rule.severity === 'required');
  return evaluateRules(rules, buildPrdContext(answers, {}, { includeProjectState: false }));
}

export function evaluateDevPlan(plan, context = {}) {
  return evaluateRules(DEV_PLAN_GATE_RULES, buildDevPlanContext(plan, context));
}

export function evaluateShipCheck(check, context = {}) {
  return evaluateRules(SHIP_CHECK_GATE_RULES, buildShipCheckContext(check, context));
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
