import { apiClient } from '@/app/shared/services/apiClient';

export interface User {
    id: string;
    nombre: string;
    email: string;
    role: string;
    telefono?: string;
    cedula?: string;
    direccion?: string;
    foto?: string;
    modules?: string[];
    id_empresa: number | null; // Nullable para super_admin
    empresa?: {
        id: number;
        name: string;
    };
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export const authService = {
    /**
     * Inicia sesión en el backend
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const data = await apiClient.post<LoginResponse>('/auth/login', formData);

        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
        }

        return data;
    },

    /**
     * Registra un nuevo usuario
     */
    async register(userData: any): Promise<User> {
        return apiClient.post<User>('/auth/register', userData);
    },

    /**
     * Cierra la sesión
     */
    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
    },

    /**
     * Verifica si hay un token guardado
     */
    isAuthenticated(): boolean {
        return !!localStorage.getItem('access_token');
    },

    /**
     * Obtiene los datos del usuario actual
     */
    async me(): Promise<User> {
        return apiClient.get<User>('/auth/me');
    }
};
