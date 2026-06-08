#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function printHelp() {
  console.log(`AI PM Dev Agent v0.4

Usage:
  ai-pm-dev init <target> [--dry-run] [--force] [--include-readme]
  ai-pm-dev start "<task>" [--type <type>] [--target <path>] [--save]
  ai-pm-dev status [--target <path>]

Commands:
  init     Install workflow files into a target project.
  start    Route a task, generate the AI prompt, and optionally save task state.
  status   Show the saved task state for a target project.
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
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  console.error('Run ai-pm-dev --help for usage.');
  process.exitCode = 1;
}
