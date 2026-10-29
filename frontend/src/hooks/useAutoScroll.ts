import { RefObject, useEffect, useRef } from 'react';

/** Keeps a scroll container pinned to the bottom when `deps` change (unless the user scrolled up). */
export function useAutoScroll<T extends HTMLElement>(ref: RefObject<T>, deps: unknown[]) {
  const pinned = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    forceScroll: () => {
      pinned.current = true;
      const el = ref.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    },
  };
}
