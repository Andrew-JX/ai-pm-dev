#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  DECISION_HEADER,
  OPEN_QUESTIONS_HEADER,
  PLACEHOLDER,
  TROUBLE_HEADER,
  cell,
  docIsStubContent,
  stripPlaceholderRows,
} from '../workflow-core/docs.mjs';
import {
  HOOK_MARKER,
  PR_TEMPLATE_MARKER,
  prTemplateContent,
  preCommitScript,
} from '../workflow-core/installers.mjs';
import { countItems, listItems, splitItems } from '../workflow-core/items.mjs';
import {
  OWNERSHIP_MARKER,
  ownershipJson,
  ownershipMarkdown,
  ownershipRules,
  ruleMatchesPath,
} from '../workflow-core/ownership.mjs';
import {
  buildBuildHandoff,
  buildDevPlanMarkdown,
  validateDevPlanStructure,
} from '../workflow-core/dev-plan.mjs';
import {
  buildDesignHandoff,
  buildDesignMarkdown,
  validateDesignStructure,
} from '../workflow-core/design.mjs';
import {
  evaluateDesign,
  evaluateDevPlan,
  evaluateIterate,
  evaluatePrd,
  evaluateShipCheck,
  scoreChecks,
} from '../workflow-core/prd-gates.mjs';
import {
  parseFullPrdJsonStdin,
  parseQuickPrdStdin,
  prdQuestions,
  projectTypes,
  questionText,
  questionsForType,
} from '../workflow-core/questions.mjs';
import { buildQualityReportJson, buildQualityReportMarkdown } from '../workflow-core/quality-report.mjs';
import {
  buildReleaseChecklist,
  buildReleaseHandoff,
  buildShipCheckMarkdown,
  validateShipCheckStructure,
} from '../workflow-core/ship-check.mjs';
import {
  anchorIterate,
  buildIterateMarkdown,
  createFeedbackEntry,
  dispositionFeedbackLog,
  nextFeedbackId,
  normalizeProductFeedbackLog,
  openFeedbackEntries,
  validateIterateStructure,
} from '../workflow-core/iterate.mjs';
import { buildReviewPacket } from '../workflow-core/review-packet.mjs';
import { createAnthropicPrdClient } from '../llm/anthropic-client.mjs';
import { createClarificationState, runPrdClarificationTurn } from '../llm/prd-clarifier.mjs';
import { DEFAULT_REASONING_MODEL, resolveModelAlias } from '../llm/models.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '1.6.0';
const requiredSkills = [
  'prd-generator',
  'product-spec-builder',
  'design-brief-builder',
  'design-maker',
  'dev-planner',
  'dev-builder',
  'bug-fixer',
  'code-review',
  'release-builder',
  'iterate-planner',
];

function printHelp() {
  console.log(`AI PM Dev Agent v${version}

Usage:
  ai-pm-dev init <target> [--dry-run] [--force] [--include-readme]
  ai-pm-dev prd [--target <path>] [--lang <zh|en>] [--type <ai-tool|saas|consumer|internal-tool>] [--from-note <file>] [--quick] [--json]
  ai-pm-dev prd clarify [--target <path>] [--lang <zh|en>] [--type <ai-tool|saas|consumer|internal-tool>] [--model <opus|sonnet>] [--from-note <file>] [--json-turn]
  ai-pm-dev prd status [--target <path>]
  ai-pm-dev prd check [--strict] [--target <path>]
  ai-pm-dev prd handoff --to <codex|v0|figma> [--target <path>]
  ai-pm-dev plan materialize [--target <path>] < dev-plan.json
  ai-pm-dev plan check [--strict] [--target <path>]
  ai-pm-dev plan handoff [--target <path>]
  ai-pm-dev design materialize [--target <path>] < design.json
  ai-pm-dev design check [--strict] [--target <path>]
  ai-pm-dev design handoff [--target <path>]
  ai-pm-dev ship materialize [--target <path>] < ship-check.json
  ai-pm-dev ship check [--strict] [--target <path>]
  ai-pm-dev ship handoff [--target <path>]
  ai-pm-dev feedback add "<signal>" --source <source> [--kind <user-reaction|usage|request>] [--target <path>]
  ai-pm-dev iterate materialize [--target <path>] < iterate.json
  ai-pm-dev iterate check [--strict] [--target <path>]
  ai-pm-dev iterate seed [--target <path>]
  ai-pm-dev review-packet [--target <path>] [--base <ref>] [--out <file>]
  ai-pm-dev start "<task>" [--type <type>] [--target <path>] [--save]
  ai-pm-dev decide "<decision>" [--why <reason>] [--target <path>]
  ai-pm-dev decision-record "<title>" [--why <reason>] [--goals <goals>] [--non-goals <non-goals>] [--test <plan>] [--rollback <plan>] [--target <path>]
  ai-pm-dev bug "<title>" --actual <text> --expected <text> --repro <steps> --impact <scope> --verify <plan> [--env <info>] [--target <path>]
  ai-pm-dev note "<progress note>" [--target <path>]
  ai-pm-dev pitfall "<symptom>" [--cause <c>] [--fix <f>] [--target <path>]
  ai-pm-dev keyword "<term>" --explain "<plain words>" [--example <e>] [--target <path>]
  ai-pm-dev learned "<understanding in your own words>" [--target <path>]
  ai-pm-dev ask "<question>" [--why <reason>] [--target <path>]
  ai-pm-dev brief [--target <path>]
  ai-pm-dev dashboard [--target <path>]
  ai-pm-dev checkpoint "<phase>" [--note <note>] [--target <path>]
  ai-pm-dev timeline [--target <path>]
  ai-pm-dev install-ownership [--target <path>] [--force]
  ai-pm-dev review-route [--target <path>] [--paths <path1,path2>]
  ai-pm-dev skill lint [--target <path>] [--strict]
  ai-pm-dev workflow check [--target <path>] [--strict]
  ai-pm-dev install-pr-template [--target <path>] [--force]
  ai-pm-dev install-hook [--target <path>]
  ai-pm-dev uninstall-hook [--target <path>]
  ai-pm-dev status [--target <path>]
  ai-pm-dev doctor [--target <path>]
  ai-pm-dev config get
  ai-pm-dev config set target <path>
  ai-pm-dev config clear
  ai-pm-dev onboarding
  ai-pm-dev release-check

Commands:
  init           Install workflow files into a target project.
  prd            Run an interactive PM interview and generate AI-PRD assets.
  plan           Materialize, check, or print the latest PRD-linked dev plan.
  design         Materialize, check, or print the latest PRD-linked page structure.
  ship           Materialize, check, or print the latest PRD-linked ship check.
  feedback       Capture post-ship product feedback for next-round iteration.
  iterate        Materialize and gate a next-PRD seed from triaged feedback.
  review-packet  Assemble a local-only Markdown review packet from git and PRD artifacts.
  start          Route a task, generate the AI prompt, and optionally save task state.
  decide         Append a one-line decision to docs/decision-log.md.
  decision-record Write a KEP-lite decision record for a larger change.
  bug            Write a structured bug report with repro, impact, and verification.
  note           Append a one-line progress note to docs/progress.md.
  pitfall        Append a one-line pitfall to docs/troubleshooting.md.
  keyword        Append a key-term card to docs/keywords.md.
  learned        Append an own-words understanding note to docs/learning-log.md.
  ask            Append a clarifying question to docs/open-questions.md.
  brief          Print a paste-ready context digest to resume in a fresh AI session.
  dashboard      Write a read-only HTML project status dashboard.
  checkpoint     Record a session lifecycle checkpoint (idea/prd/build/verify/release).
  timeline       Show the recorded session checkpoints.
  install-ownership Install local ownership/review routing rules.
  review-route   Route changed paths to docs, checks, and reviewer skill lenses.
  skill lint      Check development skills for AI collaboration guardrails.
  workflow check  Check skill workflow guardrails; --strict exits non-zero on gaps.
  install-pr-template Install a GitHub PR template that gates PRs against PRD/scope/tests.
  install-hook   Install a git pre-commit gate: block commits that skip docs/ updates.
  uninstall-hook Remove the ai-pm-dev pre-commit gate.
  status         Show the saved task state for a target project.
  doctor         Check the package and optional target project setup.
  config         Store or inspect default CLI settings.
  onboarding     Show the shortest beginner path.
  release-check  Show release readiness checks.
`);
}

