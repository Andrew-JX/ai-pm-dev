import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prdQuestions } from '../workflow-core/questions.mjs';

const llmDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(llmDir, '..', 'templates', 'ai-prd-schema.json');

export const PRD_ANSWER_KEYS = prdQuestions.map((question) => question.key);

export function loadPrdAnswerSchema() {
  return JSON.parse(readFileSync(schemaPath, 'utf8'));
}

export function normalizePrdAnswersForSchema(rawAnswers = {}) {
  const warnings = [];
  const errors = [];
  const answers = {};

  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
    return {
      answers: Object.fromEntries(PRD_ANSWER_KEYS.map((key) => [key, ''])),
      warnings,
      errors: ['PRD answers must be an object.'],
      unknownFields: [],
    };
  }

  const knownKeys = new Set(PRD_ANSWER_KEYS);
  const unknownFields = Object.keys(rawAnswers).filter((key) => !knownKeys.has(key));
  if (unknownFields.length) {
    warnings.push(`Ignored unknown PRD answer fields: ${unknownFields.join(', ')}.`);
  }

  for (const key of PRD_ANSWER_KEYS) {
    if (rawAnswers[key] === undefined || rawAnswers[key] === null) {
      answers[key] = '';
    } else if (typeof rawAnswers[key] === 'string') {
      answers[key] = rawAnswers[key];
    } else {
      answers[key] = rawAnswers[key];
      errors.push(`Field "${key}" must be a string.`);
    }
  }

  return { answers, warnings, errors, unknownFields };
}

export function validatePrdAnswers(rawAnswers, options = {}) {
  const schema = options.schema || loadPrdAnswerSchema();
  const normalized = normalizePrdAnswersForSchema(rawAnswers, options);
  const errors = [...normalized.errors];
  const required = schema.required || [];
  const properties = schema.properties || {};

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(normalized.answers, key)) {
      errors.push(`Missing required field "${key}".`);
    }
  }

  for (const [key, definition] of Object.entries(properties)) {
    if (definition.type === 'string' && typeof normalized.answers[key] !== 'string') {
      errors.push(`Field "${key}" must be a string.`);
    }
  }

  return {
    ok: errors.length === 0,
    answers: normalized.answers,
    errors,
    warnings: normalized.warnings,
    unknownFields: normalized.unknownFields,
    schemaTitle: schema.title,
  };
}
