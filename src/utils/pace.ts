import { WorkoutRecord, WorkoutType } from '../types/workout';

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwX86Ue_Fh-oIc8zMbEJ8mXPy8h6mKKpgAU6r8zMNyJrOotWQkqiLomht1jUDdlh09apQ/exec';

export const STORAGE_KEYS = {
  WORKOUTS: 'runtracker_sheets_workouts_v1',
  SCRIPT_URL: 'runtracker_sheets_exec_url_v1',
  DEMO_MODE: 'runtracker_sheets_demo_mode_v1',
} as const;

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculatePace(distanciaKm: number, duracionMin: number): {
  formatted: string;
  short: string;
  speedKmh: number;
  isValid: boolean;
} {
  if (!Number.isFinite(distanciaKm) || !Number.isFinite(duracionMin) || distanciaKm <= 0 || duracionMin <= 0) {
    return {
      formatted: '--:-- min/km',
      short: '--:--',
      speedKmh: 0,
      isValid: false,
    };
  }

  const paceMinPerKm = duracionMin / distanciaKm;
  const totalSeconds = Math.round(paceMinPerKm * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const short = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const speedKmh = Number(((distanciaKm / duracionMin) * 60).toFixed(1));

  return {
    formatted: `${short} min/km`,
    short,
    speedKmh,
    isValid: true,
  };
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function isValidExecUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function buildDemoWorkouts(): WorkoutRecord[] {
  const today = new Date();
  const offsetDate = (daysAgo: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const samples: Array<{
    fecha: string;
    tipo: WorkoutType;
    distancia_km: number;
    duracion_min: number;
    notas: string;
    aiAnalysis: string;
  }> = [
    {
      fecha: offsetDate(0),
      tipo: 'Correr',
      distancia_km: 8.4,
      duracion_min: 41.5,
      notas: 'Rodaje progresivo por el parque, último kilómetro fuerte.',
      aiAnalysis:
        'Ritmo sólido de 04:56 min/km con cierre progresivo. Mantén 24 h de recuperación suave o movilidad de cadera antes de tu próxima sesión de series.',
    },
    {
      fecha: offsetDate(2),
      tipo: 'Trail',
      distancia_km: 12.2,
      duracion_min: 76,
      notas: 'Sendero técnico con desnivel positivo de 380 m.',
      aiAnalysis:
        'Excelente gestión del esfuerzo en montaña (06:14 min/km). Prioriza hidratación con electrolitos y trabajo excéntrico de cuádriceps esta semana.',
    },
    {
      fecha: offsetDate(4),
      tipo: 'Caminata',
      distancia_km: 5.5,
      duracion_min: 52,
      notas: 'Caminata activa de descarga muscular.',
      aiAnalysis:
        'Buen ritmo aeróbico de recuperación a 09:27 min/km. Ideal para activar circulación sin sobrecargar articulaciones entre días de carrera.',
    },
  ];

  return samples.map((item, idx) => {
    const pace = calculatePace(item.distancia_km, item.duracion_min);
    return {
      id: `demo-${Date.now()}-${idx}`,
      fecha: item.fecha,
      tipo: item.tipo,
      distancia_km: item.distancia_km,
      duracion_min: item.duracion_min,
      notas: item.notas,
      ritmo: pace.formatted,
      velocidad_kmh: pace.speedKmh,
      syncStatus: 'local',
      aiAnalysis: item.aiAnalysis,
      createdAt: new Date(today.getTime() - idx * 86400000).toISOString(),
    };
  });
}
