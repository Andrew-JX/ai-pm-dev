export const DESIGN_REQUIRED_SCREEN_FIELDS = [
  'id',
  'name',
  'purpose',
  'coversMustHaves',
  'keyElements',
];

const topLevelArrayFields = ['screens', 'workflowScreens', 'supportingScreens', 'excludedNonGoals', 'openQuestions'];
const screenStringFields = ['id', 'name', 'purpose'];
const screenArrayFields = ['coversMustHaves', 'keyElements'];

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function normalizeScreen(screen = {}) {
  return {
    id: asString(screen.id),
    name: asString(screen.name),
    purpose: asString(screen.purpose),
    coversMustHaves: stringArray(screen.coversMustHaves),
    keyElements: stringArray(screen.keyElements),
    entry: screen.entry === true,
  };
}

export function normalizeDesign(raw = {}) {
  return {
    prdSessionPath: asString(raw.prdSessionPath),
    idea: asString(raw.idea),
    oneThing: asString(raw.oneThing),
    mustHaves: stringArray(raw.mustHaves),
    nonGoals: stringArray(raw.nonGoals),
    coreWorkflow: asString(raw.coreWorkflow),
    goal: asString(raw.goal),
    screens: Array.isArray(raw.screens) ? raw.screens.map(normalizeScreen) : [],
    workflowScreens: stringArray(raw.workflowScreens),
    supportingScreens: stringArray(raw.supportingScreens),
    excludedNonGoals: stringArray(raw.excludedNonGoals),
    openQuestions: stringArray(raw.openQuestions),
  };
}

export function validateDesignStructure(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Design must be a JSON object.'], design: normalizeDesign({}) };
  }

  for (const field of topLevelArrayFields) {
    if (!Array.isArray(raw[field])) {
      errors.push(`Field "${field}" must be an array.`);
    }
  }
  if (!raw.screens?.length) {
    errors.push('Field "screens" must include at least one screen.');
  }

  if (Array.isArray(raw.screens)) {
    raw.screens.forEach((screen, index) => {
      if (!screen || typeof screen !== 'object' || Array.isArray(screen)) {
        errors.push(`Screen ${index + 1} must be an object.`);
        return;
      }
      for (const field of DESIGN_REQUIRED_SCREEN_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(screen, field)) {
          errors.push(`Screen ${index + 1} missing field "${field}".`);
        }
      }
      for (const field of screenStringFields) {
        if (Object.prototype.hasOwnProperty.call(screen, field) && typeof screen[field] !== 'string') {
          errors.push(`Screen ${index + 1} field "${field}" must be a string.`);
        }
      }
      for (const field of screenArrayFields) {
        if (Object.prototype.hasOwnProperty.call(screen, field) && !Array.isArray(screen[field])) {
          errors.push(`Screen ${index + 1} field "${field}" must be an array.`);
        }
      }
      if (Object.prototype.hasOwnProperty.call(screen, 'entry') && typeof screen.entry !== 'boolean') {
        errors.push(`Screen ${index + 1} field "entry" must be a boolean.`);
      }
    });
  }

  const design = normalizeDesign(raw);
  const screenIds = new Set(design.screens.map((screen) => screen.id).filter(Boolean));
  for (const id of [...design.workflowScreens, ...design.supportingScreens]) {
    if (!screenIds.has(id)) {
      errors.push(`Referenced screen "${id}" must exist in screens.`);
    }
  }

  return { ok: errors.length === 0, errors, design };
}

function bulletList(items, fallback = '- Not specified.') {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : fallback;
}

function screenMarkdown(screen, index) {
  return `### ${index + 1}. ${screen.name || screen.id || 'Untitled screen'}

- ID: ${screen.id || 'not-specified'}
- Entry screen: ${screen.entry ? 'yes' : 'no'}
- Covers must-haves: ${screen.coversMustHaves.join('; ') || 'None'}
- Key elements: ${screen.keyElements.join('; ') || 'Not specified.'}

${screen.purpose || 'No purpose provided.'}`;
}

export function buildDesignMarkdown(design) {
  return `# UI Spec: ${design.idea || design.goal || 'Untitled'}

Source PRD session: ${design.prdSessionPath || 'Not linked.'}

## Goal

${design.goal || 'Not specified.'}

## PRD Anchors

- The one thing: ${design.oneThing || 'Not specified.'}
- Must-haves: ${design.mustHaves.join('; ') || 'Not specified.'}
- Non-goals: ${design.nonGoals.join('; ') || 'Not specified.'}
- Core workflow: ${design.coreWorkflow || 'Not specified.'}

## Workflow Screens

${bulletList(design.workflowScreens)}

## Screens

${design.screens.map(screenMarkdown).join('\n\n')}

## Supporting Screens

${bulletList(design.supportingScreens, '- None.')}

## Excluded Non-Goals

${bulletList(design.excludedNonGoals)}

## Open Questions

${bulletList(design.openQuestions, '- None.')}
`;
}

export function buildDesignHandoff(design) {
  const firstWorkflowScreen = screenById(design, design.workflowScreens[0]);
  return `# Design Handoff: ${design.idea || design.goal || 'Untitled'}

Read \`ai-prd.md\`, \`scope.md\`, \`design.md\`, and \`docs/UI_SPEC.md\` first. Preserve the declared page structure, keep v1 inside the PRD non-goals, and build only from screens covered by the design.

## Core Workflow

${design.workflowScreens.join(' -> ') || 'No workflow screens defined.'}

## First Workflow Screen

${firstWorkflowScreen ? screenMarkdown(firstWorkflowScreen, 0) : 'No first workflow screen defined.'}

## All Screens

${design.screens.map((screen, index) => `${index + 1}. ${screen.name || screen.id || 'Untitled'} (${screen.id || 'not-specified'})`).join('\n') || 'No screens defined.'}

## Explicitly Excluded

${bulletList(design.excludedNonGoals)}

Report any PRD or design ambiguity before implementation expands scope.
`;
}

export function screenById(design, id) {
  return design.screens.find((screen) => screen.id === id);
}

export function workflowScreenItems(design) {
  return design.workflowScreens.map((id) => screenById(design, id)).filter(Boolean);
}

export function coveredDesignMustHaveText(design) {
  return design.screens.flatMap((screen) => screen.coversMustHaves).join('\n');
}

export function workflowCoveredMustHaveText(design) {
  return workflowScreenItems(design).flatMap((screen) => screen.coversMustHaves).join('\n');
}

export function workflowScreenText(design) {
  return workflowScreenItems(design).map((screen) => [
    screen.id,
    screen.name,
    screen.purpose,
    ...screen.coversMustHaves,
    ...screen.keyElements,
  ].join('\n')).join('\n');
}

export function builtNonGoalClaimText(design) {
  return coveredDesignMustHaveText(design);
}

export function excludedDesignNonGoalText(design) {
  return design.excludedNonGoals.join('\n');
}
