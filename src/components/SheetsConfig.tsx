import React, { useState } from 'react';
import { Check, Copy, RotateCcw, Save, AlertCircle } from 'lucide-react';
import { DEFAULT_APPS_SCRIPT_URL, isValidExecUrl } from '../utils/pace';

interface SheetsConfigProps {
  scriptUrl: string;
  demoMode: boolean;
  onSaveScriptUrl: (url: string) => void;
  onToggleDemoMode: () => void;
}

const APPS_SCRIPT_SNIPPET = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.fecha,
    data.tipo,
    data.distancia_km,
    data.duracion_min,
    data.notas
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const SheetsConfig: React.FC<SheetsConfigProps> = ({
  scriptUrl,
  demoMode,
  onSaveScriptUrl,
  onToggleDemoMode,
}) => {
  const [draftUrl, setDraftUrl] = useState<string>(scriptUrl);
  const [savedNotice, setSavedNotice] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');
    setSavedNotice('');

    const trimmed = draftUrl.trim();
    if (!isValidExecUrl(trimmed)) {
      setUrlError('Ingresa una URL válida que comience con https:// y termine en /exec.');
      return;
    }

    onSaveScriptUrl(trimmed);
    setSavedNotice('URL guardada en localStorage correctamente.');
    setTimeout(() => setSavedNotice(''), 3500);
  };

  const handleResetDefault = () => {
    setDraftUrl(DEFAULT_APPS_SCRIPT_URL);
    onSaveScriptUrl(DEFAULT_APPS_SCRIPT_URL);
    setUrlError('');
    setSavedNotice('URL restaurada al endpoint /exec por defecto.');
    setTimeout(() => setSavedNotice(''), 3500);
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
    }
  };

  return (
    <section aria-labelledby="config-heading" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: URL Form & Demo Mode */}
      <div className="lg:col-span-7 space-y-4">
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 space-y-5"
        >
          <div>
            <h2 id="config-heading" className="font-display text-2xl font-bold tracking-tight text-neutral-950">
              Conexión con Google Sheets
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1">
              Envío directo sin OAuth mediante Web App de Google Apps Script (/exec). La configuración se guarda en localStorage.
            </p>
          </div>

          <div>
            <label htmlFor="apps-script-url" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              URL de Google Apps Script (/exec)
            </label>
            <input
              id="apps-script-url"
              type="url"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              required
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-mono text-neutral-950 focus:outline-none focus:border-neutral-950 focus:bg-white transition-colors"
            />
          </div>

          {urlError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{urlError}</span>
            </div>
          )}

          {savedNotice && (
            <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0E1116] hover:bg-neutral-800 text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar URL</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefault}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restaurar URL por defecto</span>
            </button>
          </div>
        </form>

        {/* Offline / Demo Mode Control Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-neutral-950">Modo Demo / Local (sin conexión)</h3>
            <p className="text-xs text-neutral-600">
              Cuando está activo, los entrenamientos se guardan únicamente en localStorage sin enviar peticiones POST a Google Sheets.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleDemoMode}
            aria-pressed={demoMode}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              demoMode
                ? 'bg-[#C8FA00] text-[#0E1116]'
                : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
            }`}
          >
            {demoMode ? 'Desactivar Modo Local' : 'Activar Modo Local'}
          </button>
        </div>
      </div>

      {/* Right Column: Payload & Apps Script Reference */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-[#0E1116] text-white rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight">
              Formato exacto enviado a /exec
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Petición fetch POST con <code className="font-mono text-neutral-200">mode: &apos;no-cors&apos;</code> y{' '}
              <code className="font-mono text-neutral-200">Content-Type: text/plain;charset=utf-8</code>.
            </p>
          </div>

          <pre className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-[#C8FA00] overflow-x-auto leading-relaxed">
{`{
  "fecha": "2026-11-19",
  "tipo": "Correr",
  "distancia_km": 5.25,
  "duracion_min": 26,
  "notas": "Ritmo constante"
}`}
          </pre>

          <div className="pt-2 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-300">
                Referencia Google Apps Script (doPost)
              </span>
              <button
                type="button"
                onClick={handleCopyScript}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#C8FA00]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiado' : 'Copiar código'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
              {APPS_SCRIPT_SNIPPET}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
