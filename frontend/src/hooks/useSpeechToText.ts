import { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Minimal Web Speech API typings (not shipped in lib.dom yet)        */
/* ------------------------------------------------------------------ */

interface RecognitionResultEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface RecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onresult: ((ev: RecognitionResultEvent) => void) | null;
  onerror: ((ev: RecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

const getRecognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': "Microphone access was blocked. Allow it from the site settings (lock icon in the address bar) and try again.",
  'service-not-allowed': 'Speech recognition is disabled in this browser.',
  'audio-capture': 'No microphone was found. Connect one and try again.',
  network: "The browser's speech service could not be reached. Check your connection.",
  'language-not-supported': 'Speech recognition does not support your browser language.',
};

/** Join the text that was in the box before dictation with what has been spoken. */
const joinText = (base: string, spoken: string) => {
  if (!spoken) return base;
  if (!base) return spoken;
  return /\s$/.test(base) ? base + spoken : `${base} ${spoken}`;
};

/**
 * Browser dictation (Web Speech API) that writes into a controlled text value.
 *
 *  - `toggle()` starts / stops listening. Text already in the box is kept; speech is appended.
 *  - Interim (not yet final) words are shown live and replaced as the browser refines them.
 *  - `cancel()` stops immediately and ignores late results (use before sending or when the user types).
 *
 * Supported in Chromium browsers (Chrome, Edge, Opera…) and Safari. Requires a secure context
 * (https or http://localhost) — the browser asks for microphone permission on first use.
 */
export function useSpeechToText(value: string, onChange: (next: string) => void) {
  const supported = getRecognitionCtor() !== null && window.isSecureContext;
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<Recognition | null>(null);
  const baseRef = useRef('');
  const activeRef = useRef(false); // false → ignore any late `result` events
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const cancel = useCallback(() => {
    activeRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const stop = useCallback(() => {
    // Keep `activeRef` true so the final result the browser flushes on stop is still applied.
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recognitionRef.current?.abort();

    const rec = new Ctor();
    rec.lang = navigator.language || 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    baseRef.current = valueRef.current;
    activeRef.current = true;
    setError(null);

    rec.onstart = () => setListening(true);
    rec.onresult = (event) => {
      if (!activeRef.current || recognitionRef.current !== rec) return;
      // Rebuild the whole utterance each time: finalised segments first, then the live interim guess.
      const segments: string[] = [];
      for (let i = 0; i < event.results.length; i++) segments.push(event.results[i][0]?.transcript ?? '');
      onChangeRef.current(joinText(baseRef.current, segments.join(' ').replace(/\s+/g, ' ').trim()));
    };
    rec.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return; // user cancelled / silence
      setError(ERROR_MESSAGES[event.error] ?? `Voice input failed (${event.error}).`);
    };
    rec.onend = () => {
      if (recognitionRef.current === rec) recognitionRef.current = null;
      activeRef.current = false;
      setListening(false);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
      activeRef.current = false;
      setError('Voice input could not be started. Try again.');
    }
  }, []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  // Never leave the microphone open after the composer unmounts.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return {
    supported,
    listening,
    error,
    toggle,
    stop,
    cancel,
    dismissError: useCallback(() => setError(null), []),
  };
}
