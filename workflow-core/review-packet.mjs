import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const REVIEW_PACKET_DIFF_LINE_BUDGET = 800;
const defaultMainlineRefs = ['origin/master', 'master', 'origin/main', 'main'];

function git(target, args) {
  return execFileSync('git', ['-C', target, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trimEnd();
}

function tryGit(target, args) {
  try {
    return { ok: true, value: git(target, args) };
  } catch (error) {
    return { ok: false, value: '', error };
  }
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8').trimEnd() : '';
}

function latestPrdSession(target) {
  const sessionsRoot = join(target, '.ai-pm-dev', 'prd-sessions');
  if (!existsSync(sessionsRoot)) return '';
  const sessions = readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort();
  const latest = sessions.at(-1);
  return latest ? join(sessionsRoot, latest) : '';
}

function firstAvailableBaseRef(target) {
  for (const ref of defaultMainlineRefs) {
    if (tryGit(target, ['rev-parse', '--verify', '--quiet', ref]).ok) {
      return ref;
    }
  }
  return '';
}

function collectGitContext(target, explicitBaseRef = '') {
  const root = tryGit(target, ['rev-parse', '--show-toplevel']);
  if (!root.ok) {
    return {
      available: false,
      targetRoot: resolve(target),
      fallbackReason: 'Git metadata is unavailable for this target.',
    };
  }

  const targetRoot = root.value;
  const branch = tryGit(targetRoot, ['branch', '--show-current']).value || '(detached HEAD)';
  const head = tryGit(targetRoot, ['rev-parse', 'HEAD']).value || 'unknown';
  const baseRef = explicitBaseRef || firstAvailableBaseRef(targetRoot);
  if (!baseRef) {
    return {
      available: false,
      targetRoot,
      branch,
      head,
      fallbackReason: 'No local mainline base ref found. Tried origin/master, master, origin/main, main.',
    };
  }

  const mergeBase = tryGit(targetRoot, ['merge-base', 'HEAD', baseRef]);
  if (!mergeBase.ok) {
    return {
      available: false,
      targetRoot,
      branch,
      head,
      baseRef,
      fallbackReason: `Unable to compute merge-base for HEAD and ${baseRef}.`,
    };
  }

  const committedDiffRange = `${baseRef}...HEAD`;
  return {
    available: true,
    targetRoot,
    branch,
    head,
    baseRef,
    mergeBase: mergeBase.value,
    committedDiffRange,
    commits: tryGit(targetRoot, ['log', '--oneline', `${mergeBase.value}..HEAD`]).value,
    committedStat: tryGit(targetRoot, ['diff', '--stat', committedDiffRange]).value,
    committedDiff: tryGit(targetRoot, ['diff', committedDiffRange]).value,
    stagedStat: tryGit(targetRoot, ['diff', '--cached', '--stat']).value,
    stagedDiff: tryGit(targetRoot, ['diff', '--cached']).value,
    unstagedStat: tryGit(targetRoot, ['diff', '--stat']).value,
    unstagedDiff: tryGit(targetRoot, ['diff']).value,
  };
}

function collectSession(targetRoot) {
  const sessionPath = latestPrdSession(targetRoot);
  if (!sessionPath) {
    return { sessionPath: '', planMarkdown: '', shipMarkdown: '', plan: null, ship: null, planReport: null, shipReport: null };
  }
  return {
    sessionPath,
    planMarkdown: readText(join(sessionPath, 'dev-plan.md')),
    shipMarkdown: readText(join(sessionPath, 'ship-check.md')),
    plan: readJson(join(sessionPath, 'dev-plan.json')),
    ship: readJson(join(sessionPath, 'ship-check.json')),
    planReport: readJson(join(sessionPath, 'dev-plan-quality-report.json')),
    shipReport: readJson(join(sessionPath, 'ship-quality-report.json')),
  };
}

function reportLine(label, report) {
  if (!report) {
    return `- ${label}: missing executor-reported quality report. Reviewer must independently rerun.`;
  }
  return `- ${label}: executor-reported ${report.overall || 'UNKNOWN'} (required ${report.requiredPass ?? '?'}/${report.requiredTotal ?? '?'}, recommended ${report.recommendedPass ?? '?'}/${report.recommendedTotal ?? '?'}). Reviewer must independently rerun.`;
}

function fencedBlock(lang, content, fallback) {
  return `\`\`\`${lang}\n${content || fallback}\n\`\`\``;
}

function truncateLines(content, remaining) {
  const lines = content ? content.split(/\r?\n/) : [];
  if (!lines.length) {
    return { text: '', used: 0, omitted: 0 };
  }
  if (lines.length <= remaining) {
    return { text: content, used: lines.length, omitted: 0 };
  }
  return {
    text: lines.slice(0, Math.max(remaining, 0)).join('\n'),
    used: Math.max(remaining, 0),
    omitted: lines.length - Math.max(remaining, 0),
  };
}

function renderDiffBodySection(title, command, content, state) {
  if (!content) {
    return `### ${title}\n\nNo diff.\n`;
  }
  const truncated = truncateLines(content, state.remaining);
  state.remaining -= truncated.used;
  const truncationNote = truncated.omitted > 0
    ? `\n\n**Diff truncated:** omitted ${truncated.omitted} line(s). Rerun locally: \`${command}\``
    : '';
  return `### ${title}\n\nCommand: \`${command}\`\n\n${fencedBlock('diff', truncated.text, '')}${truncationNote}\n`;
}

function renderDiffSection(gitContext, lineBudget) {
  if (!gitContext.available) {
    return `## Diff Summary and Body\n\nGit diff unavailable: ${gitContext.fallbackReason}\n`;
  }

  const state = { remaining: lineBudget };
  const committedCommand = `git -C "${gitContext.targetRoot}" diff ${gitContext.committedDiffRange}`;
  const stagedCommand = `git -C "${gitContext.targetRoot}" diff --cached`;
  const unstagedCommand = `git -C "${gitContext.targetRoot}" diff`;
  return `## Diff Summary and Body\n\nInline diff budget: ${lineBudget} lines across committed, staged, and unstaged diffs. Full diff can be rerun locally with the commands below.\n\n### Committed Diff Stat\n\nCommand: \`git -C "${gitContext.targetRoot}" diff --stat ${gitContext.committedDiffRange}\`\n\n${fencedBlock('', gitContext.committedStat, 'No committed diff.')}\n\n### Staged Diff Stat\n\nCommand: \`git -C "${gitContext.targetRoot}" diff --cached --stat\`\n\n${fencedBlock('', gitContext.stagedStat, 'No staged diff.')}\n\n### Unstaged Diff Stat\n\nCommand: \`git -C "${gitContext.targetRoot}" diff --stat\`\n\n${fencedBlock('', gitContext.unstagedStat, 'No unstaged diff.')}\n\n${renderDiffBodySection('Committed Diff', committedCommand, gitContext.committedDiff, state)}\n\n${renderDiffBodySection('Staged Diff', stagedCommand, gitContext.stagedDiff, state)}\n\n${renderDiffBodySection('Unstaged Diff', unstagedCommand, gitContext.unstagedDiff, state)}`;
}

function checklistFromPlan(plan) {
  if (!plan) return ['- [ ] No dev-plan.json found; reviewer should request or regenerate the dev plan.'];
  const items = [];
  for (const slice of plan.slices || []) {
    const label = slice.title || slice.id || 'Untitled slice';
    items.push(`- [ ] Slice ${slice.id || 'not-specified'} (${label}): diff implements mapped must-haves (${(slice.mappedMustHaves || []).join('; ') || 'none listed'}) and reviewer reruns verification: ${slice.verification || 'not specified'}.`);
  }
  for (const mustHave of plan.mustHaves || []) {
    items.push(`- [ ] PRD must-have covered by diff and evidence: ${mustHave}.`);
  }
  for (const nonGoal of plan.excludedNonGoals || plan.nonGoals || []) {
    items.push(`- [ ] Non-goal still excluded: ${nonGoal}.`);
  }
  return items.length ? items : ['- [ ] Dev plan has no slices/must-haves to review.'];
}

function checklistFromShip(ship) {
  if (!ship) return ['- [ ] No ship-check.json found; reviewer should request or regenerate ship evidence before release review.'];
  const items = [];
  for (const item of ship.mustHavesShipped || []) {
    items.push(`- [ ] Shipped must-have has independent evidence: ${item.mustHave || 'not specified'} (${item.status || 'unknown'}) -- ${item.evidence || 'no evidence'}.`);
  }
  for (const item of ship.deferredMustHaves || []) {
    items.push(`- [ ] Deferred must-have has explicit reason and waiver: ${item.mustHave || 'not specified'} -- ${item.reason || 'no reason'} -- ${item.waiver || 'no waiver'}.`);
  }
  for (const item of ship.acceptanceEvidence || []) {
    items.push(`- [ ] Acceptance evidence independently holds: ${item.criterion || 'not specified'} -- ${item.evidence || 'no evidence'}.`);
  }
  for (const item of ship.verification || []) {
    items.push(`- [ ] Verification rerun or inspected: ${item.command || 'no command'} -- ${item.evidence || 'no evidence'}.`);
  }
  for (const nonGoal of ship.nonGoalsHeld || []) {
    items.push(`- [ ] Ship evidence keeps non-goal held: ${nonGoal}.`);
  }
  items.push(`- [ ] Rollback is credible and actionable: ${ship.rollback || 'not specified'}.`);
  return items;
}

function renderArtifacts(session) {
  return `## Latest Plan Artifact\n\nSession: ${session.sessionPath || 'No PRD session found.'}\n\n${session.planMarkdown ? session.planMarkdown : '_No dev-plan.md found in the latest PRD session._'}\n\n## Latest Ship Artifact\n\n${session.shipMarkdown ? session.shipMarkdown : '_No ship-check.md found in the latest PRD session._'}`;
}

export function buildReviewPacket(options = {}) {
  const target = resolve(options.target || process.cwd());
  const lineBudget = options.diffLineBudget ?? REVIEW_PACKET_DIFF_LINE_BUDGET;
  const gitContext = collectGitContext(target, options.baseRef || '');
  const targetRoot = gitContext.targetRoot || target;
  const session = collectSession(targetRoot);
  const generatedAt = (options.now || new Date()).toISOString();
  const commits = gitContext.available && gitContext.commits ? gitContext.commits : 'No branch-only commits found or commit list unavailable.';

  return `# Review Packet\n\n## Review Target\n\n- Target: ${targetRoot}\n- Current branch: ${gitContext.branch || 'unknown'}\n- HEAD: ${gitContext.head || 'unknown'}\n- Base ref: ${gitContext.baseRef || 'unresolved'}\n- Merge-base: ${gitContext.mergeBase || 'unresolved'}\n- Commit range: ${gitContext.available ? `${gitContext.mergeBase}..${gitContext.head}` : 'unresolved'}\n- Diff range: ${gitContext.committedDiffRange || 'unresolved'}\n- Generated at: ${generatedAt}\n\n### Branch Commits\n\n${fencedBlock('', commits, '')}\n\n## Safety Notice\n\nThis packet is generated locally and is not sent anywhere by \`ai-pm-dev\`. Diffs may contain secrets, credentials, tokens, or private data. v1 does not scan, redact, or sanitize secrets; redaction remains a future human-owned policy. Review before sharing.\n\n## Executor-Reported Gates\n\nThese gate results are executor-reported context only. They are not authoritative review evidence; the reviewer must independently rerun the gates.\n\n${reportLine('Dev Plan Gate', session.planReport)}\n${reportLine('Ship Gate', session.shipReport)}\n\n${renderArtifacts(session)}\n\n${renderDiffSection(gitContext, lineBudget)}\n\n## Reviewer Re-Run Checklist\n\n- [ ] Rerun \`ai-pm-dev plan check --strict --target "${targetRoot}"\` locally if a dev plan exists.\n- [ ] Rerun \`ai-pm-dev ship check --strict --target "${targetRoot}"\` locally if a ship check exists.\n- [ ] Inspect committed, staged, and unstaged diffs directly in git before approving.\n${checklistFromPlan(session.plan).join('\n')}\n${checklistFromShip(session.ship).join('\n')}\n- [ ] Check for unexpected scope creep, unrelated refactors, generated noise, and secret exposure.\n`;
}
