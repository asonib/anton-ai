import { useEffect, useState } from 'react';
import { chatApi } from '../api/chatApi';

/**
 * Stored attachments need the JWT, so <img src> can't point at the API directly.
 * We fetch the blob once per attachment id and share the object URL for the session.
 */
const cache = new Map<string, Promise<string>>();

export function loadAttachmentUrl(attachmentId: string): Promise<string> {
  let pending = cache.get(attachmentId);
  if (!pending) {
    pending = chatApi.getAttachmentBlob(attachmentId).then((blob) => URL.createObjectURL(blob));
    pending.catch(() => cache.delete(attachmentId)); // allow a retry after failures
    cache.set(attachmentId, pending);
  }
  return pending;
}

/** Object URL for an attachment (or `localUrl` for optimistic, not-yet-uploaded files). */
export function useAttachmentUrl(attachmentId: string | null, localUrl?: string) {
  const [url, setUrl] = useState<string | null>(localUrl ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (localUrl) {
      setUrl(localUrl);
      return;
    }
    if (!attachmentId) return;
    let alive = true;
    setFailed(false);
    loadAttachmentUrl(attachmentId)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attachmentId, localUrl]);

  return { url, failed };
}
