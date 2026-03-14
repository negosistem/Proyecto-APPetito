export type ReservationStatus = 
  'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'no_show';

export interface Reservation {
  id:               number;
  id_empresa:       number;
  id_table:         number | null;
  id_customer:      number | null;
  customer_name:    string;
  customer_phone:   string;
  party_size:       number;
  reservation_date: string;  // ISO string del backend
  status:           ReservationStatus;
  notes:            string | null;
  arrival_time:     string | null;
  created_at:       string;
  table_name:       string | null;
}

export interface ReservationCreate {
  customer_name:    string;
  customer_phone:   string;
  reservation_date: string;  // ISO string
  party_size:       number;
  id_table?:        number | null;
  id_customer?:     number | null;
  notes?:           string | null;
  status?:          ReservationStatus;
}

export interface ReservationUpdate extends Partial<ReservationCreate> {
  status?:       ReservationStatus;
  arrival_time?: string | null;
}

export interface ReservationFilters {
  search?:  string;
  fecha?:   string;  // YYYY-MM-DD
  status?:  ReservationStatus | '';
}
