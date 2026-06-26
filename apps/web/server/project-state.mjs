import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const placeholderPattern = /_\(to be filled\)_|_\(date\)_|_\(skill or person\)_|_\(how\)_/;
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
  if (/\*\*Status:\*\* TODO/.test(content) || placeholderPattern.test(content)) {
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
    qualityReport: readText(join(path, 'quality-report.md')),
  };
}

function parseQualityReport(report) {
  if (!report) {
    return {
      overall: 'UNKNOWN',
      requiredPass: 0,
      requiredTotal: 0,
      recommendedPass: 0,
      recommendedTotal: 0,
      checks: [],
    };
  }
  const summary = report.match(/Overall:\s+(PASS|WARN|FAIL)\s+\(required\s+(\d+)\/(\d+),\s+recommended\s+(\d+)\/(\d+)\)/);
  const checks = report
    .split(/\r?\n/)
    .filter((line) => /^\|\s+(PASS|WARN|FAIL)\s+\|/.test(line))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      return {
        status: cells[0],
        severity: cells[1],
        name: cells[2],
        fix: cells[3] || '',
      };
    });
  return {
    overall: summary?.[1] || 'UNKNOWN',
    requiredPass: Number(summary?.[2] || 0),
    requiredTotal: Number(summary?.[3] || 0),
    recommendedPass: Number(summary?.[4] || 0),
    recommendedTotal: Number(summary?.[5] || 0),
    checks,
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
    { id: 'plan', label: 'Dev Plan', done: /plan|planner/i.test(state.skill || state.phase || '') },
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

function deriveNextAction(projectInitialized, session, qualityGate, currentPhase) {
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
  return {
    label: 'Continue phase',
    command: `ai-pm-dev checkpoint "${currentPhase?.id || 'build'}"`,
    detail: 'Record the next verified movement in the project timeline.',
  };
}

export function readProjectState(targetInput = process.cwd()) {
  const target = resolve(targetInput || process.cwd());
  const projectInitialized = existsSync(join(target, 'AGENTS.md')) || existsSync(join(target, '.ai-pm-dev'));
  const docsRoot = join(target, 'docs');
  const artifacts = coreDocs.map((doc) => {
    const fullPath = join(docsRoot, doc.path);
    const content = readText(fullPath);
    return {
      id: doc.id,
      title: doc.title,
      path: fullPath,
      relativePath: `docs/${doc.path}`,
      phase: doc.phase,
      status: docStatus(fullPath),
      updatedAt: existsSync(fullPath) ? statSync(fullPath).mtime.toISOString() : '',
      heading: firstMarkdownHeading(content),
      preview: preview(content),
    };
  });
  const session = latestSession(target);
  const state = readJson(join(target, '.ai-pm-dev', 'state.json')) || {};
  const qualityGate = parseQualityReport(session?.qualityReport || '');
  const phases = phaseStatuses(target, session, artifacts, qualityGate);
  const currentPhase = deriveCurrentPhase(phases);
  const nextAction = deriveNextAction(projectInitialized, session, qualityGate, currentPhase);

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
    openQuestions: artifacts.find((item) => item.id === 'questions')?.preview || '',
    decisions: artifacts.find((item) => item.id === 'decisions')?.preview || '',
    progress: artifacts.find((item) => item.id === 'progress')?.preview || '',
    timeline: readTimeline(target),
    nextAction,
    state,
    phaseOrder,
  };
}
