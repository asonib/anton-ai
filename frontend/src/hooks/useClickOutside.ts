import { RefObject, useEffect } from 'react';

/** Calls `onOutside` on pointerdown outside `ref` while `active` is true. */
export function useClickOutside<T extends HTMLElement>(ref: RefObject<T>, active: boolean, onOutside: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [ref, active, onOutside]);
}
