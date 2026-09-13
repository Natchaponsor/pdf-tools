/**
 * A one-shot, in-memory handoff slot for passing a file straight into a tool
 * without a download-then-re-upload round trip.
 *
 * Two things fill it: "Continue with…" on a result card, and the home bench,
 * where a file is put down before a verb is chosen (which is the order people
 * actually think in — "this PDF is too big" comes before "I want the compress
 * tool"). Deliberately not persisted to storage: it only lives for the current
 * page session and is consumed exactly once, so a tool visited any other way
 * (a fresh upload, a reload, a bookmark) behaves exactly as it always has.
 * Writing a user's document into IndexedDB to survive one hash change would
 * quietly break the promise that nothing is kept.
 */
let pending: File | null = null;

export function setHandoff(file: File): void {
  pending = file;
}

export function takeHandoff(): File | null {
  const file = pending;
  pending = null;
  return file;
}

/**
 * Take the pending file only if a receiving input would accept it, so a PDF
 * left on the bench is never forced into a tool that can only open images.
 * A non-match is left in the slot for whichever tool can actually use it.
 */
export function takeHandoffMatching(accept: string): File | null {
  if (pending && !matches(pending, accept)) return null;
  return takeHandoff();
}

function matches(file: File, accept: string): boolean {
  const rules = accept
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (!rules.length) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}
