import { listItems } from './items.mjs';

export const DEV_PLAN_REQUIRED_SLICE_FIELDS = [
  'id',
  'title',
  'mappedMustHaves',
  'provesOneThing',
  'summary',
  'plannedFiles',
  'verification',
  'humanDecisions',
  'docsUpdates',
  'risks',
];

const topLevelArrayFields = ['constraints', 'currentState', 'slices', 'excludedNonGoals', 'openQuestions'];
const sliceArrayFields = ['mappedMustHaves', 'plannedFiles', 'humanDecisions', 'docsUpdates', 'risks'];
const sliceStringFields = ['id', 'title', 'provesOneThing', 'summary', 'verification'];

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function normalizeSlice(slice = {}) {
  return {
    id: asString(slice.id),
    title: asString(slice.title),
    mappedMustHaves: stringArray(slice.mappedMustHaves),
    provesOneThing: asString(slice.provesOneThing),
    summary: asString(slice.summary),
    plannedFiles: stringArray(slice.plannedFiles),
    verification: asString(slice.verification),
    humanDecisions: stringArray(slice.humanDecisions),
    docsUpdates: stringArray(slice.docsUpdates),
    risks: stringArray(slice.risks),
    splitReason: asString(slice.splitReason),
  };
}

export function normalizeDevPlan(raw = {}) {
  return {
    prdSessionPath: asString(raw.prdSessionPath),
    idea: asString(raw.idea),
    oneThing: asString(raw.oneThing),
    mustHaves: stringArray(raw.mustHaves),
    nonGoals: stringArray(raw.nonGoals),
    acceptanceCriteria: asString(raw.acceptanceCriteria),
    goal: asString(raw.goal),
    constraints: stringArray(raw.constraints),
    currentState: stringArray(raw.currentState),
    technicalApproach: asString(raw.technicalApproach),
    slices: Array.isArray(raw.slices) ? raw.slices.map(normalizeSlice) : [],
    excludedNonGoals: stringArray(raw.excludedNonGoals),
    openQuestions: stringArray(raw.openQuestions),
  };
}

export function validateDevPlanStructure(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Dev plan must be a JSON object.'], plan: normalizeDevPlan({}) };
  }

  for (const field of topLevelArrayFields) {
    if (!Array.isArray(raw[field])) {
      errors.push(`Field "${field}" must be an array.`);
    }
  }
  if (!raw.slices?.length) {
    errors.push('Field "slices" must include at least one slice.');
  }

  if (Array.isArray(raw.slices)) {
    raw.slices.forEach((slice, index) => {
      if (!slice || typeof slice !== 'object' || Array.isArray(slice)) {
        errors.push(`Slice ${index + 1} must be an object.`);
        return;
      }
      for (const field of DEV_PLAN_REQUIRED_SLICE_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(slice, field)) {
          errors.push(`Slice ${index + 1} missing field "${field}".`);
        }
      }
      for (const field of sliceStringFields) {
        if (Object.prototype.hasOwnProperty.call(slice, field) && typeof slice[field] !== 'string') {
          errors.push(`Slice ${index + 1} field "${field}" must be a string.`);
        }
      }
      for (const field of sliceArrayFields) {
        if (Object.prototype.hasOwnProperty.call(slice, field) && !Array.isArray(slice[field])) {
          errors.push(`Slice ${index + 1} field "${field}" must be an array.`);
        }
      }
      if (Object.prototype.hasOwnProperty.call(slice, 'splitReason') && typeof slice.splitReason !== 'string') {
        errors.push(`Slice ${index + 1} field "splitReason" must be a string.`);
      }
    });
  }

  return { ok: errors.length === 0, errors, plan: normalizeDevPlan(raw) };
}

function bulletList(items, fallback = '- Not specified.') {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : fallback;
}

function sliceMarkdown(slice, index) {
  return `### ${index + 1}. ${slice.title || slice.id || 'Untitled slice'}

- ID: ${slice.id || 'not-specified'}
- Maps must-haves: ${slice.mappedMustHaves.join('; ') || 'Not specified.'}
- Proves the one thing: ${slice.provesOneThing || 'Not specified.'}
- Planned files: ${slice.plannedFiles.join(', ') || 'Not specified.'}
- Verification: ${slice.verification || 'Not specified.'}
- Human decisions: ${slice.humanDecisions.join('; ') || 'None'}
- Docs updates: ${slice.docsUpdates.join('; ') || 'None'}
- Risks: ${slice.risks.join('; ') || 'None'}
${slice.splitReason ? `- Split reason: ${slice.splitReason}\n` : ''}
${slice.summary || 'No summary provided.'}`;
}

export function buildDevPlanMarkdown(plan) {
  return `# Dev Plan: ${plan.idea || plan.goal || 'Untitled'}

Source PRD session: ${plan.prdSessionPath || 'Not linked.'}

## Goal

${plan.goal || 'Not specified.'}

## PRD Anchors

- The one thing: ${plan.oneThing || 'Not specified.'}
- Must-haves: ${plan.mustHaves.join('; ') || 'Not specified.'}
- Non-goals: ${plan.nonGoals.join('; ') || 'Not specified.'}
- Acceptance: ${plan.acceptanceCriteria || 'Not specified.'}

## Constraints

${bulletList(plan.constraints)}

## Current State

${bulletList(plan.currentState)}

## Technical Approach

${plan.technicalApproach || 'Not specified.'}

## Slices

${plan.slices.map(sliceMarkdown).join('\n\n')}

## Excluded Non-Goals

${bulletList(plan.excludedNonGoals)}

## Open Questions

${bulletList(plan.openQuestions, '- None.')}
`;
}

export function buildBuildHandoff(plan) {
  return `# Build Handoff: ${plan.idea || plan.goal || 'Untitled'}

Read \`ai-prd.md\`, \`scope.md\`, \`acceptance-tests.md\`, and \`dev-plan.md\` first. Build only the declared slices and keep v1 inside the PRD non-goals.

## First Slice

${plan.slices[0] ? sliceMarkdown(plan.slices[0], 0) : 'No slice defined.'}

## Full Slice Order

${plan.slices.map((slice, index) => `${index + 1}. ${slice.title || slice.id || 'Untitled'} — verify with: ${slice.verification || 'Not specified.'}`).join('\n') || 'No slices defined.'}

## Explicitly Excluded

${bulletList(plan.excludedNonGoals)}

Report the slice completed, verification evidence, changed files, and any PRD or dev-plan ambiguity before finishing.
`;
}

export function mappedMustHaveText(plan) {
  return plan.slices.flatMap((slice) => slice.mappedMustHaves).join('\n');
}

export function excludedNonGoalText(plan) {
  return plan.excludedNonGoals.join('\n');
}

export function prdMustHaveItems(answers) {
  return listItems(answers.mvpScope).slice(0, 3);
}

export function prdNonGoalItems(answers) {
  return listItems(answers.nonGoals);
}
