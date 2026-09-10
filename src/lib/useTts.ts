import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * Text-to-speech via the browser's built-in SpeechSynthesis — no dependency,
 * no network, uses the voices installed on the device. The text is split into
 * short chunks and spoken one at a time so we can highlight the current chunk,
 * offer resume points, and dodge the Chrome bug where long utterances stall.
 */

export type TtsStatus = 'idle' | 'speaking' | 'paused';

export interface TtsState {
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  status: TtsStatus;
  /** Index of the chunk currently being spoken, or -1. */
  chunk: number;
  chunkCount: number;
  /** Set when the speech engine refused to play (blocked, no voice, busy). */
  error: string | null;
}

export interface TtsControls {
  speak: (text: string, opts?: { voiceURI?: string; rate?: number }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** Restart playback from a given chunk index, optionally with new options. */
  jumpTo: (chunk: number, opts?: { voiceURI?: string; rate?: number }) => void;
}

/** Break text into <=180-char pieces at sentence / whitespace boundaries. */
export function chunkText(text: string): string[] {
  const MAX = 180;
  const pieces: string[] = [];
  // Split on line breaks and after sentence punctuation (Latin + Thai « ๚ ฯ »).
  const units = text
    .replace(/\r/g, '')
    .split(/(?<=[.!?。！？\n])|(?<=[ฯๆ๚])/)
    .map((s) => s.trim())
    .filter(Boolean);

  let buf = '';
  const flush = () => {
    if (buf) pieces.push(buf);
    buf = '';
  };
  for (const unit of units) {
    if (unit.length > MAX) {
      flush();
      for (let i = 0; i < unit.length; i += MAX) pieces.push(unit.slice(i, i + MAX));
      continue;
    }
    if ((buf + ' ' + unit).trim().length > MAX) flush();
    buf = buf ? `${buf} ${unit}` : unit;
  }
  flush();
  return pieces;
}

export function useTts(): TtsState & TtsControls {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<TtsStatus>('idle');
  const [chunk, setChunk] = useState(-1);
  const [chunkCount, setChunkCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const chunksRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const optsRef = useRef<{ voiceURI?: string; rate?: number }>({});
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speakFrom = useCallback(
    (from: number) => {
      if (!supported) return;
      const chunks = chunksRef.current;
      window.speechSynthesis.cancel();
      cancelledRef.current = false;
      idxRef.current = from;

      const next = () => {
        if (cancelledRef.current) return;
        const i = idxRef.current;
        if (i >= chunks.length) {
          setStatus('idle');
          setChunk(-1);
          return;
        }
        const u = new SpeechSynthesisUtterance(chunks[i]);
        const { voiceURI, rate } = optsRef.current;
        const v = voiceURI && window.speechSynthesis.getVoices().find((x) => x.voiceURI === voiceURI);
        if (v) {
          u.voice = v;
          u.lang = v.lang;
        }
        if (rate) u.rate = rate;
        u.onstart = () => {
          setError(null);
          setStatus('speaking');
          setChunk(i);
        };
        u.onend = () => {
          if (cancelledRef.current) return;
          idxRef.current = i + 1;
          next();
        };
        u.onerror = (e) => {
          if (cancelledRef.current || e.error === 'interrupted' || e.error === 'canceled') return;
          cancelledRef.current = true;
          window.speechSynthesis.cancel();
          setStatus('idle');
          setChunk(-1);
          setError(
            e.error === 'not-allowed'
              ? 'Your device blocked speech playback. Tap Play again; it may need a direct tap.'
              : "Speech playback failed. Your device may have no voice for this language, or the audio is busy.",
          );
        };
        window.speechSynthesis.speak(u);
      };
      next();
    },
    [supported],
  );

  const speak = useCallback<TtsControls['speak']>(
    (text, opts = {}) => {
      if (!supported) return;
      setError(null);
      optsRef.current = opts;
      chunksRef.current = chunkText(text);
      setChunkCount(chunksRef.current.length);
      speakFrom(0);
    },
    [supported, speakFrom],
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setStatus('speaking');
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    setStatus('idle');
    setChunk(-1);
  }, [supported]);

  const jumpTo = useCallback<TtsControls['jumpTo']>(
    (c, opts) => {
      if (!chunksRef.current.length) return;
      if (opts) optsRef.current = { ...optsRef.current, ...opts };
      const clamped = Math.max(0, Math.min(c, chunksRef.current.length - 1));
      speakFrom(clamped);
    },
    [speakFrom],
  );

  return { supported, voices, status, chunk, chunkCount, error, speak, pause, resume, stop, jumpTo };
}
