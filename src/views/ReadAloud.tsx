import { useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell } from '../components/ToolShell';
import { Notice } from '../components/Notice';
import { SaveAs } from '../components/SaveAs';
import { OcrCapture, type OcrOutcome } from '../components/OcrCapture';
import { useTts, chunkText } from '../lib/useTts';
import { bcp47ForLang } from '../lib/ocr';

const RATES = [0.75, 1, 1.25, 1.5];

export function ReadAloud() {
  const [outcome, setOutcome] = useState<OcrOutcome | null>(null);

  return (
    <ToolShell
      title="Read a PDF aloud"
      blurb="Recognise the text in a scanned PDF on your device, then have your browser read it to you — hands-free, works offline."
    >
      {!outcome ? (
        <OcrCapture actionLabel="Get the text" langLabel="Document language" onResult={setOutcome} />
      ) : (
        <Player outcome={outcome} onReset={() => setOutcome(null)} />
      )}
    </ToolShell>
  );
}

function Player({ outcome, onReset }: { outcome: OcrOutcome; onReset: () => void }) {
  const tts = useTts();
  const parts = useMemo(() => chunkText(outcome.text), [outcome.text]);
  const wantLang = bcp47ForLang(outcome.lang);

  const matching = tts.voices.filter((v) => v.lang.toLowerCase().startsWith(wantLang));
  const voiceList = matching.length ? matching : tts.voices;
  const [voiceURI, setVoiceURI] = useState('');
  const [rate, setRate] = useState(1);

  // Default to the first voice for the document's language once voices load.
  useEffect(() => {
    if (!voiceURI && voiceList.length) setVoiceURI(voiceList[0].voiceURI);
  }, [voiceURI, voiceList]);

  const activeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [tts.chunk]);

  function primary() {
    if (tts.status === 'speaking') tts.pause();
    else if (tts.status === 'paused') tts.resume();
    else tts.speak(outcome.text, { voiceURI, rate });
  }

  function changeVoice(uri: string) {
    setVoiceURI(uri);
    if (tts.status !== 'idle') tts.jumpTo(Math.max(0, tts.chunk), { voiceURI: uri });
  }
  function changeRate(r: number) {
    setRate(r);
    if (tts.status !== 'idle') tts.jumpTo(Math.max(0, tts.chunk), { rate: r });
  }

  if (!tts.supported) {
    return (
      <div className="space-y-4">
        <Notice tone="warn">
          This browser has no speech engine, so it can’t read the document aloud. The text was
          still recognised — you can download the searchable PDF below.
        </Notice>
        <TextBlock parts={parts} active={-1} />
        <Footer outcome={outcome} onReset={onReset} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {tts.error && <Notice tone="warn">{tts.error}</Notice>}

      <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-900/30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={primary}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
            aria-label={tts.status === 'speaking' ? 'Pause' : 'Play'}
          >
            {tts.status === 'speaking' ? (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-brand-800 dark:text-brand-200">
              {tts.status === 'speaking'
                ? 'Reading…'
                : tts.status === 'paused'
                  ? 'Paused'
                  : 'Ready to read'}
            </p>
            <p className="text-sm text-ink-500 dark:text-white/60">
              {tts.chunk >= 0 ? `Part ${tts.chunk + 1} of ${parts.length}` : `${parts.length} parts`}
            </p>
          </div>
          {tts.status !== 'idle' && (
            <button
              type="button"
              onClick={tts.stop}
              className="shrink-0 rounded-lg border border-brand-300 px-3 py-1.5 text-sm font-semibold text-brand-700 dark:border-brand-700 dark:text-brand-300"
            >
              Stop
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink-700 dark:text-white/80">
            Voice
            <select
              value={voiceURI}
              onChange={(e) => changeVoice(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm font-normal dark:border-white/15 dark:bg-white/10"
            >
              {voiceList.length === 0 && <option value="">System default</option>}
              {voiceList.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm font-semibold text-ink-700 dark:text-white/80">
            Speed
            <div className="mt-1.5 flex gap-1.5">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => changeRate(r)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium ${
                    rate === r
                      ? 'border-brand-500 bg-white text-brand-800 dark:bg-white/10 dark:text-brand-200'
                      : 'border-paper-200 dark:border-white/15'
                  }`}
                >
                  {r}×
                </button>
              ))}
            </div>
          </div>
        </div>

        {matching.length === 0 && (
          <p className="text-xs text-ink-500 dark:text-white/50">
            No voice for this language is installed on your device — it will read with the default
            voice. You can add one in your system’s language or accessibility settings.
          </p>
        )}
      </div>

      <TextBlock parts={parts} active={tts.chunk} activeRef={activeRef} onJump={(i) => tts.jumpTo(i)} />

      <Footer outcome={outcome} onReset={onReset} />
    </div>
  );
}

function TextBlock({
  parts,
  active,
  activeRef,
  onJump,
}: {
  parts: string[];
  active: number;
  activeRef?: React.RefObject<HTMLSpanElement | null>;
  onJump?: (i: number) => void;
}) {
  return (
    <div className="max-h-96 overflow-auto rounded-2xl border border-paper-200 bg-white p-4 text-sm leading-relaxed dark:border-white/10 dark:bg-white/5">
      {parts.map((p, i) => (
        <span
          key={i}
          ref={i === active ? activeRef : undefined}
          onClick={onJump ? () => onJump(i) : undefined}
          className={`${onJump ? 'cursor-pointer ' : ''}rounded px-0.5 ${
            i === active
              ? 'bg-brand-200 text-ink-900 dark:bg-brand-500/40 dark:text-white'
              : 'text-ink-700 dark:text-white/70'
          }`}
        >
          {p}{' '}
        </span>
      ))}
    </div>
  );
}

function Footer({ outcome, onReset }: { outcome: OcrOutcome; onReset: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SaveAs blob={outcome.pdf} defaultName="document-ocr.pdf" variant="inline" label="Searchable PDF" />
      <button
        type="button"
        onClick={onReset}
        className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        Start over
      </button>
    </div>
  );
}
