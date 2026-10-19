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
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setBody('');
    setTitle('');
    setCategory('');
    setPostType('activity');
    setEditingId(null);
  };

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

  const beginEdit = (post: CommunityPost) => {
    if (!post.is_owner) {
      setError('Solo puede editar sus propias publicaciones.');
      return;
    }

    setEditingId(post.id);
    setBody(post.body);
    setTitle(post.title ?? '');
    setCategory(post.category ?? '');
    setPostType(post.post_type);
    setError('');
  };

  const cancelEdit = () => {
    resetForm();
    setError('');
  };

  const save = async () => {
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

    const input = {
      body: body.trim(),
      post_type: postType,
      title: title.trim() || undefined,
      category: category.trim() || undefined,
    };

    try {
      if (editingId !== null) {
        const updated = await CommunityService.update(
          token,
          editingId,
          input,
        );

        setItems((current) =>
          current.map((item) =>
            String(item.id) === String(editingId)
              ? { ...updated, is_owner: true }
              : item,
          ),
        );
      } else {
        const created = await CommunityService.create(token, input);
        setItems((current) => [
          { ...created, is_owner: true },
          ...current,
        ]);
      }

      resetForm();
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'No fue posible guardar la publicación.',
      );
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number | string) => {
    if (!token) {
      setError('Inicie sesión para eliminar una publicación.');
      return;
    }

    const post = items.find((item) => String(item.id) === String(id));

    if (!post?.is_owner) {
      setError('Solo puede eliminar sus propias publicaciones.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await CommunityService.remove(token, id);
      setItems((current) =>
        current.filter((item) => String(item.id) !== String(id)),
      );

      if (String(editingId) === String(id)) {
        resetForm();
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'No fue posible eliminar la publicación.',
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
    editingId,
    beginEdit,
    cancelEdit,
    loading,
    error,
    save,
    remove,
    reload: load,
  };
}
