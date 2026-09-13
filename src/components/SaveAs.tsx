import { useState } from 'react';
import { downloadBlob, resolveFilename, sanitizeStem, splitName } from '../lib/download';
import { convertPdfToImages } from '../lib/pdfDoc';
import { zipFiles } from '../lib/zip';
import { errorMessage } from '../lib/errors';
import { IconLoader } from './icons';

interface Props {
  blob: Blob;
  /** The pre-filled name, e.g. "report-compressed.pdf". */
  defaultName: string;
  /** 'button' = full-width name field + primary button; 'inline' = compact row. */
  variant?: 'button' | 'inline';
  label?: string;
  onDownloaded?: () => void;
}

type ExportFormat = 'pdf' | 'jpg' | 'png';

/**
 * Lets the user edit the file name before saving. The extension is fixed and
 * shown as a suffix so it can't be lost, unless the result is a PDF, in which case
 * it becomes a format choice (PDF stays the default) that renders every page
 * to an image on save instead. An empty name falls back to the original stem.
 */
export function SaveAs({ blob, defaultName, variant = 'button', label = 'Download', onDownloaded }: Props) {
  const { stem, ext } = splitName(defaultName);
  const [value, setValue] = useState(stem);
  const isPdf = blob.type === 'application/pdf';
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [busy, setBusy] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  async function save() {
    setConvertError(null);
    if (!isPdf || format === 'pdf') {
      downloadBlob(blob, resolveFilename(value, ext, stem));
      onDownloaded?.();
      return;
    }
    setBusy(true);
    try {
      const baseName = sanitizeStem(value) || stem;
      const images = await convertPdfToImages(blob, format === 'jpg' ? 'jpeg' : 'png', baseName, {
        dpi: 150,
      });
      if (images.length === 1) {
        downloadBlob(images[0].blob, images[0].name);
      } else {
        const zip = await zipFiles(images.map((img) => ({ name: img.name, data: img.blob })));
        downloadBlob(zip, `${baseName}.zip`);
      }
      onDownloaded?.();
    } catch (err) {
      setConvertError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const extControl = isPdf ? (
    <select
      aria-label="File format"
      value={format}
      onChange={(e) => setFormat(e.target.value as ExportFormat)}
      disabled={busy}
      className="cursor-pointer bg-transparent pr-2 text-[13px] text-ink-dim outline-none disabled:cursor-default"
    >
      <option value="pdf">.pdf</option>
      <option value="jpg">.jpg</option>
      <option value="png">.png</option>
    </select>
  ) : (
    <span className="pr-2 text-[13px] text-ink-dim">{ext}</span>
  );

  if (variant === 'inline') {
    return (
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex min-w-0 items-center rounded-full border-2 border-line bg-page text-[13px] focus-within:border-brand">
            <input
              aria-label="File name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={busy}
              className="min-w-0 flex-1 rounded-l-full bg-transparent px-3 py-1.5 font-bold text-ink outline-none"
            />
            {extControl}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="shrink-0 rounded-full bg-brand px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-brand-deep disabled:opacity-40"
          >
            {busy ? <IconLoader className="h-4 w-4 animate-spin" /> : 'Save'}
          </button>
        </span>
        {convertError && <span className="text-[12px] text-danger">{convertError}</span>}
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-stretch gap-2">
        <span className="flex min-w-0 flex-1 items-center rounded-full border-2 border-line bg-page focus-within:border-brand">
          <input
            aria-label="File name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
            className="min-w-0 flex-1 rounded-l-full bg-transparent px-5 py-3 text-[15px] font-bold text-ink outline-none"
          />
          {extControl}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="flex shrink-0 items-center gap-2 rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-brand-deep disabled:opacity-40"
        >
          {busy && <IconLoader className="h-4 w-4 animate-spin" />}
          {busy ? 'Converting…' : label}
        </button>
      </div>
      {convertError && <p className="text-[13px] text-danger">{convertError}</p>}
    </div>
  );
}
