import { useCallback, useEffect, useState } from 'react';
import { projectApi } from '../api/projectApi';
import type { Project, ProjectDetail, ProjectsConfig } from '../api/types';
import { toNormalisedError, type NormalisedError } from '../utils/errors';

/**
 * The user's projects (list + server config) and add/remove actions. `activeId` is the project
 * attached to the chat (owned by `useChat`); its details (file count) are loaded when it changes.
 */
export function useProjects(activeId: string | null) {
  const [config, setConfig] = useState<ProjectsConfig | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'new' | 'local' | 'github' | null>(null);
  const [error, setError] = useState<NormalisedError | null>(null);
  const [details, setDetails] = useState<Record<string, ProjectDetail>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, list] = await Promise.all([projectApi.getConfig(), projectApi.list()]);
      setConfig(cfg);
      setProjects(list);
      setError(null);
    } catch (e) {
      setError(toNormalisedError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // File count etc. for the attached project (cached per id).
  useEffect(() => {
    if (!activeId || details[activeId]) return;
    let cancelled = false;
    projectApi
      .get(activeId)
      .then((d) => {
        if (!cancelled) setDetails((m) => ({ ...m, [d.id]: d }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeId, details]);

  const remember = (project: ProjectDetail) => {
    setDetails((m) => ({ ...m, [project.id]: project }));
    setProjects((list) => [project, ...list.filter((p) => p.id !== project.id)]);
  };

  /** Resolves with the new project, or null on failure (error is set). */
  const create = useCallback(async (name: string): Promise<ProjectDetail | null> => {
    setBusy('new');
    setError(null);
    try {
      const project = await projectApi.create({ name });
      remember(project);
      return project;
    } catch (e) {
      setError(toNormalisedError(e));
      return null;
    } finally {
      setBusy(null);
    }
  }, []);

  const addLocal = useCallback(async (path: string, name?: string): Promise<ProjectDetail | null> => {
    setBusy('local');
    setError(null);
    try {
      const project = await projectApi.addLocal({ path, name: name || undefined });
      remember(project);
      return project;
    } catch (e) {
      setError(toNormalisedError(e));
      return null;
    } finally {
      setBusy(null);
    }
  }, []);

  const addGithub = useCallback(async (url: string, ref?: string, name?: string): Promise<ProjectDetail | null> => {
    setBusy('github');
    setError(null);
    try {
      const project = await projectApi.addGithub({ url, ref: ref || undefined, name: name || undefined });
      remember(project);
      return project;
    } catch (e) {
      setError(toNormalisedError(e));
      return null;
    } finally {
      setBusy(null);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await projectApi.remove(id);
      setProjects((list) => list.filter((p) => p.id !== id));
      return true;
    } catch (e) {
      setError(toNormalisedError(e));
      return false;
    }
  }, []);

  const active = projects.find((p) => p.id === activeId) ?? null;

  return {
    config,
    projects,
    loading,
    busy,
    error,
    dismissError: () => setError(null),
    active,
    activeDetail: activeId ? (details[activeId] ?? null) : null,
    create,
    addLocal,
    addGithub,
    remove,
    refresh,
  };
}

export type ProjectsState = ReturnType<typeof useProjects>;