function runNodeScript(scriptName, args) {
  const scriptPath = join(repoRoot, 'scripts', scriptName);
  // Run in the user's working directory, not the package root, so a relative target
  // like `.` resolves against where the user actually invoked the CLI.
  return execFileSync('node', [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parseTarget(args) {
  const targetIndex = args.indexOf('--target');
  if (targetIndex >= 0) {
    return args[targetIndex + 1] ?? process.cwd();
  }
  return readConfig().defaultTarget ?? process.cwd();
}

function parseValue(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
}

function formatStamp(date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)}-${iso.slice(11, 19).replace(/:/g, '')}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'prd-session';
}

// Clean session suffix. If the idea contains CJK/kana, a latin slug would only surface
// scattered fragments (e.g. "yes-no-no-next"), so fall back to a stable 'session' name.
// Pure-latin ideas keep a meaningful slug from the first 80 chars, capped at 6 tokens.
function sessionSlug(idea) {
  const head = (idea || '').slice(0, 80);
  if (/[぀-鿿]/.test(head)) {
    return 'session';
  }
  const tokens = slugify(head).split('-').filter(Boolean).slice(0, 6);
  const joined = tokens.join('-');
  return joined && joined !== 'prd-session' ? joined : 'session';
}

function nowForSession() {
  return process.env.AI_PM_DEV_FIXED_TIME
    ? new Date(process.env.AI_PM_DEV_FIXED_TIME)
    : new Date();
}

function configDir() {
  return process.env.AI_PM_DEV_HOME
    ? resolve(process.env.AI_PM_DEV_HOME)
    : join(homedir(), '.ai-pm-dev');
}

function configPath() {
  return join(configDir(), 'config.json');
}

function readConfig() {
  const path = configPath();
  if (!existsSync(path)) {
    return {};
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeConfig(config) {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function formatCheck(name, pass, fix = '') {
  const status = pass ? 'PASS' : 'FAIL';
  return `${name}: ${status}${pass || !fix ? '' : `\n  Fix: ${fix}`}`;
}

function runInit(args) {
  const [target, ...rest] = args;
  if (!target || target.startsWith('-')) {
    throw new Error('Usage: ai-pm-dev init <target> [--dry-run] [--force] [--include-readme]');
  }
  // Resolve the target against the user's cwd up front so it never lands in the package dir.
  const absoluteTarget = resolve(process.cwd(), target);
  return runNodeScript('init-ai-pm-dev.mjs', ['--target', absoluteTarget, ...rest]);
}

function runStart(args) {
  const [task, ...rest] = args;
  if (!task || task.startsWith('-')) {
    throw new Error('Usage: ai-pm-dev start "<task>" [--type <type>] [--target <path>] [--save]');
  }
  const hasTarget = rest.includes('--target');
  const defaultTarget = readConfig().defaultTarget;
  const targetArgs = hasTarget || !defaultTarget ? [] : ['--target', defaultTarget];
  return runNodeScript('start-task.mjs', ['--task', task, ...targetArgs, ...rest]);
}

function gitHooksDir(target) {
  const gitDir = join(target, '.git');
  if (!existsSync(gitDir)) {
    throw new Error(`Not a git repository (no .git): ${target}. Run "git init" first.`);
  }
  if (!statSync(gitDir).isDirectory()) {
    throw new Error(`.git is not a directory (worktrees/submodules are not supported): ${target}`);
  }
  return join(gitDir, 'hooks');
}

function runInstallHook(args) {
  const target = resolve(parseTarget(args));
  const hooksDir = gitHooksDir(target);
  const hookPath = join(hooksDir, 'pre-commit');

  if (existsSync(hookPath) && !readFileSync(hookPath, 'utf8').includes(HOOK_MARKER)) {
    throw new Error(`A pre-commit hook already exists and was not created by ai-pm-dev:\n  ${hookPath}\nRemove or merge it manually, then re-run.`);
  }

  mkdirSync(hooksDir, { recursive: true });
  writeFileSync(hookPath, preCommitScript(), 'utf8');
  try {
    chmodSync(hookPath, 0o755);
  } catch {
    // Windows filesystems may not support chmod; Git for Windows runs the hook anyway.
  }

  return `Installed git pre-commit gate -> ${hookPath}

It blocks any commit that changes code/content without updating docs/.
Bypass intentionally with: git commit --no-verify
Remove with: ai-pm-dev uninstall-hook --target "${target}"
`;
}

function runUninstallHook(args) {
  const target = resolve(parseTarget(args));
  const hookPath = join(target, '.git', 'hooks', 'pre-commit');

  if (!existsSync(hookPath)) {
    return `No pre-commit hook found at ${hookPath}\n`;
  }
  if (!readFileSync(hookPath, 'utf8').includes(HOOK_MARKER)) {
    throw new Error(`The pre-commit hook was not created by ai-pm-dev; leaving it untouched:\n  ${hookPath}`);
  }
  rmSync(hookPath, { force: true });
  return `Removed ai-pm-dev pre-commit gate from ${hookPath}\n`;
}

function runInstallPrTemplate(args) {
  const target = resolve(parseTarget(args));
  const force = args.includes('--force');
  const templatePath = join(target, '.github', 'PULL_REQUEST_TEMPLATE.md');

  if (existsSync(templatePath)) {
    const current = readFileSync(templatePath, 'utf8');
    if (!current.includes(PR_TEMPLATE_MARKER) && !force) {
      throw new Error(`A GitHub PR template already exists and was not created by ai-pm-dev:\n  ${templatePath}\nRe-run with --force to replace it intentionally.`);
    }
  }

  mkdirSync(dirname(templatePath), { recursive: true });
  writeFileSync(templatePath, prTemplateContent(), 'utf8');
  return `Installed GitHub PR template gate -> ${templatePath}

It asks every PR to name the PRD session, mapped must-have, non-goal boundary, docs updates, and test evidence.
`;
}

function protectGeneratedFile(path, marker, force, description) {
  if (!existsSync(path)) {
    return;
  }
  const current = readFileSync(path, 'utf8');
  if (!current.includes(marker) && !force) {
    throw new Error(`${description} already exists and was not created by ai-pm-dev:\n  ${path}\nRe-run with --force to replace it intentionally.`);
  }
}

function runInstallOwnership(args) {
  const target = resolve(parseTarget(args));
  const force = args.includes('--force');
  const mdPath = join(target, 'docs', 'ownership.md');
  const jsonPath = join(target, '.ai-pm-dev', 'owners.json');

  protectGeneratedFile(mdPath, OWNERSHIP_MARKER, force, 'Ownership doc');
  protectGeneratedFile(jsonPath, OWNERSHIP_MARKER, force, 'Owners routing file');

  mkdirSync(dirname(mdPath), { recursive: true });
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(mdPath, ownershipMarkdown(), 'utf8');
  writeFileSync(jsonPath, ownershipJson(), 'utf8');

  return `Installed ownership routing -> ${mdPath}
Installed machine-readable routes -> ${jsonPath}

Use: ai-pm-dev review-route --paths "docs/scope.md,bin/ai-pm-dev.mjs" --target "${target}"
`;
}

function normalizeRoutePath(value) {
  return (value || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function parseRoutePaths(args, target) {
  const explicit = parseValue(args, '--paths');
  if (explicit) {
    return explicit.split(/[,;\n]+/).map(normalizeRoutePath).filter(Boolean);
  }
  try {
    const unstaged = execFileSync('git', ['-C', target, 'diff', '--name-only'], { encoding: 'utf8' });
    const staged = execFileSync('git', ['-C', target, 'diff', '--cached', '--name-only'], { encoding: 'utf8' });
    return [...new Set(`${unstaged}\n${staged}`.split(/\r?\n/).map(normalizeRoutePath).filter(Boolean))];
  } catch {
    throw new Error('Usage: ai-pm-dev review-route [--target <path>] --paths "docs/scope.md,bin/ai-pm-dev.mjs"');
  }
}

function runReviewRoute(args) {
  const target = resolve(parseTarget(args));
  const paths = parseRoutePaths(args, target);
  if (!paths.length) {
    return `Review Route\n\nNo changed paths found. Pass --paths "path1,path2" or run inside a git repo with changes.\n`;
  }

  const matched = [];
  for (const rule of ownershipRules) {
    const changed = paths.filter((path) => ruleMatchesPath(rule, path));
    if (changed.length) {
      matched.push({ rule, changed });
    }
  }

  if (!matched.length) {
    return `Review Route

Paths:
${paths.map((path) => `- ${path}`).join('\n')}

No ownership route matched. Use code-review and update docs/progress.md with what changed.
`;
  }

  const blocks = matched.map(({ rule, changed }) => `## ${rule.name}

Changed paths:
${changed.map((path) => `- ${path}`).join('\n')}

Owner / skill lens: ${rule.owner}
Review focus: ${rule.review}

Docs to read:
${rule.docs.map((doc) => `- ${doc}`).join('\n')}

Checks:
${rule.checks.map((check) => `- ${check}`).join('\n')}`).join('\n\n');

  return `Review Route

Target: ${target}

${blocks}
`;
}

function runReviewPacket(args) {
  const target = resolve(parseTarget(args));
  const baseRef = parseValue(args, '--base');
  const outValue = parseValue(args, '--out');
  if (args.includes('--out') && !outValue) {
    throw new Error('Usage: ai-pm-dev review-packet [--target <path>] [--base <ref>] [--out <file>]');
  }

  const packet = buildReviewPacket({ target, baseRef });
  if (!outValue) {
    return packet;
  }

  const outPath = resolve(process.cwd(), outValue);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, packet, 'utf8');
  return `Review packet written: ${outPath}\n`;
}

const workflowSkillNames = [
  'dev-planner',
  'dev-builder',
  'bug-fixer',
  'code-review',
  'release-builder',
];

const workflowGuardrailChecks = [
  {
    id: 'context',
    label: 'Context is explicit before action',
    patterns: [/context/i, /review-route/i, /docs\/scope\.md/i, /actual\/expected\/repro/i],
    hint: 'Add a context-pack, review-route, repro, or docs-to-read instruction.',
  },
  {
    id: 'verification',
    label: 'Verification evidence is required',
    patterns: [/verification/i, /verify/i, /test/i, /evidence/i, /prd check --strict/i],
    hint: 'Name the command, manual flow, evidence, or strict gate that proves the work.',
  },
  {
    id: 'risk-boundary',
    label: 'Risk boundaries require confirmation',
    patterns: [/risk/i, /boundary/i, /security/i, /permission/i, /destructive/i, /data-loss/i, /auth/i, /secrets/i],
    hint: 'Call out security, permission, destructive, data, auth, or other human-owned boundaries.',
  },
  {
    id: 'docs-update',
    label: 'Docs/memory updates are required',
    patterns: [/docs update/i, /update docs/i, /documentation/i, /decision-record/i, /pitfall/i, /release-checklist/i, /local-run-guide/i, /demo-script/i],
    hint: 'Require the relevant docs, decision, pitfall, release, or troubleshooting record to move with the work.',
  },
  {
    id: 'rollback',
    label: 'Rollback path is named for risky work',
    patterns: [/rollback/i],
    hint: 'Add rollback guidance for risky changes, releases, migrations, data, or config edits.',
  },
];

function listWorkflowSkillPaths(target) {
  const skillsDir = join(target, 'skills');
  return workflowSkillNames.map((name) => ({
    name,
    path: join(skillsDir, name, 'SKILL.md'),
  }));
}

function evaluateWorkflowSkill(skillPath) {
  if (!existsSync(skillPath)) {
    return {
      exists: false,
      checks: workflowGuardrailChecks.map((check) => ({ ...check, pass: false })),
    };
  }
  const body = readFileSync(skillPath, 'utf8');
  return {
    exists: true,
    checks: workflowGuardrailChecks.map((check) => ({
      ...check,
      pass: check.patterns.some((pattern) => pattern.test(body)),
    })),
  };
}

function runWorkflowCheck(args, title = 'Workflow Check') {
  const target = resolve(parseTarget(args));
  const strict = args.includes('--strict');
  const skills = listWorkflowSkillPaths(target);
  const results = skills.map((skill) => ({
    ...skill,
    result: evaluateWorkflowSkill(skill.path),
  }));

  const totalChecks = results.reduce((sum, item) => sum + item.result.checks.length, 0);
  const passedChecks = results.reduce((sum, item) => sum + item.result.checks.filter((check) => check.pass).length, 0);
  const missingSkills = results.filter((item) => !item.result.exists);
  const failedChecks = results.flatMap((item) => item.result.checks
    .filter((check) => !check.pass)
    .map((check) => ({ skill: item.name, path: item.path, check })));
  const overall = failedChecks.length || missingSkills.length ? 'FAIL' : 'PASS';

  if (strict && overall === 'FAIL') {
    process.exitCode = 1;
  }

  const skillBlocks = results.map((item) => {
    if (!item.result.exists) {
      return `FAIL ${item.name}
  missing: ${item.path}`;
    }
    const lines = item.result.checks.map((check) => `  ${check.pass ? 'PASS' : 'FAIL'} ${check.id}: ${check.label}${check.pass ? '' : ` (${check.hint})`}`);
    return `${item.result.checks.every((check) => check.pass) ? 'PASS' : 'FAIL'} ${item.name}
${lines.join('\n')}`;
  }).join('\n\n');

  return `${title}${strict ? ' (strict)' : ''}

Target: ${target}
Overall: ${overall} (${passedChecks}/${totalChecks} guardrail checks passed)

${skillBlocks}
${strict && overall === 'FAIL' ? '\nStrict mode: exiting non-zero because workflow guardrails are missing.\n' : '\n'}`;
}

function runSkill(args) {
  const [subcommand, ...rest] = args;
  if (subcommand === 'lint') {
    return runWorkflowCheck(rest, 'Skill Lint');
  }
  throw new Error('Usage: ai-pm-dev skill lint [--target <path>] [--strict]');
}

function runWorkflow(args) {
  const [subcommand, ...rest] = args;
  if (subcommand === 'check') {
    return runWorkflowCheck(rest, 'Workflow Check');
  }
  throw new Error('Usage: ai-pm-dev workflow check [--target <path>] [--strict]');
}

function runStatus(args) {
  const target = resolve(parseTarget(args));
  const statePath = join(target, '.ai-pm-dev', 'state.json');

  if (!existsSync(statePath)) {
    return `No saved AI PM Dev task state found at ${statePath}\nRun: ai-pm-dev start "<task>" --target "${target}" --save\n`;
  }

  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  return `AI PM Dev Agent Status

Target: ${target}
Current Phase: ${state.phase}
Current Skill: ${state.skill}
Skill Path: ${state.skillPath}
Task: ${state.task}
Next Step: ${state.nextStep}
Updated At: ${state.updatedAt}
`;
}

function hasPackageAssets() {
  const requiredPaths = [
    'CLAUDE.md',
    'README.md',
    'README.zh-CN.md',
    'skills',
    'templates',
    'memory',
    'bin/ai-pm-dev.mjs',
    'scripts/init-ai-pm-dev.mjs',
    'scripts/start-task.mjs',
  ];
  return requiredPaths.every((item) => existsSync(join(repoRoot, item)));
}

function hasAllSkills(target) {
  return requiredSkills.every((skill) => existsSync(join(target, 'skills', skill, 'SKILL.md')));
}

const staleReferenceExtensions = [
  'md',
  'mjs',
  'js',
  'ts',
  'tsx',
  'json',
  'css',
  'html',
  'yml',
  'yaml',
];

const staleReferencePattern = new RegExp(
  [
    String.raw`(?:^|[\s([{"'` + '`' + String.raw`])`,
    String.raw`((?:(?:\.{1,2}[\\/])?(?:[A-Za-z0-9._-]+[\\/])+[A-Za-z0-9._-]+\.`,
    String.raw`(?:${staleReferenceExtensions.join('|')})(?::\d+)?)`,
    String.raw`|(?:(?:AGENTS|CLAUDE)\.md(?::\d+)?))`,
  ].join(''),
  'g',
);

function isInsideRoot(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !/^[A-Za-z]:/.test(rel) && !rel.startsWith('\\'));
}

function normalizedRelativePath(root, path) {
  return relative(root, path).replace(/\\/g, '/');
}

function collectMarkdownFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectMarkdownFiles(path);
      }
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
    });
}

function doctorReferenceDocs(target) {
  return [
    join(target, 'AGENTS.md'),
    join(target, 'CLAUDE.md'),
    ...collectMarkdownFiles(join(target, 'docs')),
  ].filter((path) => existsSync(path)).sort();
}

