export const DEFAULT_REASONING_MODEL = 'claude-opus-4-8';
export const COST_SENSITIVE_MODEL = 'claude-sonnet-4-6';

export const MODEL_ALIASES = {
  opus: DEFAULT_REASONING_MODEL,
  sonnet: COST_SENSITIVE_MODEL,
};

export function resolveModelAlias(value) {
  return MODEL_ALIASES[value] || value || DEFAULT_REASONING_MODEL;
}
