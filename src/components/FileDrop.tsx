import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { takeHandoffMatching } from '../lib/handoff';
import { Pal } from './Pal';

interface Props {
  accept: string;
  multiple?: boolean;
  hint: string;
  onFiles: (files: File[]) => void;
  label?: string;
}

export function FileDrop({ accept, multiple = false, hint, onFiles, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  // A file handed over from the home screen (or by "Continue with…") is picked
  // up here, so every tool inherits it without knowing where it came from.
  const deliver = useRef(onFiles);
  deliver.current = onFiles;
  useEffect(() => {
    const handed = takeHandoffMatching(accept);
    if (handed) deliver.current([handed]);
  }, [accept]);

  function take(files: File[]) {
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setOver(false);
          take(Array.from(e.dataTransfer.files));
        }}
        className={`group relative flex w-full flex-col items-center gap-4 rounded-[20px] px-6 py-10 text-center transition-colors duration-200 sm:py-12 ${
          over ? 'bg-chip' : 'bg-recess'
        }`}
      >
        <DashedEdge active={over} />
        {/* It lifts its brows when something is actually being handed over.
            Rocking gently while it waits, still while you are actually
            pointing at it: the idle motion is what draws the eye, and once the
            eye is here it has done its job and should get out of the way. */}
        <Pal
          state={over ? 'alert' : 'resting'}
          className="animate-tilt h-14 w-14 text-brand transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:animate-none group-hover:-translate-y-1 sm:h-16 sm:w-16"
        />
        <span className="block">
          <span className="block text-[21px] font-extrabold leading-tight tracking-tight text-ink sm:text-[25px]">
            {label ?? 'Drop a PDF here'}
          </span>
          <span className="mt-1.5 block text-[14px] text-ink-dim">{hint}</span>
        </span>
        <span className="inline-block rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition-colors group-hover:bg-brand-deep">
          Choose a file
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          take(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </>
  );
}

/**
 * The travelling dashed edge.
 *
 * Drawn as an SVG rather than a CSS dashed border, because `border-style:
 * dashed` has no offset to animate. The svg is inset by half the stroke width
 * and allowed to overflow, so the stroke sits centred on the box edge exactly
 * where the old border did.
 */
function DashedEdge({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full transition-colors duration-200 ${
        active ? 'text-brand' : 'text-line group-hover:text-fold'
      }`}
    >
      {/* Inset by half the stroke so the dashes sit inside the box rather than
          straddling its edge. width and height are set in CSS because SVG
          attributes cannot take calc(). */}
      <rect
        x="1.5"
        y="1.5"
        rx="18.5"
        style={{ width: 'calc(100% - 3px)', height: 'calc(100% - 3px)' }}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="13 9"
        className="group-hover:animate-march"
      />
    </svg>
  );
}
