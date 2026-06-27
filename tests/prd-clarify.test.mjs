import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClarificationState, runPrdClarificationTurn } from '../llm/prd-clarifier.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliPath = join(repoRoot, 'bin', 'ai-pm-dev.mjs');

const completeAnswers = {
  idea: 'AI fitness logging tool',
  targetUsers: 'Fitness beginners',
  painPoints: 'They cannot see whether training improves',
  currentWorkaround: 'Scattered notes',
  coreWorkflow: 'Log workout, review progress, receive AI summary',
  mvpScope: 'Workout logging; weekly summary; progress trend',
  oneThing: 'Workout logging',
  nonGoals: 'No social features in v1',
  dataModel: 'Workouts, sets, reps, weight',
  deterministicRules: 'Training volume is deterministic',
  aiBoundaries: 'AI summarizes progress only',
  trustMechanism: 'Show the workouts used',
  risks: 'Protect health data',
  acceptanceCriteria: 'Users understand weekly progress',
};

function fakeClient(outputs) {
  const queue = [...outputs];
  return {
    available: true,
    model: 'fake-model',
    async completeJson() {
      const next = queue.shift();
      if (next instanceof Error) {
        throw next;
      }
      return typeof next === 'string'
        ? { ok: true, model: 'fake-model', text: next, usage: { input_tokens: 1, output_tokens: 1 }, attempts: 1 }
        : next;
    },
  };
}

function runCliJsonTurn(body, target) {
  return execFileSync(process.execPath, [cliPath, 'prd', 'clarify', '--json-turn'], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: JSON.stringify(body),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: '',
      AI_PM_DEV_FIXED_TIME: '2026-06-09T10:00:00.000Z',
      AI_PM_DEV_HOME: join(target, '.home'),
    },
  });
}

const tempRoots = [];

try {
  {
    const state = createClarificationState({
      runId: 'run-ready',
      model: 'fake-model',
      lang: 'en',
      projectType: 'general',
    });
    const result = await runPrdClarificationTurn({
      client: fakeClient([JSON.stringify({ action: 'final', answers: completeAnswers })]),
      state,
      userInput: 'Build an AI fitness logging tool',
      now: new Date('2026-06-09T10:00:00.000Z'),
    });

    assert.equal(result.status, 'ready');
    assert.equal(result.answers.acceptanceCriteria, 'Users understand weekly progress');
    assert.equal(result.llmRecord.validation.answerGateOverall, 'PASS');
    assert.deepEqual(result.llmRecord.validation.failedRequired, []);
  }

  {
    const result = await runPrdClarificationTurn({
      client: fakeClient([JSON.stringify({
        action: 'final',
        answers: {
          ...completeAnswers,
          mvpScope: 'One; Two; Three; Four',
          nonGoals: '',
        },
      })]),
      state: createClarificationState({ runId: 'run-ask', model: 'fake-model' }),
      userInput: 'Here is my first draft',
      now: new Date('2026-06-09T10:00:00.000Z'),
    });

    assert.equal(result.status, 'ask');
    assert.equal(result.questions.length, 2);
    assert.match(result.questions.join('\n'), /Cut the v1 must-haves/);
    assert.match(result.questions.join('\n'), /deliberately not do/);
  }

  {
    const result = await runPrdClarificationTurn({
      client: fakeClient([
        'not-json',
        JSON.stringify({ action: 'final', answers: completeAnswers }),
      ]),
      state: createClarificationState({ runId: 'run-repair', model: 'fake-model' }),
      userInput: 'Repair path',
      now: new Date('2026-06-09T10:00:00.000Z'),
    });

    assert.equal(result.status, 'ready');
    assert.equal(result.llmRecord.responses.length, 2);
    assert.equal(result.llmRecord.repaired, true);
  }

  {
    const result = await runPrdClarificationTurn({
      client: fakeClient([JSON.stringify({ action: 'ask', questions: ['Who is this for?', 'What hurts most?', 'What is out of scope?', 'Ignored fourth?'] })]),
      state: createClarificationState({ runId: 'run-ask-llm', model: 'fake-model' }),
      userInput: 'A vague product idea',
      now: new Date('2026-06-09T10:00:00.000Z'),
    });

    assert.equal(result.status, 'ask');
    assert.deepEqual(result.questions, ['Who is this for?', 'What hurts most?', 'What is out of scope?']);
  }

  {
    const result = await runPrdClarificationTurn({
      client: fakeClient([{ ok: false, model: 'fake-model', error: 'request timed out' }]),
      state: createClarificationState({ runId: 'run-timeout', model: 'fake-model' }),
      userInput: 'Timeout path idea',
      now: new Date('2026-06-09T10:00:00.000Z'),
    });

    assert.equal(result.status, 'degraded');
    assert.match(result.reason, /timed out/);
    assert.equal(result.answers.idea, 'Timeout path idea');
  }

  {
    const result = await runPrdClarificationTurn({
      client: fakeClient(['not-json', 'still-not-json']),
      state: createClarificationState({ runId: 'run-repair-fails', model: 'fake-model' }),
      userInput: 'Repair failure idea',
      now: new Date('2026-06-09T10:00:00.000Z'),
    });

    assert.equal(result.status, 'degraded');
    assert.match(result.reason, /Invalid JSON/);
    assert.equal(result.llmRecord.responses.length, 2);
  }

  {
    const result = await runPrdClarificationTurn({
      client: fakeClient([JSON.stringify({ action: 'ask', questions: ['Still missing scope?'] })]),
      state: createClarificationState({
        runId: 'run-limit',
        model: 'fake-model',
      }),
      userInput: 'Turn limit idea',
      maxTurns: 1,
      now: new Date('2026-06-09T10:00:00.000Z'),
    });

    assert.equal(result.status, 'degraded');
    assert.match(result.reason, /turn limit/);
  }

  {
    const target = mkdtempSync(join(tmpdir(), 'ai-pm-dev-clarify-json-'));
    tempRoots.push(target);
    const stdout = runCliJsonTurn({
      target,
      userInput: 'AI notes tool',
      state: {
        runId: 'json-turn-run',
        model: 'claude-opus-4-8',
        draftAnswers: {},
      },
    }, target);
    const response = JSON.parse(stdout);

    assert.equal(response.status, 'degraded');
    assert.equal(response.runId, 'json-turn-run');
    assert.equal(existsSync(response.sessionPath), true);
    assert.equal(existsSync(response.callsPath), true);
    const answers = JSON.parse(readFileSync(join(response.sessionPath, 'answers.json'), 'utf8'));
    assert.equal(answers.idea, 'AI notes tool');
    const calls = readFileSync(response.callsPath, 'utf8');
    assert.match(calls, /ANTHROPIC_API_KEY is not set/);
    assert.equal(existsSync(join(response.sessionPath, 'llm-run.json')), true);
  }
} finally {
  for (const dir of tempRoots) {
    rmSync(dir, { recursive: true, force: true });
  }
}
