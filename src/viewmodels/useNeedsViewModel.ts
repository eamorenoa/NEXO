import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { Need } from '../models/Need';
import { NeedService } from '../services/NeedService';

export function useNeedsViewModel(token?: string) {
  const [items, setItems] = useState<Need[]>([]);
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }

    setLoading(true);

    try {
      setItems(await NeedService.list(token));
      setError('');
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!token) {
      setError('Inicie sesión para publicar una necesidad.');
      return;
    }

    if (description.trim().length < 5) {
      setError('Describa la necesidad con un poco más de detalle.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const created = await NeedService.create(token, description.trim());

      setItems(current => [created, ...current]);
      setDescription('');
      setSuccess(
        `NEXO AI la clasificó como: ${created.ai_category || created.category
        }.`,
      );
    } catch (e: any) {
      setError(e.message || 'No se pudo publicar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (item: Need) => {
    if (!item.is_owner) {
      setError('Solo puede editar sus propias solicitudes.');
      return;
    }

    setEditingId(item.id);
    setDescription(item.description);
    setError('');
    setSuccess('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDescription('');
    setError('');
  };

  const saveEditing = async () => {
    if (!token || editingId === null) {
      return;
    }

    if (description.trim().length < 5 || description.trim().length > 1000) {
      setError('La descripción debe tener entre 5 y 1000 caracteres.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updated = await NeedService.update(
        token,
        editingId,
        description.trim(),
      );

      setItems(current =>
        current.map(item =>
          item.id === editingId
            ? { ...item, ...updated, is_owner: true }
            : item,
        ),
      );

      setEditingId(null);
      setDescription('');
      setSuccess('Solicitud actualizada correctamente.');
    } catch (e: any) {
      setError(e.message || 'No se pudo actualizar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const remove = (item: Need) => {
    if (!item.is_owner) {
      setError('Solo puede eliminar sus propias solicitudes.');
      return;
    }

    const confirmDelete = async () => {
      if (!token) {
        setError('Debe iniciar sesión para eliminar esta solicitud.');
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');

      try {
        await NeedService.delete(token, item.id);

        setItems(current =>
          current.filter(currentItem => currentItem.id !== item.id)
        );

        if (editingId === item.id) {
          setEditingId(null);
          setDescription('');
        }

        setSuccess('Solicitud eliminada correctamente.');
      } catch (e: any) {
        setError(e.message || 'No se pudo eliminar la solicitud.');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        '¿Está seguro de que desea eliminar esta solicitud? Esta acción no se puede deshacer.'
      );

      if (confirmed) {
        void confirmDelete();
      }

      return;
    }

    Alert.alert(
      'Eliminar solicitud',
      '¿Está seguro de que desea eliminar esta solicitud? Esta acción no se puede deshacer.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void confirmDelete();
          },
        },
      ]
    );
  };

  return {
    items,
    description,
    setDescription,
    loading,
    error,
    success,
    editingId,
    create,
    startEditing,
    cancelEditing,
    saveEditing,
    remove,
    reload: load,
  };
}