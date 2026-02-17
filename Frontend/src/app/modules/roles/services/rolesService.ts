import { apiClient } from '@/app/shared/services/apiClient';

export interface Role {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface RoleCreateInput {
    name: string;
    description?: string;
    is_active?: boolean;
}

class RolesService {
    /**
     * Get all active roles
     */
    async getAllRoles(): Promise<Role[]> {
        const response = await apiClient.get<Role[]>('/api/roles/');
        return response;
    }

    /**
     * Create a new role
     */
    async createRole(data: RoleCreateInput): Promise<Role> {
        const response = await apiClient.post<Role>('/api/roles/', data);
        return response;
    }
}

export const rolesService = new RolesService();
