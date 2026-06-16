#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '1.0.0';
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
];

function printHelp() {
  console.log(`AI PM Dev Agent v${version}

Usage:
  ai-pm-dev init <target> [--dry-run] [--force] [--include-readme]
  ai-pm-dev prd [--target <path>] [--lang <zh|en>] [--type <ai-tool|saas|consumer|internal-tool>] [--from-note <file>]
  ai-pm-dev prd status [--target <path>]
  ai-pm-dev prd check [--strict] [--target <path>]
  ai-pm-dev prd handoff --to <codex|v0|figma> [--target <path>]
  ai-pm-dev start "<task>" [--type <type>] [--target <path>] [--save]
  ai-pm-dev decide "<decision>" [--why <reason>] [--target <path>]
  ai-pm-dev note "<progress note>" [--target <path>]
  ai-pm-dev pitfall "<symptom>" [--cause <c>] [--fix <f>] [--target <path>]
  ai-pm-dev keyword "<term>" --explain "<plain words>" [--example <e>] [--target <path>]
  ai-pm-dev learned "<understanding in your own words>" [--target <path>]
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
  start          Route a task, generate the AI prompt, and optionally save task state.
  decide         Append a one-line decision to docs/decision-log.md.
  note           Append a one-line progress note to docs/progress.md.
  pitfall        Append a one-line pitfall to docs/troubleshooting.md.
  keyword        Append a key-term card to docs/keywords.md.
  learned        Append an own-words understanding note to docs/learning-log.md.
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
  const promptExists = targetExists && existsSync(join(target, 'memory', 'current-task-prompt.md'));
  const stateExists = targetExists && existsSync(join(target, '.ai-pm-dev', 'state.json'));
  const installedSkillCount = targetExists && existsSync(join(target, 'skills'))
    ? readdirSync(join(target, 'skills'), { withFileTypes: true }).filter((item) => item.isDirectory()).length
    : 0;

  return `AI PM Dev Doctor

Node: ${process.version}
Package root: ${repoRoot}
Target: ${target}

${formatCheck('Package assets', packageAssetsOk, 'Reinstall with: npm install -g github:Andrew-JX/ai-pm-dev')}
${formatCheck('Target exists', targetExists, `Create the directory or check the path: ${target}`)}
${formatCheck('Target initialized', targetInitialized, `ai-pm-dev init "${target}"`)}
${formatCheck('Operating layer (AGENTS.md + docs/)', operatingLayerOk, `ai-pm-dev init "${target}"`)}${docsNudge ? `\n${docsNudge}` : ''}
Installed skills: ${installedSkillCount}/${requiredSkills.length}
${formatCheck('Task prompt', promptExists, `ai-pm-dev start "<task>" --target "${target}" --save`)}
${formatCheck('Task state', stateExists, `ai-pm-dev start "<task>" --target "${target}" --save`)}
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

const prdQuestions = [
  {
    key: 'idea',
    label: 'Product idea',
    prompt: 'What product do you want to build in one sentence?',
    promptZh: '用一句话描述你想做的产品是什么？',
  },
  {
    key: 'targetUsers',
    label: 'Target users',
    prompt: 'Who is the first user group this product should serve?',
    promptZh: '第一批目标用户是谁？',
  },
  {
    key: 'painPoints',
    label: 'Pain points',
    prompt: 'What is the sharpest user pain or scenario?',
    promptZh: '最尖锐的用户痛点或场景是什么？',
  },
  {
    key: 'currentWorkaround',
    label: 'Current workaround',
    prompt: 'How do users solve this problem today?',
    promptZh: '用户现在是怎么解决这个问题的？',
  },
  {
    key: 'coreWorkflow',
    label: 'Core workflow',
    prompt: 'What core workflow takes users from entry to value?',
    promptZh: '从进入到获得价值的核心流程是什么？',
  },
  {
    key: 'mvpScope',
    label: 'MVP must-haves',
    prompt: 'List the v1 must-haves — at most 3. More than 3 means you have not prioritized.',
    promptZh: '列出 v1 的必做项 —— 最多 3 个。超过 3 个就是还没定优先级。',
  },
  {
    key: 'oneThing',
    label: 'The one thing',
    prompt: 'If you could ship only ONE of those, which one proves the idea?',
    promptZh: '如果只能上线其中一个，哪一个能验证这个想法？',
  },
  {
    key: 'nonGoals',
    label: 'Non-goals',
    prompt: 'Name at least one thing you are deliberately NOT doing in v1 (and why).',
    promptZh: '至少说出一件 v1 故意不做的事（以及为什么）。',
  },
  {
    key: 'dataModel',
    label: 'Data model',
    prompt: 'What data must the product record or generate?',
    promptZh: '产品必须记录或生成哪些数据？',
  },
  {
    key: 'deterministicRules',
    label: 'Deterministic rules',
    prompt: 'Which calculations or decisions must be deterministic rather than AI-generated?',
    promptZh: '哪些计算或决策必须是确定性的，而不是由 AI 生成？',
    aiRelated: true,
  },
  {
    key: 'aiBoundaries',
    label: 'AI boundaries',
    prompt: 'What should AI do, and what should AI never decide by itself?',
    promptZh: 'AI 应该做什么，又绝不能自己决定什么？',
    aiRelated: true,
  },
  {
    key: 'trustMechanism',
    label: 'Trust mechanism',
    prompt: 'What evidence, sources, or state should be shown behind AI output?',
    promptZh: 'AI 输出背后应展示哪些证据、来源或状态？',
    aiRelated: true,
  },
  {
    key: 'risks',
    label: 'Risks',
    prompt: 'What privacy, safety, permission, or misleading-output risks matter?',
    promptZh: '有哪些隐私、安全、权限或误导性输出方面的风险？',
  },
  {
    key: 'acceptanceCriteria',
    label: 'Primary success metric',
    prompt: 'One measurable signal that v1 worked (a single number or observable result).',
    promptZh: '一个可衡量的成功信号（单一数字或可观察的结果）。',
  },
];

// Count list items in a free-text answer (comma / Chinese comma / semicolon / newline separated).
function countItems(value) {
  return (value || '')
    .split(/[,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

const projectTypes = ['ai-tool', 'saas', 'consumer', 'internal-tool', 'general'];

// AI-specific questions only apply to AI-centric products. For other declared types
// they are skipped and recorded as not-applicable, instead of forcing blank answers.
function questionsForType(type) {
  if (!type || type === 'ai-tool' || type === 'general') {
    return prdQuestions;
  }
  return prdQuestions.filter((question) => !question.aiRelated);
}

function questionText(question, index, lang) {
  const body = lang === 'zh' ? question.promptZh : question.prompt;
  return `${index + 1}. ${body}`;
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

Read \`ai-prd.md\` first and treat it as the product source of truth.

## Product Context

- Target users: ${answers.targetUsers}
- Core workflow: ${answers.coreWorkflow}
- MVP scope: ${answers.mvpScope}

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

Audience: ${answers.targetUsers}
Problem: ${answers.painPoints}
Workflow: ${answers.coreWorkflow}

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

## User and Scenario

- User: ${answers.targetUsers}
- Pain: ${answers.painPoints}
- Current workaround: ${answers.currentWorkaround}

## Flow

Represent this flow as connected screens and states:
${answers.coreWorkflow}

## Product Constraints

- MVP and non-goals: ${answers.mvpScope}
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
  const items = (answers.mvpScope || '')
    .split(/[,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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

const PLACEHOLDER = /_\(to be filled\)_|_\(date\)_|_\(skill or person\)_|_\(how\)_/;

// A doc still untouched: either an unfilled stub (Status: TODO) or only placeholder rows.
function docIsStub(path) {
  if (!existsSync(path)) {
    return false;
  }
  const content = readFileSync(path, 'utf8');
  return /\*\*Status:\*\* TODO/.test(content) || PLACEHOLDER.test(content);
}

function stripPlaceholderRows(content) {
  return content
    .split('\n')
    .filter((line) => !PLACEHOLDER.test(line))
    .join('\n');
}

// Escape a value for a markdown table cell (collapse whitespace, escape pipes).
function cell(value) {
  return (value || '').replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
}

function appendRows(path, header, rows) {
  if (!rows.length) {
    return;
  }
  const raw = existsSync(path) ? readFileSync(path, 'utf8') : header;
  const base = stripPlaceholderRows(raw).trimEnd();
  writeFileSync(path, `${base}\n${rows.join('\n')}\n`, 'utf8');
}

const DECISION_HEADER = '# Decision Log\n\n| Date | Decision | Why | Owner |\n| --- | --- | --- | --- |\n';
const TROUBLE_HEADER = '# Troubleshooting\n\n| Symptom | Root cause | Fix | Verified |\n| --- | --- | --- | --- |\n';

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

function writeProjectDocs(targetRoot, answers) {
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
  appendRows(
    join(docsDir, 'open-questions.md'),
    '# Open Questions\n\n| Question | Why it matters | Status |\n| --- | --- | --- |\n',
    blanks,
  );
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

function writePrdAssets(target, answers, sourceNote = '') {
  if (!existsSync(target)) {
    throw new Error(`Target directory does not exist: ${target}`);
  }

  // Questions skipped by project-type filtering leave keys undefined; normalize to ''
  // so builders and section() never crash on a missing field.
  for (const question of prdQuestions) {
    if (answers[question.key] === undefined) {
      answers[question.key] = '';
    }
  }

  const targetRoot = resolve(target);
  const stamp = formatStamp(nowForSession());
  const sessionName = `${stamp}-${sessionSlug(answers.idea)}`;
  const sessionPath = join(targetRoot, '.ai-pm-dev', 'prd-sessions', sessionName);
  const files = {
    'conversation.md': buildConversation(answers),
    'answers.json': `${JSON.stringify(answers, null, 2)}\n`,
    'ai-prd.md': buildAiPrd(answers),
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

  writeProjectDocs(targetRoot, answers);

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

Project docs updated: ${join(target, 'docs')}
  PROJECT_BRIEF.md, UI_SPEC.md, acceptance-tests.md, decision-log.md, open-questions.md

Next: ai-pm-dev prd check
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

  // When the idea comes from a note file, skip the idea question and pre-fill it.
  const allQuestions = questionsForType(type);
  const questions = notedIdea ? allQuestions.filter((question) => question.key !== 'idea') : allQuestions;
  const ideaLabel = lang === 'zh' ? '想法（来自笔记）' : 'Idea (from note)';

  if (!process.stdin.isTTY) {
    const lines = readFileSync(0, 'utf8').split(/\r?\n/);
    const answers = notedIdea ? { idea: notedIdea } : {};
    const [introTitle, introHint] = prdIntro(lang);
    console.log(introTitle);
    console.log(`${introHint}\n`);
    if (notedIdea) {
      console.log(`${ideaLabel}: ${notedIdea}\n`);
    }
    questions.forEach((question, index) => {
      console.log(`${questionText(question, index, lang)}\n> ${lines[index] ?? ''}`);
      answers[question.key] = (lines[index] ?? '').trim();
    });
    const { sessionPath } = writePrdAssets(target, answers, note);
    return prdCompletionMessage(target, sessionPath, lang);
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
  const { sessionPath } = writePrdAssets(target, answers, note);
  return prdCompletionMessage(target, sessionPath, lang);
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

function evaluatePrd(answers, sessionPath) {
  const text = (key) => (answers[key] || '').trim();
  const has = (key) => text(key).length > 0;
  const checks = [];

  const required = (name, pass, hint) => checks.push({ name, severity: 'required', pass, hint });
  const recommend = (name, pass, hint) => checks.push({ name, severity: 'recommended', pass, hint });

  required('Product idea present', has('idea'), 'A one-sentence product idea is mandatory.');
  required('Target users named', has('targetUsers'), 'State the first user group.');
  required('Pain point stated', has('painPoints'), 'Describe the sharpest user pain.');
  required('Must-haves present', has('mvpScope'), 'List the v1 must-haves.');
  required('Primary metric present', has('acceptanceCriteria'), 'State one measurable success signal.');

  // Forcing checks — the hard PM work: cutting and prioritizing.
  required('Must-haves prioritized (<=3)', has('mvpScope') && countItems(text('mvpScope')) <= 3,
    `Cut to at most 3 must-haves (you listed ${countItems(text('mvpScope'))}); defer the rest in scope.md.`);
  required('Non-goals declared (something cut)', has('nonGoals'),
    'Name at least one thing v1 is deliberately NOT doing.');
  required('The one thing chosen', has('oneThing'),
    'Pick the single feature that proves the idea if you could ship only one.');

  const acceptance = text('acceptanceCriteria');
  const verifiable = /\d|%|min|sec|within|less than|分钟|秒|百分|至少|次|完成/.test(acceptance);
  recommend('Acceptance looks verifiable', has('acceptanceCriteria') && verifiable,
    'Prefer measurable/observable acceptance over vague statements.');

  recommend('Core workflow described', has('coreWorkflow'), 'Describe entry-to-value flow.');
  recommend('Data model described', has('dataModel'), 'State what data is recorded or generated, or mark not-applicable.');
  recommend('AI boundary declared', has('aiBoundaries'),
    'Say what AI may do and must never decide — or mark not-applicable if the product uses no AI.');
  recommend('Deterministic rules declared', has('deterministicRules'),
    'List rules that must be deterministic — or mark not-applicable.');
  recommend('Risks & guardrails', has('risks'), 'Name privacy/safety/misleading-output risks.');

  const codexPath = join(sessionPath, 'handoff-codex.md');
  const codexRefsPrd = existsSync(codexPath) && /ai-prd\.md/.test(readFileSync(codexPath, 'utf8'));
  required('Codex handoff references PRD', codexRefsPrd, 'Handoff must point downstream tools to ai-prd.md.');

  return checks;
}

function buildQualityReport(answers, checks, score) {
  const row = (check) => {
    const status = check.pass ? 'PASS' : (check.severity === 'required' ? 'FAIL' : 'WARN');
    return `| ${status} | ${check.severity} | ${check.name} | ${check.pass ? '' : check.hint} |`;
  };
  return `# PRD Quality Report: ${answers.idea || 'Untitled'}

Overall: ${score.overall} (required ${score.requiredPass}/${score.requiredTotal}, recommended ${score.recommendedPass}/${score.recommendedTotal})

| Status | Severity | Check | Fix |
| --- | --- | --- | --- |
${checks.map(row).join('\n')}

Generated by \`ai-pm-dev prd check\`.
`;
}

function scoreChecks(checks) {
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

function runPrdCheck(args) {
  const target = resolve(parseTarget(args));
  const sessionPath = latestPrdSession(target);
  if (!sessionPath) {
    return `No PRD sessions found for ${target}\nRun: ai-pm-dev prd --target "${target}"\n`;
  }

  const answers = JSON.parse(readFileSync(join(sessionPath, 'answers.json'), 'utf8'));
  const checks = evaluatePrd(answers, sessionPath);
  const score = scoreChecks(checks);
  const report = buildQualityReport(answers, checks, score);
  const reportPath = join(sessionPath, 'quality-report.md');
  writeFileSync(reportPath, report, 'utf8');

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

async function runPrd(args) {
  const [subcommand, ...rest] = args;
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
    throw new Error('Usage: ai-pm-dev prd [--target <path>] | prd status | prd check | prd handoff --to <codex|v0|figma>');
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
  } else if (command === 'start') {
    process.stdout.write(runStart(args));
  } else if (command === 'decide') {
    process.stdout.write(runDecide(args));
  } else if (command === 'note') {
    process.stdout.write(runNote(args));
  } else if (command === 'pitfall') {
    process.stdout.write(runPitfall(args));
  } else if (command === 'keyword') {
    process.stdout.write(runKeyword(args));
  } else if (command === 'learned') {
    process.stdout.write(runLearned(args));
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
