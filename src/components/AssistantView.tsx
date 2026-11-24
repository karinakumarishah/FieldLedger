import { useEffect, useState } from 'react';
import {
  BookmarkPlus,
  CalendarPlus,
  Check,
  ImagePlus,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { analyzeWithAssistant } from '../api';
import type {
  AdvisoryUrgency,
  AssistantAnalysisResult,
  FarmPlot,
  TaskCategory,
  TaskPriority,
} from '../types';
import { HealthStatusText, UrgencyText } from './SharedUI';

interface AssistantViewProps {
  plots: FarmPlot[];
  initialPlotId?: string;
  onSaveAdvisory: (payload: {
    plotId: string | null;
    plotName: string;
    crop: string;
    title: string;
    summary: string;
    irrigationPlan: string;
    nutrientPlan: string;
    pestRisk: string;
    urgency: AdvisoryUrgency;
    author: string;
  }) => Promise<void>;
  onScheduleTask: (payload: {
    plotId: string;
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    dueDate: string;
    assignedBy: string;
    notes: string;
  }) => Promise<void>;
}

const PROMPT_STARTERS = [
  'Evaluate soil moisture and recommend the next irrigation duration.',
  'Check N-P-K and pH balance for the current crop growth stage.',
  'What pest or fungal diseases should we scout for given recent conditions?',
  'Outline a 7-day field management plan to protect yield quality.',
];

export function AssistantView({
  plots,
  initialPlotId,
  onSaveAdvisory,
  onScheduleTask,
}: AssistantViewProps) {
  const [selectedPlotId, setSelectedPlotId] = useState<string>(
    initialPlotId || plots[0]?.id || ''
  );
  const [question, setQuestion] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imageMimeType, setImageMimeType] = useState<string | undefined>(undefined);

  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantAnalysisResult | null>(null);
  const [savedAdvisory, setSavedAdvisory] = useState(false);
  const [scheduledTask, setScheduledTask] = useState(false);

  useEffect(() => {
    if (initialPlotId) {
      setSelectedPlotId(initialPlotId);
    }
  }, [initialPlotId]);

  const activePlot = plots.find((p) => p.id === selectedPlotId) ?? null;

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Please upload a JPEG, PNG, or WebP crop or soil photo.');
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setErrorMsg('Photo must be smaller than 4.5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx > -1) {
        setImagePreview(dataUrl);
        setImageBase64(dataUrl.slice(commaIdx + 1));
        setImageMimeType(file.type);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImagePreview(null);
    setImageBase64(undefined);
    setImageMimeType(undefined);
  }

  async function handleRunAnalysis(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() && !imageBase64) {
      setErrorMsg('Enter an agronomy question or attach a crop photo.');
      return;
    }
    setAnalyzing(true);
    setErrorMsg(null);
    setSavedAdvisory(false);
    setScheduledTask(false);

    try {
      const data = await analyzeWithAssistant({
        question: question.trim(),
        plotId: selectedPlotId || undefined,
        imageBase64,
        imageMimeType,
      });
      setResult(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not reach the AI agronomy assistant.'
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveToAdvisories() {
    if (!result) return;
    await onSaveAdvisory({
      plotId: activePlot ? activePlot.id : null,
      plotName: activePlot ? activePlot.name : 'General Field',
      crop: activePlot ? activePlot.crop : 'Mixed Crops',
      title: result.title,
      summary: result.summary,
      irrigationPlan: result.irrigationPlan,
      nutrientPlan: result.nutrientPlan,
      pestRisk: result.pestRisk,
      urgency: result.urgency,
      author: authorName.trim() || 'Smart Assistant · Community',
    });
    setSavedAdvisory(true);
  }

  async function handleScheduleRecommended() {
    if (!result) return;
    const targetPlotId = activePlot?.id || plots[0]?.id;
    if (!targetPlotId) return;
    const due = new Date(
      Date.now() + Math.max(0, result.recommendedTask.dueDays) * 86400_000
    )
      .toISOString()
      .slice(0, 10);

    await onScheduleTask({
      plotId: targetPlotId,
      title: result.recommendedTask.title,
      category: result.recommendedTask.category,
      priority: result.recommendedTask.priority,
      dueDate: due,
      assignedBy: authorName.trim() || 'Smart Assistant',
      notes: result.summary,
    });
    setScheduledTask(true);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Context & Query Builder */}
      <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Smart Agronomy Assistant
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Grounds AI crop diagnostics in live shared soil telemetry and optional leaf or soil photos.
          </p>
        </div>

        <form onSubmit={handleRunAnalysis} className="space-y-4">
          <div>
            <label
              htmlFor="assistant-plot-select"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Field Context from Shared Database
            </label>
            <select
              id="assistant-plot-select"
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            >
              <option value="">General Farm Consultation (No specific plot)</option>
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.crop} ({p.moisturePct.toFixed(1)}% moisture)
                </option>
              ))}
            </select>
          </div>

          {activePlot && (
            <div className="py-3 border-y border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700">
                  {activePlot.crop} · {activePlot.growthStage} · {activePlot.soilType}
                </span>
                <HealthStatusText status={activePlot.healthStatus} />
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono tabular-nums text-slate-700">
                <div>
                  <span className="text-slate-400 block font-sans">Moisture</span>
                  {activePlot.moisturePct.toFixed(1)}%
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">pH</span>
                  {activePlot.ph.toFixed(1)}
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Temp</span>
                  {activePlot.tempC.toFixed(1)}°C
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">N-P-K</span>
                  {activePlot.nitrogenPpm}/{activePlot.phosphorusPpm}/{activePlot.potassiumPpm}
                </div>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="assistant-question"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Agronomy Question or Observation
            </label>
            <textarea
              id="assistant-question"
              rows={4}
              maxLength={1200}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about irrigation timing, yellowing lower leaves, pH correction, or upload a crop photo..."
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>

          {/* Starter Prompts */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Quick Prompts</div>
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => setQuestion(starter)}
                  className="text-left text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Crop Photo Upload */}
          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              Optional Leaf / Soil Photo
            </span>
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={imagePreview}
                  alt="Uploaded crop sample"
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  aria-label="Remove uploaded photo"
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/75 text-white rounded-lg hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:border-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer">
                <ImagePlus className="w-4 h-4" aria-hidden="true" />
                <span>Attach Leaf or Soil Photo (JPEG, PNG, WebP)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          <div>
            <label
              htmlFor="assistant-author"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Contributor Name (for saving advisories)
            </label>
            <input
              id="assistant-author"
              type="text"
              maxLength={50}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Community Grower"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          {errorMsg && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={analyzing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Analyzing Field Data...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Run Agronomy Analysis</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* Right: Structured Agronomy Output */}
      <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 min-h-[480px]">
        {analyzing ? (
          <div className="space-y-4 py-4">
            <div className="h-6 w-2/3 bg-slate-100 rounded animate-pulse" />
            <div className="h-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-16 bg-slate-100 rounded animate-pulse" />
            <div className="h-16 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : !result ? (
          <div className="h-full flex flex-col justify-center py-12 px-4 text-center max-w-md mx-auto">
            <Sparkles className="w-7 h-7 text-emerald-700 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">
              Ready for Field Diagnosis
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Select any shared plot on the left to inject live moisture, pH, and nutrient readings, then ask a question or attach a leaf photo. Generated guidance can be published directly to the open community database.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-500">
                  {activePlot ? `${activePlot.name} · ${activePlot.crop}` : 'General Farm Consultation'}
                </p>
                <h2 className="text-xl font-semibold text-slate-900 mt-1 [text-wrap:balance]">
                  {result.title}
                </h2>
              </div>
              <UrgencyText urgency={result.urgency} />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Diagnosis Summary
              </h3>
              <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                {result.summary}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              <div>
                <h3 className="text-xs font-semibold text-slate-700">
                  Irrigation Guidance
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  {result.irrigationPlan}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-700">
                  Nutrient &amp; Soil Plan
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  {result.nutrientPlan}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-700">
                Pest &amp; Disease Watch
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                {result.pestRisk}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <span className="font-medium text-slate-900">Suggested task:</span>{' '}
                {result.recommendedTask.title} ({result.recommendedTask.category} ·{' '}
                {result.recommendedTask.priority})
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={scheduledTask || plots.length === 0}
                  onClick={handleScheduleRecommended}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  {scheduledTask ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Task Scheduled</span>
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Schedule Task</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={savedAdvisory}
                  onClick={handleSaveToAdvisories}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  {savedAdvisory ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Saved to Shared DB</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Save to Shared Advisories</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
