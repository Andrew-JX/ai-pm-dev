import { evaluateAnswerGates, scoreChecks } from '../workflow-core/prd-gates.mjs';
import { DEFAULT_REASONING_MODEL } from './models.mjs';
import { PRD_ANSWER_KEYS, validatePrdAnswers } from './prd-schema.mjs';

export const PRD_CLARIFIER_PROMPT_VERSION = 'prd-clarifier-v1';
export const DEFAULT_MAX_CLARIFICATION_TURNS = 6;

function timestamp(now) {
  return (now instanceof Date ? now : new Date()).toISOString();
}

function compactText(value, limit = 4000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function questionForFailedGate(check) {
  const name = check.name;
  if (/Product idea/.test(name)) return 'What product do you want to build in one sentence?';
  if (/Target users/.test(name)) return 'Who is the first narrow user group this product should serve?';
  if (/Pain point/.test(name)) return 'What exact user pain or scenario is urgent enough to solve first?';
  if (/Must-haves present/.test(name)) return 'List exactly 1-3 v1 must-haves, separated by semicolons.';
  if (/Must-haves prioritized/.test(name)) return 'Cut the v1 must-haves to 3 or fewer. Which items stay, and which move later?';
  if (/Primary metric/.test(name)) return 'What single success signal proves v1 worked?';
  if (/Non-goals/.test(name)) return 'Name at least one attractive thing v1 will deliberately not do.';
  if (/one thing/i.test(name)) return 'If only one feature shipped first, which one proves the idea?';
  return check.hint || 'What detail is still needed before writing the PRD?';
}

function fallbackAnswersFromState(state, userInput) {
  const draft = state?.draftAnswers || {};
  const answers = Object.fromEntries(PRD_ANSWER_KEYS.map((key) => [key, '']));
  for (const key of PRD_ANSWER_KEYS) {
    if (typeof draft[key] === 'string') {
      answers[key] = draft[key];
    }
  }
  if (!answers.idea) {
    answers.idea = compactText(userInput, 200) || 'Untitled product idea';
  }
  return answers;
}

function normalizeState(state = {}, defaults = {}) {
  return {
    runId: state.runId || defaults.runId || '',
    promptVersion: state.promptVersion || PRD_CLARIFIER_PROMPT_VERSION,
    model: state.model || defaults.model || DEFAULT_REASONING_MODEL,
    lang: state.lang || defaults.lang || 'en',
    projectType: state.projectType || defaults.projectType || 'general',
    turns: Array.isArray(state.turns) ? state.turns : [],
    draftAnswers: state.draftAnswers && typeof state.draftAnswers === 'object' ? state.draftAnswers : {},
    pendingQuestions: Array.isArray(state.pendingQuestions) ? state.pendingQuestions : [],
    validation: state.validation || null,
  };
}

export function createClarificationState(options = {}) {
  return normalizeState({}, {
    runId: options.runId,
    model: options.model,
    lang: options.lang,
    projectType: options.projectType,
  });
}

function systemPrompt({ lang, projectType }) {
  return `You are the AI PM Dev PRD clarifier.
Prompt version: ${PRD_CLARIFIER_PROMPT_VERSION}
Language: ${lang || 'en'}
Project type: ${projectType || 'general'}

Turn a vague product idea into structured PRD answers.
Return JSON only. No markdown, no comments.

JSON shape:
{"action":"ask","questions":["..."]} OR {"action":"final","answers":{...}}

Rules:
- Ask at most 3 high-value questions.
- Force v1 scope to at most 3 must-haves.
- Ask for the one thing, explicit non-goals, and one success signal.
- Prefer measurable success signals, but do not invent numbers.
- Final answers must use these exact string keys: ${PRD_ANSWER_KEYS.join(', ')}.
- Unknown keys are ignored, so avoid them.`;
}

function userPrompt({ state, userInput }) {
  return JSON.stringify({
    currentDraftAnswers: state.draftAnswers || {},
    previousTurns: state.turns || [],
    latestUserInput: userInput || '',
  });
}

async function callClient(client, request) {
  if (!client?.available) {
    return {
      ok: false,
      unavailable: true,
      model: request.model,
      error: 'ANTHROPIC_API_KEY is not set.',
    };
  }
  try {
    return await client.completeJson(request);
  } catch (error) {
    return {
      ok: false,
      model: request.model,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseModelResult(response) {
  if (!response.ok) {
    return { ok: false, error: response.error || 'LLM request failed.' };
  }
  const parsed = safeJsonParse(response.text || '');
  if (!parsed.ok) {
    return { ok: false, error: `Invalid JSON from LLM: ${parsed.error}` };
  }
  const value = parsed.value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'LLM JSON must be an object.' };
  }
  if (value.action !== 'ask' && value.action !== 'final') {
    return { ok: false, error: 'LLM action must be "ask" or "final".' };
  }
  if (value.action === 'ask') {
    const questions = Array.isArray(value.questions) ? value.questions.map((item) => compactText(item, 500)).filter(Boolean).slice(0, 3) : [];
    if (!questions.length) {
      return { ok: false, error: 'Ask action must include at least one question.' };
    }
    return { ok: true, value: { action: 'ask', questions } };
  }
  return { ok: true, value };
}

function validateFinalAnswers(rawAnswers, projectType) {
  const validation = validatePrdAnswers(rawAnswers, { projectType });
  const answerChecks = validation.ok ? evaluateAnswerGates(validation.answers) : [];
  const answerScore = validation.ok ? scoreChecks(answerChecks) : null;
  const failedRequired = answerChecks.filter((check) => !check.pass);
  return { ...validation, answerChecks, answerScore, failedRequired };
}

function finalValidationErrors(validation) {
  const errors = [...validation.errors];
  for (const check of validation.failedRequired || []) {
    errors.push(`${check.name}: ${check.hint}`);
  }
  return errors;
}

function stateWithTurn(state, userInput, at) {
  if (!compactText(userInput)) {
    return state;
  }
  return {
    ...state,
    turns: [...state.turns, { role: 'user', content: String(userInput), at }],
  };
}

function recordBase({ state, model, at, userInput }) {
  return {
    at,
    promptVersion: PRD_CLARIFIER_PROMPT_VERSION,
    runId: state.runId,
    model,
    input: {
      userInput: compactText(userInput, 1000),
      turnCount: state.turns.length,
      draftAnswerKeys: Object.keys(state.draftAnswers || {}).filter((key) => state.draftAnswers[key]),
    },
  };
}

function degradedResult({ state, userInput, reason, llmRecord }) {
  return {
    status: 'degraded',
    reason,
    state: {
      ...state,
      validation: { status: 'degraded', reason },
    },
    answers: fallbackAnswersFromState(state, userInput),
    questions: [],
    llmRecord: {
      ...llmRecord,
      status: 'degraded',
      degradationReason: reason,
    },
  };
}

export async function runPrdClarificationTurn(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const at = timestamp(now);
  const model = options.model || options.state?.model || options.client?.model || DEFAULT_REASONING_MODEL;
  const state = stateWithTurn(normalizeState(options.state, {
    model,
    lang: options.lang,
    projectType: options.projectType,
  }), options.userInput, at);
  const maxTurns = options.maxTurns || DEFAULT_MAX_CLARIFICATION_TURNS;
  const baseRecord = recordBase({ state, model, at, userInput: options.userInput });

  const request = {
    model,
    system: systemPrompt({ lang: state.lang, projectType: state.projectType }),
    messages: [{ role: 'user', content: userPrompt({ state, userInput: options.userInput }) }],
    maxTokens: options.maxTokens || 2500,
    temperature: 0,
  };

  const firstResponse = await callClient(options.client, request);
  const llmRecord = {
    ...baseRecord,
    responses: [{
      ok: firstResponse.ok,
      unavailable: Boolean(firstResponse.unavailable),
      rawOutput: firstResponse.text || '',
      error: firstResponse.error,
      usage: firstResponse.usage,
      attempts: firstResponse.attempts,
    }],
  };

  if (!firstResponse.ok) {
    return degradedResult({
      state,
      userInput: options.userInput,
      reason: firstResponse.error || 'LLM unavailable.',
      llmRecord,
    });
  }

  let parsed = parseModelResult(firstResponse);
  let repaired = false;
  let validation = null;

  if (parsed.ok && parsed.value.action === 'final') {
    validation = validateFinalAnswers(parsed.value.answers, state.projectType);
    if (!validation.ok) {
      parsed = { ok: false, error: finalValidationErrors(validation).join('\n') };
    }
  }

  if (!parsed.ok) {
    repaired = true;
    const repairResponse = await callClient(options.client, {
      ...request,
      messages: [
        ...request.messages,
        { role: 'assistant', content: firstResponse.text || '' },
        { role: 'user', content: `Repair the previous output. Return valid JSON only. Problems:\n${parsed.error}` },
      ],
    });
    llmRecord.responses.push({
      ok: repairResponse.ok,
      rawOutput: repairResponse.text || '',
      error: repairResponse.error,
      usage: repairResponse.usage,
      attempts: repairResponse.attempts,
      repair: true,
    });

    if (!repairResponse.ok) {
      return degradedResult({
        state,
        userInput: options.userInput,
        reason: repairResponse.error || parsed.error,
        llmRecord,
      });
    }

    parsed = parseModelResult(repairResponse);
    if (parsed.ok && parsed.value.action === 'final') {
      validation = validateFinalAnswers(parsed.value.answers, state.projectType);
      if (!validation.ok) {
        parsed = { ok: false, error: finalValidationErrors(validation).join('\n') };
      }
    }
  }

  if (!parsed.ok) {
    return degradedResult({
      state,
      userInput: options.userInput,
      reason: parsed.error,
      llmRecord,
    });
  }

  if (parsed.value.action === 'ask') {
    if (state.turns.length >= maxTurns) {
      return degradedResult({
        state,
        userInput: options.userInput,
        reason: `Reached clarification turn limit (${maxTurns}).`,
        llmRecord: { ...llmRecord, parsed: parsed.value, repaired },
      });
    }
    return {
      status: 'ask',
      questions: parsed.value.questions,
      state: {
        ...state,
        pendingQuestions: parsed.value.questions,
        validation: { status: 'asking' },
      },
      llmRecord: {
        ...llmRecord,
        status: 'ask',
        parsed: parsed.value,
        repaired,
      },
    };
  }

  validation = validation || validateFinalAnswers(parsed.value.answers, state.projectType);
  const validationRecord = {
    schemaOk: validation.ok,
    schemaErrors: validation.errors,
    warnings: validation.warnings,
    unknownFields: validation.unknownFields,
    answerGateOverall: validation.answerScore?.overall || 'FAIL',
    failedRequired: (validation.failedRequired || []).map((check) => check.name),
  };

  if (!validation.ok) {
    return degradedResult({
      state,
      userInput: options.userInput,
      reason: validation.errors.join('\n') || 'Final PRD answers failed schema validation.',
      llmRecord: { ...llmRecord, validation: validationRecord, repaired },
    });
  }

  if (validation.failedRequired.length) {
    if (state.turns.length >= maxTurns) {
      return degradedResult({
        state,
        userInput: options.userInput,
        reason: `Reached clarification turn limit (${maxTurns}) before required answer gates passed.`,
        llmRecord: { ...llmRecord, validation: validationRecord, repaired },
      });
    }
    const questions = validation.failedRequired.map(questionForFailedGate).slice(0, 3);
    return {
      status: 'ask',
      questions,
      state: {
        ...state,
        draftAnswers: validation.answers,
        pendingQuestions: questions,
        validation: validationRecord,
      },
      llmRecord: {
        ...llmRecord,
        status: 'ask',
        parsed: parsed.value,
        validation: validationRecord,
        repaired,
      },
    };
  }

  const nextState = {
    ...state,
    draftAnswers: validation.answers,
    pendingQuestions: [],
    validation: validationRecord,
  };

  return {
    status: 'ready',
    questions: [],
    answers: validation.answers,
    warnings: validation.warnings,
    state: nextState,
    llmRecord: {
      ...llmRecord,
      status: 'ready',
      parsed: { action: 'final' },
      validation: validationRecord,
      repaired,
    },
  };
}