function stripReferenceToken(value) {
  return value
    .trim()
    .replace(/^[`"'(<[]+/, '')
    .replace(/[>`"')\].,;]+$/, '');
}

function isSkippableReferenceToken(token) {
  return !token
    || token.includes('://')
    || token.startsWith('mailto:')
    || token.startsWith('#')
    || token.startsWith('?')
    || token.startsWith('/')
    || /^[A-Za-z]:[\\/]/.test(token);
}

function parseReferenceToken(token) {
  const cleaned = stripReferenceToken(token);
  if (isSkippableReferenceToken(cleaned)) {
    return null;
  }
  const lineMatch = cleaned.match(/^(.*):(\d+)$/);
  return {
    path: (lineMatch ? lineMatch[1] : cleaned).replace(/\\/g, '/'),
    line: lineMatch ? Number(lineMatch[2]) : null,
  };
}

function lineCount(path) {
  return readFileSync(path, 'utf8').split(/\r?\n/).length;
}

function skipOptionalOperatingReference(docPath, line, refPath) {
  const name = docPath.split(/[\\/]/).at(-1);
  if (name !== 'AGENTS.md' && name !== 'CLAUDE.md') {
    return false;
  }
  return /on demand/i.test(line)
    || ['docs/scope.md', 'memory/current-ai-prd.md'].includes(refPath);
}

function staleReferences(target) {
  const root = resolve(target);
  const findings = [];
  for (const docPath of doctorReferenceDocs(root)) {
    const lines = readFileSync(docPath, 'utf8').split(/\r?\n/);
    let fenceMarker = '';
    lines.forEach((line, index) => {
      const fenceMatch = line.match(/^\s*(```|~~~)/);
      if (fenceMatch && (!fenceMarker || fenceMatch[1] === fenceMarker)) {
        fenceMarker = fenceMarker ? '' : fenceMatch[1];
        return;
      }
      if (fenceMarker || /^(?: {4}|\t)/.test(line)) {
        return;
      }
      staleReferencePattern.lastIndex = 0;
      for (const match of line.matchAll(staleReferencePattern)) {
        const ref = parseReferenceToken(match[1]);
        if (!ref || skipOptionalOperatingReference(docPath, line, ref.path)) {
          continue;
        }
        const candidate = resolve(root, ref.path);
        if (!isInsideRoot(root, candidate)) {
          continue;
        }
        if (!existsSync(candidate)) {
          findings.push({
            source: `${normalizedRelativePath(root, docPath)}:${index + 1}`,
            reference: ref.line ? `${ref.path}:${ref.line}` : ref.path,
            reason: 'file not found',
          });
          continue;
        }
        if (ref.line !== null && (ref.line < 1 || ref.line > lineCount(candidate))) {
          findings.push({
            source: `${normalizedRelativePath(root, docPath)}:${index + 1}`,
            reference: `${ref.path}:${ref.line}`,
            reason: `line out of range (file has ${lineCount(candidate)} lines)`,
          });
        }
      }
    });
  }
  return findings;
}

function formatStaleReferenceCheck(findings) {
  if (!findings.length) {
    return 'Stale references: PASS';
  }
  const shown = findings.slice(0, 10).map((finding) => `  - ${finding.source} -> ${finding.reference} (${finding.reason})`);
  const hiddenCount = findings.length - shown.length;
  return `Stale references: WARN
${shown.join('\n')}${hiddenCount > 0 ? `\n  ... ${hiddenCount} more` : ''}`;
}

function runDoctor(args) {
  const target = resolve(parseTarget(args));
  const packageAssetsOk = hasPackageAssets();
  const targetExists = existsSync(target);
  const targetInitialized = targetExists && existsSync(join(target, 'CLAUDE.md')) && hasAllSkills(target);
  const coreDocs = [
    'PROJECT_BRIEF.md',
    'UI_SPEC.md',
    'acceptance-tests.md',
    'decision-log.md',
    'open-questions.md',
    'progress.md',
    'troubleshooting.md',
  ];
  const operatingLayerOk = targetExists
    && existsSync(join(target, 'AGENTS.md'))
    && coreDocs.every((doc) => existsSync(join(target, 'docs', doc)));
  const stubDocs = operatingLayerOk
    ? coreDocs.filter((doc) => docIsStub(join(target, 'docs', doc)))
    : [];
  const docsNudge = operatingLayerOk
    ? (stubDocs.length
      ? `Docs still empty stubs: ${stubDocs.join(', ')}\n  Fill with: ai-pm-dev decide/note/pitfall, or ai-pm-dev prd`
      : 'Docs filled: all core docs have content')
    : '';
  // Catch the common drift: a separate CHANGELOG while the operating-layer record is empty.
  const competingRecord = operatingLayerOk
    && existsSync(join(target, 'CHANGELOG.md'))
    && docIsStub(join(target, 'docs', 'decision-log.md'))
    ? 'CHANGELOG.md exists but docs/decision-log.md is empty — record decisions with ai-pm-dev decide, not a separate file'
    : '';
  const promptExists = targetExists && existsSync(join(target, 'memory', 'current-task-prompt.md'));
  const stateExists = targetExists && existsSync(join(target, '.ai-pm-dev', 'state.json'));
  const installedSkillCount = targetExists && existsSync(join(target, 'skills'))
    ? readdirSync(join(target, 'skills'), { withFileTypes: true }).filter((item) => item.isDirectory()).length
    : 0;
  const staleReferenceFindings = targetExists ? staleReferences(target) : [];

  return `AI PM Dev Doctor

Node: ${process.version}
Package root: ${repoRoot}
Target: ${target}

${formatCheck('Package assets', packageAssetsOk, 'Reinstall with: npm install -g github:Andrew-JX/ai-pm-dev')}
${formatCheck('Target exists', targetExists, `Create the directory or check the path: ${target}`)}
${formatCheck('Target initialized', targetInitialized, `ai-pm-dev init "${target}"`)}
${formatCheck('Operating layer (AGENTS.md + docs/)', operatingLayerOk, `ai-pm-dev init "${target}"`)}${docsNudge ? `\n${docsNudge}` : ''}${competingRecord ? `\n${competingRecord}` : ''}
Installed skills: ${installedSkillCount}/${requiredSkills.length}
${formatCheck('Task prompt', promptExists, `ai-pm-dev start "<task>" --target "${target}" --save`)}
${formatCheck('Task state', stateExists, `ai-pm-dev start "<task>" --target "${target}" --save`)}
${formatStaleReferenceCheck(staleReferenceFindings)}
`;
}

function runOnboarding() {
  return `AI PM Dev Onboarding

1. Open your product project:
   cd <your-product-project>

2. Install the project operating layer once:
   ai-pm-dev init .
   This creates AGENTS.md (the entry file downstream AI tools read), docs/ project docs,
   skills/, and memory/. Open the project in Claude Code or Codex and they read AGENTS.md.

3. Run the interactive PRD interview:
   ai-pm-dev prd
   This fills docs/PROJECT_BRIEF.md, docs/UI_SPEC.md, docs/acceptance-tests.md and more.

4. Review generated product assets:
   docs/PROJECT_BRIEF.md
   .ai-pm-dev/prd-sessions/<latest-session>/ai-prd.md

5. Optional: copy a tool-specific handoff prompt:
   ai-pm-dev prd handoff --to codex
   ai-pm-dev prd handoff --to v0
   ai-pm-dev prd handoff --to figma

6. Check setup any time:
   ai-pm-dev doctor
`;
}

function runReleaseCheck() {
  return `AI PM Dev Release Check

Required before publishing:
- npm test
- npm pack --dry-run
- ai-pm-dev --help
- ai-pm-dev doctor
- Verify README.md and README.zh-CN.md installation instructions
- Verify CHANGELOG.md includes the release
- Confirm package.json version, bin, files, license, and description
- Create a git tag after release approval

Suggested commands:
  npm test
  npm pack --dry-run
  node bin/ai-pm-dev.mjs --help
  node bin/ai-pm-dev.mjs doctor
`;
}

function section(title, value) {
  return `## ${title}\n\n${value.trim() || 'Not specified.'}\n`;
}

function buildAiPrd(answers) {
  return `# AI-PRD: ${answers.idea}

${section('Target Users', answers.targetUsers)}
${section('Pain Points', answers.painPoints)}
${section('Current Workaround', answers.currentWorkaround)}
${section('Core User Workflow', answers.coreWorkflow)}
${section('MVP Must-Haves (max 3)', answers.mvpScope)}
${section('The One Thing (ships first)', answers.oneThing)}
${section('Non-Goals (explicitly not doing)', answers.nonGoals)}
${section('Data Model', answers.dataModel)}
${section('Deterministic Rules', answers.deterministicRules)}
${section('AI Usage Boundaries', answers.aiBoundaries)}
${section('Trust and Evidence Mechanism', answers.trustMechanism)}
${section('Risks and Guardrails', answers.risks)}
${section('Acceptance Criteria', answers.acceptanceCriteria)}
## PM Notes

- Prefer deterministic calculation for product state, metrics, permissions, and completion checks.
- Use AI for summarization, explanation, recommendation drafts, and ambiguity handling only when the AI output can be inspected.
- Downstream implementation work should preserve this PRD as the source of truth.
`;
}

function buildPrototypeBrief(answers) {
  return `# Prototype Brief: ${answers.idea}

## Goal

Create a clickable prototype that demonstrates the core workflow: ${answers.coreWorkflow}

## Screens or States

- Entry state for the target user: ${answers.targetUsers}
- Main task state covering the MVP: ${answers.mvpScope}
- Data and progress state using: ${answers.dataModel}
- AI output state with evidence: ${answers.trustMechanism}

## Interaction Requirements

- Use mock data only.
- Show at least one deterministic metric or rule: ${answers.deterministicRules}
- Show AI behavior only inside the boundary: ${answers.aiBoundaries}
- Make risks visible enough for review: ${answers.risks}
`;
}

function buildCodexHandoff(answers) {
  return `# Codex Implementation Handoff

Build the first implementation slice for: ${answers.idea}

Read \`ai-prd.md\`, \`scope.md\`, and \`acceptance-tests.md\` first. Treat them as the product source of truth and do not expand v1 beyond them.

## Product Context

- Target users: ${answers.targetUsers}
- Core workflow: ${answers.coreWorkflow}
- MVP scope: ${answers.mvpScope}
- Non-goals: ${answers.nonGoals}

## Engineering Requirements

- Model this data: ${answers.dataModel}
- Implement deterministic logic for: ${answers.deterministicRules}
- Keep AI behavior inside this boundary: ${answers.aiBoundaries}
- Expose evidence or state behind AI output: ${answers.trustMechanism}

## Verification

- Acceptance criteria: ${answers.acceptanceCriteria}
- Risk checks: ${answers.risks}
- Report tests run, residual risk, and any PRD ambiguity before completion.
`;
}

function buildV0Handoff(answers) {
  return `# v0 Prototype Handoff

Create a polished interactive prototype for: ${answers.idea}

Read \`ai-prd.md\`, \`scope.md\`, and \`acceptance-tests.md\` first. Prototype only the declared v1 slice.

Audience: ${answers.targetUsers}
Problem: ${answers.painPoints}
Workflow: ${answers.coreWorkflow}
MVP scope: ${answers.mvpScope}
Non-goals: ${answers.nonGoals}

Use realistic mock data for: ${answers.dataModel}
Show deterministic calculations for: ${answers.deterministicRules}
Show AI summary/recommendation behavior only for: ${answers.aiBoundaries}
Include an evidence panel that shows: ${answers.trustMechanism}

Do not build auth, backend persistence, payments, or social features unless they are explicitly in MVP scope.
`;
}

function buildFigmaHandoff(answers) {
  return `# Figma Design Handoff

Design an editable product prototype for: ${answers.idea}

Read \`ai-prd.md\`, \`scope.md\`, and \`acceptance-tests.md\` first. The design should make the acceptance path visible.

## User and Scenario

- User: ${answers.targetUsers}
- Pain: ${answers.painPoints}
- Current workaround: ${answers.currentWorkaround}

## Flow

Represent this flow as connected screens and states:
${answers.coreWorkflow}

## Product Constraints

- MVP scope: ${answers.mvpScope}
- Non-goals: ${answers.nonGoals}
- Data shown in UI: ${answers.dataModel}
- Deterministic state/metrics: ${answers.deterministicRules}
- AI boundary: ${answers.aiBoundaries}
- Evidence and trust: ${answers.trustMechanism}
- Risks: ${answers.risks}
`;
}

function buildRisksDoc(answers) {
  return `# Risks: ${answers.idea}

## Known Risks

${answers.risks}

## Required Guardrails

- Keep deterministic rules out of free-form AI generation: ${answers.deterministicRules}
- Keep AI inside the product boundary: ${answers.aiBoundaries}
- Show evidence for AI output: ${answers.trustMechanism}
`;
}

function buildAcceptanceTests(answers) {
  return `# Acceptance Tests: ${answers.idea}

## Product Acceptance

${answers.acceptanceCriteria}

## Test Scenarios

1. A target user can complete the core workflow: ${answers.coreWorkflow}
2. The product records or displays required data: ${answers.dataModel}
3. Deterministic rules are calculated without AI guessing: ${answers.deterministicRules}
4. AI output stays inside the declared boundary: ${answers.aiBoundaries}
5. AI output shows evidence or state: ${answers.trustMechanism}
6. Risk guardrails are visible in the workflow: ${answers.risks}
`;
}

function answerText(answers, key) {
  return (answers[key] || '').trim();
}

function answerIsThin(answers, key, minLength = 18) {
  const text = answerText(answers, key);
  return text.length > 0 && text.length < minLength;
}

function questionByKey(key) {
  return prdQuestions.find((question) => question.key === key);
}

function followUpItem(key, question, why) {
  return {
    key,
    label: questionByKey(key)?.label || key,
    question,
    why,
  };
}

function buildAdaptiveFollowUps(answers, activeQuestions = prdQuestions) {
  const activeKeys = new Set(activeQuestions.map((question) => question.key));
  const has = (key) => activeKeys.has(key) && answerText(answers, key).length > 0;
  const missing = (key) => activeKeys.has(key) && !has(key);
  const items = [];
  const add = (key, question, why) => {
    if (activeKeys.has(key) && !items.some((item) => item.key === key && item.question === question)) {
      items.push(followUpItem(key, question, why));
    }
  };

  if (missing('targetUsers') || answerIsThin(answers, 'targetUsers')) {
    add('targetUsers', 'Who is the first narrow user segment, and what makes them more urgent than adjacent users?', 'A broad audience makes scope and UX choices mushy.');
  }
  if (missing('painPoints') || answerIsThin(answers, 'painPoints')) {
    add('painPoints', 'What exact moment hurts enough that this user would try a new tool now?', 'The PRD needs a sharp use case, not just a category problem.');
  }
  if (missing('currentWorkaround')) {
    add('currentWorkaround', 'How do users solve this today, and what is frustrating or expensive about that workaround?', 'The workaround reveals switching cost and what v1 must beat.');
  }
  if (missing('coreWorkflow') || answerIsThin(answers, 'coreWorkflow')) {
    add('coreWorkflow', 'Write the entry-to-value path in 3-5 steps: user starts where, does what, and gets what result?', 'Downstream design and implementation need a concrete flow.');
  }
  if (missing('mvpScope')) {
    add('mvpScope', 'List exactly 1-3 v1 must-haves. What gets deferred even if it sounds useful?', 'The project needs a small enough build slice to protect momentum.');
  } else if (countItems(answerText(answers, 'mvpScope')) > 3) {
    add('mvpScope', 'Cut the v1 must-haves to 3 or fewer. Which items move to later, and why?', 'More than 3 must-haves means prioritization has not happened yet.');
  }
  if (missing('oneThing')) {
    add('oneThing', 'If only one feature shipped this week, which one would prove the product idea?', 'The one thing prevents a grab bag MVP.');
  }
  if (missing('nonGoals')) {
    add('nonGoals', 'Name at least one attractive thing v1 will deliberately not do, and why it is out.', 'A real non-goal is the clearest proof that scope was cut.');
  }
  if (missing('dataModel')) {
    add('dataModel', 'What data must be created, stored, imported, or displayed for the core workflow to work?', 'Data boundaries shape screens, tests, and engineering slices.');
  }
  if (missing('deterministicRules')) {
    add('deterministicRules', 'Which calculations, permissions, statuses, or rankings must be deterministic instead of AI-generated?', 'Deterministic rules keep product state inspectable.');
  }
  if (missing('aiBoundaries')) {
    add('aiBoundaries', 'What may AI suggest or summarize, and what must it never decide by itself?', 'AI boundaries reduce hallucination and product safety risk.');
  }
  if (missing('trustMechanism')) {
    add('trustMechanism', 'What evidence, source records, or state should appear beside AI output so users can verify it?', 'Trust requires inspectable evidence, not just confident prose.');
  }
  if (missing('risks')) {
    add('risks', 'What privacy, permission, safety, or misleading-output risk could make v1 unacceptable?', 'Risks should become guardrails before implementation starts.');
  }

  const metric = answerText(answers, 'acceptanceCriteria');
  const metricLooksVague = metric && !/\d|%|minute|min|second|sec|within|less than|at least|complete|finish/i.test(metric);
  if (missing('acceptanceCriteria')) {
    add('acceptanceCriteria', 'What single measurable signal proves v1 worked: one number, threshold, or observable result?', 'A primary metric turns the PRD into a gate instead of a wish.');
  } else if (metricLooksVague) {
    add('acceptanceCriteria', 'Make the success metric measurable: what exact number, threshold, or observable result should pass?', 'Vague success criteria are hard to test or review.');
  }

  return items.slice(0, 8);
}

function buildFollowUpQuestionsDoc(answers, followUps) {
  const rows = followUps.length
    ? followUps.map((item, index) => `${index + 1}. **${item.label}**\n   - Question: ${item.question}\n   - Why: ${item.why}`).join('\n\n')
    : 'No major gaps detected by the local analyzer. Run `ai-pm-dev prd check --strict` for the gate.';

  return `# Adaptive Follow-up Questions: ${answers.idea || 'Untitled'}

Generated locally by \`ai-pm-dev prd\`. No LLM API was called.

Use these questions for the next PM pass before handing work to an implementation tool.

${rows}

## Paste-ready PM Challenge

Read \`ai-prd.md\`, \`scope.md\`, and the questions above. Ask only the unanswered questions that matter for v1. Force these decisions before implementation: cut must-haves to 3, choose the one thing, name at least one non-goal, and define one measurable success signal.
`;
}

function buildConversation(answers) {
  return `# PRD Interview Conversation

${prdQuestions.map((question) => `## ${question.label}\n\nQ: ${question.prompt}\n\nA: ${answers[question.key] || ''}`).join('\n\n')}
`;
}

function buildProjectBriefDoc(answers) {
  return `# Project Brief

Purpose: the product source of truth. Read this before any task.
Seeded by \`ai-pm-dev prd\`.

## One-liner

${answers.idea.trim() || 'Not specified.'}

${section('Target users', answers.targetUsers)}
${section('Pain / scenario', answers.painPoints)}
${section('Current workaround', answers.currentWorkaround)}
${section('Core workflow', answers.coreWorkflow)}
${section('MVP must-haves (max 3)', answers.mvpScope)}
${section('The one thing (ships first)', answers.oneThing)}
${section('Non-goals (explicitly not doing)', answers.nonGoals)}
${section('Data the product records or generates', answers.dataModel)}`;
}

function buildScopeDoc(answers) {
  const items = splitItems(answers.mvpScope);
  const kept = items.slice(0, 3);
  const cut = items.slice(3);
  return `# Scope: ${answers.idea}

Forced by \`ai-pm-dev prd\` to make prioritization explicit.

## Must-haves (v1, max 3)

${kept.length ? kept.map((item) => `- ${item}`).join('\n') : '- Not specified.'}

## The one thing (proves the idea)

${answers.oneThing.trim() || 'Not specified.'}

## Explicitly not doing (v1)

${answers.nonGoals.trim() || 'Not specified.'}

## Cut / deferred to later

${cut.length ? cut.map((item) => `- ${item}`).join('\n') : '- (nothing over the 3-item line)'}

## Primary success metric

${answers.acceptanceCriteria.trim() || 'Not specified.'}
`;
}

function buildUiSpecDoc(answers) {
  return `# UI Spec

Purpose: screens, states, interaction, and visual direction for downstream UI tools.
Seeded by \`ai-pm-dev prd\`; refine with design-brief-builder / design-maker.

${section('Screens / states', answers.coreWorkflow)}
${section('Interaction rules', answers.mvpScope)}
${section('Trust / evidence shown in UI', answers.trustMechanism)}`;
}

function buildAcceptanceDoc(answers) {
  return buildAcceptanceTests(answers);
}

// Write a seeded doc only if it is missing or still an unfilled stub.
// A user-filled doc (stub marker gone) is left untouched.
function seedDoc(path, content) {
  if (existsSync(path)) {
    const current = readFileSync(path, 'utf8');
    if (!/\*\*Status:\*\* TODO/.test(current)) {
      return false;
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${content.trimEnd()}\n`, 'utf8');
  return true;
}

// A doc still untouched: either an unfilled stub (Status: TODO) or only placeholder rows.
function docIsStub(path) {
  if (!existsSync(path)) {
    return false;
  }
  const content = readFileSync(path, 'utf8');
  return docIsStubContent(content);
}

function appendRows(path, header, rows) {
  if (!rows.length) {
    return;
  }
  const raw = existsSync(path) ? readFileSync(path, 'utf8') : header;
  const base = stripPlaceholderRows(raw).trimEnd();
  writeFileSync(path, `${base}\n${rows.join('\n')}\n`, 'utf8');
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function appendMessage(args, usage) {
  const [message] = args;
  if (!message || message.startsWith('-')) {
    throw new Error(usage);
  }
  return message;
}

function runDecide(args) {
  const message = appendMessage(args, 'Usage: ai-pm-dev decide "<decision>" [--why <reason>] [--target <path>]');
  const target = resolve(parseTarget(args));
  const why = parseValue(args, '--why');
  const path = join(target, 'docs', 'decision-log.md');
  appendRows(path, DECISION_HEADER, [`| ${todayStamp()} | ${cell(message)} | ${cell(why) || '-'} | you |`]);
  return `Logged decision -> ${path}\n`;
}

function decisionRecordContent(title, options) {
  const value = (key, fallback) => clean(options[key]) || fallback;
  return `# Decision Record: ${title}

Status: proposed
Date: ${todayStamp()}

## Summary

${value('why', 'What decision are we making, and why now?')}

## PRD / Scope Link

- Latest PRD session: \`.ai-pm-dev/prd-sessions/<session>\`
- Scope source: \`docs/scope.md\`
- Acceptance source: \`docs/acceptance-tests.md\`

## Goals

${value('goals', '- What this change must achieve.')}

## Non-Goals

${value('nonGoals', '- What this change will deliberately not do.')}

## Proposal

Describe the chosen approach, key files/components, and why this is the smallest useful path.

## Risks and Mitigations

- Risk:
- Mitigation:

## Test Plan

${value('test', '- Commands, checks, screenshots, or manual flows that prove this works.')}

## Rollback Plan

${value('rollback', '- How to disable, revert, or safely back out this change.')}

## Readiness Checklist

- [ ] Goals are tied to a must-have in \`docs/scope.md\`.
- [ ] Non-goals are explicit enough to stop scope expansion.
- [ ] Acceptance tests or review checks cover the behavior.
- [ ] Rollback is understandable before implementation starts.
- [ ] Docs updates are known.

## Alternatives Considered

- Alternative:
- Why not:
`;
}

function runDecisionRecord(args) {
  const title = appendMessage(args, 'Usage: ai-pm-dev decision-record "<title>" [--why <reason>] [--goals <goals>] [--non-goals <non-goals>] [--test <plan>] [--rollback <plan>] [--target <path>]');
  const target = resolve(parseTarget(args));
  const recordsDir = join(target, 'docs', 'decision-records');
  const fileName = `${todayStamp()}-${slugify(title)}.md`;
  const path = join(recordsDir, fileName);
  const options = {
    why: parseValue(args, '--why'),
    goals: parseValue(args, '--goals'),
    nonGoals: parseValue(args, '--non-goals'),
    test: parseValue(args, '--test'),
    rollback: parseValue(args, '--rollback'),
  };

  mkdirSync(recordsDir, { recursive: true });
  writeFileSync(path, decisionRecordContent(title, options), 'utf8');
  appendRows(
    join(target, 'docs', 'decision-log.md'),
    DECISION_HEADER,
    [`| ${todayStamp()} | Decision record: ${cell(title)} | ${cell(options.why) || `See ${cell(join('docs', 'decision-records', fileName))}`} | you |`],
  );

  return `Wrote decision record -> ${path}
Review goals, non-goals, test plan, and rollback before implementation starts.
`;
}

function requireFlag(args, flag, usage) {
  const value = parseValue(args, flag);
  if (!value || value.startsWith('--')) {
    throw new Error(usage);
  }
  return value;
}

function defaultBugEnv() {
  return [
    `Node: ${process.version}`,
    `Platform: ${process.platform}`,
    `cwd: ${process.cwd()}`,
  ].join('\n');
}

function bugReportContent(title, options) {
  return `# Bug Report: ${title}

Status: open
Date: ${todayStamp()}

## Actual Behavior

${clean(options.actual)}

## Expected Behavior

${clean(options.expected)}

## Minimal Reproduction

${clean(options.repro)}

## Impact / Affected Area

${clean(options.impact)}

## Environment

\`\`\`text
${clean(options.env) || defaultBugEnv()}
\`\`\`

## Verification Plan

${clean(options.verify)}

## Investigation Notes

- Suspected layer:
- First failing version / change:
- Logs, screenshots, or links:

## Fix Checklist

- [ ] Reproduced with the minimal steps above.
- [ ] Fix stays inside current \`docs/scope.md\`.
- [ ] Added or updated a regression check.
- [ ] Ran the verification plan.
- [ ] Recorded any decision, pitfall, or follow-up question.
`;
}

function runBug(args) {
  const usage = 'Usage: ai-pm-dev bug "<title>" --actual <text> --expected <text> --repro <steps> --impact <scope> --verify <plan> [--env <info>] [--target <path>]';
  const title = appendMessage(args, usage);
  const target = resolve(parseTarget(args));
  const options = {
    actual: requireFlag(args, '--actual', usage),
    expected: requireFlag(args, '--expected', usage),
    repro: requireFlag(args, '--repro', usage),
    impact: requireFlag(args, '--impact', usage),
    verify: requireFlag(args, '--verify', usage),
    env: parseValue(args, '--env'),
  };
  const bugsDir = join(target, 'docs', 'bugs');
  const fileName = `${todayStamp()}-${slugify(title)}.md`;
  const path = join(bugsDir, fileName);

  mkdirSync(bugsDir, { recursive: true });
  writeFileSync(path, bugReportContent(title, options), 'utf8');
  appendRows(
    join(target, 'docs', 'troubleshooting.md'),
    TROUBLE_HEADER,
    [`| ${cell(title)} | Open bug report: ${cell(join('docs', 'bugs', fileName))} | ${cell(options.verify)} | - |`],
  );

  return `Wrote bug report -> ${path}
Reproduce before fixing; verify with: ${clean(options.verify)}
`;
}

function runPitfall(args) {
  const message = appendMessage(args, 'Usage: ai-pm-dev pitfall "<symptom>" [--cause <c>] [--fix <f>] [--target <path>]');
  const target = resolve(parseTarget(args));
  const cause = parseValue(args, '--cause');
  const fix = parseValue(args, '--fix');
  const path = join(target, 'docs', 'troubleshooting.md');
  appendRows(path, TROUBLE_HEADER, [`| ${cell(message)} | ${cell(cause) || '-'} | ${cell(fix) || '-'} | - |`]);
  return `Logged pitfall -> ${path}\n`;
}

function runNote(args) {
  const message = appendMessage(args, 'Usage: ai-pm-dev note "<progress note>" [--target <path>]');
  const target = resolve(parseTarget(args));
  const path = join(target, 'docs', 'progress.md');
  const raw = existsSync(path) ? readFileSync(path, 'utf8') : '# Progress\n';
  const base = stripPlaceholderRows(raw).trimEnd();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${base}\n- ${todayStamp()} — ${clean(message)}\n`, 'utf8');
  return `Logged progress note -> ${path}\n`;
}

// Collapse whitespace without truncating (for free-text doc entries).
function clean(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function appendToDoc(path, header, block) {
  const base = (existsSync(path) ? readFileSync(path, 'utf8') : header).trimEnd();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${base}\n${block}`, 'utf8');
}

function runKeyword(args) {
  const term = appendMessage(args, 'Usage: ai-pm-dev keyword "<term>" --explain "<plain words>" [--example "<example>"] [--target <path>]');
  const target = resolve(parseTarget(args));
  const explain = parseValue(args, '--explain');
  const example = parseValue(args, '--example');
  const path = join(target, 'docs', 'keywords.md');
  const header = '# Keywords\n\nYour own-words cards for key terms. Not the textbook definition — how you would explain it.\n';
  let block = `\n### ${clean(term)}\n${clean(explain) || '(explain it in your own words)'}\n`;
  if (example) {
    block += `\nExample: ${clean(example)}\n`;
  }
  appendToDoc(path, header, block);
  return `Logged keyword card -> ${path}\n`;
}

function runLearned(args) {
  const text = appendMessage(args, 'Usage: ai-pm-dev learned "<what you understood, in your own words>" [--target <path>]');
  const target = resolve(parseTarget(args));
  const path = join(target, 'docs', 'learning-log.md');
  const header = '# Learning Log\n\nWhat you understood, in your own words. The bar is "can restate", not "looks familiar".\n';
  appendToDoc(path, header, `- ${todayStamp()} — ${clean(text)}\n`);
  return `Logged learning note -> ${path}\n`;
}

function runAsk(args) {
  const question = appendMessage(args, 'Usage: ai-pm-dev ask "<question>" [--why <reason>] [--target <path>]');
  const target = resolve(parseTarget(args));
  const why = parseValue(args, '--why');
  const path = join(target, 'docs', 'open-questions.md');
  appendRows(path, OPEN_QUESTIONS_HEADER, [`| ${cell(question)} | ${cell(why) || 'raised during work'} | open |`]);
  return `Logged open question -> ${path}\n`;
}

// ---- session lifecycle ----
function timelinePath(target) {
  return join(target, '.ai-pm-dev', 'timeline.json');
}

function readTimeline(target) {
  const path = timelinePath(target);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
}

function appendCheckpoint(target, phase, note) {
  const timeline = readTimeline(target);
  timeline.push({ at: new Date().toISOString(), phase, note: note || '' });
  mkdirSync(dirname(timelinePath(target)), { recursive: true });
  writeFileSync(timelinePath(target), `${JSON.stringify(timeline, null, 2)}\n`, 'utf8');
}

function runCheckpoint(args) {
  const phase = appendMessage(args, 'Usage: ai-pm-dev checkpoint "<phase>" [--note <note>] [--target <path>]');
  const target = resolve(parseTarget(args));
  appendCheckpoint(target, phase, parseValue(args, '--note'));
  return `Checkpoint recorded: ${phase} -> ${timelinePath(target)}\n`;
}

function runTimeline(args) {
  const target = resolve(parseTarget(args));
  const timeline = readTimeline(target);
  if (!timeline.length) {
    return `No checkpoints yet for ${target}\nRecord one: ai-pm-dev checkpoint "<phase>"\n`;
  }
  const lines = timeline.map((c) => `${c.at.slice(0, 16).replace('T', ' ')}  ${c.phase}${c.note ? ` — ${oneLine(c.note)}` : ''}`);
  return `Session timeline\n\n${lines.join('\n')}\n`;
}

// ---- inbound context: brief ----
function tableCells(row) {
  return row.split('|').slice(1, -1).map((value) => value.trim());
}

function recentTableRows(path, limit) {
  if (!existsSync(path)) {
    return [];
  }
  const rows = readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .filter((line) => !/^\|[\s|:-]*\|?$/.test(line))
    .filter((line) => !PLACEHOLDER.test(line));
  return rows.slice(1).slice(-limit);
}

function readNextStep(target) {
  const statePath = join(target, '.ai-pm-dev', 'state.json');
  if (existsSync(statePath)) {
    try {
      return JSON.parse(readFileSync(statePath, 'utf8')).nextStep || '';
    } catch {
      return '';
    }
  }
  return '';
}

function briefSection(title, lines) {
  return lines.length ? `\n${title}:\n${lines.join('\n')}\n` : '';
}

function runBrief(args) {
  const target = resolve(parseTarget(args));
  const docs = (name) => join(target, 'docs', name);

  let idea = '';
  let musts = '';
  let one = '';
  let nons = '';
  let metric = '';
  const sessionPath = latestPrdSession(target);
  if (sessionPath && existsSync(join(sessionPath, 'answers.json'))) {
    const a = JSON.parse(readFileSync(join(sessionPath, 'answers.json'), 'utf8'));
    idea = (a.idea || '').trim();
    musts = (a.mvpScope || '').trim();
    one = (a.oneThing || '').trim();
    nons = (a.nonGoals || '').trim();
    metric = (a.acceptanceCriteria || '').trim();
  }

  const decisions = recentTableRows(docs('decision-log.md'), 3).map((r) => {
    const c = tableCells(r);
    return `- ${c[1]}${c[2] && c[2] !== '-' ? ` — ${c[2]}` : ''}`;
  });
  const pitfalls = recentTableRows(docs('troubleshooting.md'), 3).map((r) => {
    const c = tableCells(r);
    return `- ${c[0]}${c[2] && c[2] !== '-' ? ` → ${c[2]}` : ''}`;
  });
  const questions = recentTableRows(docs('open-questions.md'), 5).map((r) => `- ${tableCells(r)[0]}`);
  const progress = existsSync(docs('progress.md'))
    ? readFileSync(docs('progress.md'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- ')).slice(-3)
    : [];
  const next = readNextStep(target);

  const head = [
    `One-liner: ${idea || '(run ai-pm-dev prd)'}`,
    musts ? `Must-haves (v1): ${oneLine(musts)}` : '',
    one ? `The one thing: ${oneLine(one)}` : '',
    nons ? `Non-goals: ${oneLine(nons)}` : '',
    metric ? `Primary metric: ${oneLine(metric)}` : '',
  ].filter(Boolean).join('\n');

  return `# Project brief — paste this to resume in a fresh AI session

${head}
${briefSection('Open questions', questions)}${briefSection('Recent decisions', decisions)}${briefSection('Recent progress', progress)}${briefSection('Known pitfalls', pitfalls)}
Next: ${next || 'run ai-pm-dev prd, then build the must-haves'}
Rules: follow AGENTS.md — read docs/ before work, record into docs/ after via
ai-pm-dev decide/note/pitfall/ask (never a separate CHANGELOG). Verify with prd check.
`;
}

function escapeHtml(value) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlList(items, emptyText) {
  if (!items.length) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function checkClass(status) {
  if (status === 'PASS') return 'pass';
  if (status === 'WARN') return 'warn';
  return 'fail';
}

function dashboardDocRows(target) {
  const coreDocs = [
    'PROJECT_BRIEF.md',
    'UI_SPEC.md',
    'acceptance-tests.md',
    'scope.md',
    'decision-log.md',
    'open-questions.md',
    'progress.md',
    'troubleshooting.md',
  ];
  return coreDocs.map((doc) => {
    const path = join(target, 'docs', doc);
    const status = !existsSync(path) ? 'missing' : (docIsStub(path) ? 'stub' : 'filled');
    const klass = status === 'filled' ? 'pass' : (status === 'stub' ? 'warn' : 'fail');
    return `<tr><td>${escapeHtml(doc)}</td><td><span class="${klass}">${status}</span></td></tr>`;
  }).join('');
}

function buildDashboardHtml(target) {
  const sessionPath = latestPrdSession(target);
  const statePath = join(target, '.ai-pm-dev', 'state.json');
  const answers = sessionPath && existsSync(join(sessionPath, 'answers.json'))
    ? JSON.parse(readFileSync(join(sessionPath, 'answers.json'), 'utf8'))
    : {};
  const checks = sessionPath ? evaluatePrd(answers, sessionPath) : [];
  const score = checks.length ? scoreChecks(checks) : { overall: 'WARN', requiredPass: 0, requiredTotal: 0, recommendedPass: 0, recommendedTotal: 0 };
  const visibleChecks = checks.filter((check) => !check.pass).slice(0, 8);
  const openQuestions = recentTableRows(join(target, 'docs', 'open-questions.md'), 8).map((row) => tableCells(row)[0]);
  const decisions = recentTableRows(join(target, 'docs', 'decision-log.md'), 5).map((row) => {
    const cells = tableCells(row);
    return `${cells[0]} - ${cells[1]}${cells[2] && cells[2] !== '-' ? ` (${cells[2]})` : ''}`;
  });
  const timeline = readTimeline(target).slice(-8).map((item) => `${item.at.slice(0, 16).replace('T', ' ')} - ${item.phase}${item.note ? `: ${item.note}` : ''}`);
  const nextStep = existsSync(statePath) ? (JSON.parse(readFileSync(statePath, 'utf8')).nextStep || '') : '';
  const mustHaves = listItems(answers.mvpScope || '').slice(0, 3);
  const checkRows = visibleChecks.length
    ? visibleChecks.map((check) => {
      const status = check.pass ? 'PASS' : (check.severity === 'required' ? 'FAIL' : 'WARN');
      return `<tr><td><span class="${checkClass(status)}">${status}</span></td><td>${escapeHtml(check.name)}</td><td>${escapeHtml(check.hint || '')}</td></tr>`;
    }).join('')
    : '<tr><td><span class="pass">PASS</span></td><td>No blocking gate issues</td><td></td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI PM Dev Dashboard</title>
  <style>
    :root { color-scheme: light; --ink:#17202a; --muted:#617080; --line:#d9e0e7; --bg:#f7f9fb; --panel:#ffffff; --pass:#13795b; --warn:#9a6700; --fail:#b42318; }
    body { margin:0; font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif; color:var(--ink); background:var(--bg); }
    header { padding:28px 32px 18px; background:var(--panel); border-bottom:1px solid var(--line); }
    main { max-width:1160px; margin:0 auto; padding:24px; display:grid; grid-template-columns:repeat(12,1fr); gap:16px; }
    h1 { margin:0 0 8px; font-size:28px; letter-spacing:0; }
    h2 { margin:0 0 12px; font-size:16px; letter-spacing:0; }
    p { margin:0 0 10px; }
    ul { margin:0; padding-left:20px; }
    table { width:100%; border-collapse:collapse; }
    td, th { padding:8px 0; border-top:1px solid var(--line); text-align:left; vertical-align:top; }
    .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
    .wide { grid-column:span 8; }
    .half { grid-column:span 6; }
    .third { grid-column:span 4; }
    .metric { display:flex; gap:10px; flex-wrap:wrap; }
    .pill { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--line); border-radius:999px; padding:4px 9px; background:#fff; }
    .pass { color:var(--pass); font-weight:700; }
    .warn { color:var(--warn); font-weight:700; }
    .fail { color:var(--fail); font-weight:700; }
    .muted { color:var(--muted); }
    .label { color:var(--muted); font-size:12px; text-transform:uppercase; }
    @media (max-width: 760px) { main { grid-template-columns:1fr; padding:14px; } .wide,.half,.third { grid-column:auto; } header { padding:22px 18px 14px; } }
  </style>
</head>
<body>
  <header>
    <p class="label">Read-only project state</p>
    <h1>${escapeHtml(answers.idea || 'AI PM Dev Dashboard')}</h1>
    <div class="metric">
      <span class="pill">Gate: <span class="${checkClass(score.overall)}">${escapeHtml(score.overall)}</span></span>
      <span class="pill">Required: ${score.requiredPass}/${score.requiredTotal}</span>
      <span class="pill">Recommended: ${score.recommendedPass}/${score.recommendedTotal}</span>
    </div>
  </header>
  <main>
    <section class="card wide">
      <h2>Scope</h2>
      <p><strong>The one thing:</strong> ${escapeHtml(answers.oneThing || 'Not specified.')}</p>
      <p><strong>Non-goals:</strong> ${escapeHtml(answers.nonGoals || 'Not specified.')}</p>
      <p><strong>Primary metric:</strong> ${escapeHtml(answers.acceptanceCriteria || 'Not specified.')}</p>
      <div>${htmlList(mustHaves, 'No must-haves recorded.')}</div>
    </section>
    <section class="card third">
      <h2>Next</h2>
      <p>${escapeHtml(nextStep || 'Run ai-pm-dev prd, then ai-pm-dev prd check --strict.')}</p>
      <p class="muted">${escapeHtml(sessionPath || 'No PRD session yet.')}</p>
    </section>
    <section class="card half">
      <h2>Gate Issues</h2>
      <table><tbody>${checkRows}</tbody></table>
    </section>
    <section class="card half">
      <h2>Docs</h2>
      <table><tbody>${dashboardDocRows(target)}</tbody></table>
    </section>
    <section class="card third">
      <h2>Open Questions</h2>
      ${htmlList(openQuestions, 'No open questions recorded.')}
    </section>
    <section class="card third">
      <h2>Recent Decisions</h2>
      ${htmlList(decisions, 'No decisions recorded.')}
    </section>
    <section class="card third">
      <h2>Timeline</h2>
      ${htmlList(timeline, 'No checkpoints recorded.')}
    </section>
  </main>
</body>
</html>
`;
}

function runDashboard(args) {
  const target = resolve(parseTarget(args));
  const outputPath = join(target, '.ai-pm-dev', 'dashboard.html');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buildDashboardHtml(target), 'utf8');
  return `Dashboard written -> ${outputPath}\nOpen the HTML file in your browser to view the read-only project state.\n`;
}

function writeProjectDocs(targetRoot, answers, followUps = []) {
  const docsDir = join(targetRoot, 'docs');
  seedDoc(join(docsDir, 'PROJECT_BRIEF.md'), buildProjectBriefDoc(answers));
  seedDoc(join(docsDir, 'UI_SPEC.md'), buildUiSpecDoc(answers));
  seedDoc(join(docsDir, 'acceptance-tests.md'), buildAcceptanceDoc(answers));
  // scope.md is regenerated from each PRD (newest prioritization wins).
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, 'scope.md'), buildScopeDoc(answers), 'utf8');

  const today = new Date().toISOString().slice(0, 10);
  appendRows(
    join(docsDir, 'decision-log.md'),
    '# Decision Log\n\n| Date | Decision | Why | Owner |\n| --- | --- | --- | --- |\n',
    [`| ${today} | MVP scope set from PRD interview | ${oneLine(answers.mvpScope) || 'See PROJECT_BRIEF.md'} | prd-generator |`],
  );

  const blanks = prdQuestions
    .filter((question) => !(answers[question.key] || '').trim())
    .map((question) => `| ${question.label}: ${oneLine(question.prompt)} | Left blank in PRD interview | open |`);
  const adaptiveRows = followUps
    .map((item) => `| ${cell(`${item.label}: ${item.question}`)} | ${cell(item.why)} | open |`);
  appendRows(join(docsDir, 'open-questions.md'), OPEN_QUESTIONS_HEADER, [...blanks, ...adaptiveRows]);
}

function oneLine(value) {
  return (value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function latestPrdSession(target) {
  const sessionsRoot = join(target, '.ai-pm-dev', 'prd-sessions');
  if (!existsSync(sessionsRoot)) {
    return '';
  }
  const sessions = readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort();
  const latest = sessions.at(-1);
  return latest ? join(sessionsRoot, latest) : '';
}

function writePrdAssets(target, answers, sourceNote = '', activeQuestions = prdQuestions) {
  if (!existsSync(target)) {
    throw new Error(`Target directory does not exist: ${target}`);
  }

  const activeKeys = new Set(activeQuestions.map((question) => question.key));
  const nonAiTypeMarker = 'Not applicable (non-AI product type).';

  // Questions skipped by project-type filtering are explicit not-applicable answers.
  // Active unanswered questions stay blank so follow-up generation still catches them.
  for (const question of prdQuestions) {
    const skippedByType = !activeKeys.has(question.key) && question.aiRelated;
    if (skippedByType && !String(answers[question.key] ?? '').trim()) {
      answers[question.key] = nonAiTypeMarker;
      continue;
    }
    if (answers[question.key] === undefined) {
      answers[question.key] = '';
    }
  }

  const targetRoot = resolve(target);
  const stamp = formatStamp(nowForSession());
  const sessionName = `${stamp}-${sessionSlug(answers.idea)}`;
  const sessionPath = join(targetRoot, '.ai-pm-dev', 'prd-sessions', sessionName);
  const followUps = buildAdaptiveFollowUps(answers, activeQuestions);
  const files = {
    'conversation.md': buildConversation(answers),
    'answers.json': `${JSON.stringify(answers, null, 2)}\n`,
    'ai-prd.md': buildAiPrd(answers),
    'follow-up-questions.md': buildFollowUpQuestionsDoc(answers, followUps),
    'prototype-brief.md': buildPrototypeBrief(answers),
    'handoff-codex.md': buildCodexHandoff(answers),
    'handoff-v0.md': buildV0Handoff(answers),
    'handoff-figma.md': buildFigmaHandoff(answers),
    'risks.md': buildRisksDoc(answers),
    'acceptance-tests.md': buildAcceptanceTests(answers),
    'scope.md': buildScopeDoc(answers),
  };
  if (sourceNote) {
    files['source-note.md'] = `# Source Note\n\nImported via \`ai-pm-dev prd --from-note\`.\n\n${sourceNote}\n`;
  }

  mkdirSync(sessionPath, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(sessionPath, name), content, 'utf8');
  }

  mkdirSync(join(targetRoot, 'memory'), { recursive: true });
  mkdirSync(join(targetRoot, '.ai-pm-dev'), { recursive: true });
  writeFileSync(join(targetRoot, 'memory', 'current-ai-prd.md'), files['ai-prd.md'], 'utf8');
  writeFileSync(join(targetRoot, 'memory', 'current-task-prompt.md'), files['handoff-codex.md'], 'utf8');
  writeFileSync(join(targetRoot, '.ai-pm-dev', 'state.json'), `${JSON.stringify({
    version,
    task: answers.idea,
    skill: 'prd-generator',
    phase: 'Interactive PRD',
    skillPath: 'skills/prd-generator/SKILL.md',
    nextStep: 'Review ai-prd.md, then hand off to Codex, v0, or Figma.',
    prdSessionPath: sessionPath,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8');

  writeProjectDocs(targetRoot, answers, followUps);
  appendCheckpoint(targetRoot, 'prd', answers.idea);

  return { sessionPath, files };
}

function prdIntro(lang) {
  if (lang === 'zh') {
    return ['AI PM Dev 交互式 PRD 访谈', '请回答每个问题，回答后按回车。留空表示“暂不适用”。'];
  }
  return ['AI PM Dev Interactive PRD Session', 'Answer each PM interview question. Press Enter after each answer. Blank means "not applicable".'];
}

function prdCompletionMessage(target, sessionPath, lang) {
  if (lang === 'zh') {
    return `\nPRD 访谈完成。
会话目录: ${sessionPath}
AI-PRD: ${join(sessionPath, 'ai-prd.md')}
原型说明: ${join(sessionPath, 'prototype-brief.md')}
Codex handoff: ${join(sessionPath, 'handoff-codex.md')}
v0 handoff: ${join(sessionPath, 'handoff-v0.md')}
Figma handoff: ${join(sessionPath, 'handoff-figma.md')}
Follow-up questions: ${join(sessionPath, 'follow-up-questions.md')}

项目文档已更新: ${join(target, 'docs')}
  PROJECT_BRIEF.md, UI_SPEC.md, acceptance-tests.md, decision-log.md, open-questions.md

下一步: ai-pm-dev prd check
`;
  }
  return `\nInteractive PRD session complete.
Session: ${sessionPath}
AI-PRD: ${join(sessionPath, 'ai-prd.md')}
Prototype brief: ${join(sessionPath, 'prototype-brief.md')}
Codex handoff: ${join(sessionPath, 'handoff-codex.md')}
v0 handoff: ${join(sessionPath, 'handoff-v0.md')}
Figma handoff: ${join(sessionPath, 'handoff-figma.md')}
Follow-up questions: ${join(sessionPath, 'follow-up-questions.md')}

Project docs updated: ${join(target, 'docs')}
  PROJECT_BRIEF.md, UI_SPEC.md, acceptance-tests.md, decision-log.md, open-questions.md

Next: ai-pm-dev prd check
`;
}

function quickHandoffNote(lang) {
  if (lang === 'zh') {
    return `\n快速模式：这份 PRD 是故意精简的。在 Claude Code / Codex 里打开项目，
让它执行 PM challenge（排序 → 砍到 3 个 → 那一个 → 非目标 → 单一指标），
然后跑 ai-pm-dev prd check。
`;
  }
  return `\nQuick mode: this PRD is intentionally thin. Open the project in Claude Code / Codex
and let it run the PM challenge (rank -> cut to 3 -> the one thing -> a non-goal -> one metric),
then run ai-pm-dev prd check.
`;
}

function parsePrdLang(args) {
  const value = parseValue(args, '--lang');
  if (value && value !== 'zh' && value !== 'en') {
    throw new Error('Usage: ai-pm-dev prd [--lang <zh|en>]');
  }
  return value;
}

function parsePrdType(args) {
  const value = parseValue(args, '--type');
  if (value && !projectTypes.includes(value)) {
    throw new Error(`Usage: ai-pm-dev prd [--type <${projectTypes.join('|')}>]`);
  }
  return value;
}

// First meaningful line of a note, used as the idea headline (full note is saved separately).
function firstLine(text) {
  const line = text.split(/\r?\n/).map((value) => value.trim()).find(Boolean) || text.trim();
  return line.replace(/^#+\s*/, '').slice(0, 200);
}

function parsePrdNote(args) {
  const value = parseValue(args, '--from-note');
  if (!value) {
    return { note: '', idea: '' };
  }
  const notePath = resolve(process.cwd(), value);
  if (!existsSync(notePath)) {
    throw new Error(`Note file not found: ${notePath}`);
  }
  const note = readFileSync(notePath, 'utf8').trim();
  if (!note) {
    throw new Error(`Note file is empty: ${notePath}`);
  }
  return { note, idea: firstLine(note) };
}

async function runPrdInterview(args) {
  const target = resolve(parseTarget(args));
  const type = parsePrdType(args);
  const { note, idea: notedIdea } = parsePrdNote(args);
  let lang = parsePrdLang(args) || 'en';

  // --quick captures only who/what/why and hands the real interrogation to the LLM.
  const quick = args.includes('--quick');
  const jsonInput = args.includes('--json');
  if (quick && jsonInput) {
    throw new Error('Usage: ai-pm-dev prd --json cannot be combined with --quick.');
  }
  const quickKeys = new Set(['idea', 'targetUsers', 'painPoints']);

  // When the idea comes from a note file, skip the idea question and pre-fill it.
  const typeQuestions = questionsForType(type);
  const baseQuestions = quick ? typeQuestions.filter((question) => quickKeys.has(question.key)) : typeQuestions;
  const questions = notedIdea ? baseQuestions.filter((question) => question.key !== 'idea') : baseQuestions;
  const ideaLabel = lang === 'zh' ? '想法（来自笔记）' : 'Idea (from note)';
  const finish = (sessionPath) => prdCompletionMessage(target, sessionPath, lang) + (quick ? quickHandoffNote(lang) : '');

  if (!process.stdin.isTTY) {
    const stdin = readFileSync(0, 'utf8');
    const parsedStdin = jsonInput ? parseFullPrdJsonStdin(stdin) : (quick ? parseQuickPrdStdin(stdin) : { kind: 'lines', lines: stdin.split(/\r?\n/) });
    const keyedInput = parsedStdin.kind === 'json' ? parsedStdin.values : null;
    const lines = parsedStdin.kind === 'lines' ? parsedStdin.lines : [];
    const answers = notedIdea ? { idea: notedIdea } : {};
    const [introTitle, introHint] = prdIntro(lang);
    console.log(introTitle);
    console.log(`${introHint}\n`);
    if (notedIdea) {
      console.log(`${ideaLabel}: ${notedIdea}\n`);
    }
    questions.forEach((question, index) => {
      const answer = keyedInput ? keyedInput[question.key] : lines[index];
      console.log(`${questionText(question, index, lang)}\n> ${answer ?? ''}`);
      answers[question.key] = String(answer ?? '').trim();
    });
    const { sessionPath } = writePrdAssets(target, answers, note, typeQuestions);
    return finish(sessionPath);
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answers = {};

  try {
    if (!parsePrdLang(args)) {
      const chosen = (await rl.question('Language / 语言 [en/zh]: ')).trim().toLowerCase();
      lang = chosen === 'zh' ? 'zh' : 'en';
    }
    const [introTitle, introHint] = prdIntro(lang);
    console.log(introTitle);
    console.log(`${introHint}\n`);
    if (notedIdea) {
      console.log(`${ideaLabel}: ${notedIdea}\n`);
    }
    // The prompts carry the forcing wording (max 3, required non-goal, the one thing),
    // but the form does not nag or block — a dumb form cannot tell a real cut from a
    // typed-anything answer. Rigor lives in the LLM PM-challenge protocol, in scope.md,
    // and in the opt-in `prd check --strict` gate, not in re-asking here.
    for (const [index, question] of questions.entries()) {
      const answer = await rl.question(`${questionText(question, index, lang)}\n> `);
      answers[question.key] = answer.trim();
    }
  } finally {
    rl.close();
  }

  if (notedIdea) {
    answers.idea = notedIdea;
  }
  const { sessionPath } = writePrdAssets(target, answers, note, typeQuestions);
  return finish(sessionPath);
}

function parsePrdModel(args) {
  return resolveModelAlias(parseValue(args, '--model') || DEFAULT_REASONING_MODEL);
}

function createLlmRunId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `${formatStamp(nowForSession())}-${random}`;
}

function llmRunDir(target, runId) {
  return join(resolve(target), '.ai-pm-dev', 'llm-runs', runId);
}

function appendLlmRecord(target, runId, record) {
  const dir = llmRunDir(target, runId);
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, 'llm-calls.jsonl'), `${JSON.stringify(record)}\n`, 'utf8');
  return join(dir, 'llm-calls.jsonl');
}

function writeLlmRunSessionMetadata(sessionPath, runId, callsPath, status) {
  writeFileSync(join(sessionPath, 'llm-run.json'), `${JSON.stringify({
    runId,
    status,
    callsPath,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8');
}

function activeTypeQuestions(type) {
  return questionsForType(type || 'general');
}

function ensureClarificationState(rawState, options = {}) {
  const state = rawState && typeof rawState === 'object'
    ? rawState
    : createClarificationState({
      runId: options.runId,
      model: options.model,
      lang: options.lang,
      projectType: options.projectType,
    });
  const draftAnswers = {
    ...(state.draftAnswers && typeof state.draftAnswers === 'object' ? state.draftAnswers : {}),
  };
  if (options.idea && !draftAnswers.idea) {
    draftAnswers.idea = options.idea;
  }
  return {
    ...state,
    runId: state.runId || options.runId || createLlmRunId(),
    model: state.model || options.model || DEFAULT_REASONING_MODEL,
    lang: state.lang || options.lang || 'en',
    projectType: state.projectType || options.projectType || 'general',
    draftAnswers,
  };
}

function compactClarifyResult(result, extra = {}) {
  return {
    status: result.status,
    reason: result.reason,
    questions: result.questions || [],
    answers: result.answers,
    warnings: result.warnings || [],
    state: result.state,
    runId: result.state?.runId,
    sessionPath: extra.sessionPath,
    callsPath: extra.callsPath,
  };
}

async function executePrdClarifyTurn({ target, type, lang, model, state, userInput, sourceNote = '', client }) {
  const result = await runPrdClarificationTurn({
    client,
    state,
    userInput,
    lang,
    projectType: type,
    model,
    now: nowForSession(),
  });
  const runId = result.state?.runId || state.runId || createLlmRunId();
  const callsPath = appendLlmRecord(target, runId, result.llmRecord);

  if (result.status === 'ready' || result.status === 'degraded') {
    const { sessionPath } = writePrdAssets(target, result.answers, sourceNote, activeTypeQuestions(type));
    writeLlmRunSessionMetadata(sessionPath, runId, callsPath, result.status);
    return { result, sessionPath, callsPath };
  }

  return { result, callsPath };
}

function parseJsonTurnBody(args) {
  const raw = readFileSync(0, 'utf8').trim();
  if (!raw) {
    throw new Error('Usage: ai-pm-dev prd clarify --json-turn < JSON body on stdin');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON stdin for prd clarify --json-turn.');
  }
}

function parsePrdTypeValue(value) {
  if (value && !projectTypes.includes(value)) {
    throw new Error(`Usage: ai-pm-dev prd clarify [--type <${projectTypes.join('|')}>]`);
  }
  return value || 'general';
}

function parsePrdLangValue(value) {
  if (value && value !== 'zh' && value !== 'en') {
    throw new Error('Usage: ai-pm-dev prd clarify [--lang <zh|en>]');
  }
  return value || 'en';
}

async function runPrdClarifyJsonTurn(args) {
  const body = parseJsonTurnBody(args);
  const target = resolve(body.target || parseTarget(args));
  const type = parsePrdTypeValue(body.type || body.projectType || parsePrdType(args));
  const lang = parsePrdLangValue(body.lang || parsePrdLang(args));
  const model = resolveModelAlias(body.model || parseValue(args, '--model') || DEFAULT_REASONING_MODEL);
  const state = ensureClarificationState(body.state, {
    runId: body.runId,
    model,
    lang,
    projectType: type,
    idea: body.idea,
  });
  const client = createAnthropicPrdClient({ model });
  const { result, sessionPath, callsPath } = await executePrdClarifyTurn({
    target,
    type,
    lang,
    model,
    state,
    userInput: body.userInput || '',
    sourceNote: body.sourceNote || '',
    client,
  });
  return `${JSON.stringify(compactClarifyResult(result, { sessionPath, callsPath }), null, 2)}\n`;
}

function prdClarifyCompletionMessage(target, sessionPath, result) {
  const mode = result.status === 'degraded' ? 'AI clarification degraded to template PRD' : 'AI clarification complete';
  const reason = result.reason ? `\nReason: ${result.reason}` : '';
  return `\n${mode}.${reason}
Session: ${sessionPath}
AI-PRD: ${join(sessionPath, 'ai-prd.md')}
LLM run: ${join(sessionPath, 'llm-run.json')}

Project docs updated: ${join(target, 'docs')}
Next: ai-pm-dev prd check
`;
}

async function runPrdClarifyInteractive(args) {
  const target = resolve(parseTarget(args));
  const type = parsePrdType(args) || 'general';
  const { note, idea: notedIdea } = parsePrdNote(args);
  let lang = parsePrdLang(args) || 'en';
  const model = parsePrdModel(args);
  const client = createAnthropicPrdClient({ model });
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let state = ensureClarificationState(null, {
    runId: createLlmRunId(),
    model,
    lang,
    projectType: type,
    idea: notedIdea,
  });
  let userInput = notedIdea;

  try {
    if (!parsePrdLang(args)) {
      const chosen = (await rl.question('Language / 语言 [en/zh]: ')).trim().toLowerCase();
      lang = chosen === 'zh' ? 'zh' : 'en';
      state = { ...state, lang };
    }
    if (!userInput) {
      userInput = (await rl.question('Product idea:\n> ')).trim();
      state = ensureClarificationState(state, { idea: userInput, model, lang, projectType: type });
    }
    while (true) {
      const { result, sessionPath } = await executePrdClarifyTurn({
        target,
        type,
        lang,
        model,
        state,
        userInput,
        sourceNote: note,
        client,
      });

      if (result.status === 'ready' || result.status === 'degraded') {
        return prdClarifyCompletionMessage(target, sessionPath, result);
      }

      state = result.state;
      const answers = [];
      console.log('\nAI clarification questions:');
      for (const question of result.questions) {
        const answer = await rl.question(`${question}\n> `);
        answers.push(`Q: ${question}\nA: ${answer.trim()}`);
      }
      userInput = answers.join('\n\n');
    }
  } finally {
    rl.close();
  }
}

async function runPrdClarify(args) {
  if (args.includes('--json-turn')) {
    return runPrdClarifyJsonTurn(args);
  }
  return runPrdClarifyInteractive(args);
}

function runPrdStatus(args) {
  const target = resolve(parseTarget(args));
  const sessionPath = latestPrdSession(target);
  if (!sessionPath) {
    return `No PRD sessions found for ${target}\nRun: ai-pm-dev prd --target "${target}"\n`;
  }

  const answers = JSON.parse(readFileSync(join(sessionPath, 'answers.json'), 'utf8'));
  return `Latest PRD Session

Target: ${target}
Session: ${sessionPath}
Idea: ${answers.idea}
Next handoffs:
- ai-pm-dev prd handoff --to codex --target "${target}"
- ai-pm-dev prd handoff --to v0 --target "${target}"
- ai-pm-dev prd handoff --to figma --target "${target}"
`;
}

function runPrdHandoff(args) {
  const target = resolve(parseTarget(args));
  const to = parseValue(args, '--to');
  const supported = ['codex', 'v0', 'figma'];
  if (!supported.includes(to)) {
    throw new Error('Usage: ai-pm-dev prd handoff --to <codex|v0|figma> [--target <path>]');
  }

  const sessionPath = latestPrdSession(target);
  if (!sessionPath) {
    throw new Error(`No PRD sessions found for ${target}. Run: ai-pm-dev prd --target "${target}"`);
  }

  return readFileSync(join(sessionPath, `handoff-${to}.md`), 'utf8');
}

function runPrdCheck(args) {
  const target = resolve(parseTarget(args));
  const sessionPath = latestPrdSession(target);
  if (!sessionPath) {
    return `No PRD sessions found for ${target}\nRun: ai-pm-dev prd --target "${target}"\n`;
  }

  const answers = JSON.parse(readFileSync(join(sessionPath, 'answers.json'), 'utf8'));
  const checks = evaluatePrd(answers, sessionPath);
  const score = scoreChecks(checks);
  const report = buildQualityReportMarkdown(answers, checks, score);
  const reportPath = join(sessionPath, 'quality-report.md');
  const reportJsonPath = join(sessionPath, 'quality-report.json');
  writeFileSync(reportPath, report, 'utf8');
  writeFileSync(reportJsonPath, `${JSON.stringify(buildQualityReportJson(answers, checks, score, { sessionPath }), null, 2)}\n`, 'utf8');

  const lines = checks.map((check) => {
    const status = check.pass ? 'PASS' : (check.severity === 'required' ? 'FAIL' : 'WARN');
    return `${status.padEnd(4)} ${check.name}${check.pass ? '' : ` — ${check.hint}`}`;
  });

  // --strict turns a FAIL into a non-zero exit so it can gate a commit or CI run.
  const strict = args.includes('--strict');
  if (strict && score.overall === 'FAIL') {
    process.exitCode = 1;
  }

  return `PRD Quality Check${strict ? ' (strict)' : ''}

Session: ${sessionPath}
Overall: ${score.overall} (required ${score.requiredPass}/${score.requiredTotal}, recommended ${score.recommendedPass}/${score.recommendedTotal})

${lines.join('\n')}

Report: ${reportPath}${strict && score.overall === 'FAIL' ? '\n\nStrict mode: exiting non-zero because required checks failed.' : ''}
`;
}

function loadLatestPrdSession(target) {
  const sessionPath = latestPrdSession(target);
  if (!sessionPath) {
    throw new Error(`No PRD sessions found for ${target}. Run: ai-pm-dev prd --target "${target}"`);
  }
  const answers = JSON.parse(readFileSync(join(sessionPath, 'answers.json'), 'utf8'));
  return { sessionPath, answers };
}

function readDevPlanStdin() {
  const raw = readFileSync(0, 'utf8').trim();
  if (!raw) {
    throw new Error('Usage: ai-pm-dev plan materialize [--target <path>] < dev-plan.json');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON stdin for plan materialize.');
  }
}

function readDesignStdin() {
  const raw = readFileSync(0, 'utf8').trim();
  if (!raw) {
    throw new Error('Usage: ai-pm-dev design materialize [--target <path>] < design.json');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON stdin for design materialize.');
  }
}

function readShipCheckStdin() {
  const raw = readFileSync(0, 'utf8').trim();
  if (!raw) {
    throw new Error('Usage: ai-pm-dev ship materialize [--target <path>] < ship-check.json');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON stdin for ship materialize.');
  }
}

function readIterateStdin() {
  const raw = readFileSync(0, 'utf8').trim();
  if (!raw) {
    throw new Error('Usage: ai-pm-dev iterate materialize [--target <path>] < iterate.json');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON stdin for iterate materialize.');
  }
}

function prdAnchoredPlan(plan, answers, sessionPath) {
  return {
    ...plan,
    prdSessionPath: sessionPath,
    idea: answers.idea || '',
    oneThing: answers.oneThing || '',
    mustHaves: listItems(answers.mvpScope).slice(0, 3),
    nonGoals: listItems(answers.nonGoals),
    acceptanceCriteria: answers.acceptanceCriteria || '',
  };
}

function prdAnchoredDesign(design, answers, sessionPath) {
  return {
    ...design,
    prdSessionPath: sessionPath,
    idea: answers.idea || '',
    oneThing: answers.oneThing || '',
    mustHaves: listItems(answers.mvpScope).slice(0, 3),
    nonGoals: listItems(answers.nonGoals),
    coreWorkflow: answers.coreWorkflow || '',
  };
}

function prdAnchoredShipCheck(check, answers, sessionPath, latestDevPlanPath) {
  return {
    ...check,
    prdSessionPath: sessionPath,
    devPlanPath: latestDevPlanPath,
    idea: answers.idea || '',
    oneThing: answers.oneThing || '',
  };
}

function requireDevPlanStructure(raw) {
  const validation = validateDevPlanStructure(raw);
  if (!validation.ok) {
    throw new Error(`Invalid dev plan structure:\n- ${validation.errors.join('\n- ')}`);
  }
  return validation.plan;
}

function requireDesignStructure(raw) {
  const validation = validateDesignStructure(raw);
  if (!validation.ok) {
    throw new Error(`Invalid design structure:\n- ${validation.errors.join('\n- ')}`);
  }
  return validation.design;
}

function requireShipCheckStructure(raw) {
  const validation = validateShipCheckStructure(raw);
  if (!validation.ok) {
    throw new Error(`Invalid ship check structure:\n- ${validation.errors.join('\n- ')}`);
  }
  return validation.check;
}

function requireIterateStructure(raw) {
  const validation = validateIterateStructure(raw);
  if (!validation.ok) {
    throw new Error(`Invalid iterate structure:\n- ${validation.errors.join('\n- ')}`);
  }
  return validation.iterate;
}

function checkLines(checks) {
  return checks.map((check) => {
    const status = check.pass ? 'PASS' : (check.severity === 'required' ? 'FAIL' : 'WARN');
    return `${status.padEnd(4)} ${check.name}${check.pass ? '' : ` — ${check.hint}`}`;
  });
}

function runPlanMaterialize(args) {
  const target = resolve(parseTarget(args));
  const { sessionPath, answers } = loadLatestPrdSession(target);
  const rawPlan = readDevPlanStdin();
  const plan = prdAnchoredPlan(requireDevPlanStructure(rawPlan), answers, sessionPath);
  const devPlanJson = `${JSON.stringify(plan, null, 2)}\n`;
  const devPlanMarkdown = buildDevPlanMarkdown(plan);
  const buildHandoff = buildBuildHandoff(plan);
  const docsDir = join(target, 'docs');
  const memoryDir = join(target, 'memory');
  const stateDir = join(target, '.ai-pm-dev');
  const devPlanJsonPath = join(sessionPath, 'dev-plan.json');
  const devPlanMarkdownPath = join(sessionPath, 'dev-plan.md');
  const buildHandoffPath = join(sessionPath, 'handoff-build.md');
  const projectDevPlanPath = join(docsDir, 'dev-plan.md');
  const promptPath = join(memoryDir, 'current-task-prompt.md');
  const statePath = join(stateDir, 'state.json');

  mkdirSync(docsDir, { recursive: true });
  mkdirSync(memoryDir, { recursive: true });
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(devPlanJsonPath, devPlanJson, 'utf8');
  writeFileSync(devPlanMarkdownPath, devPlanMarkdown, 'utf8');
  writeFileSync(buildHandoffPath, buildHandoff, 'utf8');
  writeFileSync(projectDevPlanPath, devPlanMarkdown, 'utf8');
  writeFileSync(promptPath, buildHandoff, 'utf8');
  writeFileSync(statePath, `${JSON.stringify({
    version,
    task: plan.idea || plan.goal,
    skill: 'dev-planner',
    phase: 'Dev Plan',
    skillPath: 'skills/dev-planner/SKILL.md',
    nextStep: 'Run ai-pm-dev plan check --strict, then build from handoff-build.md.',
    prdSessionPath: sessionPath,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8');
  appendCheckpoint(target, 'plan', plan.goal || plan.idea);

  return `Dev plan materialized

Session: ${sessionPath}
Artifacts:
- ${devPlanJsonPath}
- ${devPlanMarkdownPath}
- ${buildHandoffPath}
- ${projectDevPlanPath}

Next: ai-pm-dev plan check --strict --target "${target}"
`;
}

function loadLatestDevPlan(target) {
  const { sessionPath, answers } = loadLatestPrdSession(target);
  const devPlanJsonPath = join(sessionPath, 'dev-plan.json');
  if (!existsSync(devPlanJsonPath)) {
    throw new Error(`No dev plan found for latest PRD session. Run: ai-pm-dev plan materialize --target "${target}" < dev-plan.json`);
  }
  const plan = requireDevPlanStructure(JSON.parse(readFileSync(devPlanJsonPath, 'utf8')));
  return { sessionPath, answers, plan };
}

function runPlanCheck(args) {
  const target = resolve(parseTarget(args));
  const { sessionPath, answers, plan } = loadLatestDevPlan(target);
  const checks = evaluateDevPlan(plan, { sessionPath, latestSessionPath: sessionPath, answers });
  const score = scoreChecks(checks);
  const reportPath = join(sessionPath, 'dev-plan-quality-report.md');
  const reportJsonPath = join(sessionPath, 'dev-plan-quality-report.json');
  const report = buildQualityReportMarkdown(plan, checks, score, {
    title: 'Dev Plan Quality Report',
    generatedBy: 'ai-pm-dev plan check',
  });
  writeFileSync(reportPath, report, 'utf8');
  writeFileSync(reportJsonPath, `${JSON.stringify(buildQualityReportJson(plan, checks, score, {
    generatedBy: 'ai-pm-dev plan check',
    idea: plan.idea,
    sessionPath,
  }), null, 2)}\n`, 'utf8');

  const strict = args.includes('--strict');
  if (strict && score.overall === 'FAIL') {
    process.exitCode = 1;
  }

  return `Dev Plan Quality Check${strict ? ' (strict)' : ''}

Session: ${sessionPath}
Overall: ${score.overall} (required ${score.requiredPass}/${score.requiredTotal}, recommended ${score.recommendedPass}/${score.recommendedTotal})

${checkLines(checks).join('\n')}

Report: ${reportPath}${strict && score.overall === 'FAIL' ? '\n\nStrict mode: exiting non-zero because required checks failed.' : ''}
`;
}

function runPlanHandoff(args) {
  const target = resolve(parseTarget(args));
  const sessionPath = latestPrdSession(target);
  if (!sessionPath) {
    throw new Error(`No PRD sessions found for ${target}. Run: ai-pm-dev prd --target "${target}"`);
  }
  const handoffPath = join(sessionPath, 'handoff-build.md');
  if (!existsSync(handoffPath)) {
    throw new Error(`No build handoff found for latest PRD session. Run: ai-pm-dev plan materialize --target "${target}" < dev-plan.json`);
  }
  return readFileSync(handoffPath, 'utf8');
}

function runPlan(args) {
  const [subcommand, ...rest] = args;
  if (subcommand === 'materialize') {
    return runPlanMaterialize(rest);
  }
  if (subcommand === 'check') {
    return runPlanCheck(rest);
  }
  if (subcommand === 'handoff') {
    return runPlanHandoff(rest);
  }
  throw new Error('Usage: ai-pm-dev plan materialize [--target <path>] < dev-plan.json | plan check [--strict] [--target <path>] | plan handoff [--target <path>]');
}

function runDesignMaterialize(args) {
  const target = resolve(parseTarget(args));
  const { sessionPath, answers } = loadLatestPrdSession(target);
  const rawDesign = readDesignStdin();
  const design = prdAnchoredDesign(requireDesignStructure(rawDesign), answers, sessionPath);
  const designJson = `${JSON.stringify(design, null, 2)}\n`;
  const designMarkdown = buildDesignMarkdown(design);
  const designHandoff = buildDesignHandoff(design);
  const docsDir = join(target, 'docs');
  const memoryDir = join(target, 'memory');
  const stateDir = join(target, '.ai-pm-dev');
  const designJsonPath = join(sessionPath, 'design.json');
  const designMarkdownPath = join(sessionPath, 'design.md');
  const designHandoffPath = join(sessionPath, 'handoff-design.md');
  const projectUiSpecPath = join(docsDir, 'UI_SPEC.md');
  const promptPath = join(memoryDir, 'current-task-prompt.md');
  const statePath = join(stateDir, 'state.json');

  mkdirSync(docsDir, { recursive: true });
  mkdirSync(memoryDir, { recursive: true });
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(designJsonPath, designJson, 'utf8');
  writeFileSync(designMarkdownPath, designMarkdown, 'utf8');
  writeFileSync(designHandoffPath, designHandoff, 'utf8');
  writeFileSync(projectUiSpecPath, designMarkdown, 'utf8');
  writeFileSync(promptPath, designHandoff, 'utf8');
  writeFileSync(statePath, `${JSON.stringify({
    version,
    task: design.idea || design.goal,
    skill: 'design-maker',
    phase: 'Design',
    skillPath: 'skills/design-maker/SKILL.md',
    nextStep: 'Run ai-pm-dev design check --strict, then use handoff-design.md for UI implementation planning.',
    prdSessionPath: sessionPath,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8');
  appendCheckpoint(target, 'design', design.goal || design.idea);

  return `Design materialized

Session: ${sessionPath}
Artifacts:
- ${designJsonPath}
- ${designMarkdownPath}
- ${designHandoffPath}
- ${projectUiSpecPath}

Next: ai-pm-dev design check --strict --target "${target}"
`;
}

function loadLatestDesign(target) {
  const { sessionPath, answers } = loadLatestPrdSession(target);
  const designJsonPath = join(sessionPath, 'design.json');
  if (!existsSync(designJsonPath)) {
    throw new Error(`No design found for latest PRD session. Run: ai-pm-dev design materialize --target "${target}" < design.json`);
  }
  const design = requireDesignStructure(JSON.parse(readFileSync(designJsonPath, 'utf8')));
  return { sessionPath, answers, design };
}

function runDesignCheck(args) {
  const target = resolve(parseTarget(args));
  const { sessionPath, answers, design } = loadLatestDesign(target);
  const checks = evaluateDesign(design, { sessionPath, latestSessionPath: sessionPath, answers });
  const score = scoreChecks(checks);
  const reportPath = join(sessionPath, 'design-quality-report.md');
  const reportJsonPath = join(sessionPath, 'design-quality-report.json');
  const report = buildQualityReportMarkdown(design, checks, score, {
    title: 'Design Quality Report',
    generatedBy: 'ai-pm-dev design check',
  });
  writeFileSync(reportPath, report, 'utf8');
  writeFileSync(reportJsonPath, `${JSON.stringify(buildQualityReportJson(design, checks, score, {
    generatedBy: 'ai-pm-dev design check',
    idea: design.idea,
    sessionPath,
  }), null, 2)}\n`, 'utf8');

  const strict = args.includes('--strict');
  if (strict && score.overall === 'FAIL') {
    process.exitCode = 1;
  }

  return `Design Quality Check${strict ? ' (strict)' : ''}

Session: ${sessionPath}
Overall: ${score.overall} (required ${score.requiredPass}/${score.requiredTotal}, recommended ${score.recommendedPass}/${score.recommendedTotal})

${checkLines(checks).join('\n')}

Report: ${reportPath}${strict && score.overall === 'FAIL' ? '\n\nStrict mode: exiting non-zero because required checks failed.' : ''}
`;
}

function runDesignHandoff(args) {
  const target = resolve(parseTarget(args));
  const sessionPath = latestPrdSession(target);
  if (!sessionPath) {
    throw new Error(`No PRD sessions found for ${target}. Run: ai-pm-dev prd --target "${target}"`);
  }
  const handoffPath = join(sessionPath, 'handoff-design.md');
  if (!existsSync(handoffPath)) {
    throw new Error(`No design handoff found for latest PRD session. Run: ai-pm-dev design materialize --target "${target}" < design.json`);
  }
  return readFileSync(handoffPath, 'utf8');
}

function runDesign(args) {
  const [subcommand, ...rest] = args;
  if (subcommand === 'materialize') {
    return runDesignMaterialize(rest);
  }
  if (subcommand === 'check') {
    return runDesignCheck(rest);
  }
  if (subcommand === 'handoff') {
    return runDesignHandoff(rest);
  }
  throw new Error('Usage: ai-pm-dev design materialize [--target <path>] < design.json | design check [--strict] [--target <path>] | design handoff [--target <path>]');
}

function runShipMaterialize(args) {
  const target = resolve(parseTarget(args));
  const { sessionPath, answers } = loadLatestPrdSession(target);
  const latestDevPlanPath = join(sessionPath, 'dev-plan.json');
  if (!existsSync(latestDevPlanPath)) {
    throw new Error(`No dev plan found for latest PRD session. Run: ai-pm-dev plan materialize --target "${target}" < dev-plan.json`);
  }

  const rawCheck = readShipCheckStdin();
  const check = prdAnchoredShipCheck(requireShipCheckStructure(rawCheck), answers, sessionPath, latestDevPlanPath);
  const shipCheckJson = `${JSON.stringify(check, null, 2)}\n`;
  const shipCheckMarkdown = buildShipCheckMarkdown(check);
  const releaseHandoff = buildReleaseHandoff(check);
  const releaseChecklist = buildReleaseChecklist(check);
  const docsDir = join(target, 'docs');
  const memoryDir = join(target, 'memory');
  const stateDir = join(target, '.ai-pm-dev');
  const shipCheckJsonPath = join(sessionPath, 'ship-check.json');
  const shipCheckMarkdownPath = join(sessionPath, 'ship-check.md');
  const releaseHandoffPath = join(sessionPath, 'handoff-release.md');
  const releaseChecklistPath = join(docsDir, 'release-checklist.md');
  const promptPath = join(memoryDir, 'current-task-prompt.md');
  const statePath = join(stateDir, 'state.json');

  mkdirSync(docsDir, { recursive: true });
  mkdirSync(memoryDir, { recursive: true });
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(shipCheckJsonPath, shipCheckJson, 'utf8');
  writeFileSync(shipCheckMarkdownPath, shipCheckMarkdown, 'utf8');
  writeFileSync(releaseHandoffPath, releaseHandoff, 'utf8');
  writeFileSync(releaseChecklistPath, releaseChecklist, 'utf8');
  writeFileSync(promptPath, releaseHandoff, 'utf8');
  writeFileSync(statePath, `${JSON.stringify({
    version,
    task: check.idea || check.goal,
    skill: 'release-builder',
    phase: 'Ship',
    skillPath: 'skills/release-builder/SKILL.md',
    nextStep: 'Run ai-pm-dev ship check --strict, then hand off from handoff-release.md.',
    prdSessionPath: sessionPath,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8');
  appendCheckpoint(target, 'ship', check.goal || check.releaseScope || check.idea);

  return `Ship check materialized

Session: ${sessionPath}
Artifacts:
- ${shipCheckJsonPath}
- ${shipCheckMarkdownPath}
- ${releaseHandoffPath}
- ${releaseChecklistPath}

Next: ai-pm-dev ship check --strict --target "${target}"
`;
}

function loadLatestShipCheck(target) {
  const { sessionPath, answers } = loadLatestPrdSession(target);
  const latestDevPlanPath = join(sessionPath, 'dev-plan.json');
  if (!existsSync(latestDevPlanPath)) {
    throw new Error(`No dev plan found for latest PRD session. Run: ai-pm-dev plan materialize --target "${target}" < dev-plan.json`);
  }
  const shipCheckJsonPath = join(sessionPath, 'ship-check.json');
  if (!existsSync(shipCheckJsonPath)) {
    throw new Error(`No ship check found for latest PRD session. Run: ai-pm-dev ship materialize --target "${target}" < ship-check.json`);
  }
  const check = requireShipCheckStructure(JSON.parse(readFileSync(shipCheckJsonPath, 'utf8')));
  return { sessionPath, latestDevPlanPath, shipCheckJsonPath, answers, check };
}

function runShipCheck(args) {
  const target = resolve(parseTarget(args));
  const { sessionPath, latestDevPlanPath, answers, check } = loadLatestShipCheck(target);
  const checks = evaluateShipCheck(check, {
    sessionPath,
    latestSessionPath: sessionPath,
    latestDevPlanPath,
    answers,
  });
  const score = scoreChecks(checks);
  const reportPath = join(sessionPath, 'ship-quality-report.md');
  const reportJsonPath = join(sessionPath, 'ship-quality-report.json');
  const report = buildQualityReportMarkdown(check, checks, score, {
    title: 'Ship Quality Report',
    generatedBy: 'ai-pm-dev ship check',
  });
  writeFileSync(reportPath, report, 'utf8');
  writeFileSync(reportJsonPath, `${JSON.stringify(buildQualityReportJson(check, checks, score, {
    generatedBy: 'ai-pm-dev ship check',
    idea: check.idea,
    sessionPath,
  }), null, 2)}\n`, 'utf8');

  const strict = args.includes('--strict');
  if (strict && score.overall === 'FAIL') {
    process.exitCode = 1;
  }

  return `Ship Quality Check${strict ? ' (strict)' : ''}

Session: ${sessionPath}
Overall: ${score.overall} (required ${score.requiredPass}/${score.requiredTotal}, recommended ${score.recommendedPass}/${score.recommendedTotal})

${checkLines(checks).join('\n')}

Report: ${reportPath}${strict && score.overall === 'FAIL' ? '\n\nStrict mode: exiting non-zero because required checks failed.' : ''}
`;
}

function runShipHandoff(args) {
  const target = resolve(parseTarget(args));
  const sessionPath = latestPrdSession(target);
  if (!sessionPath) {
    throw new Error(`No PRD sessions found for ${target}. Run: ai-pm-dev prd --target "${target}"`);
  }
  const handoffPath = join(sessionPath, 'handoff-release.md');
  if (!existsSync(handoffPath)) {
    throw new Error(`No release handoff found for latest PRD session. Run: ai-pm-dev ship materialize --target "${target}" < ship-check.json`);
  }
  return readFileSync(handoffPath, 'utf8');
}

function runShip(args) {
  const [subcommand, ...rest] = args;
  if (subcommand === 'materialize') {
    return runShipMaterialize(rest);
  }
  if (subcommand === 'check') {
    return runShipCheck(rest);
  }
  if (subcommand === 'handoff') {
    return runShipHandoff(rest);
  }
  throw new Error('Usage: ai-pm-dev ship materialize [--target <path>] < ship-check.json | ship check [--strict] [--target <path>] | ship handoff [--target <path>]');
}

function productFeedbackPath(target) {
  return join(target, '.ai-pm-dev', 'feedback', 'product-feedback.json');
}

function iterateSeedPath(target) {
  return join(target, '.ai-pm-dev', 'feedback', 'iterate-seed.json');
}

function readProductFeedback(target) {
  const path = productFeedbackPath(target);
  if (!existsSync(path)) {
    return normalizeProductFeedbackLog({});
  }
  return normalizeProductFeedbackLog(JSON.parse(readFileSync(path, 'utf8')));
}

function writeProductFeedback(target, log) {
  const path = productFeedbackPath(target);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(normalizeProductFeedbackLog(log), null, 2)}\n`, 'utf8');
  return path;
}

function latestShippedSessionPath(target) {
  const sessionPath = latestPrdSession(target);
  if (!sessionPath) {
    return '';
  }
  return existsSync(join(sessionPath, 'ship-check.json')) ? sessionPath : '';
}

function runFeedback(args) {
  const [subcommand, ...rest] = args;
  if (subcommand !== 'add') {
    throw new Error('Usage: ai-pm-dev feedback add "<signal>" --source <source> [--kind <user-reaction|usage|request>] [--target <path>]');
  }
  const usage = 'Usage: ai-pm-dev feedback add "<signal>" --source <source> [--kind <user-reaction|usage|request>] [--target <path>]';
  const signal = appendMessage(rest, usage);
  const target = resolve(parseTarget(rest));
  const source = requireFlag(rest, '--source', usage);
  const kind = parseValue(rest, '--kind') || 'request';
  if (!['user-reaction', 'usage', 'request'].includes(kind)) {
    throw new Error('Feedback kind must be one of: user-reaction, usage, request.');
  }

  const log = readProductFeedback(target);
  const entry = createFeedbackEntry({
    id: nextFeedbackId(log),
    signal,
    source,
    kind,
    shipSessionPath: latestShippedSessionPath(target),
    openedAt: nowForSession().toISOString(),
  });
  log.feedback.push(entry);
  const path = writeProductFeedback(target, log);
  return `Captured product feedback -> ${path}
Feedback: ${entry.id} (${entry.kind})
Status: open
`;
}

function loadLatestIterate(target) {
  const { sessionPath, answers } = loadLatestPrdSession(target);
  const shipCheckPath = join(sessionPath, 'ship-check.json');
  if (!existsSync(shipCheckPath)) {
    throw new Error(`No ship check found for latest PRD session. Run: ai-pm-dev ship materialize --target "${target}" < ship-check.json`);
  }
  const iteratePath = join(sessionPath, 'iterate.json');
  if (!existsSync(iteratePath)) {
    throw new Error(`No iterate packet found for latest PRD session. Run: ai-pm-dev iterate materialize --target "${target}" < iterate.json`);
  }
  const iterate = requireIterateStructure(JSON.parse(readFileSync(iteratePath, 'utf8')));
  return { sessionPath, answers, shipCheckPath, iteratePath, iterate };
}

function runIterateMaterialize(args) {
  const target = resolve(parseTarget(args));
  const { sessionPath, shipCheckJsonPath, answers } = loadLatestShipCheck(target);
  const rawIterate = readIterateStdin();
  const feedbackLog = readProductFeedback(target);
  const openFeedbackIds = openFeedbackEntries(feedbackLog).map((entry) => entry.id);
  const iterate = anchorIterate(requireIterateStructure(rawIterate), {
    answers,
    sessionPath,
    shipCheckPath: shipCheckJsonPath,
    openFeedbackIds,
  });

  const iterateJson = `${JSON.stringify(iterate, null, 2)}\n`;
  const iterateMarkdown = buildIterateMarkdown(iterate, feedbackLog.feedback);
  const iterateJsonPath = join(sessionPath, 'iterate.json');
  const iterateMarkdownPath = join(sessionPath, 'iterate.md');
  const seedPath = iterateSeedPath(target);
  const memoryDir = join(target, 'memory');
  const stateDir = join(target, '.ai-pm-dev');
  const checks = evaluateIterate(iterate, {
    sessionPath,
    latestSessionPath: sessionPath,
    latestShipCheckPath: shipCheckJsonPath,
    answers,
    feedbackLog,
  });
  const score = scoreChecks(checks);

  mkdirSync(sessionPath, { recursive: true });
  mkdirSync(dirname(seedPath), { recursive: true });
  mkdirSync(memoryDir, { recursive: true });
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(iterateJsonPath, iterateJson, 'utf8');
  writeFileSync(iterateMarkdownPath, iterateMarkdown, 'utf8');
  writeFileSync(seedPath, `${JSON.stringify(iterate.nextPrdSeed, null, 2)}\n`, 'utf8');
  writeFileSync(join(memoryDir, 'current-task-prompt.md'), `# Next PRD Seed

Run:

\`\`\`sh
ai-pm-dev iterate seed --target "${target}" | ai-pm-dev prd --json --target "${target}"
\`\`\`

Seed source: ${seedPath}
`, 'utf8');
  writeFileSync(join(stateDir, 'state.json'), `${JSON.stringify({
    version,
    task: iterate.nextPrdSeed.idea || answers.idea || '',
    skill: 'iterate-planner',
    phase: 'Iterate',
    skillPath: 'skills/iterate-planner/SKILL.md',
    nextStep: 'Run ai-pm-dev iterate check --strict, then feed iterate seed into prd --json.',
    prdSessionPath: sessionPath,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, 'utf8');
  appendCheckpoint(target, 'iterate', iterate.nextPrdSeed.mvpScope || iterate.nextPrdSeed.idea);

  let lifecycleNote = 'Feedback lifecycle unchanged because required iterate gates are not passing yet.';
  if (score.overall !== 'FAIL') {
    const updatedLog = dispositionFeedbackLog(feedbackLog, iterate, {
      iteratePath: iterateJsonPath,
      dispositionedAt: nowForSession().toISOString(),
    });
    writeProductFeedback(target, updatedLog);
    lifecycleNote = 'Triaged open feedback marked dispositioned.';
  }

  return `Iterate packet materialized

Session: ${sessionPath}
Artifacts:
- ${iterateJsonPath}
- ${iterateMarkdownPath}
- ${seedPath}

${lifecycleNote}

Next: ai-pm-dev iterate check --strict --target "${target}"
`;
}

function runIterateCheck(args) {
  const target = resolve(parseTarget(args));
  const { sessionPath, answers, shipCheckPath, iterate } = loadLatestIterate(target);
  const feedbackLog = readProductFeedback(target);
  const checks = evaluateIterate(iterate, {
    sessionPath,
    latestSessionPath: sessionPath,
    latestShipCheckPath: shipCheckPath,
    answers,
    feedbackLog,
  });
  const score = scoreChecks(checks);
  const reportPath = join(sessionPath, 'iterate-quality-report.md');
  const reportJsonPath = join(sessionPath, 'iterate-quality-report.json');
  const report = buildQualityReportMarkdown({ idea: iterate.nextPrdSeed.idea || answers.idea || 'Next iteration' }, checks, score, {
    title: 'Iterate Quality Report',
    generatedBy: 'ai-pm-dev iterate check',
  });
  writeFileSync(reportPath, report, 'utf8');
  writeFileSync(reportJsonPath, `${JSON.stringify(buildQualityReportJson({ idea: iterate.nextPrdSeed.idea || answers.idea || '' }, checks, score, {
    generatedBy: 'ai-pm-dev iterate check',
    sessionPath,
  }), null, 2)}\n`, 'utf8');

  const strict = args.includes('--strict');
  if (strict && score.overall === 'FAIL') {
    process.exitCode = 1;
  }

  return `Iterate Quality Check${strict ? ' (strict)' : ''}

Session: ${sessionPath}
Overall: ${score.overall} (required ${score.requiredPass}/${score.requiredTotal}, recommended ${score.recommendedPass}/${score.recommendedTotal})

${checkLines(checks).join('\n')}

Report: ${reportPath}${strict && score.overall === 'FAIL' ? '\n\nStrict mode: exiting non-zero because required checks failed.' : ''}
`;
}

function runIterateSeed(args) {
  const target = resolve(parseTarget(args));
  const seedPath = iterateSeedPath(target);
  if (!existsSync(seedPath)) {
    throw new Error(`No iterate seed found. Run: ai-pm-dev iterate materialize --target "${target}" < iterate.json`);
  }
  return readFileSync(seedPath, 'utf8');
}

function runIterate(args) {
  const [subcommand, ...rest] = args;
  if (subcommand === 'materialize') {
    return runIterateMaterialize(rest);
  }
  if (subcommand === 'check') {
    return runIterateCheck(rest);
  }
  if (subcommand === 'seed') {
    return runIterateSeed(rest);
  }
  throw new Error('Usage: ai-pm-dev iterate materialize [--target <path>] < iterate.json | iterate check [--strict] [--target <path>] | iterate seed [--target <path>]');
}

async function runPrd(args) {
  const [subcommand, ...rest] = args;
  if (subcommand === 'clarify') {
    return runPrdClarify(rest);
  }
  if (subcommand === 'status') {
    return runPrdStatus(rest);
  }
  if (subcommand === 'check') {
    return runPrdCheck(rest);
  }
  if (subcommand === 'handoff') {
    return runPrdHandoff(rest);
  }
  if (subcommand && !subcommand.startsWith('-')) {
    throw new Error('Usage: ai-pm-dev prd [--target <path>] | prd clarify | prd status | prd check | prd handoff --to <codex|v0|figma>');
  }
  return runPrdInterview(args);
}

function runConfig(args) {
  const [action, key, ...rest] = args;
  if (!action || action === 'get') {
    const config = readConfig();
    if (!config.defaultTarget) {
      return `No default target configured.\nSet one with: ai-pm-dev config set target "<project-path>"\n`;
    }
    return `AI PM Dev Config

Config file: ${configPath()}
Default target: ${config.defaultTarget}
`;
  }

  if (action === 'set' && key === 'target') {
    const target = rest.join(' ');
    if (!target) {
      throw new Error('Usage: ai-pm-dev config set target <path>');
    }
    const resolvedTarget = resolve(target);
    writeConfig({
      ...readConfig(),
      defaultTarget: resolvedTarget,
      updatedAt: new Date().toISOString(),
    });
    return `Default target saved: ${resolvedTarget}\nConfig file: ${configPath()}\n`;
  }

  if (action === 'clear') {
    rmSync(configPath(), { force: true });
    return 'AI PM Dev config cleared.\n';
  }

  throw new Error('Usage: ai-pm-dev config get | config set target <path> | config clear');
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    printHelp();
  } else if (command === 'init') {
    process.stdout.write(runInit(args));
  } else if (command === 'prd') {
    process.stdout.write(await runPrd(args));
  } else if (command === 'plan') {
    process.stdout.write(runPlan(args));
  } else if (command === 'design') {
    process.stdout.write(runDesign(args));
  } else if (command === 'ship') {
    process.stdout.write(runShip(args));
  } else if (command === 'feedback') {
    process.stdout.write(runFeedback(args));
  } else if (command === 'iterate') {
    process.stdout.write(runIterate(args));
  } else if (command === 'start') {
    process.stdout.write(runStart(args));
  } else if (command === 'decide') {
    process.stdout.write(runDecide(args));
  } else if (command === 'decision-record') {
    process.stdout.write(runDecisionRecord(args));
  } else if (command === 'bug') {
    process.stdout.write(runBug(args));
  } else if (command === 'note') {
    process.stdout.write(runNote(args));
  } else if (command === 'pitfall') {
    process.stdout.write(runPitfall(args));
  } else if (command === 'keyword') {
    process.stdout.write(runKeyword(args));
  } else if (command === 'learned') {
    process.stdout.write(runLearned(args));
  } else if (command === 'ask') {
    process.stdout.write(runAsk(args));
  } else if (command === 'brief') {
    process.stdout.write(runBrief(args));
  } else if (command === 'dashboard') {
    process.stdout.write(runDashboard(args));
  } else if (command === 'checkpoint') {
    process.stdout.write(runCheckpoint(args));
  } else if (command === 'timeline') {
    process.stdout.write(runTimeline(args));
  } else if (command === 'install-ownership') {
    process.stdout.write(runInstallOwnership(args));
  } else if (command === 'review-route') {
    process.stdout.write(runReviewRoute(args));
  } else if (command === 'review-packet') {
    process.stdout.write(runReviewPacket(args));
  } else if (command === 'skill') {
    process.stdout.write(runSkill(args));
  } else if (command === 'workflow') {
    process.stdout.write(runWorkflow(args));
  } else if (command === 'install-pr-template') {
    process.stdout.write(runInstallPrTemplate(args));
  } else if (command === 'install-hook') {
    process.stdout.write(runInstallHook(args));
  } else if (command === 'uninstall-hook') {
    process.stdout.write(runUninstallHook(args));
  } else if (command === 'status') {
    process.stdout.write(runStatus(args));
  } else if (command === 'doctor') {
    process.stdout.write(runDoctor(args));
  } else if (command === 'config') {
    process.stdout.write(runConfig(args));
  } else if (command === 'onboarding') {
    process.stdout.write(runOnboarding());
  } else if (command === 'release-check') {
    process.stdout.write(runReleaseCheck());
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  console.error('Run ai-pm-dev --help for usage.');
  process.exitCode = 1;
}
