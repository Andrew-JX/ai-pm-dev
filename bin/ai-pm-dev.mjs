#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '0.7.0';
const requiredSkills = [
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
  ai-pm-dev start "<task>" [--type <type>] [--target <path>] [--save]
  ai-pm-dev status [--target <path>]
  ai-pm-dev doctor [--target <path>]
  ai-pm-dev onboarding
  ai-pm-dev release-check

Commands:
  init           Install workflow files into a target project.
  start          Route a task, generate the AI prompt, and optionally save task state.
  status         Show the saved task state for a target project.
  doctor         Check the package and optional target project setup.
  onboarding     Show the shortest beginner path.
  release-check  Show release readiness checks.
`);
}

function runNodeScript(scriptName, args) {
  const scriptPath = join(repoRoot, 'scripts', scriptName);
  return execFileSync('node', [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parseTarget(args) {
  const targetIndex = args.indexOf('--target');
  if (targetIndex >= 0) {
    return args[targetIndex + 1] ?? process.cwd();
  }
  return process.cwd();
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
  return runNodeScript('init-ai-pm-dev.mjs', ['--target', target, ...rest]);
}

function runStart(args) {
  const [task, ...rest] = args;
  if (!task || task.startsWith('-')) {
    throw new Error('Usage: ai-pm-dev start "<task>" [--type <type>] [--target <path>] [--save]');
  }
  return runNodeScript('start-task.mjs', ['--task', task, ...rest]);
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
Installed skills: ${installedSkillCount}/${requiredSkills.length}
${formatCheck('Task prompt', promptExists, `ai-pm-dev start "<task>" --target "${target}" --save`)}
${formatCheck('Task state', stateExists, `ai-pm-dev start "<task>" --target "${target}" --save`)}
`;
}

function runOnboarding() {
  return `AI PM Dev Onboarding

1. Initialize a project:
   ai-pm-dev init "<your-project-path>"

2. Start a task:
   ai-pm-dev start "<your task>" --target "<your-project-path>" --save

3. Open the generated prompt:
   memory/current-task-prompt.md

4. Paste that prompt into Codex, Claude Code, or another AI coding tool from the target project root.

5. Check setup any time:
   ai-pm-dev doctor --target "<your-project-path>"
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

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    printHelp();
  } else if (command === 'init') {
    process.stdout.write(runInit(args));
  } else if (command === 'start') {
    process.stdout.write(runStart(args));
  } else if (command === 'status') {
    process.stdout.write(runStatus(args));
  } else if (command === 'doctor') {
    process.stdout.write(runDoctor(args));
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
