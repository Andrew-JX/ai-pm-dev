// Split a free-text answer into items. When the user used explicit separators
// (new lines or semicolons), commas are treated as part of an item — so a single
// must-have like "track weight, steps, and sleep" is not miscounted as three.
// With no explicit separator, fall back to comma-splitting so a one-line
// "A, B, C" answer still yields three items.
export function splitItems(value) {
  const raw = (value || '').trim();
  if (!raw) {
    return [];
  }
  const separator = /[\n;；]/.test(raw) ? /[\n;；]+/ : /[,，;；\n]+/;
  return raw.split(separator).map((item) => item.trim()).filter(Boolean);
}

export function countItems(value) {
  return splitItems(value).length;
}

export function listItems(value) {
  return splitItems(value);
}
