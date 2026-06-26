import assert from 'node:assert/strict';
import { createAnthropicPrdClient } from '../llm/anthropic-client.mjs';
import { DEFAULT_REASONING_MODEL, COST_SENSITIVE_MODEL, resolveModelAlias } from '../llm/models.mjs';
import {
  PRD_ANSWER_KEYS,
  loadPrdAnswerSchema,
  normalizePrdAnswersForSchema,
  validatePrdAnswers,
} from '../llm/prd-schema.mjs';
import { evaluateAnswerGates, scoreChecks } from '../workflow-core/prd-gates.mjs';

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

assert.equal(DEFAULT_REASONING_MODEL, 'claude-opus-4-8');
assert.equal(COST_SENSITIVE_MODEL, 'claude-sonnet-4-6');
assert.equal(resolveModelAlias('opus'), DEFAULT_REASONING_MODEL);
assert.equal(resolveModelAlias('sonnet'), COST_SENSITIVE_MODEL);

{
  const schema = loadPrdAnswerSchema();
  assert.equal(PRD_ANSWER_KEYS.length, 14);
  assert.deepEqual(schema.required, PRD_ANSWER_KEYS);
  assert.deepEqual(Object.keys(schema.properties), PRD_ANSWER_KEYS);
  assert.equal(schema.additionalProperties, false);
  assert.ok(schema.required.includes('oneThing'));
  assert.ok(schema.required.includes('nonGoals'));
}

{
  const result = validatePrdAnswers(completeAnswers);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.answers.oneThing, 'Workout logging');
}

{
  const result = validatePrdAnswers({
    idea: 'A playful dating plan app',
    targetUsers: 'Young couples',
    painPoints: 'Planning dates takes too much chat',
    currentWorkaround: 'Manual chat',
    coreWorkflow: 'Pick time, food, and activity',
    mvpScope: 'Date picker; food picker; activity picker',
    oneThing: 'Generate a date plan',
    nonGoals: 'No accounts',
    dataModel: 'Date, time, food, activity',
    risks: 'Avoid pressuring users',
    acceptanceCriteria: 'A plan is created',
  }, { projectType: 'consumer' });
  assert.equal(result.ok, true);
  assert.equal(result.answers.deterministicRules, '');
  assert.equal(result.answers.aiBoundaries, '');
  assert.equal(result.answers.trustMechanism, '');
}

{
  const result = validatePrdAnswers({
    ...completeAnswers,
    extraExplanation: 'The model may include this, but it is not part of answers.json.',
  });
  assert.equal(result.ok, true);
  assert.equal(result.answers.extraExplanation, undefined);
  assert.deepEqual(result.unknownFields, ['extraExplanation']);
  assert.match(result.warnings.join('\n'), /Ignored unknown PRD answer fields/);
}

{
  const result = validatePrdAnswers({ ...completeAnswers, idea: { text: 'not a string' } });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Field "idea" must be a string/);
}

{
  const result = normalizePrdAnswersForSchema(null);
  assert.equal(result.answers.idea, '');
  assert.match(result.errors.join('\n'), /must be an object/);
}

{
  const checks = evaluateAnswerGates(completeAnswers);
  const score = scoreChecks(checks);
  assert.equal(score.overall, 'PASS');
  assert.equal(score.requiredPass, score.requiredTotal);
  assert.deepEqual(checks.map((check) => check.severity), checks.map(() => 'required'));
  assert.equal(checks.some((check) => check.name === 'Acceptance looks verifiable'), false);
}

for (const key of ['idea', 'targetUsers', 'painPoints', 'acceptanceCriteria', 'oneThing', 'nonGoals']) {
  const checks = evaluateAnswerGates({ ...completeAnswers, [key]: '' });
  assert.equal(scoreChecks(checks).overall, 'FAIL', `${key} should be an answer required gate`);
}

{
  const checks = evaluateAnswerGates({
    ...completeAnswers,
    mvpScope: 'One; Two; Three; Four',
  });
  assert.equal(scoreChecks(checks).overall, 'FAIL');
  assert.equal(checks.find((check) => check.name === 'Must-haves prioritized (<=3)')?.pass, false);
}

{
  const unavailable = createAnthropicPrdClient({ apiKey: '' });
  assert.equal(unavailable.available, false);
  const result = await unavailable.completeJson();
  assert.equal(result.ok, false);
  assert.equal(result.unavailable, true);
  assert.match(result.error, /ANTHROPIC_API_KEY/);
}

{
  let constructedWith;
  let payloadSeen;
  class FakeAnthropic {
    constructor(options) {
      constructedWith = options;
      this.calls = 0;
      this.messages = {
        create: async (payload) => {
          this.calls += 1;
          payloadSeen = payload;
          return {
            content: [{ type: 'text', text: '{"action":"ask"}' }],
            usage: { input_tokens: 1, output_tokens: 2 },
          };
        },
      };
    }
  }

  const client = createAnthropicPrdClient({
    apiKey: 'test-key',
    sdk: FakeAnthropic,
    model: COST_SENSITIVE_MODEL,
    timeoutMs: 100,
  });
  const result = await client.completeJson({
    messages: [{ role: 'user', content: 'Clarify this idea.' }],
  });

  assert.equal(client.available, true);
  assert.deepEqual(constructedWith, { apiKey: 'test-key' });
  assert.equal(payloadSeen.model, COST_SENSITIVE_MODEL);
  assert.equal(result.ok, true);
  assert.equal(result.text, '{"action":"ask"}');
  assert.deepEqual(result.usage, { input_tokens: 1, output_tokens: 2 });
}

{
  let calls = 0;
  class RetryAnthropic {
    constructor() {
      this.messages = {
        create: async () => {
          calls += 1;
          if (calls === 1) {
            const error = new Error('rate limited');
            error.status = 429;
            throw error;
          }
          return { content: [{ type: 'text', text: '{"action":"final"}' }] };
        },
      };
    }
  }

  const client = createAnthropicPrdClient({
    apiKey: 'test-key',
    sdk: RetryAnthropic,
    timeoutMs: 100,
    maxRetries: 1,
  });
  const result = await client.completeJson({ messages: [{ role: 'user', content: 'retry' }] });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
  assert.equal(calls, 2);
}
