import { apiClient as api } from '../../../shared/services/apiClient';
import {
  Reservation,
  ReservationCreate,
  ReservationUpdate,
  ReservationStatus,
  ReservationFilters
} from '../types/reservation';

const BASE_URL = '/reservations';

export const reservationsService = {
  // GET /reservations/?fecha=...&status=...&search=...
  getAll: async (filters?: ReservationFilters): Promise<Reservation[]> => {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.fecha) params.append('fecha', filters.fecha);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
    }
    
    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}/?${queryString}` : `${BASE_URL}/`;
    
    return await api.get<Reservation[]>(url);
  },
  
  // GET /reservations/today
  getToday: async (): Promise<Reservation[]> => {
    return await api.get<Reservation[]>(`${BASE_URL}/today`);
  },
  
  // GET /reservations/{id}
  getById: async (id: number): Promise<Reservation> => {
    return await api.get<Reservation>(`${BASE_URL}/${id}`);
  },
  
  // POST /reservations/
  create: async (data: ReservationCreate): Promise<Reservation> => {
    try {
      return await api.post<Reservation>(`${BASE_URL}/`, data);
    } catch (error: any) {
      if (error && error.message && error.message.includes("Mesa ocupada")) {
        throw new Error("Mesa ocupada en ese horario. Elige otra mesa u hora.");
      }
      throw error;
    }
  },
  
  // PUT /reservations/{id}
  update: async (id: number, data: ReservationUpdate): Promise<Reservation> => {
    try {
      return await api.put<Reservation>(`${BASE_URL}/${id}`, data);
    } catch (error: any) {
       if (error && error.message && error.message.includes("Mesa ocupada")) {
        throw new Error("Mesa ocupada en ese horario. Elige otra mesa u hora.");
      }
      throw error;
    }
  },
  
  // PATCH /reservations/{id}/status
  updateStatus: async (id: number, status: ReservationStatus): Promise<Reservation> => {
    return await api.patch<Reservation>(`${BASE_URL}/${id}/status`, { status });
  },
  
  // DELETE /reservations/{id}
  cancel: async (id: number): Promise<Reservation> => {
    return await api.delete<Reservation>(`${BASE_URL}/${id}`);
  },

  // Tables API Endpoint Fetching mapped for component usage
  getTables: async (): Promise<{id: number; nombre: string; capacity: number; status: string}[]> => {
    const data = await api.get<any[]>('/tables/');
    return data.map((t: any) => ({
      id: t.id,
      nombre: t.number, // Mapeando number -> nombre
      capacity: t.capacity,
      status: t.status
    }));
  }
};
