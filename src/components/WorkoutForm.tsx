import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  CloudOff,
  Footprints,
  Loader2,
  Mountain,
  Send,
  AlertCircle,
} from 'lucide-react';
import {
  DispatchFeedback,
  SheetsPayload,
  WorkoutType,
} from '../types/workout';
import { calculatePace, getTodayISO } from '../utils/pace';

interface WorkoutFormProps {
  demoMode: boolean;
  scriptUrl: string;
  isSubmitting: boolean;
  feedback: DispatchFeedback | null;
  onDismissFeedback: () => void;
  onOpenConfig: () => void;
  onSubmitWorkout: (payload: SheetsPayload, aiAnalysis?: string) => Promise<boolean>;
}

const WORKOUT_TYPES: Array<{ value: WorkoutType; label: string; icon: React.ReactNode }> = [
  { value: 'Correr', label: 'Correr', icon: <Activity className="w-4 h-4" /> },
  { value: 'Caminata', label: 'Caminata', icon: <Footprints className="w-4 h-4" /> },
  { value: 'Trail', label: 'Trail', icon: <Mountain className="w-4 h-4" /> },
];

export const WorkoutForm: React.FC<WorkoutFormProps> = ({
  demoMode,
  scriptUrl,
  isSubmitting,
  feedback,
  onDismissFeedback,
  onOpenConfig,
  onSubmitWorkout,
}) => {
  const [fecha, setFecha] = useState<string>(() => getTodayISO());
  const [tipo, setTipo] = useState<WorkoutType>('Correr');
  const [distanciaStr, setDistanciaStr] = useState<string>('5.00');
  const [duracionStr, setDuracionStr] = useState<string>('25');
  const [notas, setNotas] = useState<string>('');

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiError, setAiError] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const distanciaNum = parseFloat(distanciaStr);
  const duracionNum = parseFloat(duracionStr);

  const pace = useMemo(
    () => calculatePace(distanciaNum, duracionNum),
    [distanciaNum, duracionNum]
  );

  const handleAnalyzeWithAI = async () => {
    setAiError('');
    setFormError('');

    if (!pace.isValid) {
      setAiError('Ingresa una distancia y duración mayores a 0 para calcular tu ritmo y analizar la sesión.');
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          tipo,
          distancia_km: Number(distanciaNum.toFixed(2)),
          duracion_min: Number(duracionNum.toFixed(2)),
          ritmo: pace.formatted,
          notas: notas.trim(),
        }),
      });

      const data = (await response.json()) as { analysis?: string; error?: string };
      if (!response.ok || !data.analysis) {
        throw new Error(data.error || 'No se pudo obtener respuesta del entrenador IA.');
      }

      setAiAnalysis(data.analysis);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error de conexión al analizar con Gemini.';
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    onDismissFeedback();

    if (!fecha) {
      setFormError('Selecciona una fecha válida.');
      return;
    }
    if (!Number.isFinite(distanciaNum) || distanciaNum <= 0) {
      setFormError('La distancia debe ser un número mayor a 0 km.');
      return;
    }
    if (!Number.isFinite(duracionNum) || duracionNum <= 0) {
      setFormError('La duración debe ser mayor a 0 minutos.');
      return;
    }

    const payload: SheetsPayload = {
      fecha,
      tipo,
      distancia_km: Number(distanciaNum.toFixed(2)),
      duracion_min: Number(duracionNum.toFixed(2)),
      notas: notas.trim(),
    };

    const ok = await onSubmitWorkout(payload, aiAnalysis || undefined);
    if (ok) {
      setNotas('');
      setAiAnalysis('');
      setAiError('');
    }
  };

  return (
    <section aria-labelledby="form-heading" className="space-y-4">
      {/* Live Pace Telemetry Display — Adidas Running Performance Monitor */}
      <div className="bg-[#0E1116] text-white rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <span className="text-xs font-medium text-neutral-400 tracking-wide">
            Ritmo calculado en tiempo real
          </span>
          <span className="text-xs font-mono text-neutral-400 tabular-nums">
            {pace.isValid ? `${pace.speedKmh.toFixed(1)} km/h` : '--.- km/h'}
          </span>
        </div>

        <div className="flex items-baseline gap-2.5">
          <span
            data-testid="live-pace-value"
            className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight text-[#C8FA00] tabular-nums leading-none"
          >
            {pace.short}
          </span>
          <span className="text-sm font-medium text-neutral-300">min/km</span>
        </div>

        <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
          <span className="tabular-nums">
            {tipo} · {Number.isFinite(distanciaNum) && distanciaNum > 0 ? `${distanciaNum.toFixed(2)} km` : '0.00 km'} ·{' '}
            {Number.isFinite(duracionNum) && duracionNum > 0 ? `${duracionNum} min` : '0 min'}
          </span>
          <button
            type="button"
            onClick={onOpenConfig}
            className="text-neutral-300 hover:text-[#C8FA00] transition-colors underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {demoMode ? 'Modo Local activo' : 'Destino: Google Sheets'}
          </button>
        </div>
      </div>

      {/* Quick Entry Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="form-heading" className="font-display text-2xl font-bold tracking-tight text-neutral-950">
            Registrar entrenamiento
          </h2>
          <span className="text-xs text-neutral-500 whitespace-nowrap shrink-0">
            Campos obligatorios *
          </span>
        </div>

        {/* Tipo Segmented Control */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Tipo de actividad *
          </label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 rounded-xl" role="group" aria-label="Tipo de actividad">
            {WORKOUT_TYPES.map((item) => {
              const active = tipo === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTipo(item.value)}
                  className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 ${
                    active
                      ? 'bg-[#0E1116] text-white shadow-sm'
                      : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date + Distance + Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label htmlFor="workout-fecha" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Fecha *
            </label>
            <input
              id="workout-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono tabular-nums text-neutral-950 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label htmlFor="workout-distancia" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Distancia (km) *
            </label>
            <input
              id="workout-distancia"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="5.00"
              value={distanciaStr}
              onChange={(e) => setDistanciaStr(e.target.value)}
              required
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono tabular-nums text-neutral-950 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label htmlFor="workout-duracion" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Duración (min) *
            </label>
            <input
              id="workout-duracion"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              placeholder="25"
              value={duracionStr}
              onChange={(e) => setDuracionStr(e.target.value)}
              required
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono tabular-nums text-neutral-950 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="workout-notas" className="block text-xs font-semibold text-neutral-700 mb-1.5">
            Notas de la sesión
          </label>
          <textarea
            id="workout-notas"
            rows={2}
            placeholder="Sensaciones, terreno, clima o intervalos..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors resize-none"
          />
        </div>

        {/* AI Coach Analysis Panel */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleAnalyzeWithAI}
              disabled={aiLoading}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-950 text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analizando sesión...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  <span>Analizar con IA</span>
                </>
              )}
            </button>
            <span className="text-xs text-neutral-500">
              Recomendación práctica según tu ritmo ({pace.short} min/km)
            </span>
          </div>

          {aiError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{aiError}</span>
            </div>
          )}

          {aiAnalysis && (
            <div className="p-4 rounded-xl bg-[#0E1116] text-neutral-100 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#C8FA00]">
                  Feedback de Entrenamiento IA
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {pace.formatted}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-neutral-200">{aiAnalysis}</p>
            </div>
          )}
        </div>

        {/* Form Validation Error */}
        {formError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Dispatch Status Message */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
              feedback.type === 'sheets'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : feedback.type === 'local'
                ? 'bg-neutral-100 border-neutral-300 text-neutral-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {feedback.type === 'sheets' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : feedback.type === 'local' ? (
              <CloudOff className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 min-w-0">
              <p className="font-semibold">{feedback.title}</p>
              <p className="text-xs opacity-85 break-words">{feedback.detail}</p>
            </div>
          </div>
        )}

        {/* Primary Submit CTA */}
        <div className="pt-1 space-y-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#C8FA00] hover:bg-[#b9e800] active:scale-[0.99] text-[#0E1116] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{demoMode ? 'Guardando localmente...' : 'Enviando a Google Sheets...'}</span>
              </>
            ) : demoMode ? (
              <>
                <CloudOff className="w-4 h-4" />
                <span>Guardar en Modo Local</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Guardar y Enviar a Google Sheets</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-neutral-500 text-center truncate">
            {demoMode
              ? 'Modo Demo/Local activo: los registros se guardan solo en este dispositivo.'
              : `POST /exec configurado: ${scriptUrl}`}
          </p>
        </div>
      </form>
    </section>
  );
};
