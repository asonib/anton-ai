import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { markdownToSpeech, splitForSpeech } from '../utils/speech';

/* ------------------------------------------------------------------ */
/*  Module-level store: the browser has ONE speech queue, so only one  */
/*  message may be speaking at a time across the whole app.            */
/* ------------------------------------------------------------------ */

let speakingId: string | null = null;
let session = 0; // bumped on every stop/start so stale utterance events are ignored
let liveUtterances: SpeechSynthesisUtterance[] = []; // keep refs: Chromium GCs them and drops `onend`
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => speakingId;

const setSpeakingId = (id: string | null) => {
  if (speakingId === id) return;
  speakingId = id;
  listeners.forEach((l) => l());
};

const isSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

/* ------------------------------------------------------------------ */
/*  Voice selection — prefer a female voice                            */
/* ------------------------------------------------------------------ */

/**
 * The Web Speech API does not expose a voice's gender, so we match on the names browsers / OSes
 * ship (Windows/Edge, macOS/iOS, Chrome, Android). Ordered roughly by quality.
 */
const FEMALE_VOICE_PATTERN = new RegExp(
  `\\b(${[
    'female', 'woman',
    // Microsoft (Windows + Edge online "Natural" voices)
    'aria', 'jenny', 'zira', 'sonia', 'libby', 'maisie', 'natasha', 'clara', 'emily', 'hazel', 'susan',
    'catherine', 'heera', 'neerja', 'kalpana', 'swara', 'michelle', 'ana', 'ava', 'emma', 'sara', 'nanami',
    // Apple
    'samantha', 'karen', 'moira', 'tessa', 'veena', 'fiona', 'victoria', 'allison', 'kate',
    'serena', 'zoe', 'nicky', 'joana', 'amelie', 'anna', 'alice', 'paulina', 'monica', 'kyoko',
    // Google (Chrome desktop "Google US English" is a female voice)
    'google us english', 'google uk english female',
  ].join('|')})\\b`,
  'i',
);
// `\bmale\b` does not match inside "Female", so this safely rejects "Google UK English Male" etc.
const MALE_VOICE_PATTERN = /\b(male|man|david|mark|george|guy|ryan|daniel|alex|fred|thomas|ravi|prabhat|rishi|aaron|arthur|oliver)\b/i;

let cachedVoice: SpeechSynthesisVoice | null | undefined; // undefined = not resolved yet

function scoreVoice(voice: SpeechSynthesisVoice, lang: string): number {
  const name = voice.name;
  if (!FEMALE_VOICE_PATTERN.test(name) || MALE_VOICE_PATTERN.test(name)) return -1;

  const voiceLang = voice.lang.toLowerCase().replace('_', '-');
  const wanted = lang.toLowerCase();
  let score = 1;
  if (voiceLang === wanted) score += 40;
  else if (voiceLang.split('-')[0] === wanted.split('-')[0]) score += 25;
  else if (voiceLang.startsWith('en')) score += 10;
  if (/natural|neural|online|enhanced|premium/i.test(name)) score += 8; // higher-quality voices
  if (voice.localService) score += 1;
  return score;
}

function pickFemaleVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null; // not loaded yet — don't cache, try again next time

  const lang = navigator.language || 'en-US';
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = 0;
  for (const voice of voices) {
    const score = scoreVoice(voice, lang);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  cachedVoice = best; // null → no female voice installed; fall back to the browser default
  return best;
}

// Voices load asynchronously (Chrome/Edge): warm the list up and re-pick when it changes.
if (isSupported()) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = undefined;
  });
}

function stopSpeaking() {
  session += 1;
  liveUtterances = [];
  if (isSupported()) window.speechSynthesis.cancel();
  setSpeakingId(null);
}

function startSpeaking(id: string, markdown: string) {
  stopSpeaking();
  const chunks = splitForSpeech(markdownToSpeech(markdown));
  if (chunks.length === 0) return;

  const synth = window.speechSynthesis;
  const mySession = session;
  const voice = pickFemaleVoice();
  const lang = voice?.lang ?? (navigator.language || 'en-US');

  liveUtterances = chunks.map((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = lang;
    if (voice) utterance.voice = voice;
    if (index === chunks.length - 1) {
      utterance.onend = () => {
        if (session === mySession) {
          liveUtterances = [];
          setSpeakingId(null);
        }
      };
    }
    utterance.onerror = (event) => {
      if (session !== mySession) return;
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      stopSpeaking();
    };
    return utterance;
  });

  setSpeakingId(id);
  if (synth.paused) synth.resume(); // Chromium can get stuck paused after tab switches
  liveUtterances.forEach((u) => synth.speak(u));
}

/**
 * Read a message aloud with the browser's built-in speech synthesis (Web Speech API).
 *
 *  - `toggle(markdown)` starts reading (stopping any other message) or stops this one.
 *  - Markdown is converted to plain prose; fenced code blocks are announced, not read.
 *  - Speech stops automatically if the message unmounts (conversation switch, logout).
 *
 * Works in all modern browsers and, unlike speech recognition, does not need https.
 */
export function useTextToSpeech(id: string) {
  const supported = isSupported();
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const speaking = current === id;

  const toggle = useCallback(
    (markdown: string) => {
      if (!isSupported()) return;
      if (getSnapshot() === id) stopSpeaking();
      else startSpeaking(id, markdown);
    },
    [id],
  );

  const stop = useCallback(() => {
    if (getSnapshot() === id) stopSpeaking();
  }, [id]);

  useEffect(
    () => () => {
      if (getSnapshot() === id) stopSpeaking();
    },
    [id],
  );

  return { supported, speaking, toggle, stop };
}
