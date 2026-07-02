import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildReviewPacket } from '../workflow-core/review-packet.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = join(repoRoot, 'bin', 'ai-pm-dev.mjs');

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runCli(args, options = {}) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: options.input ?? '',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function setupRepo(name = 'ai-pm-dev-review-packet-') {
  const target = mkdtempSync(join(tmpdir(), name));
  git(target, ['init']);
  git(target, ['branch', '-M', 'master']);
  git(target, ['config', 'user.email', 'review-packet@example.com']);
  git(target, ['config', 'user.name', 'Review Packet Test']);
  mkdirSync(join(target, 'src'), { recursive: true });
  writeFileSync(join(target, 'README.md'), '# Demo\n', 'utf8');
  writeFileSync(join(target, 'src', 'app.txt'), 'baseline\n', 'utf8');
  git(target, ['add', '.']);
  git(target, ['commit', '-m', 'baseline']);
  git(target, ['switch', '-c', 'feature/review-packet']);
  writeFileSync(join(target, 'README.md'), '# Demo\n\ncommitted branch change\n', 'utf8');
  git(target, ['add', 'README.md']);
  git(target, ['commit', '-m', 'feature change']);
  return target;
}

function addSessionFixture(target) {
  const sessionPath = join(target, '.ai-pm-dev', 'prd-sessions', '2026-06-09-100000-review-packet');
  mkdirSync(sessionPath, { recursive: true });
  const plan = {
    idea: 'Review packet command',
    mustHaves: ['Assemble review context', 'Show local diff'],
    nonGoals: ['No network calls'],
    slices: [
      {
        id: 'slice-1',
        title: 'Packet builder',
        mappedMustHaves: ['Assemble review context'],
        verification: 'npm test review-packet',
      },
    ],
    excludedNonGoals: ['No network calls'],
  };
  const ship = {
    idea: 'Review packet command',
    mustHavesShipped: [
      {
        mustHave: 'Assemble review context',
        status: 'shipped',
        evidence: 'Packet contains plan, ship, and diff sections.',
      },
    ],
    deferredMustHaves: [],
    acceptanceEvidence: [
      {
        criterion: 'Reviewer can start from packet alone',
        passed: true,
        evidence: 'Fixture packet includes checklist and artifacts.',
      },
    ],
    verification: [
      {
        command: 'npm test',
        passed: true,
        evidence: 'Executor reported tests passed.',
      },
    ],
    nonGoalsHeld: ['No network calls'],
    rollback: 'Revert the review-packet command commit.',
  };
  writeJson(join(sessionPath, 'dev-plan.json'), plan);
  writeJson(join(sessionPath, 'ship-check.json'), ship);
  writeJson(join(sessionPath, 'dev-plan-quality-report.json'), {
    generatedBy: 'ai-pm-dev plan check',
    overall: 'PASS',
    requiredPass: 13,
    requiredTotal: 13,
    recommendedPass: 0,
    recommendedTotal: 0,
  });
  writeJson(join(sessionPath, 'ship-quality-report.json'), {
    generatedBy: 'ai-pm-dev ship check',
    overall: 'WARN',
    requiredPass: 11,
    requiredTotal: 12,
    recommendedPass: 0,
    recommendedTotal: 0,
  });
  writeFileSync(join(sessionPath, 'dev-plan.md'), '# Dev Plan: Review packet command\n\n## Slices\n\nPacket builder\n', 'utf8');
  writeFileSync(join(sessionPath, 'ship-check.md'), '# Ship Check: Review packet command\n\n## Verification\n\nnpm test\n', 'utf8');
  return sessionPath;
}

const tempRoots = [];

try {
  {
    const target = setupRepo();
    tempRoots.push(target);
    addSessionFixture(target);
    writeFileSync(join(target, 'staged.txt'), 'staged branch change\n', 'utf8');
    git(target, ['add', 'staged.txt']);
    writeFileSync(join(target, 'src', 'app.txt'), 'baseline\nunstaged branch change\n', 'utf8');

    const packet = buildReviewPacket({
      target,
      now: new Date('2026-06-09T10:00:00.000Z'),
    });

    assert.match(packet, /# Review Packet/);
    assert.match(packet, /Current branch: feature\/review-packet/);
    assert.match(packet, /Base ref: master/);
    assert.match(packet, /Diff range: master\.\.\.HEAD/);
    assert.match(packet, /## Safety Notice/);
    assert.match(packet, /v1 does not scan, redact, or sanitize secrets/);
    assert.match(packet, /## Executor-Reported Gates/);
    assert.match(packet, /Dev Plan Gate: executor-reported PASS/);
    assert.match(packet, /Ship Gate: executor-reported WARN/);
    assert.match(packet, /reviewer must independently rerun/i);
    assert.match(packet, /# Dev Plan: Review packet command/);
    assert.match(packet, /# Ship Check: Review packet command/);
    assert.match(packet, /### Committed Diff Stat/);
    assert.match(packet, /README\.md/);
    assert.match(packet, /committed branch change/);
    assert.match(packet, /### Staged Diff Stat/);
    assert.match(packet, /staged\.txt/);
    assert.match(packet, /staged branch change/);
    assert.match(packet, /### Unstaged Diff Stat/);
    assert.match(packet, /src\/app\.txt|src\\app\.txt/);
    assert.match(packet, /unstaged branch change/);
    assert.match(packet, /Slice slice-1 \(Packet builder\)/);
    assert.match(packet, /PRD must-have covered by diff and evidence: Assemble review context/);
    assert.match(packet, /Non-goal still excluded: No network calls/);
    assert.match(packet, /Acceptance evidence independently holds: Reviewer can start from packet alone/);
    assert.match(packet, /Rollback is credible and actionable: Revert the review-packet command commit/);

    const cliPacket = runCli(['review-packet', '--target', target]);
    assert.match(cliPacket, /# Review Packet/);
    assert.match(cliPacket, /Current branch: feature\/review-packet/);
    assert.match(cliPacket, /Diff range: master\.\.\.HEAD/);
    assert.match(cliPacket, /Dev Plan Gate: executor-reported PASS/);
  }

  {
    const target = setupRepo('ai-pm-dev-review-packet-large-');
    tempRoots.push(target);
    addSessionFixture(target);
    const largeDiff = Array.from({ length: 80 }, (_, index) => `line ${index}`).join('\n');
    writeFileSync(join(target, 'large.txt'), `${largeDiff}\n`, 'utf8');
    git(target, ['add', 'large.txt']);
    git(target, ['commit', '-m', 'large diff']);

    const packet = buildReviewPacket({
      target,
      now: new Date('2026-06-09T10:00:00.000Z'),
      diffLineBudget: 20,
    });

    assert.match(packet, /Inline diff budget: 20 lines/);
    assert.match(packet, /Diff truncated/);
    assert.match(packet, /omitted \d+ line\(s\)/);
    assert.match(packet, /Rerun locally: `git -C ".*" diff master\.\.\.HEAD`/);
  }

  {
    const target = setupRepo('ai-pm-dev-review-packet-out-');
    tempRoots.push(target);
    addSessionFixture(target);
    const outPath = join(target, 'packet.md');
    const stdout = runCli(['review-packet', '--target', target, '--out', outPath]);
    assert.match(stdout, /Review packet written:/);
    assert.equal(existsSync(outPath), true);
    const packet = readFileSync(outPath, 'utf8');
    assert.match(packet, /# Review Packet/);
    assert.match(packet, /## Safety Notice/);
    assert.doesNotMatch(stdout, /## Safety Notice/);
  }

} finally {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
}
