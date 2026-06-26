export const HOOK_MARKER = 'AI PM Dev Agent pre-commit gate';

export function preCommitScript() {
  return `#!/bin/sh
# ${HOOK_MARKER} — installed by \`ai-pm-dev install-hook\`.
# Blocks a commit that changes work files without recording anything in docs/.
changed=$(git diff --cached --name-only --diff-filter=ACMR)
[ -z "$changed" ] && exit 0
work=$(printf '%s\\n' "$changed" | grep -v '^docs/' | grep -v '^\\.ai-pm-dev/' | grep -v '^memory/' || true)
docs=$(printf '%s\\n' "$changed" | grep '^docs/' || true)
if [ -n "$work" ] && [ -z "$docs" ]; then
  echo "ai-pm-dev: commit blocked — code/content changed but docs/ was not updated."
  echo "Record this work first (one line each), then 'git add docs/' and commit again:"
  echo "  ai-pm-dev decide \\"<decision>\\" --why \\"<reason>\\""
  echo "  ai-pm-dev note \\"<progress>\\""
  echo "  ai-pm-dev pitfall \\"<symptom>\\" --fix \\"<fix>\\""
  echo "To bypass on purpose: git commit --no-verify"
  exit 1
fi
exit 0
`;
}

export const PR_TEMPLATE_MARKER = 'AI PM Dev Agent PR template gate';

export function prTemplateContent() {
  return `<!-- ${PR_TEMPLATE_MARKER}: installed by ai-pm-dev install-pr-template -->

# PR Gate

## Summary

What changed, and why is this the smallest useful change?

## PRD / Scope Link

- Latest PRD session: \`.ai-pm-dev/prd-sessions/<session>\`
- Related docs: \`docs/scope.md\`, \`docs/acceptance-tests.md\`
- Must-have this PR implements:
- Non-goal check: this PR does not implement or expand into:

## Gate Checklist

- [ ] I ran \`ai-pm-dev prd check --strict\`.
- [ ] The change maps to a must-have in \`docs/scope.md\`.
- [ ] The change does not sneak in a listed non-goal.
- [ ] \`docs/acceptance-tests.md\` covers the behavior changed here.
- [ ] I updated project docs with \`ai-pm-dev decide\`, \`note\`, \`pitfall\`, or direct docs edits where needed.

## How Did You Test This Change?

List the exact commands, checks, screenshots, or manual flows used.

## Reviewer Notes

Call out risky areas, permissions/data changes, migrations, or places where you want extra scrutiny.

## User-Facing Change

\`\`\`release-note
NONE
\`\`\`

## Additional Documentation

\`\`\`docs
NONE
\`\`\`
`;
}
