import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { orderQueryKeys } from '../queries/orderQueryKeys';
import type { OrderSocketEvent, OrderSocketPayload } from '../types/socket';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

const WS_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(
    /^http/,
    'ws',
);
const MAX_RETRY_DELAY_MS = 30_000;

function isSocketPayload(value: unknown): value is OrderSocketPayload {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const payload = value as Partial<OrderSocketPayload>;
    return (
        typeof payload.order_id === 'number' &&
        typeof payload.order_number === 'number' &&
        typeof payload.status === 'string' &&
        typeof payload.table_label === 'string' &&
        typeof payload.item_count === 'number'
    );
}

function isOrderSocketEvent(value: unknown): value is OrderSocketEvent {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const event = value as { type?: unknown; data?: unknown };
    return (
        (event.type === 'NEW_ORDER' || event.type === 'ORDER_UPDATED') &&
        isSocketPayload(event.data)
    );
}

export function useOrderSocket(companyId: string) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<WsStatus>(
        companyId ? 'connecting' : 'disconnected',
    );
    const [lastEvent, setLastEvent] = useState<OrderSocketEvent | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const retryDelayRef = useRef(1000);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(false);

    const connect = useCallback(() => {
        if (!isMountedRef.current || !companyId) {
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) {
            setStatus('disconnected');
            return;
        }

        setStatus('connecting');
        const url = `${WS_BASE_URL}/api/kitchen/ws/${companyId}?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!isMountedRef.current) {
                return;
            }

            setStatus('connected');
            retryDelayRef.current = 1000;
        };

        ws.onmessage = (event) => {
            if (!isMountedRef.current) {
                return;
            }

            try {
                const data: unknown = JSON.parse(event.data);
                if (!isOrderSocketEvent(data)) {
                    return;
                }

                setLastEvent(data);
                void queryClient.invalidateQueries({
                    queryKey: orderQueryKeys.company(companyId),
                });
            } catch {
                // Ignorar mensajes mal formados.
            }
        };

        ws.onerror = () => {
            // El cierre y el reintento se manejan en onclose.
        };

        ws.onclose = () => {
            if (!isMountedRef.current) {
                return;
            }

            setStatus('disconnected');
            wsRef.current = null;

            const delay = retryDelayRef.current;
            retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
            retryTimerRef.current = setTimeout(connect, delay);
        };
    }, [companyId, queryClient]);

    useEffect(() => {
        isMountedRef.current = true;
        setLastEvent(null);

        if (companyId) {
            connect();
        } else {
            setStatus('disconnected');
        }

        return () => {
            isMountedRef.current = false;
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
            }
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        };
    }, [companyId, connect]);

    return { status, lastEvent };
}
