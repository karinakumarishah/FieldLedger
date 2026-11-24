import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  createAdvisory,
  createPlot,
  createSensorLog,
  createTask,
  deletePlot,
  deleteTask,
  getPlotById,
  getRecentLogsForPlot,
  getWorkspaceSnapshot,
  incrementAdvisoryHelpful,
  updatePlot,
  updateTaskStatus,
} from './server/db.ts';
import type {
  AdvisoryUrgency,
  AssistantAnalysisResult,
  HealthStatus,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_HEALTH: HealthStatus[] = ['Optimal', 'Watch', 'Action Needed'];
const ALLOWED_TASK_CATEGORIES: TaskCategory[] = [
  'Irrigation',
  'Fertilization',
  'Scouting',
  'Harvest',
  'Soil Prep',
];
const ALLOWED_PRIORITIES: TaskPriority[] = ['Normal', 'High', 'Urgent'];
const ALLOWED_TASK_STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];
const ALLOWED_URGENCIES: AdvisoryUrgency[] = ['Routine', 'Monitor', 'Immediate'];
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const PLOT_IMAGE_BY_CROP = (crop: string): string => {
  const lower = crop.toLowerCase();
  if (lower.includes('tomato') || lower.includes('pepper') || lower.includes('cucumber')) {
    return '/src/assets/images/crop_tomato_vines_1795499332447.jpg';
  }
  if (lower.includes('avocado') || lower.includes('citrus') || lower.includes('orange') || lower.includes('orchard') || lower.includes('apple')) {
    return '/src/assets/images/crop_orchard_rows_1795499332904.jpg';
  }
  if (lower.includes('wheat') || lower.includes('grain') || lower.includes('rye') || lower.includes('barley') || lower.includes('clover')) {
    return '/src/assets/images/crop_wheat_plot_1795499332277.jpg';
  }
  return '/src/assets/images/hero_agronomy_field_1795499331310.jpg';
};

