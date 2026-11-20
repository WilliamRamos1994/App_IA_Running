import React, { useEffect, useState } from 'react';
import { ClipboardList, Link2, PlusCircle } from 'lucide-react';
import {
  DispatchFeedback,
  SheetsPayload,
  WorkoutFilter,
  WorkoutRecord,
} from './types/workout';
import {
  buildDemoWorkouts,
  calculatePace,
  DEFAULT_APPS_SCRIPT_URL,
  isValidExecUrl,
  STORAGE_KEYS,
} from './utils/pace';
import { WorkoutForm } from './components/WorkoutForm';
import { WorkoutHistory } from './components/WorkoutHistory';
import { SheetsConfig } from './components/SheetsConfig';

type AppTab = 'registrar' | 'historial' | 'conexion';

function loadStoredWorkouts(): WorkoutRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkoutRecord[]) : [];
  } catch {
    return [];
  }
}

function loadStoredScriptUrl(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCRIPT_URL);
    if (raw && isValidExecUrl(raw)) return raw;
    return DEFAULT_APPS_SCRIPT_URL;
  } catch {
    return DEFAULT_APPS_SCRIPT_URL;
  }
}

function loadStoredDemoMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
  } catch {
    return false;
  }
}

async function dispatchToGoogleSheets(scriptUrl: string, payload: SheetsPayload): Promise<void> {
  const exactPayload: SheetsPayload = {
    fecha: payload.fecha,
    tipo: payload.tipo,
    distancia_km: payload.distancia_km,
    duracion_min: payload.duracion_min,
    notas: payload.notas,
  };

  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(exactPayload),
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('registrar');
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>(loadStoredWorkouts);
  const [scriptUrl, setScriptUrl] = useState<string>(loadStoredScriptUrl);
  const [demoMode, setDemoMode] = useState<boolean>(loadStoredDemoMode);
  const [filter, setFilter] = useState<WorkoutFilter>('Todos');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<DispatchFeedback | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    } catch {
      // Ignore quota errors cleanly
    }
  }, [workouts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, scriptUrl);
    } catch {
      // Ignore storage errors
    }
  }, [scriptUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DEMO_MODE, String(demoMode));
    } catch {
      // Ignore storage errors
    }
  }, [demoMode]);

  const handleSubmitWorkout = async (
    payload: SheetsPayload,
    aiAnalysis?: string
  ): Promise<boolean> => {
    setIsSubmitting(true);
    setFeedback(null);

    const pace = calculatePace(payload.distancia_km, payload.duracion_min);
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (demoMode) {
      const localRecord: WorkoutRecord = {
        ...payload,
        id,
        ritmo: pace.formatted,
        velocidad_kmh: pace.speedKmh,
        syncStatus: 'local',
        aiAnalysis,
        createdAt: new Date().toISOString(),
      };
      setWorkouts((prev) => [localRecord, ...prev]);
      setFeedback({
        type: 'local',
        title: 'Registro guardado en Modo Local',
        detail: `${payload.tipo} · ${payload.distancia_km.toFixed(2)} km (${pace.formatted}) guardado en localStorage sin enviar a Google Sheets.`,
      });
      setIsSubmitting(false);
      return true;
    }

    if (!isValidExecUrl(scriptUrl)) {
      setFeedback({
        type: 'error',
        title: 'URL de Google Apps Script inválida',
        detail: 'Verifica la URL /exec en la pestaña Conexión antes de enviar.',
      });
      setIsSubmitting(false);
      return false;
    }

    try {
      await dispatchToGoogleSheets(scriptUrl, payload);
      const syncedRecord: WorkoutRecord = {
        ...payload,
        id,
        ritmo: pace.formatted,
        velocidad_kmh: pace.speedKmh,
        syncStatus: 'synced',
        aiAnalysis,
        createdAt: new Date().toISOString(),
      };
      setWorkouts((prev) => [syncedRecord, ...prev]);
      setFeedback({
        type: 'sheets',
        title: 'Envío disparado hacia Google Sheets',
        detail: `Se envió POST (no-cors) a tu Apps Script /exec con ${payload.tipo} · ${payload.distancia_km.toFixed(2)} km · ${pace.formatted}, y quedó guardado en el historial local.`,
      });
      setIsSubmitting(false);
      return true;
    } catch {
      const fallbackRecord: WorkoutRecord = {
        ...payload,
        id,
        ritmo: pace.formatted,
        velocidad_kmh: pace.speedKmh,
        syncStatus: 'local',
        aiAnalysis,
        createdAt: new Date().toISOString(),
      };
      setWorkouts((prev) => [fallbackRecord, ...prev]);
      setFeedback({
        type: 'error',
        title: 'Sin conexión: guardado solo en historial local',
        detail:
          'No se pudo contactar la URL /exec en este momento. Puedes reintentar el envío desde el historial cuando tengas conexión.',
      });
      setIsSubmitting(false);
      return true;
    }
  };

  const handleRetrySend = async (workout: WorkoutRecord) => {
    if (!isValidExecUrl(scriptUrl)) {
      setFeedback({
        type: 'error',
        title: 'URL /exec no válida',
        detail: 'Actualiza la URL de Google Apps Script en la sección Conexión.',
      });
      return;
    }

    setRetryingId(workout.id);
    try {
      await dispatchToGoogleSheets(scriptUrl, {
        fecha: workout.fecha,
        tipo: workout.tipo,
        distancia_km: workout.distancia_km,
        duracion_min: workout.duracion_min,
        notas: workout.notas,
      });

      setWorkouts((prev) =>
        prev.map((item) =>
          item.id === workout.id ? { ...item, syncStatus: 'synced' } : item
        )
      );
      setFeedback({
        type: 'sheets',
        title: 'Envío disparado hacia Google Sheets',
        detail: `Registro del ${workout.fecha} (${workout.distancia_km.toFixed(2)} km) enviado a tu hoja de cálculo.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        title: 'No se pudo reenviar a Google Sheets',
        detail: 'Verifica tu conexión a internet o la URL /exec configurada.',
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setWorkouts([]);
  };

  const handleLoadDemoSamples = () => {
    const samples = buildDemoWorkouts();
    setWorkouts((prev) => [...samples, ...prev]);
    setDemoMode(true);
    setFeedback({
      type: 'local',
      title: 'Sesiones de prueba cargadas',
      detail: 'Se agregaron 3 entrenamientos de ejemplo y se activó el Modo Demo/Local para pruebas sin conexión.',
    });
  };

  const handleToggleDemoMode = () => {
    setDemoMode((prev) => !prev);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#F4F5F7] text-[#0E1116]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('registrar')}
            className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#0E1116] whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            RunTracker Sheets
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium" aria-label="Navegación principal">
            <button
              type="button"
              onClick={() => setActiveTab('registrar')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'registrar' || activeTab === 'historial'
                  ? 'border-[#0E1116] text-[#0E1116] font-semibold'
                  : 'border-transparent text-neutral-600 hover:text-[#0E1116]'
              }`}
            >
              Entrenamientos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conexion')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'conexion'
                  ? 'border-[#0E1116] text-[#0E1116] font-semibold'
                  : 'border-transparent text-neutral-600 hover:text-[#0E1116]'
              }`}
            >
              Conexión Apps Script
            </button>
          </nav>

          {/* Zone 3: Single primary contextual action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleToggleDemoMode}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                demoMode
                  ? 'bg-[#C8FA00] text-[#0E1116]'
                  : 'bg-[#0E1116] text-white hover:bg-neutral-800'
              }`}
            >
              {demoMode ? 'Modo Local Activo' : 'Sheets Activo'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-24 lg:py-8">
        {activeTab === 'conexion' ? (
          <SheetsConfig
            scriptUrl={scriptUrl}
            demoMode={demoMode}
            onSaveScriptUrl={setScriptUrl}
            onToggleDemoMode={handleToggleDemoMode}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Mobile shows active tab only; Desktop shows both Registrar + Historial side by side */}
            <div
              className={`lg:col-span-5 ${
                activeTab === 'registrar' ? 'block' : 'hidden lg:block'
              }`}
            >
              <WorkoutForm
                demoMode={demoMode}
                scriptUrl={scriptUrl}
                isSubmitting={isSubmitting}
                feedback={feedback}
                onDismissFeedback={() => setFeedback(null)}
                onOpenConfig={() => setActiveTab('conexion')}
                onSubmitWorkout={handleSubmitWorkout}
              />
            </div>

            <div
              className={`lg:col-span-7 ${
                activeTab === 'historial' ? 'block' : 'hidden lg:block'
              }`}
            >
              <WorkoutHistory
                workouts={workouts}
                filter={filter}
                demoMode={demoMode}
                retryingId={retryingId}
                onFilterChange={setFilter}
                onToggleDemoMode={handleToggleDemoMode}
                onLoadDemoSamples={handleLoadDemoSamples}
                onRetrySend={handleRetrySend}
                onDeleteWorkout={handleDeleteWorkout}
                onClearAll={handleClearAll}
              />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Tab Bar (hidden on lg desktop; combined sticky height 56px + 56px = 112px < 15% mobile height) */}
      <nav
        aria-label="Navegación móvil"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 pb-safe"
      >
        <div className="grid grid-cols-3 h-14 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('registrar')}
            className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'registrar'
                ? 'text-[#0E1116] font-bold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[11px] tracking-tight whitespace-nowrap">Registrar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'historial'
                ? 'text-[#0E1116] font-bold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[11px] tracking-tight whitespace-nowrap">
              Historial ({workouts.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conexion')}
            className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeTab === 'conexion'
                ? 'text-[#0E1116] font-bold'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[11px] tracking-tight whitespace-nowrap">Conexión</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
