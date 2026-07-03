import { listItems } from './items.mjs';

export const PRODUCT_FEEDBACK_VERSION = 1;

export const feedbackKinds = ['user-reaction', 'usage', 'request'];
export const feedbackStatuses = ['open', 'dispositioned'];
export const iterateDispositions = ['candidate', 'cut', 'bug', 'defer'];

export const prdSeedFields = [
  'idea',
  'targetUsers',
  'painPoints',
  'currentWorkaround',
  'coreWorkflow',
  'mvpScope',
  'oneThing',
  'nonGoals',
  'dataModel',
  'deterministicRules',
  'aiBoundaries',
  'trustMechanism',
  'risks',
  'acceptanceCriteria',
];

export const hostSeedFields = prdSeedFields.filter((field) => !['mvpScope', 'oneThing', 'nonGoals'].includes(field));

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function normalizeFeedbackEntry(entry = {}) {
  const status = feedbackStatuses.includes(entry.status) ? entry.status : 'open';
  return {
    id: asString(entry.id),
    openedAt: asString(entry.openedAt || entry.at),
    signal: asString(entry.signal),
    source: asString(entry.source),
    kind: feedbackKinds.includes(entry.kind) ? entry.kind : 'request',
    shipSessionPath: asString(entry.shipSessionPath),
    status,
    dispositionedAt: status === 'dispositioned' ? asString(entry.dispositionedAt) : '',
    dispositionedByIteratePath: status === 'dispositioned' ? asString(entry.dispositionedByIteratePath) : '',
    disposition: status === 'dispositioned' ? asString(entry.disposition) : '',
    dispositionReason: status === 'dispositioned' ? asString(entry.dispositionReason) : '',
  };
}

export function normalizeProductFeedbackLog(raw = {}) {
  const entries = Array.isArray(raw.feedback) ? raw.feedback.map(normalizeFeedbackEntry) : [];
  return {
    version: raw.version === PRODUCT_FEEDBACK_VERSION ? raw.version : PRODUCT_FEEDBACK_VERSION,
    feedback: entries,
  };
}

export function openFeedbackEntries(log) {
  return normalizeProductFeedbackLog(log).feedback.filter((entry) => entry.status === 'open');
}

export function nextFeedbackId(log) {
  const numbers = normalizeProductFeedbackLog(log).feedback
    .map((entry) => Number((entry.id || '').replace(/^fb-/, '')))
    .filter((value) => Number.isInteger(value) && value > 0);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `fb-${String(next).padStart(4, '0')}`;
}

export function createFeedbackEntry({ id, signal, source, kind = 'request', shipSessionPath = '', openedAt }) {
  return normalizeFeedbackEntry({
    id,
    openedAt,
    signal,
    source,
    kind,
    shipSessionPath,
    status: 'open',
  });
}

function normalizeTriage(item = {}) {
  return {
    feedbackId: asString(item.feedbackId),
    disposition: asString(item.disposition),
    reason: asString(item.reason),
  };
}

function normalizeMustHaveCandidate(item = {}) {
  return {
    text: asString(item.text),
    sourceFeedbackId: asString(item.sourceFeedbackId),
    exploration: item.exploration === true,
    rationale: asString(item.rationale),
  };
}

function normalizePromotedNonGoal(item = {}) {
  return {
    nonGoal: asString(item.nonGoal),
    feedbackId: asString(item.feedbackId),
    rationale: asString(item.rationale),
  };
}

function normalizeSeed(rawSeed = {}) {
  const seed = {};
  if (!rawSeed || typeof rawSeed !== 'object' || Array.isArray(rawSeed)) {
    return seed;
  }
  for (const field of hostSeedFields) {
    if (Object.prototype.hasOwnProperty.call(rawSeed, field)) {
      seed[field] = asString(rawSeed[field]);
    }
  }
  return seed;
}

