import { useCallback, useEffect, useState } from 'react';
import { projectApi } from '../api/projectApi';
import type { ProjectChange, ProjectChangeConflict, ProjectChangeDetail } from '../api/types';
import { toNormalisedError, type NormalisedError } from '../utils/errors';

type Operation = 'apply' | 'discard' | 'revert';

/**
 * Review state for the changes proposed by one assistant message: selection, lazily loaded
 * diffs, and apply / discard / revert (with conflict reporting and "overwrite anyway").
 */
export function useProjectChanges(initial: ProjectChange[]) {
  const [changes, setChanges] = useState<ProjectChange[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.filter((c) => c.status === 'pending').map((c) => c.id)),
  );
  const [details, setDetails] = useState<Record<string, ProjectChangeDetail>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Operation | null>(null);
  const [conflicts, setConflicts] = useState<{ operation: 'apply' | 'revert'; items: ProjectChangeConflict[] } | null>(null);
  const [error, setError] = useState<NormalisedError | null>(null);

  useEffect(() => {
    setChanges(initial);
  }, [initial]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingIds((s) => new Set(s).add(id));
    try {
      const detail = await projectApi.getChange(id);
      setDetails((d) => ({ ...d, [id]: detail }));
    } catch (e) {
      setError(toNormalisedError(e));
    } finally {
      setLoadingIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const run = useCallback(async (operation: Operation, ids: string[], force = false) => {
    if (ids.length === 0) return;
    setBusy(operation);
    setError(null);
    setConflicts(null);
    try {
      const result =
        operation === 'apply'
          ? await projectApi.apply(ids, force)
          : operation === 'revert'
            ? await projectApi.revert(ids, force)
            : await projectApi.discard(ids);
      const byId = new Map(result.changes.map((c) => [c.id, c]));
      setChanges((list) => list.map((c) => byId.get(c.id) ?? c));
      // Disk state changed — drop cached diffs so they are reloaded with a fresh `diskState`.
      setDetails((d) => {
        const next = { ...d };
        ids.forEach((id) => delete next[id]);
        return next;
      });
      setSelected((s) => {
        const next = new Set(s);
        result.changes.forEach((c) => {
          if (c.status !== 'pending') next.delete(c.id);
        });
        return next;
      });
      if (result.conflicts.length > 0 && operation !== 'discard') setConflicts({ operation, items: result.conflicts });
    } catch (e) {
      setError(toNormalisedError(e));
    } finally {
      setBusy(null);
    }
  }, []);

  return {
    changes,
    selected,
    toggle,
    details,
    loadingIds,
    loadDetail,
    busy,
    conflicts,
    error,
    dismissError: () => setError(null),
    dismissConflicts: () => setConflicts(null),
    apply: (ids: string[], force = false) => run('apply', ids, force),
    discard: (ids: string[]) => run('discard', ids),
    revert: (ids: string[], force = false) => run('revert', ids, force),
  };
}
