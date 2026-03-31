/**
 * Cliente API base utilizando fetch con interceptores simulados para manejo de tokens
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

export const apiClient = {
    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { params, headers, ...customConfig } = options;

        // 1. Manejo de Query Params
        const fullUrl = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        console.log('Fetching:', fullUrl);
        const url = new URL(fullUrl);
        if (params) {
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        }

        // 2. Interceptor de Headers (Token JWT)
        const token = localStorage.getItem('access_token');
        const authHeaders: Record<string, string> = {};
        if (token) {
            authHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config: RequestInit = {
            ...customConfig,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                ...authHeaders,
                ...headers,
            },
        };

        try {
            const response = await fetch(url.toString(), config);

            // 3. Manejo de Errores de Autenticación (401)
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }

            // 4. Handle 204 No Content (DELETE success)
            if (response.status === 204) {
                return null as T;
            }

            const contentType = response.headers.get('content-type') || '';
            const isJsonResponse = contentType.includes('application/json');
            const data = isJsonResponse ? await response.json() : await response.text();

            if (!response.ok) {
                console.error('API Error Response:', data); // Log full error details
                throw new Error(data.detail ? JSON.stringify(data.detail) : 'Algo salió mal en la petición al API');
            }

            return data as T;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get<T>(endpoint: string, params?: Record<string, string>) {
        return this.request<T>(endpoint, { method: 'GET', params });
    },

    post<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body instanceof URLSearchParams ? body : JSON.stringify(body),
            headers: body instanceof URLSearchParams ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}
        });
    },

    put<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    },

    patch<T>(endpoint: string, body: any) {
        return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
    },

    delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    },
};