function cleanStr(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.trim().slice(0, maxLen);
}

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    const snap = getWorkspaceSnapshot();
    res.json({
      ok: true,
      counts: {
        plots: snap.plots.length,
        logs: snap.sensorLogs.length,
        tasks: snap.tasks.length,
        advisories: snap.advisories.length,
      },
    });
  });

  app.get('/api/workspace', (_req, res) => {
    try {
      res.json(getWorkspaceSnapshot());
    } catch (err) {
      console.error('GET /api/workspace failed:', err);
      res.status(500).json({ error: 'Failed to load shared farm database.' });
    }
  });

  app.post('/api/plots', (req, res) => {
    try {
      const body = req.body ?? {};
      const name = cleanStr(body.name, 80);
      const crop = cleanStr(body.crop, 60);
      if (!name || !crop) {
        res.status(400).json({ error: 'Plot name and crop are required.' });
        return;
      }

      const healthCandidate = cleanStr(body.healthStatus, 24) as HealthStatus;
      const moisturePct = clampNum(body.moisturePct, 0, 100, 38);
      const ph = clampNum(body.ph, 3.0, 10.0, 6.5);
      const derivedHealth: HealthStatus = ALLOWED_HEALTH.includes(healthCandidate)
        ? healthCandidate
        : moisturePct < 26 || ph < 5.5 || ph > 7.8
          ? 'Action Needed'
          : moisturePct < 33 || ph < 6.0 || ph > 7.4
            ? 'Watch'
            : 'Optimal';

      const created = createPlot({
        name,
        region: cleanStr(body.region, 60, 'Valley Block'),
        crop,
        variety: cleanStr(body.variety, 60, 'Standard'),
        growthStage: cleanStr(body.growthStage, 40, 'Vegetative'),
        areaHa: clampNum(body.areaHa, 0.1, 5000, 5),
        soilType: cleanStr(body.soilType, 40, 'Loam'),
        moisturePct,
        ph,
        nitrogenPpm: Math.round(clampNum(body.nitrogenPpm, 0, 500, 45)),
        phosphorusPpm: Math.round(clampNum(body.phosphorusPpm, 0, 500, 32)),
        potassiumPpm: Math.round(clampNum(body.potassiumPpm, 0, 1000, 140)),
        tempC: clampNum(body.tempC, -15, 60, 20),
        healthStatus: derivedHealth,
        lastIrrigated: cleanStr(body.lastIrrigated, 20, new Date().toISOString().slice(0, 10)),
        contributor: cleanStr(body.contributor, 50, 'Community Grower'),
        imageUrl: PLOT_IMAGE_BY_CROP(crop),
        notes: cleanStr(body.notes, 500, 'Shared community plot entry.'),
      });

      res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/plots failed:', err);
      res.status(500).json({ error: 'Failed to save new plot.' });
    }
  });

  app.patch('/api/plots/:id', (req, res) => {
    try {
      const id = cleanStr(req.params.id, 64);
      const body = req.body ?? {};
      const updates: Parameters<typeof updatePlot>[1] = {};

      if (body.growthStage !== undefined) updates.growthStage = cleanStr(body.growthStage, 40);
      if (body.healthStatus !== undefined && ALLOWED_HEALTH.includes(body.healthStatus)) {
        updates.healthStatus = body.healthStatus;
      }
      if (body.lastIrrigated !== undefined) updates.lastIrrigated = cleanStr(body.lastIrrigated, 20);
      if (body.moisturePct !== undefined) updates.moisturePct = clampNum(body.moisturePct, 0, 100, 35);
      if (body.ph !== undefined) updates.ph = clampNum(body.ph, 3.0, 10.0, 6.5);
      if (body.tempC !== undefined) updates.tempC = clampNum(body.tempC, -15, 60, 20);
      if (body.notes !== undefined) updates.notes = cleanStr(body.notes, 500);

      const updated = updatePlot(id, updates);
      if (!updated) {
        res.status(404).json({ error: 'Plot not found.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      console.error('PATCH /api/plots/:id failed:', err);
      res.status(500).json({ error: 'Failed to update plot.' });
    }
  });

  app.delete('/api/plots/:id', (req, res) => {
    try {
      const id = cleanStr(req.params.id, 64);
      const ok = deletePlot(id);
      if (!ok) {
        res.status(404).json({ error: 'Plot not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      console.error('DELETE /api/plots/:id failed:', err);
      res.status(500).json({ error: 'Failed to delete plot.' });
    }
  });

  app.post('/api/logs', (req, res) => {
    try {
      const body = req.body ?? {};
      const plotId = cleanStr(body.plotId, 64);
      if (!plotId) {
        res.status(400).json({ error: 'Plot ID is required.' });
        return;
      }
      const healthStatus = ALLOWED_HEALTH.includes(body.healthStatus)
        ? (body.healthStatus as HealthStatus)
        : undefined;

      const created = createSensorLog({
        plotId,
        moisturePct: clampNum(body.moisturePct, 0, 100, 35),
        ph: clampNum(body.ph, 3.0, 10.0, 6.5),
        tempC: clampNum(body.tempC, -15, 60, 20),
        ecMs: clampNum(body.ecMs, 0, 15, 1.3),
        rainfallMm: clampNum(body.rainfallMm, 0, 500, 0),
        note: cleanStr(body.note, 400, 'Routine field observation.'),
        loggedBy: cleanStr(body.loggedBy, 50, 'Community Grower'),
        healthStatus,
      });

      if (!created) {
        res.status(404).json({ error: 'Referenced plot not found.' });
        return;
      }
      res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/logs failed:', err);
      res.status(500).json({ error: 'Failed to log sensor reading.' });
    }
  });

  app.post('/api/tasks', (req, res) => {
    try {
      const body = req.body ?? {};
      const plotId = cleanStr(body.plotId, 64);
      const title = cleanStr(body.title, 140);
      if (!plotId || !title) {
        res.status(400).json({ error: 'Plot ID and task title are required.' });
        return;
      }
      const category = ALLOWED_TASK_CATEGORIES.includes(body.category)
        ? (body.category as TaskCategory)
        : 'Irrigation';
      const priority = ALLOWED_PRIORITIES.includes(body.priority)
        ? (body.priority as TaskPriority)
        : 'Normal';
      const dueDate = cleanStr(body.dueDate, 20, new Date().toISOString().slice(0, 10));

      const created = createTask({
        plotId,
        title,
        category,
        priority,
        dueDate,
        assignedBy: cleanStr(body.assignedBy, 50, 'Community Grower'),
        notes: cleanStr(body.notes, 400, ''),
      });

      if (!created) {
        res.status(404).json({ error: 'Referenced plot not found.' });
        return;
      }
      res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/tasks failed:', err);
      res.status(500).json({ error: 'Failed to create field task.' });
    }
  });

  app.patch('/api/tasks/:id', (req, res) => {
    try {
      const id = cleanStr(req.params.id, 64);
      const status = req.body?.status;
      if (!ALLOWED_TASK_STATUSES.includes(status)) {
        res.status(400).json({ error: 'Invalid task status.' });
        return;
      }
      const updated = updateTaskStatus(id, status as TaskStatus);
      if (!updated) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      console.error('PATCH /api/tasks/:id failed:', err);
      res.status(500).json({ error: 'Failed to update task.' });
    }
  });

  app.delete('/api/tasks/:id', (req, res) => {
    try {
      const id = cleanStr(req.params.id, 64);
      const ok = deleteTask(id);
      if (!ok) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      console.error('DELETE /api/tasks/:id failed:', err);
      res.status(500).json({ error: 'Failed to delete task.' });
    }
  });

  app.post('/api/advisories', (req, res) => {
    try {
      const body = req.body ?? {};
      const title = cleanStr(body.title, 140);
      const summary = cleanStr(body.summary, 1500);
      if (!title || !summary) {
        res.status(400).json({ error: 'Advisory title and summary are required.' });
        return;
      }
      const urgency = ALLOWED_URGENCIES.includes(body.urgency)
        ? (body.urgency as AdvisoryUrgency)
        : 'Monitor';

      const created = createAdvisory({
        plotId: body.plotId ? cleanStr(body.plotId, 64) : null,
        plotName: cleanStr(body.plotName, 80, 'General Field'),
        crop: cleanStr(body.crop, 60, 'Mixed Crops'),
        title,
        summary,
        irrigationPlan: cleanStr(body.irrigationPlan, 800, 'Follow local soil moisture thresholds.'),
        nutrientPlan: cleanStr(body.nutrientPlan, 800, 'Maintain balanced N-P-K based on tissue tests.'),
        pestRisk: cleanStr(body.pestRisk, 800, 'Scout field borders weekly for early pest pressure.'),
        urgency,
        author: cleanStr(body.author, 50, 'Community Grower'),
      });

      res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/advisories failed:', err);
      res.status(500).json({ error: 'Failed to save advisory.' });
    }
  });

  app.post('/api/advisories/:id/helpful', (req, res) => {
    try {
      const id = cleanStr(req.params.id, 64);
      const updated = incrementAdvisoryHelpful(id);
      if (!updated) {
        res.status(404).json({ error: 'Advisory not found.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      console.error('POST /api/advisories/:id/helpful failed:', err);
      res.status(500).json({ error: 'Failed to record upvote.' });
    }
  });

  app.post('/api/assistant/analyze', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to run AI agronomy analysis.',
      });
      return;
    }

    try {
      const body = req.body ?? {};
      const question = cleanStr(body.question, 1200);
      const plotId = body.plotId ? cleanStr(body.plotId, 64) : '';
      const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
      const imageMimeType = typeof body.imageMimeType === 'string' ? body.imageMimeType.trim() : '';

      if (!question && !imageBase64) {
        res.status(400).json({ error: 'Provide a farming question or crop photo to analyze.' });
        return;
      }

      if (imageBase64) {
        if (!ALLOWED_IMAGE_MIMES.has(imageMimeType)) {
          res.status(400).json({ error: 'Unsupported image format. Upload JPEG, PNG, or WebP.' });
          return;
        }
        if (imageBase64.length > 7_000_000) {
          res.status(400).json({ error: 'Image is too large. Keep uploads under 5 MB.' });
          return;
        }
      }

      let contextBlock = 'Plot context: General farm consultation (no specific plot selected).';
      if (plotId) {
        const plot = getPlotById(plotId);
        if (plot) {
          const recentLogs = getRecentLogsForPlot(plot.id, 5);
          const logLines = recentLogs
            .map(
              (l) =>
                `  - ${l.recordedAt.slice(0, 16)}: moisture ${l.moisturePct}%, pH ${l.ph}, temp ${l.tempC}°C, EC ${l.ecMs} mS/cm, rain ${l.rainfallMm} mm (${l.note})`
            )
            .join('\n');
          contextBlock = [
            `Selected Plot: ${plot.name} (${plot.region})`,
            `Crop & Variety: ${plot.crop} — ${plot.variety} | Stage: ${plot.growthStage} | Area: ${plot.areaHa} ha`,
            `Soil Type: ${plot.soilType} | Health Status: ${plot.healthStatus} | Last Irrigated: ${plot.lastIrrigated}`,
            `Latest Telemetry: Moisture ${plot.moisturePct}%, pH ${plot.ph}, Temp ${plot.tempC}°C, N ${plot.nitrogenPpm} ppm, P ${plot.phosphorusPpm} ppm, K ${plot.potassiumPpm} ppm`,
            `Field Notes: ${plot.notes}`,
            logLines ? `Recent Sensor History:\n${logLines}` : '',
          ]
            .filter(Boolean)
            .join('\n');
        }
      }

      const promptText = [
        contextBlock,
        '',
        `Grower Question: ${question || 'Analyze the attached crop or soil photo for signs of nutrient deficiency, water stress, pests, or disease and recommend immediate steps.'}`,
      ].join('\n');

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64,
          },
        });
      }
      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction:
            'You are an experienced field agronomist and precision-farming advisor. Give practical, evidence-based, concise recommendations grounded in the provided soil telemetry, crop stage, and any attached leaf/soil image. Avoid generic filler. Always return valid JSON matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Short 6-10 word descriptive title for the agronomy advisory.',
              },
              summary: {
                type: Type.STRING,
                description: 'Clear 2-4 sentence diagnosis and direct answer referencing observed metrics or visual symptoms.',
              },
              irrigationPlan: {
                type: Type.STRING,
                description: 'Specific irrigation timing, volume, or moisture threshold guidance.',
              },
              nutrientPlan: {
                type: Type.STRING,
                description: 'Targeted N-P-K, pH, or micronutrient amendment guidance.',
              },
              pestRisk: {
                type: Type.STRING,
                description: 'Pest/disease watchpoints and integrated pest management steps.',
              },
              urgency: {
                type: Type.STRING,
                enum: ['Routine', 'Monitor', 'Immediate'],
              },
              recommendedTask: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: ['Irrigation', 'Fertilization', 'Scouting', 'Harvest', 'Soil Prep'],
                  },
                  priority: {
                    type: Type.STRING,
                    enum: ['Normal', 'High', 'Urgent'],
                  },
                  dueDays: { type: Type.INTEGER },
                },
                required: ['title', 'category', 'priority', 'dueDays'],
              },
            },
            required: [
              'title',
              'summary',
              'irrigationPlan',
              'nutrientPlan',
              'pestRisk',
              'urgency',
              'recommendedTask',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText) as AssistantAnalysisResult;
      res.json(parsed);
    } catch (err) {
      console.error('POST /api/assistant/analyze failed:', err);
      const msg = err instanceof Error ? err.message : 'Unexpected error calling Gemini agronomy assistant.';
      res.status(502).json({ error: msg });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FieldLedger server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
