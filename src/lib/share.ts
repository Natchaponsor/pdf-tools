/*
 * Handing text off to another app. The translation itself happens in whatever
 * translator the user picks. The recognised text leaves PaperPal only when
 * they tap one of these.
 */

export function canShareText(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareText(
  title: string,
  text: string,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canShareText()) return 'unsupported';
  try {
    await navigator.share({ title, text });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

/** Google Translate on the web, prefilled. Works anywhere; text rides in the URL. */
export function googleTranslateUrl(text: string, target: string, source = 'auto'): string {
  return `https://translate.google.com/?sl=${source}&tl=${target}&op=translate&text=${encodeURIComponent(
    text.slice(0, 4000),
  )}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
