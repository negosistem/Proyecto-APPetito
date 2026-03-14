import { useState, useCallback, useEffect, useRef } from 'react';
import { reservationsService } from '../services/reservationService';
import {
  Reservation,
  ReservationCreate,
  ReservationUpdate,
  ReservationStatus,
  ReservationFilters
} from '../types/reservation';
import toast from 'react-hot-toast';

interface UseReservationsReturn {
  reservations: Reservation[];
  isLoading: boolean;
  error: string | null;
  filters: ReservationFilters;
  setFilters: (f: ReservationFilters) => void;
  createReservation: (data: ReservationCreate) => Promise<Reservation>;
  updateReservation: (id: number, data: ReservationUpdate) => Promise<Reservation>;
  changeStatus: (id: number, status: ReservationStatus) => Promise<void>;
  cancelReservation: (id: number) => Promise<void>;
  refreshReservations: () => void;
}

export function useReservations(): UseReservationsReturn {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReservationFilters>({});

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchReservations = useCallback(async (currentFilters: ReservationFilters, showLoader: boolean = false) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    try {
      const data = await reservationsService.getAll(currentFilters);
      setReservations(data);
    } catch (err: any) {
      const message = err.message || 'Error al cargar las reservas';
      setError(message);
      toast.error(message);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  // Efecto principal para re-fetch cuando cambian los filtros
  useEffect(() => {
    // Si cambia el search, aplicamos debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchReservations(filters, true);
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filters, fetchReservations]);

  const refreshReservations = useCallback(() => {
    fetchReservations(filters, true);
  }, [filters, fetchReservations]);

  const createReservation = async (reservationData: ReservationCreate) => {
    try {
      const newReservation = await reservationsService.create(reservationData);
      toast.success('Reserva creada con éxito');
      refreshReservations(); // Refetch automático
      return newReservation;
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la reserva');
      throw err;
    }
  };

  const updateReservation = async (id: number, reservationData: ReservationUpdate) => {
    try {
      const updatedReservation = await reservationsService.update(id, reservationData);
      toast.success('Reserva actualizada con éxito');
      refreshReservations(); // Refetch automático
      return updatedReservation;
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar la reserva');
      throw err;
    }
  };

  const changeStatus = async (id: number, status: ReservationStatus) => {
    try {
      await reservationsService.updateStatus(id, status);
      toast.success('Estado actualizado con éxito');
      refreshReservations(); // Refetch automático
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar el estado');
      throw err;
    }
  };

  const cancelReservation = async (id: number) => {
    try {
      await reservationsService.cancel(id);
      toast.success('Reserva cancelada con éxito');
      refreshReservations(); // Refetch automático
    } catch (err: any) {
      toast.error(err.message || 'Error al cancelar la reserva');
      throw err;
    }
  };

  return {
    reservations,
    isLoading,
    error,
    filters,
    setFilters,
    createReservation,
    updateReservation,
    changeStatus,
    cancelReservation,
    refreshReservations,
  };
}
