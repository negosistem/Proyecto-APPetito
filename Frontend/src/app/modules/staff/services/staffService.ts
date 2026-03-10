import { apiClient } from '@/app/shared/services/apiClient';
import { Role } from '@/app/modules/roles/services/rolesService';

export interface StaffMember {
    id: number;
    nombre: string;
    email: string;
    role_id: number;
    role: Role; // Full role object
    turno?: 'Mañana' | 'Tarde' | 'Noche';
    telefono?: string;
    cedula?: string;
    direccion?: string;
    foto?: string;
    modules?: string[];
    is_active: boolean;
    created_at: string;
}

export interface StaffCreateInput {
    nombre: string;
    email: string;
    password: string;
    role_id: number; // Changed from role string
    turno?: 'Mañana' | 'Tarde' | 'Noche';
    telefono?: string;
    cedula?: string;
    direccion?: string;
    foto?: string;
    modules?: string[];
    is_active?: boolean;
}

export interface StaffUpdateInput {
    nombre?: string;
    email?: string;
    password?: string;
    role_id?: number; // Changed from role string
    turno?: 'Mañana' | 'Tarde' | 'Noche';
    telefono?: string;
    cedula?: string;
    direccion?: string;
    foto?: string;
    modules?: string[];
    is_active?: boolean;
}

export interface StaffStats {
    total: number;
    by_role: Record<string, number>;
}


class StaffService {
    /**
     * Get all staff members with role info
     */
    async getAllStaff(): Promise<StaffMember[]> {
        const response = await apiClient.get<StaffMember[]>('/api/staff/');
        return response;
    }

    /**
     * Create a new staff member
     */
    async createStaff(data: StaffCreateInput): Promise<StaffMember> {
        const response = await apiClient.post<StaffMember>('/api/staff/', data);
        return response;
    }

    /**
     * Get staff member by ID
     */
    async getStaffById(id: number): Promise<StaffMember> {
        const response = await apiClient.get<StaffMember>(`/api/staff/${id}`);
        return response;
    }

    /**
     * Update staff member info
     */
    async updateStaff(id: number, data: StaffUpdateInput): Promise<StaffMember> {
        const response = await apiClient.patch<StaffMember>(`/api/staff/${id}`, data);
        return response;
    }

    /**
     * Deactivate staff member
     */
    async deactivateStaff(id: number): Promise<void> {
        await apiClient.delete(`/api/staff/${id}`);
    }

    async getCurrentUser(): Promise<StaffMember> {
        const response = await apiClient.get<StaffMember>('/api/staff/me');
        return response;
    }

    /**
     * Get staff statistics
     */
    async getStaffStats(): Promise<StaffStats> {
        const response = await apiClient.get<StaffStats>('/api/staff/stats');
        return response;
    }
}

export const staffService = new StaffService();
