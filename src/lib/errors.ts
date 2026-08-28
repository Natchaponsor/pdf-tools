/** Turn an engine/parse error into a short, friendly sentence for the UI. */
export function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/password|encrypt|decrypt/i.test(message)) {
    return 'This PDF is password-protected. Remove the password in your PDF viewer, then try again.';
  }
  if (/failed to load|fetch|wasm|network|dynamically imported/i.test(message)) {
    return 'A processing engine could not load. Check your connection and reload the page.';
  }
  if (/damaged|repair|corrupt|not a PDF|invalid|trailer|xref|parse/i.test(message)) {
    return 'This file could not be read — it may be damaged or not a real PDF.';
  }
  if (/out of memory|allocation|maximum call stack/i.test(message)) {
    return 'The file is too complex to process in the browser. Try a smaller file.';
  }
  return message || 'Something went wrong. Please try again.';
}
