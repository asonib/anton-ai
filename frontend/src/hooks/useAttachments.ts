import { useCallback, useEffect, useRef, useState } from 'react';
import type { Attachment, AttachmentKind } from '../api/types';
import { ATTACHMENT_LIMITS, classifyFile, formatBytes } from '../config/attachments';

/** A file chosen in the composer but not yet sent. */
export interface PendingAttachment {
  id: string;
  file: File;
  kind: AttachmentKind;
  /** Object URL for image thumbnails (revoked via `release`). */
  previewUrl: string | null;
}

/** An attachment as rendered in a message (server copy, or optimistic with a local preview). */
export interface DisplayAttachment extends Attachment {
  /** Object URL for optimistic (not yet uploaded) images. */
  localUrl?: string;
}

let seq = 0;
const nextId = () => `att-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/**
 * Composer attachment state: add (picker / drop / paste), remove, and hand-off to the send flow.
 * Validation here is for instant feedback only — the API is authoritative.
 */
export function useAttachments() {
  const [items, setItems] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Revoke any previews still held when the composer unmounts.
  useEffect(() => () => itemsRef.current.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl)), []);

  const add = useCallback((incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    if (files.length === 0) return;
    const problems: string[] = [];
    const accepted: PendingAttachment[] = [];
    const current = itemsRef.current;

    for (const file of files) {
      const kind = classifyFile(file);
      if (!kind) {
        problems.push(`"${file.name}" isn't a supported file type`);
        continue;
      }
      if (file.size === 0) {
        problems.push(`"${file.name}" is empty`);
        continue;
      }
      if (file.size > ATTACHMENT_LIMITS.maxFileBytes) {
        problems.push(`"${file.name}" is larger than ${formatBytes(ATTACHMENT_LIMITS.maxFileBytes)}`);
        continue;
      }
      if ([...current, ...accepted].some((i) => sameFile(i.file, file))) continue; // silently de-dupe
      if (current.length + accepted.length >= ATTACHMENT_LIMITS.maxFiles) {
        problems.push(`You can attach up to ${ATTACHMENT_LIMITS.maxFiles} files per message`);
        break;
      }
      accepted.push({ id: nextId(), file, kind, previewUrl: kind === 'image' ? URL.createObjectURL(file) : null });
    }

    if (accepted.length) setItems((list) => [...list, ...accepted]);
    setError(problems.length ? problems.join(' · ') : null);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((list) => {
      const target = list.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return list.filter((i) => i.id !== id);
    });
  }, []);

  /** Clear the tray WITHOUT revoking previews — the optimistic message still shows them. */
  const detach = useCallback(() => setItems([]), []);

  /** Put items back after a failed send. */
  const restore = useCallback((restored: PendingAttachment[]) => setItems(restored), []);

  /** Free preview URLs once the server copy has replaced the optimistic message. */
  const release = useCallback((released: PendingAttachment[]) => {
    released.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
  }, []);

  return {
    items,
    error,
    add,
    remove,
    detach,
    restore,
    release,
    dismissError: useCallback(() => setError(null), []),
  };
}
