import { useMemo, useState } from 'react';
import { Plus, Search, ThumbsUp } from 'lucide-react';
import type { Advisory, AdvisoryUrgency, FarmPlot } from '../types';
import { UrgencyText, formatRelativeTime } from './SharedUI';

interface AdvisoriesViewProps {
  advisories: Advisory[];
  plots: FarmPlot[];
  onUpvote: (advisoryId: string) => Promise<void>;
  onCreateAdvisory: (payload: {
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
}

export function AdvisoriesView({
  advisories,
  plots,
  onUpvote,
  onCreateAdvisory,
}: AdvisoriesViewProps) {
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'All' | AdvisoryUrgency>('All');
  const [showCompose, setShowCompose] = useState(false);

  const [plotId, setPlotId] = useState(plots[0]?.id ?? '');
  const [crop, setCrop] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [irrigationPlan, setIrrigationPlan] = useState('');
  const [nutrientPlan, setNutrientPlan] = useState('');
  const [pestRisk, setPestRisk] = useState('');
  const [urgency, setUrgency] = useState<AdvisoryUrgency>('Monitor');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return advisories.filter((adv) => {
      if (urgencyFilter !== 'All' && adv.urgency !== urgencyFilter) return false;
      if (!q) return true;
      return (
        adv.title.toLowerCase().includes(q) ||
        adv.crop.toLowerCase().includes(q) ||
        adv.plotName.toLowerCase().includes(q) ||
        adv.summary.toLowerCase().includes(q)
      );
    });
  }, [advisories, search, urgencyFilter]);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    setSubmitting(true);
    try {
      const matchedPlot = plots.find((p) => p.id === plotId) ?? null;
      await onCreateAdvisory({
        plotId: matchedPlot ? matchedPlot.id : null,
        plotName: matchedPlot ? matchedPlot.name : 'Community Field',
        crop: crop.trim() || matchedPlot?.crop || 'Mixed Crops',
        title: title.trim(),
        summary: summary.trim(),
        irrigationPlan:
          irrigationPlan.trim() || 'Adjust irrigation based on root-zone moisture checks.',
        nutrientPlan:
          nutrientPlan.trim() || 'Follow soil test N-P-K targets.',
        pestRisk: pestRisk.trim() || 'Continue weekly border scouting.',
        urgency,
        author: author.trim() || 'Community Grower',
      });
      setTitle('');
      setSummary('');
      setIrrigationPlan('');
      setNutrientPlan('');
      setPestRisk('');
      setShowCompose(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shared advisories by crop, plot, or symptom..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Immediate', 'Monitor', 'Routine'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setUrgencyFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  urgencyFilter === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCompose((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showCompose ? 'Close Form' : 'Post Advisory'}</span>
          </button>
        </div>
      </div>

      {/* Compose New Community Advisory */}
      {showCompose && (
        <form
          onSubmit={handlePublish}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900">
            Publish Community Field Advisory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Linked Plot
              </label>
              <select
                value={plotId}
                onChange={(e) => setPlotId(e.target.value)}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">General Field</option>
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Crop
              </label>
              <input
                type="text"
                maxLength={60}
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder="e.g., Winter Wheat"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as AdvisoryUrgency)}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="Routine">Routine</option>
                <option value="Monitor">Monitor</option>
                <option value="Immediate">Immediate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Author Name
              </label>
              <input
                type="text"
                maxLength={50}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Advisory Title *
            </label>
            <input
              type="text"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Concise summary of the field observation or remedy"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Situation Summary *
            </label>
            <textarea
              rows={2}
              required
              maxLength={1500}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Explain what was observed and why the recommendation applies..."
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Irrigation Plan
              </label>
              <input
                type="text"
                maxLength={400}
                value={irrigationPlan}
                onChange={(e) => setIrrigationPlan(e.target.value)}
                placeholder="Watering timing or volume"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nutrient Plan
              </label>
              <input
                type="text"
                maxLength={400}
                value={nutrientPlan}
                onChange={(e) => setNutrientPlan(e.target.value)}
                placeholder="Fertilizer or pH note"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pest &amp; Disease Watch
              </label>
              <input
                type="text"
                maxLength={400}
                value={pestRisk}
                onChange={(e) => setPestRisk(e.target.value)}
                placeholder="Scouting targets"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCompose(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg cursor-pointer"
            >
              {submitting ? 'Publishing...' : 'Publish to Shared DB'}
            </button>
          </div>
        </form>
      )}

      {/* Advisories List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-900">
            No advisories match your filter
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Run a diagnosis in the Smart Assistant or post a community field note.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((adv) => (
            <article
              key={adv.id}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">
                    {adv.plotName} · {adv.crop} · {adv.author} ·{' '}
                    {formatRelativeTime(adv.createdAt)}
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 mt-1">
                    {adv.title}
                  </h2>
                </div>
                <UrgencyText urgency={adv.urgency} />
              </div>

              <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
                {adv.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <div className="font-semibold text-slate-800">Irrigation</div>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    {adv.irrigationPlan}
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Nutrients &amp; pH</div>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    {adv.nutrientPlan}
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Pest &amp; Disease</div>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    {adv.pestRisk}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onUpvote(adv.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>Helpful</span>
                  <span className="font-mono tabular-nums text-slate-900 ml-0.5">
                    {adv.helpfulCount}
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
