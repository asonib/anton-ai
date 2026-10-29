import { useCallback, useEffect, useRef, useState } from 'react';

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for non-secure contexts (e.g. LAN IP over http)
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  if (!ok) throw new Error('Copy command was rejected');
}

/** Copies text and exposes a transient `copied` flag for "Copied!" feedback. */
export function useCopyToClipboard(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      window.clearTimeout(timer.current);
      try {
        await writeClipboard(text);
        setFailed(false);
        setCopied(true);
        timer.current = window.setTimeout(() => setCopied(false), resetAfterMs);
        return true;
      } catch {
        setFailed(true);
        timer.current = window.setTimeout(() => setFailed(false), resetAfterMs);
        return false;
      }
    },
    [resetAfterMs],
  );

  return { copied, failed, copy };
}
