export const PLACEHOLDER = /_\(to be filled\)_|_\(date\)_|_\(skill or person\)_|_\(how\)_/;

export const DECISION_HEADER = '# Decision Log\n\n| Date | Decision | Why | Owner |\n| --- | --- | --- | --- |\n';
export const TROUBLE_HEADER = '# Troubleshooting\n\n| Symptom | Root cause | Fix | Verified |\n| --- | --- | --- | --- |\n';
export const OPEN_QUESTIONS_HEADER = '# Open Questions\n\n| Question | Why it matters | Status |\n| --- | --- | --- |\n';

export function docIsStubContent(content) {
  return /\*\*Status:\*\* TODO/.test(content) || PLACEHOLDER.test(content);
}

export function stripPlaceholderRows(content) {
  return content
    .split('\n')
    .filter((line) => !PLACEHOLDER.test(line))
    .join('\n');
}

export function cell(value) {
  return (value || '').replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
}