export function normalizeIterate(raw = {}) {
  return {
    prdSessionPath: asString(raw.prdSessionPath),
    shipCheckPath: asString(raw.shipCheckPath),
    openFeedbackIdsAtMaterialize: stringArray(raw.openFeedbackIdsAtMaterialize),
    triage: Array.isArray(raw.triage) ? raw.triage.map(normalizeTriage) : [],
    mustHaveCandidates: Array.isArray(raw.mustHaveCandidates) ? raw.mustHaveCandidates.map(normalizeMustHaveCandidate) : [],
    carriedNonGoals: stringArray(raw.carriedNonGoals),
    promotedNonGoals: Array.isArray(raw.promotedNonGoals) ? raw.promotedNonGoals.map(normalizePromotedNonGoal) : [],
    seed: normalizeSeed(raw.seed),
    nextPrdSeed: raw.nextPrdSeed && typeof raw.nextPrdSeed === 'object' && !Array.isArray(raw.nextPrdSeed) ? raw.nextPrdSeed : {},
  };
}

export function validateIterateStructure(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Iterate input must be a JSON object.'], iterate: normalizeIterate({}) };
  }

  for (const field of ['triage', 'mustHaveCandidates', 'carriedNonGoals', 'promotedNonGoals']) {
    if (!Array.isArray(raw[field])) {
      errors.push(`Field "${field}" must be an array.`);
    }
  }
  for (const field of ['prdSessionPath', 'shipCheckPath']) {
    if (Object.prototype.hasOwnProperty.call(raw, field) && typeof raw[field] !== 'string') {
      errors.push(`Field "${field}" must be a string.`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'openFeedbackIdsAtMaterialize') && !Array.isArray(raw.openFeedbackIdsAtMaterialize)) {
    errors.push('Field "openFeedbackIdsAtMaterialize" must be an array when present.');
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'seed')) {
    if (!raw.seed || typeof raw.seed !== 'object' || Array.isArray(raw.seed)) {
      errors.push('Field "seed" must be an object when present.');
    } else {
      const unknownSeed = Object.keys(raw.seed).filter((field) => !hostSeedFields.includes(field));
      if (unknownSeed.length) {
        errors.push(`Seed field(s) cannot be supplied by the host: ${unknownSeed.join(', ')}.`);
      }
      for (const field of Object.keys(raw.seed)) {
        if (typeof raw.seed[field] !== 'string') {
          errors.push(`Seed field "${field}" must be a string.`);
        }
      }
    }
  }

  if (Array.isArray(raw.triage)) {
    raw.triage.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`Triage ${index + 1} must be an object.`);
        return;
      }
      for (const field of ['feedbackId', 'disposition', 'reason']) {
        if (Object.prototype.hasOwnProperty.call(item, field) && typeof item[field] !== 'string') {
          errors.push(`Triage ${index + 1} field "${field}" must be a string.`);
        }
      }
      if (item.disposition && !iterateDispositions.includes(item.disposition)) {
        errors.push(`Triage ${index + 1} disposition must be one of: ${iterateDispositions.join(', ')}.`);
      }
    });
  }

  if (Array.isArray(raw.mustHaveCandidates)) {
    raw.mustHaveCandidates.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`Must-have candidate ${index + 1} must be an object.`);
        return;
      }
      for (const field of ['text', 'sourceFeedbackId', 'rationale']) {
        if (Object.prototype.hasOwnProperty.call(item, field) && typeof item[field] !== 'string') {
          errors.push(`Must-have candidate ${index + 1} field "${field}" must be a string.`);
        }
      }
      if (Object.prototype.hasOwnProperty.call(item, 'exploration') && typeof item.exploration !== 'boolean') {
        errors.push(`Must-have candidate ${index + 1} field "exploration" must be a boolean.`);
      }
    });
  }

  if (Array.isArray(raw.promotedNonGoals)) {
    raw.promotedNonGoals.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`Promoted non-goal ${index + 1} must be an object.`);
        return;
      }
      for (const field of ['nonGoal', 'feedbackId', 'rationale']) {
        if (Object.prototype.hasOwnProperty.call(item, field) && typeof item[field] !== 'string') {
          errors.push(`Promoted non-goal ${index + 1} field "${field}" must be a string.`);
        }
      }
    });
  }

  return { ok: errors.length === 0, errors, iterate: normalizeIterate(raw) };
}

