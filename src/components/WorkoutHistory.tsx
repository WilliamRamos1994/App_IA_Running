import React, { useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  CloudOff,
  Footprints,
  Mountain,
  PlusCircle,
  Send,
  Trash2,
} from 'lucide-react';
import { WorkoutFilter, WorkoutRecord, WorkoutType } from '../types/workout';
import { calculatePace, formatShortDate } from '../utils/pace';

interface WorkoutHistoryProps {
  workouts: WorkoutRecord[];
  filter: WorkoutFilter;
  demoMode: boolean;
  retryingId: string | null;
  onFilterChange: (filter: WorkoutFilter) => void;
  onToggleDemoMode: () => void;
  onLoadDemoSamples: () => void;
  onRetrySend: (workout: WorkoutRecord) => void;
  onDeleteWorkout: (id: string) => void;
  onClearAll: () => void;
}

const FILTER_OPTIONS: WorkoutFilter[] = ['Todos', 'Correr', 'Caminata', 'Trail'];

function getTypeIcon(tipo: WorkoutType) {
  switch (tipo) {
    case 'Correr':
      return <Activity className="w-4 h-4 text-neutral-900" />;
    case 'Caminata':
      return <Footprints className="w-4 h-4 text-neutral-900" />;
    case 'Trail':
      return <Mountain className="w-4 h-4 text-neutral-900" />;
  }
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  workouts,
  filter,
  demoMode,
  retryingId,
  onFilterChange,
  onToggleDemoMode,
  onLoadDemoSamples,
  onRetrySend,
  onDeleteWorkout,
  onClearAll,
}) => {
  const filteredWorkouts = useMemo(() => {
    if (filter === 'Todos') return workouts;
    return workouts.filter((w) => w.tipo === filter);
  }, [workouts, filter]);

  const stats = useMemo(() => {
    const totalKm = filteredWorkouts.reduce((acc, w) => acc + w.distancia_km, 0);
    const totalMin = filteredWorkouts.reduce((acc, w) => acc + w.duracion_min, 0);
    const avgPace = calculatePace(totalKm, totalMin);
    return {
      count: filteredWorkouts.length,
      totalKm: totalKm.toFixed(2),
      avgPaceShort: avgPace.short,
    };
  }, [filteredWorkouts]);

  return (
    <section aria-labelledby="history-heading" className="space-y-4">
      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <span className="block text-xs text-neutral-500">Distancia total</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-3xl font-extrabold text-neutral-950 tabular-nums leading-none">
              {stats.totalKm}
            </span>
            <span className="text-xs font-medium text-neutral-500">km</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <span className="block text-xs text-neutral-500">Sesiones</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-3xl font-extrabold text-neutral-950 tabular-nums leading-none">
              {stats.count}
            </span>
            <span className="text-xs font-medium text-neutral-500">reg.</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-4">
          <span className="block text-xs text-neutral-500">Ritmo medio</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-3xl font-extrabold text-neutral-950 tabular-nums leading-none">
              {stats.avgPaceShort}
            </span>
            <span className="text-xs font-medium text-neutral-500">min/km</span>
          </div>
        </div>
      </div>

      {/* History Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {/* Header & Mode Controls */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="history-heading" className="font-display text-2xl font-bold tracking-tight text-neutral-950">
                Historial de sesiones
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Guardado automático en localStorage · Sincronización directa con Sheets
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleDemoMode}
                aria-pressed={demoMode}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  demoMode
                    ? 'bg-[#0E1116] text-[#C8FA00] border-[#0E1116]'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <CloudOff className="w-3.5 h-3.5" />
                <span>{demoMode ? 'Modo Demo / Local: ON' : 'Modo Demo / Local: OFF'}</span>
              </button>

              {workouts.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  title="Vaciar historial local"
                  className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:text-red-700 hover:bg-red-50 border border-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Segmented Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex items-center gap-1 p-1 bg-neutral-100 rounded-xl overflow-x-auto max-w-full"
              role="tablist"
              aria-label="Filtrar historial por tipo"
            >
              {FILTER_OPTIONS.map((option) => {
                const active = filter === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onFilterChange(option)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white text-neutral-950 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-950'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onLoadDemoSamples}
              className="min-h-[44px] px-3 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cargar datos de prueba</span>
            </button>
          </div>
        </div>

        {/* Workout Rows */}
        {filteredWorkouts.length === 0 ? (
          <div className="p-8 sm:p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-neutral-900">
              {workouts.length === 0
                ? 'Aún no hay entrenamientos guardados en este dispositivo.'
                : `No hay sesiones registradas en la categoría "${filter}".`}
            </p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Registra una nueva sesión en el formulario o carga entrenamientos de ejemplo para probar los filtros y el cálculo de ritmo.
            </p>
            {workouts.length === 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onLoadDemoSamples}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cargar sesiones demo
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filteredWorkouts.map((workout) => (
              <li
                key={workout.id}
                className="p-4 sm:px-6 sm:py-4 hover:bg-neutral-50/70 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                      {getTypeIcon(workout.tipo)}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-sm text-neutral-950">
                          {workout.tipo}
                        </span>
                        <span className="text-neutral-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs font-mono tabular-nums text-neutral-600">
                          {formatShortDate(workout.fecha)}
                        </span>
                        <span className="text-neutral-300" aria-hidden="true">
                          ·
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            workout.syncStatus === 'synced' ? 'text-emerald-700' : 'text-neutral-600'
                          }`}
                        >
                          {workout.syncStatus === 'synced' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Enviado a Sheets</span>
                            </>
                          ) : (
                            <>
                              <CloudOff className="w-3.5 h-3.5" />
                              <span>Solo local</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-600 tabular-nums">
                        <span>{workout.distancia_km.toFixed(2)} km</span>
                        <span aria-hidden="true">·</span>
                        <span>{workout.duracion_min} min</span>
                        <span aria-hidden="true">·</span>
                        <span>{workout.velocidad_kmh.toFixed(1)} km/h</span>
                      </div>

                      {workout.notas && (
                        <p className="text-xs text-neutral-700 leading-relaxed break-words pt-0.5">
                          {workout.notas}
                        </p>
                      )}

                      {workout.aiAnalysis && (
                        <p className="text-xs text-neutral-600 bg-neutral-100 rounded-lg px-3 py-2 mt-1.5 leading-relaxed">
                          <span className="font-semibold text-neutral-900">IA: </span>
                          {workout.aiAnalysis}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Metrics + Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <span className="block font-display text-2xl font-extrabold text-neutral-950 tabular-nums leading-none">
                        {workout.ritmo.replace(' min/km', '')}
                      </span>
                      <span className="text-[11px] text-neutral-500">min/km</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {workout.syncStatus === 'local' && !demoMode && (
                        <button
                          type="button"
                          onClick={() => onRetrySend(workout)}
                          disabled={retryingId === workout.id}
                          title="Enviar este registro a Google Sheets"
                          className="min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-900 bg-[#C8FA00] hover:bg-[#b9e800] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Enviar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteWorkout(workout.id)}
                        aria-label={`Eliminar entrenamiento del ${workout.fecha}`}
                        className="min-h-[44px] min-w-[44px] rounded-lg text-neutral-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
