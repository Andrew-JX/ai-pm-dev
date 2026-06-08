#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const copyRoots = ['skills', 'templates'];
const memoryRoot = 'memory';

function printHelp() {
  console.log(`AI PM Dev Agent v0.2 initializer

Usage:
  node scripts/init-ai-pm-dev.mjs --target <project-root> [options]

Options:
  -t, --target <path>   Target project root.
  --dry-run            Show actions without writing files.
  --force              Overwrite CLAUDE.md without creating a backup.
  --include-readme     Copy this README.md into the target project.
  -h, --help           Show this help.

Examples:
  node scripts/init-ai-pm-dev.mjs --target "E:\\studyspace\\webroad\\FitMind\\fitmind-ai"
  node scripts/init-ai-pm-dev.mjs -t ../my-project --dry-run
`);
}

function parseArgs(argv) {
  const options = {
    target: '',
    dryRun: false,
    force: false,
    includeReadme: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--target' || arg === '-t') {
      options.target = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--include-readme') {
      options.includeReadme = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function assertTarget(target) {
  if (!target) {
    throw new Error('Missing required --target <project-root>.');
  }

  if (!existsSync(target)) {
    throw new Error(`Target directory does not exist: ${target}`);
  }

  if (!statSync(target).isDirectory()) {
    throw new Error(`Target path is not a directory: ${target}`);
  }
}

function sameFileContent(source, target) {
  return existsSync(target) && readFileSync(source, 'utf8') === readFileSync(target, 'utf8');
}

function uniqueBackupPath(targetDir, basename) {
  const first = join(targetDir, basename);
  if (!existsSync(first)) {
    return first;
  }

  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  return join(targetDir, basename.replace(/\.md$/, `-${stamp}.md`));
}

function copyFileWithLog(source, target, actions, { dryRun, overwrite = true } = {}) {
  if (!overwrite && existsSync(target)) {
    actions.push(`keep existing ${target}`);
    return;
  }

  actions.push(`${existsSync(target) ? 'overwrite' : 'copy'} ${target}`);
  if (dryRun) {
    return;
  }

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

function copyDirectory(sourceDir, targetDir, actions, options) {
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const source = join(sourceDir, entry.name);
    const target = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      if (!options.dryRun) {
        mkdirSync(target, { recursive: true });
      }
      copyDirectory(source, target, actions, options);
    } else if (entry.isFile()) {
      copyFileWithLog(source, target, actions, options);
    }
  }
}

function installClaude(targetDir, actions, options) {
  const source = join(repoRoot, 'CLAUDE.md');
  const target = join(targetDir, 'CLAUDE.md');

  if (sameFileContent(source, target)) {
    actions.push(`keep existing ${target}`);
    return;
  }

  if (existsSync(target) && !options.force) {
    const backup = uniqueBackupPath(targetDir, 'CLAUDE.ai-pm-dev-backup.md');
    actions.push(`backup ${target} -> ${backup}`);
    if (!options.dryRun) {
      copyFileSync(target, backup);
    }
  }

  copyFileWithLog(source, target, actions, options);
}

function installMemory(targetDir, actions, options) {
  const sourceDir = join(repoRoot, memoryRoot);
  const targetDirForMemory = join(targetDir, memoryRoot);

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }
    copyFileWithLog(join(sourceDir, entry.name), join(targetDirForMemory, entry.name), actions, {
      ...options,
      overwrite: false,
    });
  }
}

function initialize(options) {
  const targetDir = resolve(options.target);
  assertTarget(targetDir);

  const actions = [];
  installClaude(targetDir, actions, options);

  for (const root of copyRoots) {
    copyDirectory(join(repoRoot, root), join(targetDir, root), actions, options);
  }

  installMemory(targetDir, actions, options);

  if (options.includeReadme) {
    copyFileWithLog(join(repoRoot, 'README.md'), join(targetDir, 'AI_PM_DEV_README.md'), actions, options);
  }

  const mode = options.dryRun ? 'Dry run' : 'AI PM Dev Agent v0.2 initialized';
  console.log(`${mode}: ${targetDir}`);
  for (const action of actions) {
    console.log(`- ${action}`);
  }
  console.log('');
  console.log('Next prompt:');
  console.log('请先阅读 CLAUDE.md，并按其中的 AI PM Dev Agent 流程工作。');
  console.log('当前任务是：...');
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
  } else {
    initialize(options);
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  console.error('Run with --help for usage.');
  process.exitCode = 1;
}
