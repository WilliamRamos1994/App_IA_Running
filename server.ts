import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const app = express();
app.use(express.json({ limit: '1mb' }));

interface AnalyzeRequestBody {
  fecha?: string;
  tipo?: string;
  distancia_km?: number;
  duracion_min?: number;
  ritmo?: string;
  notas?: string;
}

app.post('/api/analyze', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(500).json({
      error:
        'Falta configurar GEMINI_API_KEY en el servidor. Configúrala en Settings > Secrets para usar el análisis con IA.',
    });
    return;
  }

  const body = (req.body ?? {}) as AnalyzeRequestBody;
  const tipo = typeof body.tipo === 'string' && body.tipo.trim() ? body.tipo.trim() : 'Correr';
  const fecha = typeof body.fecha === 'string' ? body.fecha : '';
  const distancia = Number(body.distancia_km);
  const duracion = Number(body.duracion_min);
  const ritmo = typeof body.ritmo === 'string' && body.ritmo.trim() ? body.ritmo.trim() : '--:-- min/km';
  const notas = typeof body.notas === 'string' ? body.notas.trim() : '';

  if (!Number.isFinite(distancia) || distancia <= 0 || !Number.isFinite(duracion) || duracion <= 0) {
    res.status(400).json({
      error: 'Ingresa una distancia y duración válidas mayores a 0 para analizar la sesión.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = [
      `Analiza esta sesión de entrenamiento registrada en RunTracker Sheets:`,
      `- Fecha: ${fecha || 'Hoy'}`,
      `- Tipo: ${tipo}`,
      `- Distancia: ${distancia.toFixed(2)} km`,
      `- Duración: ${duracion} min`,
      `- Ritmo promedio: ${ritmo}`,
      notas ? `- Notas del atleta: "${notas}"` : `- Notas del atleta: Sin notas adicionales`,
      ``,
      `Devuelve un comentario breve (máximo 3 frases, ~55-75 palabras) y práctico en español con tono de entrenador deportivo:`,
      `1) Lectura rápida de la intensidad/ritmo para ${tipo}.`,
      `2) Una recomendación concreta para la recuperación o la próxima sesión.`,
      `Sin listas con asteriscos ni markdown pesado; texto directo y claro.`,
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'Eres un entrenador de running, trail y caminata deportiva. Das feedback breve, preciso, accionable y motivador en español neutro, sin relleno ni emojis excesivos.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const analysis = response.text?.trim();
    if (!analysis) {
      res.status(502).json({
        error: 'El modelo no devolvió texto de análisis. Intenta nuevamente.',
      });
      return;
    }

    res.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido al consultar Gemini.';
    console.error('Error in /api/analyze:', message);
    res.status(500).json({
      error: `No se pudo completar el análisis con IA: ${message}`,
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RunTracker Sheets server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
