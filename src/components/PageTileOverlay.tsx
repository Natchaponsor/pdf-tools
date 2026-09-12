import type { CSSProperties, ReactNode, Ref } from 'react';
import { IconZoomIn } from './icons';

type Tone = 'neutral' | 'selected' | 'danger';

/**
 * One consistent hover/border treatment for a page-thumbnail tile, applied by
 * each view directly to its own existing interactive element (a native
 * button, or a drag handle) — this is what makes the hover highlight
 * identical everywhere without changing any view's click semantics.
 */
export function tileBorderClass(tone: Tone): string {
  switch (tone) {
    case 'selected':
      return 'border-brand-500 ring-2 ring-brand-500/30 hover:border-brand-600 hover:ring-brand-500/40';
    case 'danger':
      return 'border-red-400 ring-2 ring-red-400/30 hover:border-red-500 hover:ring-red-400/40';
    default:
      return 'border-paper-200 dark:border-white/15 hover:border-brand-400 hover:ring-2 hover:ring-brand-400/20 dark:hover:border-brand-300';
  }
}

interface Props {
  position: number;
  onZoom: () => void;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
  children: ReactNode;
  /** For a draggable tile (Organize): dnd-kit's sortable ref/style go on the
   * <li> itself, so the whole tile — image and badges together — moves as
   * one unit during drag. `attributes`/`listeners` stay on the view's own
   * inner element instead, exactly as before. */
  liRef?: Ref<HTMLLIElement>;
  liStyle?: CSSProperties;
}

/**
 * Wraps a tile's own interactive element with the shared corner overlays
 * (position badge, zoom button, status slots) as absolute siblings — never
 * descendants — so nesting this inside a view whose whole tile is already a
 * native <button> stays valid HTML and doesn't disturb its click handling.
 */
export function PageTileOverlay({
  position,
  onZoom,
  bottomLeft,
  bottomRight,
  children,
  liRef,
  liStyle,
}: Props) {
  return (
    <li ref={liRef} style={liStyle} className="relative">
      {children}
      <span className="pointer-events-none absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black/60 px-1 text-[10px] font-semibold text-white">
        {position}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onZoom();
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        aria-label={`Zoom in on page ${position}`}
        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white opacity-70 transition-opacity hover:opacity-100"
      >
        <IconZoomIn className="h-3.5 w-3.5" />
      </button>
      {bottomLeft && <span className="absolute bottom-1 left-1">{bottomLeft}</span>}
      {bottomRight && <span className="absolute bottom-1 right-1">{bottomRight}</span>}
    </li>
  );
}
