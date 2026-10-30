import { useCallback, useEffect, useRef, useState } from 'react';
import { projectApi } from '../api/projectApi';
import type { FolderListing } from '../api/types';
import { toNormalisedError, type NormalisedError } from '../utils/errors';

/** Navigation state for the workspace folder picker. Loads (or reloads) when `enabled` turns true. */
export function useFolderBrowser(enabled: boolean) {
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<NormalisedError | null>(null);
  const requestId = useRef(0);

  const open = useCallback(async (path?: string) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const next = await projectApi.browse(path);
      if (id !== requestId.current) return; // a newer navigation won
      setListing(next);
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError(toNormalisedError(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // (Re)load whenever the picker becomes visible, staying in the last opened folder.
  const lastPath = useRef<string | undefined>(undefined);
  lastPath.current = listing?.path;
  useEffect(() => {
    if (enabled) void open(lastPath.current);
  }, [enabled, open]);

  /** Reload the current folder (e.g. after a clone or a new project created a folder). */
  const refresh = useCallback(() => open(listing?.path), [open, listing?.path]);

  return { listing, loading, error, dismissError: () => setError(null), open, refresh };
}

export type FolderBrowserState = ReturnType<typeof useFolderBrowser>;
