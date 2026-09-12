import { useRef } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  label?: string;
}

/** A plain text link that opens the OS file picker — the "add more" companion to FileDrop. */
export function FilePickerButton({ onFiles, accept = 'application/pdf,.pdf', label = 'Add files' }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
    </>
  );
}
