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
      className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-[transform,background-color,border-color] duration-150 active:scale-[0.99] ${
        over
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
          : 'border-paper-200 bg-white hover:border-brand-300 dark:border-white/15 dark:bg-white/5'
      }`}
    >
      <span
        className={`grid h-14 w-14 place-items-center rounded-lg transition-colors ${
          over
            ? 'bg-brand-100 text-brand-700 dark:bg-brand-800/50 dark:text-brand-200'
            : 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300'
        }`}
      >
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 16V4m0 0L7 9m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold text-ink-900 dark:text-white">
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
