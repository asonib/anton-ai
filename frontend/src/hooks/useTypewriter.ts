import { useEffect, useState } from 'react';

export interface TypewriterOptions {
  /** ms per typed character */
  typeSpeed?: number;
  /** ms per deleted character (backspace) */
  deleteSpeed?: number;
  /** ms the full phrase stays on screen before backspacing */
  holdDelay?: number;
  /** ms pause on an empty line before typing the next phrase */
  pauseDelay?: number;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Cycles through `phrases` forever: types one out, holds, backspaces it, then types the next.
 * With `prefers-reduced-motion`, phrases swap whole instead of being typed.
 */
export function useTypewriter(phrases: readonly string[], options: TypewriterOptions = {}): string {
  const { typeSpeed = 55, deleteSpeed = 30, holdDelay = 5000, pauseDelay = 400 } = options;
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const phrase = phrases.length > 0 ? phrases[index % phrases.length] : '';

  useEffect(() => {
    if (phrases.length === 0) return undefined;

    if (prefersReducedMotion()) {
      setText(phrase);
      const id = window.setTimeout(() => setIndex((i) => (i + 1) % phrases.length), holdDelay + 1500);
      return () => window.clearTimeout(id);
    }

    let delay: number;
    let step: () => void;

    if (!deleting && text === phrase) {
      if (phrases.length === 1) return undefined; // nothing to cycle to — keep it on screen
      delay = holdDelay;
      step = () => setDeleting(true);
    } else if (deleting && text === '') {
      delay = pauseDelay;
      step = () => {
        setDeleting(false);
        setIndex((i) => (i + 1) % phrases.length);
      };
    } else if (deleting) {
      delay = deleteSpeed;
      step = () => setText((t) => t.slice(0, -1));
    } else {
      delay = typeSpeed;
      step = () => setText(phrase.slice(0, text.length + 1));
    }

    const id = window.setTimeout(step, delay);
    return () => window.clearTimeout(id);
  }, [text, deleting, phrase, phrases.length, typeSpeed, deleteSpeed, holdDelay, pauseDelay]);

  return text;
}
