import { useState } from 'react';
import { AIService } from '../services/AIService';
import { AIResponse } from '../models/AIResponse';

export function useAIViewModel(token?: string) {
    const [message, setMessage] = useState('');
    const [response, setResponse] = useState<AIResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const ask = async () => {
        const cleanMessage = message.trim();

        if (loading) return;

        if (!token) {
            setError('Inicie sesión para utilizar NEXO AI.');
            return;
        }

        if (cleanMessage.length < 3) {
            setError('Escriba una consulta un poco más detallada.');
            return;
        }

        setLoading(true);
        setError('');
        setResponse(null);

        try {
            const result = await AIService.ask(token, cleanMessage);
            setResponse(result);
        } catch (e: any) {
            setError(
                e?.message || 'No fue posible obtener una respuesta. Inténtelo nuevamente.',
            );
        } finally {
            setLoading(false);
        }
    };

    return {
        message,
        setMessage,
        response,
        loading,
        error,
        ask,
    };
}