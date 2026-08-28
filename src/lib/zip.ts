/** Bundle named byte blobs into a .zip (JSZip is loaded on demand). */
export async function zipFiles(
  entries: { name: string; data: Uint8Array | Blob }[],
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const used = new Set<string>();
  for (const entry of entries) {
    let name = entry.name;
    for (let n = 2; used.has(name); n++) {
      name = entry.name.replace(/(\.[^.]+)?$/, (ext) => `-${n}${ext || ''}`);
    }
    used.add(name);
    zip.file(name, entry.data);
  }
  return zip.generateAsync({ type: 'blob' });
}