export function deriveNextPrdSeed(iterate, answers = {}) {
  const seed = {};
  for (const field of prdSeedFields) {
    seed[field] = asString(answers[field]);
  }
  for (const [field, value] of Object.entries(iterate.seed || {})) {
    if (hostSeedFields.includes(field)) {
      seed[field] = asString(value);
    }
  }
  const mustHaves = iterate.mustHaveCandidates.map((item) => item.text.trim()).filter(Boolean).slice(0, 3);
  seed.mvpScope = mustHaves.join('; ');
  seed.oneThing = mustHaves[0] || '';
  seed.nonGoals = iterate.carriedNonGoals.map((item) => item.trim()).filter(Boolean).join('; ');
  return seed;
}

export function anchorIterate(rawIterate, { answers = {}, sessionPath = '', shipCheckPath = '', openFeedbackIds = [] } = {}) {
  const iterate = normalizeIterate(rawIterate);
  const anchored = {
    ...iterate,
    prdSessionPath: sessionPath,
    shipCheckPath,
    openFeedbackIdsAtMaterialize: openFeedbackIds,
  };
  return {
    ...anchored,
    nextPrdSeed: deriveNextPrdSeed(anchored, answers),
  };
}

export function dispositionFeedbackLog(log, iterate, { iteratePath = '', dispositionedAt = '' } = {}) {
  const dispositionById = new Map(iterate.triage.map((item) => [item.feedbackId, item]));
  const feedback = normalizeProductFeedbackLog(log).feedback.map((entry) => {
    const triage = dispositionById.get(entry.id);
    if (!triage || entry.status !== 'open') {
      return entry;
    }
    return {
      ...entry,
      status: 'dispositioned',
      dispositionedAt,
      dispositionedByIteratePath: iteratePath,
      disposition: triage.disposition,
      dispositionReason: triage.reason,
    };
  });
  return { version: PRODUCT_FEEDBACK_VERSION, feedback };
}

function bulletList(items, fallback = '- None.') {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : fallback;
}

export function buildIterateMarkdown(iterate, feedbackEntries = []) {
  const feedbackById = new Map(feedbackEntries.map((entry) => [entry.id, entry]));
  const triageLines = iterate.triage.map((item) => {
    const signal = feedbackById.get(item.feedbackId)?.signal || 'Feedback not found';
    return `- ${item.feedbackId}: ${item.disposition} -- ${item.reason || 'No reason'} -- ${signal}`;
  });
  const candidateLines = iterate.mustHaveCandidates.map((item) => {
    const source = item.sourceFeedbackId ? `feedback: ${item.sourceFeedbackId}` : 'exploration';
    return `${item.text || 'Not specified.'} (${source}) -- ${item.rationale || 'No rationale'}`;
  });
  const promotedLines = iterate.promotedNonGoals.map((item) => `${item.nonGoal || 'Not specified.'} -- ${item.feedbackId || 'No feedback'} -- ${item.rationale || 'No rationale'}`);

  return `# Iterate: ${iterate.nextPrdSeed?.idea || 'Next PRD seed'}

Source PRD session: ${iterate.prdSessionPath || 'Not linked.'}
Source ship check: ${iterate.shipCheckPath || 'Not linked.'}

## Feedback Triaged

${bulletList(triageLines)}

## Next Must-Have Candidates

${bulletList(candidateLines)}

## Carried Non-Goals

${bulletList(iterate.carriedNonGoals)}

## Promoted Non-Goals

${bulletList(promotedLines)}

## Next PRD Seed

\`\`\`json
${JSON.stringify(iterate.nextPrdSeed || {}, null, 2)}
\`\`\`
`;
}

export function carriedNonGoalText(iterate) {
  return iterate.carriedNonGoals.join('\n');
}

export function promotedNonGoalText(iterate) {
  return iterate.promotedNonGoals.map((item) => item.nonGoal).join('\n');
}

export function latestPrdNonGoalItems(answers) {
  return listItems(answers.nonGoals);
}
