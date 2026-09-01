import { callMupdf } from './mupdfClient';

/**
 * PDF permission integers (PDF 32000-1, Table 22). The high reserved bits are
 * set, so the values are negative when read as a signed 32-bit int.
 */
export const PERMISSIONS = {
  /** Everything allowed — the file just needs the password to open. */
  all: -1,
  /** Printing (and accessibility copy) allowed; editing, copying, annotating blocked. */
  printOnly: -1340,
};

export async function protectPdf(
  file: File,
  password: string,
  permissions: number,
): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const res = await callMupdf(
    { op: 'protect', file: buffer, password, permissions },
    [buffer],
  );
  return new Blob([res.output as ArrayBuffer], { type: 'application/pdf' });
}

export async function unlockPdf(file: File, password: string): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const res = await callMupdf({ op: 'unlock', file: buffer, password }, [buffer]);
  return new Blob([res.output as ArrayBuffer], { type: 'application/pdf' });
}
