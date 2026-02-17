import { apiClient } from '@/app/shared/services/apiClient';

export interface Table {
    id: number;
    number: string;
    capacity: number;
    status: 'libre' | 'ocupada' | 'reservada' | 'fuera_de_servicio';
    location: string;
    qr_code?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface TableCreate {
    number: string;
    capacity: number;
    status: string;
    location: string;
    is_active: boolean;
}

export interface TableUpdate {
    number?: string;
    capacity?: number;
    status?: string;
    location?: string;
    is_active?: boolean;
}

export interface TableStats {
    total: number;
    libres: number;
    ocupadas: number;
    reservadas: number;
    fuera_de_servicio: number;
}

export const tableService = {
    /**
     * Get all tables
     */
    async getTables(): Promise<Table[]> {
        return apiClient.get<Table[]>('/api/tables/');
    },

    /**
     * Get table stats
     */
    async getStats(): Promise<TableStats> {
        return apiClient.get<TableStats>('/api/tables/stats');
    },

    /**
     * Get single table
     */
    async getTable(id: number): Promise<Table> {
        return apiClient.get<Table>(`/api/tables/${id}`);
    },

    /**
     * Create new table
     */
    async createTable(data: TableCreate): Promise<Table> {
        return apiClient.post<Table>('/api/tables/', data);
    },

    /**
     * Update table
     */
    async updateTable(id: number, data: TableUpdate): Promise<Table> {
        return apiClient.put<Table>(`/api/tables/${id}`, data);
    },

    /**
     * Delete/Disable table
     */
    async deleteTable(id: number): Promise<void> {
        return apiClient.delete(`/api/tables/${id}`);
    }
};
