import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { docIsStubContent } from '../../../workflow-core/docs.mjs';

const coreDocs = [
  { id: 'brief', title: 'Project Brief', path: 'PROJECT_BRIEF.md', phase: 'idea' },
  { id: 'scope', title: 'MVP Scope', path: 'scope.md', phase: 'scope' },
  { id: 'ui', title: 'UI Spec', path: 'UI_SPEC.md', phase: 'ui' },
  { id: 'acceptance', title: 'Acceptance Tests', path: 'acceptance-tests.md', phase: 'test' },
  { id: 'questions', title: 'Open Questions', path: 'open-questions.md', phase: 'prd' },
  { id: 'decisions', title: 'Decision Log', path: 'decision-log.md', phase: 'build' },
  { id: 'progress', title: 'Progress', path: 'progress.md', phase: 'build' },
];

const phaseOrder = ['idea', 'prd', 'scope', 'ui', 'plan', 'build', 'test'];

export function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function readJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function docStatus(path) {
  if (!existsSync(path)) {
    return 'missing';
  }
  const content = readText(path);
  if (docIsStubContent(content)) {
    return 'stub';
  }
  return content.trim().length ? 'filled' : 'stub';
}

function firstMarkdownHeading(content) {
  const line = content.split(/\r?\n/).find((item) => item.startsWith('# '));
  return line ? line.replace(/^#\s+/, '').trim() : '';
}

function preview(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join('\n')
    .slice(0, 1200);
}

function latestSession(target) {
  const root = join(target, '.ai-pm-dev', 'prd-sessions');
  if (!existsSync(root)) {
    return null;
  }
  const names = readdirSync(root, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort();
  const latest = names.at(-1);
  if (!latest) {
    return null;
  }
  const path = join(root, latest);
  const answers = readJson(join(path, 'answers.json')) || {};
  return {
    name: latest,
    path,
    idea: answers.idea || '',
    answers,
    qualityReportJson: readJson(join(path, 'quality-report.json')),
    devPlanQualityReportJson: readJson(join(path, 'dev-plan-quality-report.json')),
  };
}

function unknownQualityGate() {
  return {
    overall: 'UNKNOWN',
    requiredPass: 0,
    requiredTotal: 0,
    recommendedPass: 0,
    recommendedTotal: 0,
    checks: [],
  };
}

function readTimeline(target) {
  const path = join(target, '.ai-pm-dev', 'timeline.json');
  if (!existsSync(path)) {
    return [];
  }
  try {
    return JSON.parse(readText(path)).slice(-8);
  } catch {
    return [];
  }
}

function phaseStatuses(target, session, artifacts, qualityGate) {
  const state = readJson(join(target, '.ai-pm-dev', 'state.json')) || {};
  const filled = new Set(artifacts.filter((artifact) => artifact.status === 'filled').map((artifact) => artifact.phase));
  const phases = [
    { id: 'idea', label: 'Idea', done: Boolean(session?.idea || filled.has('idea')) },
    { id: 'prd', label: 'PRD', done: Boolean(session) },
    { id: 'scope', label: 'MVP Scope', done: filled.has('scope') },
    { id: 'ui', label: 'UI Spec', done: filled.has('ui') },
    { id: 'plan', label: 'Dev Plan', done: filled.has('plan') || /plan|planner/i.test(state.skill || state.phase || '') },
    { id: 'build', label: 'Build', done: filled.has('build') || /build|builder/i.test(state.skill || state.phase || '') },
    { id: 'test', label: 'Test / Release', done: qualityGate.overall === 'PASS' },
  ];
  const firstOpen = phases.findIndex((phase) => !phase.done);
  return phases.map((phase, index) => ({
    ...phase,
    status: phase.done ? 'done' : index === firstOpen ? 'current' : 'upcoming',
  }));
}

function deriveCurrentPhase(phases) {
  return phases.find((phase) => phase.status === 'current') || phases.at(-1);
}

function deriveNextAction(projectInitialized, session, qualityGate, currentPhase, hasDevPlan) {
  if (!projectInitialized) {
    return {
      label: 'Initialize project',
      command: 'ai-pm-dev init .',
      detail: 'Install AGENTS.md and docs/ before starting the product loop.',
    };
  }
  if (!session) {
    return {
      label: 'Generate PRD',
      command: 'ai-pm-dev prd --quick',
      detail: 'Capture the idea, then let the PM challenge fill the hard questions.',
    };
  }
  if (qualityGate.overall === 'UNKNOWN') {
    return {
      label: 'Run PRD check',
      command: 'ai-pm-dev prd check',
      detail: 'Score the current PRD and surface blocking gaps.',
    };
  }
  if (qualityGate.overall === 'FAIL') {
    return {
      label: 'Resolve gate failures',
      command: 'ai-pm-dev prd check --strict',
      detail: 'Fix scope, acceptance, or handoff drift before implementation.',
    };
  }
  if (qualityGate.overall === 'PASS' && !hasDevPlan) {
    return {
      label: 'Plan in your code agent',
      command: 'dev-planner -> ai-pm-dev plan materialize -> ai-pm-dev plan check --strict',
      detail: 'Open your code agent, run the dev-planner skill, materialize its JSON plan with the CLI, then run the strict plan gate.',
    };
  }
  return {
    label: 'Continue phase',
    command: `ai-pm-dev checkpoint "${currentPhase?.id || 'build'}"`,
    detail: 'Record the next verified movement in the project timeline.',
  };
}

function artifactSummary({ id, title, path, relativePath, phase }) {
  const content = readText(path);
  return {
    id,
    title,
    path,
    relativePath,
    phase,
    status: docStatus(path),
    updatedAt: existsSync(path) ? statSync(path).mtime.toISOString() : '',
    heading: firstMarkdownHeading(content),
    preview: preview(content),
  };
}

export function readProjectState(targetInput = process.cwd()) {
  const target = resolve(targetInput || process.cwd());
  const projectInitialized = existsSync(join(target, 'AGENTS.md')) || existsSync(join(target, '.ai-pm-dev'));
  const docsRoot = join(target, 'docs');
  const session = latestSession(target);
  const artifacts = coreDocs.map((doc) => artifactSummary({
    id: doc.id,
    title: doc.title,
    path: join(docsRoot, doc.path),
    relativePath: `docs/${doc.path}`,
    phase: doc.phase,
  }));
  if (session) {
    artifacts.push(
      artifactSummary({
        id: 'dev-plan',
        title: 'Dev Plan',
        path: join(session.path, 'dev-plan.md'),
        relativePath: `.ai-pm-dev/prd-sessions/${session.name}/dev-plan.md`,
        phase: 'plan',
      }),
      artifactSummary({
        id: 'dev-plan-gate-report',
        title: 'Dev Plan Gate Report',
        path: join(session.path, 'dev-plan-quality-report.json'),
        relativePath: `.ai-pm-dev/prd-sessions/${session.name}/dev-plan-quality-report.json`,
        phase: 'plan',
      }),
    );
  }
  const state = readJson(join(target, '.ai-pm-dev', 'state.json')) || {};
  const qualityGate = session?.qualityReportJson || unknownQualityGate();
  const devPlanGate = session?.devPlanQualityReportJson || unknownQualityGate();
  const hasDevPlan = artifacts.some((artifact) => artifact.id === 'dev-plan' && artifact.status === 'filled');
  const phases = phaseStatuses(target, session, artifacts, qualityGate);
  const currentPhase = deriveCurrentPhase(phases);
  const nextAction = deriveNextAction(projectInitialized, session, qualityGate, currentPhase, hasDevPlan);

  return {
    target,
    projectInitialized,
    idea: session?.idea || state.task || '',
    latestSession: session ? {
      name: session.name,
      path: session.path,
      idea: session.idea,
    } : null,
    currentPhase,
    phases,
    artifacts,
    qualityGate,
    devPlanGate,
    openQuestions: artifacts.find((item) => item.id === 'questions')?.preview || '',
    decisions: artifacts.find((item) => item.id === 'decisions')?.preview || '',
    progress: artifacts.find((item) => item.id === 'progress')?.preview || '',
    timeline: readTimeline(target),
    nextAction,
    state,
    phaseOrder,
  };
}
