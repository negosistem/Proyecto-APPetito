/**
 * useKitchenSocket.ts
 * Hook personalizado para la conexión WebSocket del módulo de cocina.
 * - Conecta con autenticación JWT via query param
 * - Reconexión automática con backoff exponencial (1s → 2s → 4s → ... → 30s)
 * - Expone estado de conexión para mostrar indicador visual
 * - Multi-tenant: el servidor filtra por id_empresa del token
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

interface UseKitchenSocketOptions {
    /** Callback que se dispara cada vez que el servidor envía un evento kanban_update */
    onUpdate: () => void;
}

const WS_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
    .replace(/^http/, 'ws'); // http → ws, https → wss

const MAX_RETRY_DELAY_MS = 30_000;

export function useKitchenSocket({ onUpdate }: UseKitchenSocketOptions) {
    const [status, setStatus] = useState<WsStatus>('connecting');
    const wsRef = useRef<WebSocket | null>(null);
    const retryDelayRef = useRef<number>(1000);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!isMountedRef.current) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            setStatus('disconnected');
            return;
        }

        setStatus('connecting');
        const url = `${WS_BASE_URL}/api/kitchen/ws?token=${token}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!isMountedRef.current) return;
            setStatus('connected');
            retryDelayRef.current = 1000; // reset backoff al reconectar
        };

        ws.onmessage = (event) => {
            if (!isMountedRef.current) return;
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'kanban_update') {
                    onUpdate(); // Refrescar el kanban
                }
            } catch {
                // Ignorar mensajes mal formados
            }
        };

        ws.onerror = () => {
            // El navegador cerrará el socket después del error; manejamos en onclose
        };

        ws.onclose = () => {
            if (!isMountedRef.current) return;
            setStatus('disconnected');
            wsRef.current = null;

            // Reintentar con backoff exponencial
            const delay = retryDelayRef.current;
            retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
            retryTimerRef.current = setTimeout(connect, delay);
        };
    }, [onUpdate]);

    useEffect(() => {
        isMountedRef.current = true;
        connect();

        return () => {
            // Cleanup: desconectar al desmontar el componente
            isMountedRef.current = false;
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // evitar re-reconexión en cleanup
                wsRef.current.close();
            }
        };
    }, [connect]);

    return { status };
}
