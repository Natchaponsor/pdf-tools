/**
 * A one-shot, in-memory handoff slot for passing a just-produced file
 * straight into another tool, so "Continue with…" can skip the
 * download-then-re-upload round trip. Deliberately not persisted to storage
 * — it only lives for the current page session and is consumed exactly once,
 * so a tool visited any other way (a fresh upload, a reload, a bookmark)
 * behaves exactly as it always has.
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
