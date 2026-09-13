import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ToolShell } from '../components/ToolShell';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { SaveAs } from '../components/SaveAs';
import { scansToPdf } from '../lib/pdf';
import { bytesToBlob } from '../lib/download';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';
import {
  toCanvas,
  detectQuad,
  defaultQuad,
  flatten,
  canvasToJpeg,
  type Quad,
  type Point,
  type ScanMode,
} from '../lib/scanner';

interface ScanPage {
  id: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

interface Draft {
  canvas: HTMLCanvasElement;
  url: string;
  quad: Quad;
  detecting: boolean;
}

const MODES: [ScanMode, string][] = [
  ['color', 'Colour'],
  ['grayscale', 'Greyscale'],
  ['bw', 'Black & white'],
];

let seq = 0;

export function ScanDocuments() {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<ScanMode>('color');
  const [phase, setPhase] = useState<'scanning' | 'review'>('scanning');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const rescanRef = useRef(false);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(
    () => () => {
      pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
      if (draftRef.current) URL.revokeObjectURL(draftRef.current.url);
    },
    [],
  );

  function openCamera(rescan = false) {
    rescanRef.current = rescan;
    setError(null);
    inputRef.current?.click();
  }

  async function onCapture(file: File | undefined) {
    if (!file) return;
    if (rescanRef.current) {
      setPages((prev) => {
        const last = prev[prev.length - 1];
        if (last) URL.revokeObjectURL(last.url);
        return prev.slice(0, -1);
      });
    }
    setBusy('Preparing the photo…');
    try {
      const canvas = await toCanvas(file);
      const url = URL.createObjectURL(await canvasToJpeg(canvas, 0.9));
      setDraft({ canvas, url, quad: defaultQuad(canvas.width, canvas.height), detecting: true });
      const found = await detectQuad(canvas).catch(() => null);
      setDraft((d) =>
        d && d.canvas === canvas
          ? { ...d, detecting: false, quad: found ?? d.quad }
          : d,
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function usePage() {
    if (!draft) return;
    setBusy('Flattening the page…');
    try {
      const flat = await flatten(draft.canvas, draft.quad, mode);
      const blob = await canvasToJpeg(flat.canvas, 0.85);
      const page: ScanPage = {
        id: `s${++seq}`,
        blob,
        url: URL.createObjectURL(blob),
        width: flat.width,
        height: flat.height,
      };
      URL.revokeObjectURL(draft.url);
      setDraft(null);
      setPages((prev) => [...prev, page]);
      setResult(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  function discardDraft() {
    if (draft) URL.revokeObjectURL(draft.url);
    setDraft(null);
  }

  function removePage(id: string) {
    setPages((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.id !== id);
    });
    setResult(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPages((prev) => {
      const from = prev.findIndex((p) => p.id === active.id);
      const to = prev.findIndex((p) => p.id === over.id);
      return arrayMove(prev, from, to);
    });
    setResult(null);
  }

  async function exportPdf() {
    if (!pages.length) return;
    setBusy('Building the PDF…');
    setError(null);
    try {
      const bytes = await scansToPdf(pages.map((p) => p.blob));
      const blob = bytesToBlob(bytes, 'application/pdf');
      setResult({ blob, bytes: bytes.byteLength });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  function startOver() {
    pages.forEach((p) => URL.revokeObjectURL(p.url));
    discardDraft();
    setPages([]);
    setPhase('scanning');
    setResult(null);
    setError(null);
  }

  return (
    <ToolShell
      title="Scan documents"
      blurb="Photograph a page, straighten it automatically, then repeat. Reorder the pages and export one PDF. Nothing is uploaded."
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onCapture(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {error && <Notice tone="error">{error}</Notice>}

      {/* 1. adjust the corners of the photo just taken */}
      {draft ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink-700 dark:text-white/80">
            {draft.detecting ? 'Finding the page…' : 'Drag the corners to match the page'}
          </p>
          <CornerAdjust
            url={draft.url}
            width={draft.canvas.width}
            height={draft.canvas.height}
            quad={draft.quad}
            onChange={(quad) => setDraft((d) => (d ? { ...d, quad } : d))}
          />

          <Segmented label="Look" value={mode} options={MODES} onChange={setMode} />

          {busy ? (
            <ProgressBar ratio={null} label={busy} />
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  discardDraft();
                  openCamera(false);
                }}
                className="flex-1 rounded-xl border border-paper-200 px-4 py-3 font-semibold text-ink-700 dark:border-white/15 dark:text-white/80"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={usePage}
                className="flex-1 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
              >
                Use this page
              </button>
            </div>
          )}
        </div>
      ) : phase === 'scanning' ? (
        <div className="space-y-4">
          {pages.length === 0 ? (
            <>
              <Notice tone="info">
                Works best with the page flat, well lit, and fully in frame on a contrasting
                surface. Everything, edge detection included, runs on your device. The first
                scan downloads a ~13&nbsp;MB engine, then it works offline.
              </Notice>
              {busy ? (
                <ProgressBar ratio={null} label={busy} />
              ) : (
                <button
                  type="button"
                  onClick={() => openCamera(false)}
                  className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
                >
                  Scan a page
                </button>
              )}
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
                <p className="text-lg font-bold text-brand-800 dark:text-brand-200">
                  {pages.length} {pages.length === 1 ? 'page' : 'pages'} scanned
                </p>
                <p className="mt-1 text-sm text-ink-500 dark:text-white/60">
                  Scan the next page, redo the last one, or stop and review.
                </p>
              </div>

              <ThumbStrip pages={pages} />

              {busy ? (
                <ProgressBar ratio={null} label={busy} />
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => openCamera(true)}
                    className="rounded-xl border border-paper-200 px-4 py-3 font-semibold text-ink-700 dark:border-white/15 dark:text-white/80"
                  >
                    Rescan last page
                  </button>
                  <button
                    type="button"
                    onClick={() => openCamera(false)}
                    className="rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700"
                  >
                    Scan next page
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase('review')}
                    className="rounded-xl border border-paper-200 px-4 py-3 font-semibold text-ink-700 dark:border-white/15 dark:text-white/80"
                  >
                    Stop
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* 3. review grid + export */
        <div className="space-y-4">
          <p className="text-sm text-ink-500 dark:text-white/60">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} · drag to reorder, tap ✕ to
            remove
          </p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {pages.map((p, i) => (
                  <PageTile key={p.id} page={p} position={i + 1} onRemove={() => removePage(p.id)} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={() => {
              setPhase('scanning');
              openCamera(false);
            }}
            className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            + Scan another page
          </button>

          {result ? (
            <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
              <p className="text-lg font-bold text-brand-800 dark:text-brand-200">
                PDF ready · {pages.length} {pages.length === 1 ? 'page' : 'pages'} ·{' '}
                {formatBytes(result.bytes)}
              </p>
              <SaveAs blob={result.blob} defaultName="scan.pdf" />
              <button
                type="button"
                onClick={startOver}
                className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                Start a new scan
              </button>
            </div>
          ) : busy ? (
            <ProgressBar ratio={null} label={busy} />
          ) : (
            <button
              type="button"
              onClick={exportPdf}
              disabled={pages.length === 0}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Export PDF
            </button>
          )}
        </div>
      )}
    </ToolShell>
  );
}

/* ── Corner-adjust overlay ────────────────────────────────────────────────── */

function CornerAdjust({
  url,
  width,
  height,
  quad,
  onChange,
}: {
  url: string;
  width: number;
  height: number;
  quad: Quad;
  onChange: (q: Quad) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<keyof Quad | null>(null);
  const r = Math.max(width, height) * 0.018;
  const pad = r * 1.6;

  function toSvg(e: React.PointerEvent): Point {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    const p = ctm ? pt.matrixTransform(ctm.inverse()) : pt;
    return {
      x: Math.max(0, Math.min(width, p.x)),
      y: Math.max(0, Math.min(height, p.y)),
    };
  }

  const order: (keyof Quad)[] = ['tl', 'tr', 'br', 'bl'];
  const poly = order.map((k) => `${quad[k].x},${quad[k].y}`).join(' ');

  return (
    <div className="rounded-2xl border border-paper-200 bg-black/5 p-2 dark:border-white/15">
      <svg
        ref={svgRef}
        viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
        className="block w-full touch-none select-none"
        onPointerMove={(e) => {
          if (!dragging.current) return;
          onChange({ ...quad, [dragging.current]: toSvg(e) });
        }}
        onPointerUp={() => (dragging.current = null)}
        onPointerLeave={() => (dragging.current = null)}
      >
        <image href={url} x="0" y="0" width={width} height={height} />
        <polygon
          points={poly}
          fill="rgba(37,99,235,0.15)"
          stroke="#2563eb"
          strokeWidth={r * 0.35}
        />
        {order.map((k) => (
          <circle
            key={k}
            cx={quad[k].x}
            cy={quad[k].y}
            r={r}
            fill="#fff"
            stroke="#2563eb"
            strokeWidth={r * 0.35}
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture(e.pointerId);
              dragging.current = k;
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ── Thumbnails ───────────────────────────────────────────────────────────── */

function ThumbStrip({ pages }: { pages: ScanPage[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {pages.map((p, i) => (
        <div key={p.id} className="relative shrink-0">
          <img
            src={p.url}
            alt={`Page ${i + 1}`}
            className="h-24 w-auto rounded-lg border border-paper-200 bg-white object-contain dark:border-white/15"
          />
          <span className="absolute left-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-black/60 px-1 text-[10px] font-semibold text-white">
            {i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}

function PageTile({
  page,
  position,
  onRemove,
}: {
  page: ScanPage;
  position: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className="aspect-3/4 cursor-grab touch-none overflow-hidden rounded-lg border border-paper-200 bg-white dark:border-white/15 dark:bg-white/5"
      >
        <img src={page.url} alt={`Page ${position}`} className="h-full w-full object-contain" />
      </div>
      <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black/60 px-1 text-[10px] font-semibold text-white">
        {position}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove page ${position}`}
        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-red-600"
      >
        ✕
      </button>
    </li>
  );
}

/* ── Segmented (local copy, matches the other tool views) ─────────────────── */

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink-700 dark:text-white/80">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([val, text]) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              value === val
                ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                : 'border-paper-200 dark:border-white/15'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
