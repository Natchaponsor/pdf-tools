import { useRef, useState } from 'react';
import type { DragEvent } from 'react';

interface Props {
  accept: string;
  multiple?: boolean;
  hint: string;
  onFiles: (files: File[]) => void;
}

export function FileDrop({ accept, multiple = false, hint, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={`flex w-full flex-col items-center justify-center gap-4 rounded-2xl border px-6 py-16 text-center shadow-sm transition-[transform,background-color,border-color,box-shadow] duration-150 active:scale-[0.99] ${
        over
          ? 'border-brand-500 bg-brand-50 shadow-[0_12px_28px_-12px_rgba(37,99,235,0.35)] dark:bg-brand-900/30'
          : 'border-paper-200 bg-white hover:border-brand-300 hover:shadow-[0_12px_28px_-14px_rgba(37,99,235,0.25)] dark:border-white/15 dark:bg-white/5'
      }`}
    >
      <span className="grid h-16 w-16 place-items-center rounded-lg bg-brand-600 text-white">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 16V4m0 0L7 9m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg font-bold text-ink-900 dark:text-white">
        Choose a file or drag it here
      </span>
      <span className="text-sm text-ink-500 dark:text-white/60">{hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(multiple ? files : files.slice(0, 1));
          e.target.value = '';
        }}
      />
    </button>
  );
}
