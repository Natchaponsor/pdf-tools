import { useState } from 'react';
import { navigate } from '../lib/useHashRoute';
import { setHandoff, takeHandoff } from '../lib/handoff';
import { TOOL_SECTIONS, type Tool } from '../data/tools';
import { PRIVACY_LINE } from '../lib/constants';
import { formatBytes } from '../lib/format';
import { FileDrop } from '../components/FileDrop';
import { Pal } from '../components/Pal';
import { IconClose } from '../components/icons';

export function Home({ compact = false }: { compact?: boolean }) {
  // A file handed over before a verb is chosen — the order people actually
  // think in ("this PDF is too big" comes before "I want the compress tool").
  const [staged, setStaged] = useState<File | null>(null);

  const kind: 'pdf' | 'image' | null = staged
    ? staged.type === 'application/pdf' || staged.name.toLowerCase().endsWith('.pdf')
      ? 'pdf'
      : 'image'
    : null;

  return (
    <div className="space-y-12">
      {!compact && (
        <section className="pt-4">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-lg">
              <h1 className="text-[38px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[52px]">
                PDF chores,
                <br />
                done on your device.
              </h1>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-dim sm:text-[17px]">
                Seventeen tools that never upload your file — because there is no
                server to upload it to. Open your network tab and check.
              </p>
            </div>
            <Pal
              state={staged ? 'alert' : 'resting'}
              className="hidden h-32 w-32 shrink-0 text-brand sm:block lg:h-36 lg:w-36"
            />
          </div>

          <div className="mt-8">
            {staged ? (
              <StagedCard
                file={staged}
                kind={kind}
                onClear={() => {
                  takeHandoff();
                  setStaged(null);
                }}
              />
            ) : (
              <FileDrop
                accept="application/pdf,.pdf,image/*"
                hint="PDF, JPG, PNG or WebP, up to 50 MB. Hand it over first, then pick a tool."
                onFiles={(files) => files[0] && setStaged(files[0])}
              />
            )}
            <p className="mt-3 text-center text-[13px] text-ink-dim">{PRIVACY_LINE}</p>
          </div>
        </section>
      )}

      <div className="space-y-10">
        {compact && (
          <h1 className="text-[34px] font-extrabold tracking-tight text-ink">All tools</h1>
        )}
        {TOOL_SECTIONS.map((section) => (
          <section key={section.id}>
            <div className="flex items-baseline gap-3">
              <h2 className="text-[15px] font-extrabold tracking-tight text-ink">
                {section.title}
              </h2>
              <span className="text-[13px] text-ink-dim">{section.description}</span>
            </div>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {section.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} kind={kind} staged={staged} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function StagedCard({
  file,
  kind,
  onClear,
}: {
  file: File;
  kind: 'pdf' | 'image' | null;
  onClear: () => void;
}) {
  return (
    <div className="animate-enter flex flex-wrap items-center gap-4 rounded-[20px] bg-recess px-5 py-5 sm:px-6">
      <Pal state="alert" className="h-12 w-12 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[18px] font-extrabold tracking-tight text-ink">{file.name}</p>
        <p className="num mt-0.5 text-[13px] text-ink-dim">
          {formatBytes(file.size)} · {kind === 'pdf' ? 'PDF' : 'Image'} · pick a tool below
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-page px-4 py-2.5 text-[14px] font-bold text-ink-dim shadow-sm transition-colors hover:text-ink"
      >
        <IconClose className="h-4 w-4" />
        Take it back
      </button>
    </div>
  );
}

function ToolCard({
  tool,
  kind,
  staged,
}: {
  tool: Tool;
  kind: 'pdf' | 'image' | null;
  staged: File | null;
}) {
  // With a file handed over, a tool that cannot open it is dimmed rather than
  // hidden — you can still see it exists, and reach it by taking the file back.
  const unavailable = kind != null && tool.accepts !== kind;

  return (
    <li>
      <button
        type="button"
        disabled={unavailable}
        onClick={() => {
          if (staged) setHandoff(staged);
          navigate(tool.route);
        }}
        className={`group flex h-full w-full items-start gap-3.5 rounded-[20px] border border-line bg-page p-3.5 text-left transition-[transform,border-color,background-color] duration-200 ease-[cubic-bezier(0.22,1.2,0.36,1)] ${
          unavailable
            ? 'cursor-not-allowed opacity-45'
            : 'hover:-translate-y-0.5 hover:border-fold hover:bg-recess'
        }`}
      >
        {/* The icon chip is the mark's own silhouette, repeated seventeen times. */}
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-chip text-brand transition-transform duration-200 ease-[cubic-bezier(0.22,1.2,0.36,1)] group-hover:-rotate-6">
          <tool.icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15.5px] font-extrabold leading-tight tracking-tight text-ink">
              {tool.title}
            </span>
            {tool.sandbox && (
              <span className="rounded-full bg-sunk px-2 py-0.5 text-[11px] font-bold text-ink-dim">
                Rough
              </span>
            )}
          </span>
          <span className="mt-1 block text-[13px] leading-snug text-ink-dim">
            {unavailable ? `Needs a ${tool.accepts === 'pdf' ? 'PDF' : 'image'}.` : tool.blurb}
          </span>
        </span>
      </button>
    </li>
  );
}
