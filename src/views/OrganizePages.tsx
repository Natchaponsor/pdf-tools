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
  type DragOverEvent,
  type DragStartEvent,
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
import { DownloadCard } from '../components/DownloadCard';
import { WorkingCard } from '../components/WorkingCard';
import { PageTileOverlay, tileBorderClass } from '../components/PageTileOverlay';
import { PageZoomModal } from '../components/PageZoomModal';
import { FileRow } from './AddPageNumbers';
import { openDoc, renderPage } from '../lib/pdfDoc';
import { organizePages, type RotationAngle, type PageOp } from '../lib/pdf';
import { bytesToBlob } from '../lib/download';
import { formatBytes } from '../lib/format';
import { errorMessage } from '../lib/errors';
import { takeHandoff } from '../lib/handoff';
import { IconRotate, IconTrash, IconUndo } from '../components/icons';

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
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

  // Runs once on mount to pick up a "Continue with…" handoff, if any.
  useEffect(() => {
    const handoff = takeHandoff();
    if (handoff) pick([handoff]);
  }, []);

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

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;
    setCards((prev) => {
      const from = prev.findIndex((c) => c.id === active.id);
      const to = prev.findIndex((c) => c.id === over.id);
      return arrayMove(prev, from, to);
    });
    setResult(null);
  }

  function onDragCancel() {
    setActiveId(null);
    setOverId(null);
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

  const activeIndex = activeId ? cards.findIndex((c) => c.id === activeId) : -1;
  const overIndex = overId ? cards.findIndex((c) => c.id === overId) : -1;

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
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onDragCancel={onDragCancel}
              >
                <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {cards.map((card, i) => (
                      <PageTile
                        key={card.id}
                        card={card}
                        position={i + 1}
                        dropEdge={
                          activeId && overId === card.id && card.id !== activeId
                            ? activeIndex < overIndex
                              ? 'right'
                              : 'left'
                            : null
                        }
                        onRotate={() =>
                          update(card.id, {
                            rotate: (((card.rotate + 90) % 360) as RotationAngle),
                          })
                        }
                        onToggleDelete={() => update(card.id, { deleted: !card.deleted })}
                        onZoom={() => setZoomIndex(card.sourceIndex)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>

              {zoomIndex != null && (
                <PageZoomModal
                  file={file}
                  pageIndex={zoomIndex}
                  rotationDeg={cards.find((c) => c.sourceIndex === zoomIndex)?.rotate ?? 0}
                  onClose={() => setZoomIndex(null)}
                />
              )}

              {result ? (
                <DownloadCard
                  headline="New PDF ready"
                  detail={`${kept.length} pages · ${formatBytes(result.bytes)}`}
                  filename={file.name.replace(/\.pdf$/i, '') + '-organized.pdf'}
                  blob={result.blob}
                  onReset={() => setResult(null)}
                  resetLabel="Keep editing"
                  chainFrom="organize"
                />
              ) : busy ? (
                <WorkingCard ratio={null} label="Building PDF…" />
              ) : (
                <button
                  type="button"
                  onClick={run}
                  disabled={kept.length === 0 || !dirty}
                  className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm transition-[transform,background-color] duration-150 hover:bg-brand-700 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
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
  dropEdge,
  onRotate,
  onToggleDelete,
  onZoom,
}: {
  card: PageCard;
  position: number;
  dropEdge: 'left' | 'right' | null;
  onRotate: () => void;
  onToggleDelete: () => void;
  onZoom: () => void;
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
    <PageTileOverlay position={position} onZoom={onZoom} liRef={setNodeRef} liStyle={style}>
      <div
        {...attributes}
        {...listeners}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onZoom();
        }}
        className={`relative aspect-3/4 cursor-grab touch-none overflow-hidden rounded-lg border bg-white transition-colors dark:bg-white/5 ${
          card.deleted ? `${tileBorderClass('danger')} opacity-40` : tileBorderClass('neutral')
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
      {dropEdge && (
        <span
          className={`pointer-events-none absolute top-0 z-10 h-full w-1 rounded-full bg-brand-500 ${
            dropEdge === 'left' ? '-left-2' : '-right-2'
          }`}
        />
      )}
      <div className="mt-1 flex justify-center gap-1">
        <button
          type="button"
          onClick={onRotate}
          aria-label={`Rotate page ${position}`}
          className="rounded-md p-1 text-ink-dim transition-colors hover:bg-ink-dim hover:text-page"
        >
          <IconRotate className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleDelete}
          aria-label={card.deleted ? `Restore page ${position}` : `Delete page ${position}`}
          className="rounded-md p-1 text-ink-dim transition-colors hover:bg-ink-dim hover:text-page"
        >
          {card.deleted ? <IconUndo className="h-4 w-4" /> : <IconTrash className="h-4 w-4" />}
        </button>
      </div>
    </PageTileOverlay>
  );
}
