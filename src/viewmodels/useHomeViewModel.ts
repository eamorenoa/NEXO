import { useCallback, useEffect, useState } from 'react';
import { Need } from '../models/Need';
import { CommunityPost } from '../models/CommunityPost';
import { NeedService } from '../services/NeedService';
import { CommunityService } from '../services/CommunityService';

export function useHomeViewModel(token: string) {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const [needsResult, postsResult] = await Promise.all([
        NeedService.list(token),
        CommunityService.list(token),
      ]);

      setNeeds(needsResult);
      setPosts(postsResult);
    } catch (err) {
      console.error('Error cargando el resumen de inicio:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    needs,
    posts,
    loading,
    error,
    reload: load,
  };
}
