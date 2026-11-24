import { useMemo, useState } from 'react';
import { Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import type { FarmPlot, HealthStatus, SensorLog } from '../types';
import {
  HealthStatusText,
  MoistureSparkline,
  ResilientImage,
  formatRelativeTime,
} from './SharedUI';

interface PlotsViewProps {
  plots: FarmPlot[];
  sensorLogs: SensorLog[];
  selectedPlotId: string | null;
  onSelectPlot: (plotId: string | null) => void;
  onOpenLogModal: (plotId?: string, defaultTab?: 'log' | 'plot') => void;
  onAskAssistantForPlot: (plotId: string) => void;
  onUpdatePlotStage: (
    plotId: string,
    payload: { growthStage: string; healthStatus: HealthStatus; notes: string }
  ) => Promise<void>;
  onDeletePlot: (plotId: string) => Promise<void>;
}

export function PlotsView({
  plots,
  sensorLogs,
  selectedPlotId,
  onSelectPlot,
  onOpenLogModal,
  onAskAssistantForPlot,
  onUpdatePlotStage,
  onDeletePlot,
}: PlotsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | HealthStatus>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [stageInput, setStageInput] = useState('');
  const [statusInput, setStatusInput] = useState<HealthStatus>('Optimal');
  const [notesInput, setNotesInput] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const filteredPlots = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plots.filter((plot) => {
      if (statusFilter !== 'All' && plot.healthStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        plot.name.toLowerCase().includes(q) ||
        plot.crop.toLowerCase().includes(q) ||
        plot.region.toLowerCase().includes(q) ||
        plot.variety.toLowerCase().includes(q)
      );
    });
  }, [plots, search, statusFilter]);

  const activePlot = useMemo(
    () => plots.find((p) => p.id === selectedPlotId) ?? null,
    [plots, selectedPlotId]
  );

  const activePlotLogs = useMemo(
    () =>
      activePlot
        ? sensorLogs.filter((l) => l.plotId === activePlot.id).slice(0, 10)
        : [],
    [activePlot, sensorLogs]
  );

  function openDetail(plot: FarmPlot) {
    setConfirmDeleteId(null);
    setEditingNotes(false);
    setStageInput(plot.growthStage);
    setStatusInput(plot.healthStatus);
    setNotesInput(plot.notes);
    onSelectPlot(plot.id);
  }

  async function handleSavePlotEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!activePlot) return;
    setSavingEdit(true);
    try {
      await onUpdatePlotStage(activePlot.id, {
        growthStage: stageInput.trim() || activePlot.growthStage,
        healthStatus: statusInput,
        notes: notesInput.trim(),
      });
      setEditingNotes(false);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Workspace Toolbar */}
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
            placeholder="Search plots by name, crop, variety, or region..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Optimal', 'Watch', 'Action Needed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'All' ? 'All Plots' : tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onOpenLogModal(undefined, 'plot')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Register Plot</span>
          </button>
        </div>
      </div>

      {/* Plots Grid */}
      {filteredPlots.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-900">
            No matching plots found
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Adjust your search filter or add a new plot to the shared database.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('All');
            }}
            className="mt-4 px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlots.map((plot) => (
            <article
              key={plot.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 border-b border-slate-100">
                  <ResilientImage
                    src={plot.imageUrl}
                    alt={`${plot.crop} at ${plot.name}`}
                    fallbackTitle={`${plot.crop} · ${plot.name}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900 leading-snug">
                      {plot.name}
                    </h3>
                    <HealthStatusText status={plot.healthStatus} />
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {plot.crop} · {plot.variety} · {plot.areaHa} ha · {plot.region}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-4 gap-2 text-left">
                    <div>
                      <div className="text-[11px] text-slate-500">Moisture</div>
                      <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                        {plot.moisturePct.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Soil pH</div>
                      <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                        {plot.ph.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Temp</div>
                      <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                        {plot.tempC.toFixed(1)}°C
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">N-P-K</div>
                      <div className="text-xs font-medium text-slate-900 font-mono tabular-nums mt-0.5">
                        {plot.nitrogenPpm}/{plot.phosphorusPpm}/{plot.potassiumPpm}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 truncate">
                  {plot.contributor} · {formatRelativeTime(plot.updatedAt)}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenLogModal(plot.id, 'log')}
                    className="text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap cursor-pointer"
                  >
                    Log
                  </button>
                  <button
                    type="button"
                    onClick={() => onAskAssistantForPlot(plot.id)}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-900 whitespace-nowrap cursor-pointer"
                  >
                    Ask AI
                  </button>
                  <button
                    type="button"
                    onClick={() => openDetail(plot)}
                    className="text-xs font-medium text-slate-900 underline underline-offset-4 hover:text-emerald-700 whitespace-nowrap cursor-pointer"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Plot Detail Modal */}
      {activePlot && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${activePlot.name}`}
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {activePlot.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {activePlot.crop} ({activePlot.variety}) · {activePlot.soilType} · {activePlot.areaHa} ha
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectPlot(null)}
                aria-label="Close plot details"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <HealthStatusText status={activePlot.healthStatus} />
                  <span>Stage: {activePlot.growthStage}</span>
                  <span>Last irrigated: {activePlot.lastIrrigated}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenLogModal(activePlot.id, 'log')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Log Reading
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = activePlot.id;
                      onSelectPlot(null);
                      onAskAssistantForPlot(id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Analyze with AI</span>
                  </button>
                </div>
              </div>

              {/* Nutrient & Soil Telemetry */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 py-2">
                <div>
                  <div className="text-xs text-slate-500">Moisture</div>
                  <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                    {activePlot.moisturePct.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Soil pH</div>
                  <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                    {activePlot.ph.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Soil Temp</div>
                  <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                    {activePlot.tempC.toFixed(1)}°C
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Nitrogen</div>
                  <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                    {activePlot.nitrogenPpm} ppm
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Phosphorus</div>
                  <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                    {activePlot.phosphorusPpm} ppm
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Potassium</div>
                  <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                    {activePlot.potassiumPpm} ppm
                  </div>
                </div>
              </div>

              {/* Sparkline */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700 mb-2">
                  Moisture History
                </h3>
                <MoistureSparkline logs={activePlotLogs} />
              </div>

              {/* Editable Stage & Notes */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-700">
                    Field Notes &amp; Status
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setStageInput(activePlot.growthStage);
                      setStatusInput(activePlot.healthStatus);
                      setNotesInput(activePlot.notes);
                      setEditingNotes((v) => !v);
                    }}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    {editingNotes ? 'Cancel Edit' : 'Edit Status & Notes'}
                  </button>
                </div>

                {editingNotes ? (
                  <form onSubmit={handleSavePlotEdit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">
                          Growth Stage
                        </label>
                        <input
                          type="text"
                          value={stageInput}
                          onChange={(e) => setStageInput(e.target.value)}
                          maxLength={40}
                          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">
                          Health Condition
                        </label>
                        <select
                          value={statusInput}
                          onChange={(e) => setStatusInput(e.target.value as HealthStatus)}
                          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
                        >
                          <option value="Optimal">Optimal</option>
                          <option value="Watch">Watch</option>
                          <option value="Action Needed">Action Needed</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Field Notes
                      </label>
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={notesInput}
                        onChange={(e) => setNotesInput(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                    >
                      {savingEdit ? 'Saving...' : 'Save Updates'}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {activePlot.notes || 'No field notes recorded.'}
                  </p>
                )}
              </div>

              {/* Recent Sensor Logs */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-700 mb-3">
                  Recent Shared Logs
                </h3>
                {activePlotLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">No readings logged yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activePlotLogs.map((log) => (
                      <div
                        key={log.id}
                        className="py-2.5 flex items-start justify-between gap-4 text-xs"
                      >
                        <div>
                          <div className="text-slate-800 font-medium">{log.note}</div>
                          <div className="text-slate-500 mt-0.5">
                            {log.loggedBy} · {formatRelativeTime(log.recordedAt)}
                          </div>
                        </div>
                        <div className="font-mono tabular-nums text-slate-700 text-right shrink-0">
                          {log.moisturePct.toFixed(1)}% · pH {log.ph.toFixed(1)} · {log.tempC.toFixed(1)}°C
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete Plot */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {confirmDeleteId === activePlot.id ? (
                  <div className="flex items-center gap-3 w-full justify-between">
                    <span className="text-xs text-red-700 font-medium">
                      Remove this plot and its logs from the shared database?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeletePlot(activePlot.id);
                          onSelectPlot(null);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
                      >
                        Confirm Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(activePlot.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Remove Plot</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
