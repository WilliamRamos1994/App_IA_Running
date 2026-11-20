export type WorkoutType = 'Correr' | 'Caminata' | 'Trail';

export type WorkoutFilter = 'Todos' | WorkoutType;

export type SyncStatus = 'synced' | 'local';

export interface SheetsPayload {
  fecha: string;
  tipo: WorkoutType;
  distancia_km: number;
  duracion_min: number;
  notas: string;
}

export interface WorkoutRecord extends SheetsPayload {
  id: string;
  ritmo: string;
  velocidad_kmh: number;
  syncStatus: SyncStatus;
  aiAnalysis?: string;
  createdAt: string;
}

export interface DispatchFeedback {
  type: 'sheets' | 'local' | 'error';
  title: string;
  detail: string;
}
