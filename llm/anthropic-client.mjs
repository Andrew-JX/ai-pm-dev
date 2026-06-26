import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_REASONING_MODEL } from './models.mjs';

const RETRYABLE_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function errorStatus(error) {
  return error?.status || error?.statusCode || error?.response?.status;
}

function isRetryable(error) {
  const status = errorStatus(error);
  return RETRYABLE_STATUSES.has(status) || /timeout|network|econnreset|etimedout/i.test(error?.message || '');
}

function extractText(response) {
  return (response?.content || [])
    .map((part) => (part?.type === 'text' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function withTimeout(operation, timeoutMs) {
  if (!timeoutMs) {
    return operation();
  }
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Anthropic request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createAnthropicPrdClient(options = {}) {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const model = options.model || DEFAULT_REASONING_MODEL;
  const timeoutMs = options.timeoutMs ?? 30000;
  const maxRetries = options.maxRetries ?? 1;
  const sdk = options.sdk || Anthropic;

  if (!apiKey) {
    return {
      available: false,
      model,
      async completeJson() {
        return {
          ok: false,
          unavailable: true,
          model,
          error: 'ANTHROPIC_API_KEY is not set.',
        };
      },
    };
  }

  const client = options.client || new sdk({ apiKey });

  return {
    available: true,
    model,
    async completeJson(request = {}) {
      const payload = {
        model: request.model || model,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature ?? 0,
        system: request.system,
        messages: request.messages || [],
      };

      let attempts = 0;
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        attempts = attempt + 1;
        try {
          const response = await withTimeout((signal) => client.messages.create(payload, { signal }), timeoutMs);
          return {
            ok: true,
            model: payload.model,
            text: extractText(response),
            raw: response,
            usage: response?.usage,
            attempts: attempt + 1,
          };
        } catch (error) {
          lastError = error;
          if (attempt >= maxRetries || !isRetryable(error)) {
            break;
          }
          await wait(100 * 2 ** attempt);
        }
      }

      return {
        ok: false,
        model: payload.model,
        error: lastError instanceof Error ? lastError.message : String(lastError),
        status: errorStatus(lastError),
        attempts,
      };
    },
  };
}
