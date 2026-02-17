import { useState, useEffect, useCallback } from 'react';

export function useDataFetch<T>(
    fetchFunction: () => Promise<T>,
    dependencies: any[] = []
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError(null);
        try {
            const result = await fetchFunction();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [fetchFunction]);

    useEffect(() => {
        refresh();
    }, dependencies);

    return { data, loading, error, refresh, setData };
}
