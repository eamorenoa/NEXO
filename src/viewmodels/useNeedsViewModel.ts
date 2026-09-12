import { useCallback, useEffect, useState } from 'react';
import { Need } from '../models/Need';
import { NeedService } from '../services/NeedService';
export function useNeedsViewModel(token?: string) {
  const [items, setItems] = useState<Need[]>([]); const [description, setDescription] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const load = useCallback(async () => { if (!token) return; setLoading(true); try { setItems(await NeedService.list(token)); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const create = async () => { if (!token || description.trim().length < 5) return setError('Describe la necesidad con un poco más de detalle.'); setLoading(true); setError(''); setSuccess(''); try { const created = await NeedService.create(token, description); setItems(v => [created, ...v]); setDescription(''); setSuccess(`NEXO AI la clasificó como: ${created.ai_category || created.category}.`); } catch (e: any) { setError(e.message); } finally { setLoading(false); } };
  return { items, description, setDescription, loading, error, success, create, reload: load };
}
