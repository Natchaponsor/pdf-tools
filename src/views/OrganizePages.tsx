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
import { FileDrop } from '../components/FileDrop';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { FileRow } from './AddPageNumbers';
import { openDoc, renderPage } from '../lib/pdfDoc';
import { organizePages, type RotationAngle, type PageOp } from '../lib/pdf';
import { downloadBlob, bytesToBlob } from '../lib/download';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';

interface PageCard {
  id: string;
  sourceIndex: number;
  rotate: RotationAngle;
  deleted: boolean;
  thumbUrl?: string;
}

export function OrganizePages() {
  const [file, setFile] = useState<File | null>(null);
  const [cards, setCards] = useState<PageCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; bytes: number } | null>(null);
  const urls = useRef<string[]>([]);
  const outUrl = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(
    () => () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      if (outUrl.current) URL.revokeObjectURL(outUrl.current);
    },
    [],
  );

  async function pick(files: File[]) {
    const next = files[0];
    if (!next) return;
    setError(null);
    setResult(null);
    setFile(next);
    setLoading(true);
    setCards([]);
    try {
      const doc = await openDoc(next);
      const initial: PageCard[] = Array.from({ length: doc.pageCount }, (_, i) => ({
        id: `p${i}`,
        sourceIndex: i,
        rotate: 0,
        deleted: false,
      }));
      setCards(initial);
      for (let i = 0; i < doc.pageCount; i++) {
        const { blob } = await renderPage(doc.docId, i, { maxWidth: 200, format: 'jpeg', quality: 70 });
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        setCards((prev) => prev.map((c) => (c.sourceIndex === i ? { ...c, thumbUrl: url } : c)));
      }
      doc.close();
    } catch (err) {
      setError(errorMessage(err));
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCards((prev) => {
      const from = prev.findIndex((c) => c.id === active.id);
      const to = prev.findIndex((c) => c.id === over.id);
      return arrayMove(prev, from, to);
    });
    setResult(null);
  }

  const update = (id: string, patch: Partial<PageCard>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setResult(null);
  };

  const kept = cards.filter((c) => !c.deleted);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const ops: PageOp[] = kept.map((c) => ({ index: c.sourceIndex, rotate: c.rotate }));
      const bytes = await organizePages(file, ops);
      const blob = bytesToBlob(bytes, 'application/pdf');
      outUrl.current = URL.createObjectURL(blob);
      setResult({ blob, bytes: bytes.byteLength });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    if (outUrl.current) URL.revokeObjectURL(outUrl.current);
    outUrl.current = null;
    setFile(null);
    setCards([]);
    setResult(null);
    setError(null);
  }

  const dirty =
    cards.some((c, i) => c.deleted || c.rotate !== 0 || c.sourceIndex !== i);

  return (
    <ToolShell
      title="Organize pages"
      blurb="Drag to reorder, rotate, or delete pages. Then export a new PDF."
    >
      {error && <Notice tone="error">{error}</Notice>}

      {!file && <FileDrop accept="application/pdf,.pdf" hint="One PDF" onFiles={pick} />}

      {file && (
        <div className="space-y-4">
          <FileRow file={file} onClear={reset} />

          {loading && cards.length === 0 && <ProgressBar ratio={null} label="Opening PDF…" />}

          {cards.length > 0 && (
            <>
              <p className="text-sm text-ink-500 dark:text-white/60">
                {kept.length} of {cards.length} pages kept
              </p>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {cards.map((card, i) => (
                      <PageTile
                        key={card.id}
                        card={card}
                        position={i + 1}
                        onRotate={() =>
                          update(card.id, {
                            rotate: (((card.rotate + 90) % 360) as RotationAngle),
                          })
                        }
                        onToggleDelete={() => update(card.id, { deleted: !card.deleted })}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>

              {result ? (
                <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
                  <p className="text-lg font-bold text-brand-800 dark:text-brand-200">
                    New PDF ready · {kept.length} pages · {formatBytes(result.bytes)}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        downloadBlob(
                          result.blob,
                          file.name.replace(/\.pdf$/i, '') + '-organized.pdf',
                        )
                      }
                      className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      className="rounded-xl border border-brand-300 px-4 py-2.5 font-semibold text-brand-700 dark:border-brand-700 dark:text-brand-200"
                    >
                      Keep editing
                    </button>
                  </div>
                </div>
              ) : busy ? (
                <ProgressBar ratio={null} label="Building PDF…" />
              ) : (
                <button
                  type="button"
                  onClick={run}
                  disabled={kept.length === 0 || !dirty}
                  className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {dirty ? 'Export new PDF' : 'Make a change to export'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </ToolShell>
  );
}

function PageTile({
  card,
  position,
  onRotate,
  onToggleDelete,
}: {
  card: PageCard;
  position: number;
  onRotate: () => void;
  onToggleDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const spin = card.rotate % 360;

  return (
    <li ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className={`aspect-3/4 cursor-grab touch-none overflow-hidden rounded-lg border bg-white dark:bg-white/5 ${
          card.deleted
            ? 'border-red-300 opacity-40'
            : 'border-paper-200 dark:border-white/15'
        }`}
      >
        {card.thumbUrl ? (
          <img
            src={card.thumbUrl}
            alt={`Page ${position}`}
            className="h-full w-full object-contain transition-transform"
            style={{ transform: `rotate(${spin}deg)` }}
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-ink-500">…</div>
        )}
      </div>
      <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black/60 px-1 text-[10px] font-semibold text-white">
        {position}
      </span>
      <div className="mt-1 flex justify-center gap-1">
        <button
          type="button"
          onClick={onRotate}
          aria-label={`Rotate page ${position}`}
          className="rounded-md px-2 py-0.5 text-xs text-ink-500 hover:bg-paper-100 dark:hover:bg-white/10"
        >
          ⟳
        </button>
        <button
          type="button"
          onClick={onToggleDelete}
          aria-label={card.deleted ? `Restore page ${position}` : `Delete page ${position}`}
          className="rounded-md px-2 py-0.5 text-xs text-ink-500 hover:bg-paper-100 dark:hover:bg-white/10"
        >
          {card.deleted ? '↺' : '🗑'}
        </button>
      </div>
    </li>
  );
}
