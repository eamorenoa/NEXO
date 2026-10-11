import { useCallback, useEffect, useState } from 'react';
import {
  CommunityPost,
  CommunityPostType,
} from '../models/CommunityPost';
import { CommunityService } from '../services/CommunityService';

export function useCommunityViewModel(token?: string) {
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [postType, setPostType] =
    useState<CommunityPostType>('activity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      setItems(await CommunityService.list(token));
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'No fue posible cargar las publicaciones.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!token) {
      setError('Inicie sesión para publicar.');
      return;
    }

    if (body.trim().length < 3) {
      setError('Escriba al menos 3 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const post = await CommunityService.create(token, {
        body: body.trim(),
        post_type: postType,
        title: title.trim() || undefined,
        category: category.trim() || undefined,
      });

      setItems((current) => [post, ...current]);
      setBody('');
      setTitle('');
      setCategory('');
      setPostType('activity');
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'No fue posible crear la publicación.',
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    body,
    setBody,
    title,
    setTitle,
    category,
    setCategory,
    postType,
    setPostType,
    loading,
    error,
    create,
    reload: load,
  };
}
