import { useCallback, useEffect, useRef, useState } from 'react';
import { aiRepoApi } from '../api/aiRepoApi';
import type { AiRepoList } from '../api/types';
import { toNormalisedError, type NormalisedError } from '../utils/errors';

/**
 * Top 10 AI repos on GitHub for the selected category. Nothing is fetched until `open` is true;
 * results are kept per category for the session (the server caches GitHub for an hour anyway).
 */
export function useAiRepos(open: boolean) {
  const [category, setCategory] = useState<string | null>(null);
  const [lists, setLists] = useState<Record<string, AiRepoList>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<NormalisedError | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (cat: string | null) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const list = await aiRepoApi.list(cat ?? undefined);
      if (id !== requestId.current) return;
      setLists((m) => ({ ...m, [list.category]: list }));
      setCategory(list.category);
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError(toNormalisedError(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const list = category ? (lists[category] ?? null) : null;
  // Snapshot/stale lists are re-requested on every open so they recover once GitHub is reachable.
  const usable = Boolean(list && (list.source === 'live' || list.source === 'cache'));

  useEffect(() => {
    if (open && !usable) void load(category);
  }, [open, category, usable, load]);

  const selectCategory = useCallback((id: string) => setCategory(id), []);

  return {
    category,
    categories: list?.categories ?? Object.values(lists)[0]?.categories ?? [],
    list,
    loading,
    error,
    dismissError: () => setError(null),
    selectCategory,
    refresh: () => void load(category),
  };
}

export type AiReposState = ReturnType<typeof useAiRepos>;
