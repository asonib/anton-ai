import { useCallback, useEffect, useMemo, useState } from 'react';
import { chatApi } from '../api/chatApi';
import type { Skill } from '../api/types';
import { storage } from '../utils/storage';

/**
 * Skills catalogue (from `GET /skills`) + the user's current pick, persisted in localStorage.
 * `activeSkill === null` means the general assistant.
 */
export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(storage.getSkill);

  useEffect(() => {
    let cancelled = false;
    chatApi
      .listSkills()
      .then((list) => {
        if (!cancelled) setSkills(list);
      })
      .catch(() => undefined) // the launcher simply stays hidden
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Forget a saved skill that the server no longer offers.
  useEffect(() => {
    if (loaded && selectedId && !skills.some((s) => s.id === selectedId)) {
      setSelectedId(null);
      storage.setSkill(null);
    }
  }, [loaded, skills, selectedId]);

  const selectSkill = useCallback((id: string | null) => {
    storage.setSkill(id);
    setSelectedId(id);
  }, []);

  const activeSkill = useMemo(() => skills.find((s) => s.id === selectedId) ?? null, [skills, selectedId]);

  return { skills, activeSkill, selectSkill };
}
