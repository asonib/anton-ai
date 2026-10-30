import { useCallback, useEffect, useRef, useState } from 'react';
import { promptApi } from '../api/promptApi';
import type { LibraryPrompt, PromptCategory, PromptDraft, PromptScope } from '../api/types';
import { toNormalisedError, type NormalisedError } from '../utils/errors';

const SEARCH_DEBOUNCE_MS = 250;

/**
 * State for the shared prompt library: filters (search / scope / category), the matching prompts and
 * CRUD + favourite actions. Nothing is fetched until `open` is true; filters survive closing.
 */
export function usePromptLibrary(open: boolean) {
  const [categories, setCategories] = useState<PromptCategory[]>([]);
  const [prompts, setPrompts] = useState<LibraryPrompt[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scope, setScope] = useState<PromptScope>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<NormalisedError | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open || categories.length > 0) return;
    promptApi
      .listCategories()
      .then(setCategories)
      .catch(() => undefined); // cards fall back to the raw category id
  }, [open, categories.length]);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const { items, total: count } = await promptApi.list({ search: debouncedSearch, scope, category: category ?? undefined });
      if (id !== requestId.current) return; // a newer filter won
      setPrompts(items);
      setTotal(count);
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError(toNormalisedError(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [debouncedSearch, scope, category]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  /** Optimistic heart toggle; reverted if the request fails. */
  const toggleFavorite = useCallback(
    async (prompt: LibraryPrompt) => {
      const next = !prompt.isFavorite;
      const patch = (p: LibraryPrompt): LibraryPrompt =>
        p.id === prompt.id ? { ...p, isFavorite: next, favoriteCount: Math.max(0, p.favoriteCount + (next ? 1 : -1)) } : p;
      setPrompts((list) => list.map(patch));
      try {
        const saved = await promptApi.setFavorite(prompt.id, next);
        setPrompts((list) =>
          scope === 'favorites' && !saved.isFavorite ? list.filter((p) => p.id !== saved.id) : list.map((p) => (p.id === saved.id ? saved : p)),
        );
        if (scope === 'favorites' && !saved.isFavorite) setTotal((t) => Math.max(0, t - 1));
      } catch (e) {
        setPrompts((list) => list.map((p) => (p.id === prompt.id ? prompt : p)));
        setError(toNormalisedError(e));
      }
    },
    [scope],
  );

  /** Create or update. Throws a NormalisedError so the editor can show it inline. */
  const save = useCallback(
    async (draft: PromptDraft, id?: string): Promise<LibraryPrompt> => {
      try {
        const saved = id ? await promptApi.update(id, draft) : await promptApi.create(draft);
        await refresh();
        return saved;
      } catch (e) {
        throw toNormalisedError(e);
      }
    },
    [refresh],
  );

  const remove = useCallback(async (prompt: LibraryPrompt) => {
    try {
      await promptApi.remove(prompt.id);
      setPrompts((list) => list.filter((p) => p.id !== prompt.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setError(toNormalisedError(e));
    }
  }, []);

  return {
    categories,
    prompts,
    total,
    search,
    setSearch,
    /** True while the typed search hasn't been applied yet or a request is in flight. */
    searching: search.trim() !== debouncedSearch,
    scope,
    setScope,
    category,
    setCategory,
    loading,
    error,
    dismissError: () => setError(null),
    toggleFavorite,
    save,
    remove,
  };
}
