function asString(value) {
  return typeof value === 'string' ? value : '';
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function normalizeVerification(item = {}) {
  return {
    command: asString(item.command),
    passed: item.passed === true,
    evidence: asString(item.evidence),
  };
}

function normalizeAcceptanceEvidence(item = {}) {
  return {
    criterion: asString(item.criterion),
    passed: item.passed === true,
    evidence: asString(item.evidence),
  };
}

function normalizeMustHaveShipped(item = {}) {
  return {
    mustHave: asString(item.mustHave),
    slice: asString(item.slice),
    status: asString(item.status),
    evidence: asString(item.evidence),
  };
}

function normalizeDeferredMustHave(item = {}) {
  return {
    mustHave: asString(item.mustHave),
    reason: asString(item.reason),
    waiver: asString(item.waiver),
  };
}

function normalizeBlocker(item = {}) {
  if (typeof item === 'string') {
    return { blocker: item, waiver: '' };
  }
  return {
    blocker: asString(item.blocker),
    waiver: asString(item.waiver),
  };
}

export function normalizeShipCheck(raw = {}) {
  return {
    prdSessionPath: asString(raw.prdSessionPath),
    devPlanPath: asString(raw.devPlanPath),
    idea: asString(raw.idea),
    oneThing: asString(raw.oneThing),
    goal: asString(raw.goal),
    releaseScope: asString(raw.releaseScope),
    targetEnvironment: asString(raw.targetEnvironment),
    changes: stringArray(raw.changes),
    verification: Array.isArray(raw.verification) ? raw.verification.map(normalizeVerification) : [],
    acceptanceEvidence: Array.isArray(raw.acceptanceEvidence) ? raw.acceptanceEvidence.map(normalizeAcceptanceEvidence) : [],
    mustHavesShipped: Array.isArray(raw.mustHavesShipped) ? raw.mustHavesShipped.map(normalizeMustHaveShipped) : [],
    deferredMustHaves: Array.isArray(raw.deferredMustHaves) ? raw.deferredMustHaves.map(normalizeDeferredMustHave) : [],
    nonGoalsHeld: stringArray(raw.nonGoalsHeld),
    rollback: asString(raw.rollback),
    openBlockers: Array.isArray(raw.openBlockers) ? raw.openBlockers.map(normalizeBlocker) : [],
    docsUpdates: stringArray(raw.docsUpdates),
  };
}

const topLevelArrayFields = [
  'changes',
  'verification',
  'acceptanceEvidence',
  'mustHavesShipped',
  'deferredMustHaves',
  'nonGoalsHeld',
  'openBlockers',
  'docsUpdates',
];

const topLevelStringFields = [
  'prdSessionPath',
  'devPlanPath',
  'goal',
  'releaseScope',
  'targetEnvironment',
  'rollback',
];

const entrySpecs = {
  verification: {
    stringFields: ['command', 'evidence'],
    booleanFields: ['passed'],
  },
  acceptanceEvidence: {
    stringFields: ['criterion', 'evidence'],
    booleanFields: ['passed'],
  },
  mustHavesShipped: {
    stringFields: ['mustHave', 'slice', 'status', 'evidence'],
    booleanFields: [],
  },
  deferredMustHaves: {
    stringFields: ['mustHave', 'reason', 'waiver'],
    booleanFields: [],
  },
};

function validateObjectEntries(raw, field, errors) {
  const spec = entrySpecs[field];
  if (!Array.isArray(raw[field]) || !spec) {
    return;
  }
  raw[field].forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${field} ${index + 1} must be an object.`);
      return;
    }
    for (const itemField of spec.stringFields) {
      if (Object.prototype.hasOwnProperty.call(entry, itemField) && typeof entry[itemField] !== 'string') {
        errors.push(`${field} ${index + 1} field "${itemField}" must be a string.`);
      }
    }
    for (const itemField of spec.booleanFields) {
      if (Object.prototype.hasOwnProperty.call(entry, itemField) && typeof entry[itemField] !== 'boolean') {
        errors.push(`${field} ${index + 1} field "${itemField}" must be a boolean.`);
      }
    }
  });
}

export function validateShipCheckStructure(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Ship check must be a JSON object.'], check: normalizeShipCheck({}) };
  }

  for (const field of topLevelStringFields) {
    if (Object.prototype.hasOwnProperty.call(raw, field) && typeof raw[field] !== 'string') {
      errors.push(`Field "${field}" must be a string.`);
    }
  }
  for (const field of topLevelArrayFields) {
    if (!Array.isArray(raw[field])) {
      errors.push(`Field "${field}" must be an array.`);
    }
  }
  for (const field of Object.keys(entrySpecs)) {
    validateObjectEntries(raw, field, errors);
  }

  if (Array.isArray(raw.openBlockers)) {
    raw.openBlockers.forEach((entry, index) => {
      if (typeof entry === 'string') {
        return;
      }
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`openBlockers ${index + 1} must be a string or object.`);
        return;
      }
      for (const itemField of ['blocker', 'waiver']) {
        if (Object.prototype.hasOwnProperty.call(entry, itemField) && typeof entry[itemField] !== 'string') {
          errors.push(`openBlockers ${index + 1} field "${itemField}" must be a string.`);
        }
      }
    });
  }

  return { ok: errors.length === 0, errors, check: normalizeShipCheck(raw) };
}

function bulletList(items, fallback = '- Not specified.') {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : fallback;
}

function verificationMarkdown(items) {
  return items.length
    ? items.map((item) => `- ${item.passed ? 'PASS' : 'FAIL'}: ${item.command || 'No command'} -- ${item.evidence || 'No evidence'}`).join('\n')
    : '- Not specified.';
}

function acceptanceMarkdown(items) {
  return items.length
    ? items.map((item) => `- ${item.passed ? 'PASS' : 'FAIL'}: ${item.criterion || 'No criterion'} -- ${item.evidence || 'No evidence'}`).join('\n')
    : '- Not specified.';
}

export function buildShipCheckMarkdown(check) {
  return `# Ship Check: ${check.idea || check.goal || 'Untitled'}

Source PRD session: ${check.prdSessionPath || 'Not linked.'}
Source dev plan: ${check.devPlanPath || 'Not linked.'}

## Goal

${check.goal || 'Not specified.'}

## Release Scope

${check.releaseScope || 'Not specified.'}

## Target Environment

${check.targetEnvironment || 'Not specified.'}

## Changes

${bulletList(check.changes)}

## Verification

${verificationMarkdown(check.verification)}

## Acceptance Evidence

${acceptanceMarkdown(check.acceptanceEvidence)}

## Must-Haves Shipped

${bulletList(check.mustHavesShipped.map((item) => `${item.mustHave || 'Not specified.'} (${item.status || 'unknown'}) -- ${item.evidence || 'No evidence'}`))}

## Deferred Must-Haves

${bulletList(check.deferredMustHaves.map((item) => `${item.mustHave || 'Not specified.'} -- ${item.reason || 'No reason'} -- waiver: ${item.waiver || 'None'}`), '- None.')}

## Non-Goals Held

${bulletList(check.nonGoalsHeld)}

## Rollback

${check.rollback || 'Not specified.'}

## Open Blockers

${bulletList(check.openBlockers.map((item) => `${item.blocker || 'Not specified.'}${item.waiver ? ` -- waiver: ${item.waiver}` : ''}`), '- None.')}

## Docs Updates

${bulletList(check.docsUpdates, '- None.')}
`;
}

export function buildReleaseHandoff(check) {
  return `# Release Handoff: ${check.idea || check.goal || 'Untitled'}

Read \`ai-prd.md\`, \`scope.md\`, \`acceptance-tests.md\`, \`dev-plan.md\`, and \`ship-check.md\` first. Ship only what is evidenced, keep PRD non-goals out, and do not claim readiness without verification evidence.

## Release Scope

${check.releaseScope || 'Not specified.'}

## Verification Evidence

${verificationMarkdown(check.verification)}

## Acceptance Evidence

${acceptanceMarkdown(check.acceptanceEvidence)}

## Rollback

${check.rollback || 'Not specified.'}
`;
}

export function buildReleaseChecklist(check) {
  return `# Release Checklist: ${check.idea || check.goal || 'Untitled'}

Source PRD session: ${check.prdSessionPath || 'Not linked.'}
Source dev plan: ${check.devPlanPath || 'Not linked.'}

## Release Scope

${check.releaseScope || 'Not specified.'}

## Required Verification

${verificationMarkdown(check.verification)}

## Acceptance Evidence

${acceptanceMarkdown(check.acceptanceEvidence)}

## PRD Must-Haves

${bulletList(check.mustHavesShipped.map((item) => `${item.mustHave || 'Not specified.'} (${item.status || 'unknown'}) -- ${item.evidence || 'No evidence'}`))}

## Deferred Must-Haves

${bulletList(check.deferredMustHaves.map((item) => `${item.mustHave || 'Not specified.'} -- ${item.reason || 'No reason'} -- waiver: ${item.waiver || 'None'}`), '- None.')}

## Non-Goals Held

${bulletList(check.nonGoalsHeld)}

## Rollback

${check.rollback || 'Not specified.'}

## Open Blockers

${bulletList(check.openBlockers.map((item) => `${item.blocker || 'Not specified.'}${item.waiver ? ` -- waiver: ${item.waiver}` : ''}`), '- None.')}

## Docs Updates

${bulletList(check.docsUpdates, '- None.')}
`;
}

export function shippedMustHaveText(check) {
  return check.mustHavesShipped.map((item) => item.mustHave).join('\n');
}

export function coveredMustHaveText(check) {
  return [
    ...check.mustHavesShipped.map((item) => item.mustHave),
    ...check.deferredMustHaves.map((item) => item.mustHave),
  ].join('\n');
}

export function passedAcceptanceCriterionText(check) {
  return check.acceptanceEvidence
    .filter((item) => item.passed === true && item.evidence.trim().length > 0)
    .map((item) => item.criterion)
    .join('\n');
}

export function nonGoalsHeldText(check) {
  return check.nonGoalsHeld.join('\n');
}
