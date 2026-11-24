import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  createAdvisoryEntry,
  createPlotEntry,
  createSensorLogEntry,
  createTaskEntry,
  deletePlotEntry,
  deleteTaskEntry,
  fetchWorkspace,
  updatePlotEntry,
  updateTaskStatusEntry,
  upvoteAdvisory,
} from './api';
import { AdvisoriesView } from './components/AdvisoriesView';
import { AssistantView } from './components/AssistantView';
import { LogDataModal } from './components/LogDataModal';
import { OverviewView } from './components/OverviewView';
import { PlotsView } from './components/PlotsView';
import { formatRelativeTime } from './components/SharedUI';
import type {
  AdvisoryUrgency,
  HealthStatus,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  WorkspaceSnapshot,
} from './types';

type NavTab = 'overview' | 'plots' | 'assistant' | 'advisories';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>({
    plots: [],
    sensorLogs: [],
    tasks: [],
    advisories: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(new Date().toISOString());

  // Cross-view selection state
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [assistantPlotId, setAssistantPlotId] = useState<string | undefined>(undefined);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalPlotId, setLogModalPlotId] = useState<string | undefined>(undefined);
  const [logModalTab, setLogModalTab] = useState<'log' | 'plot'>('log');

  const loadWorkspace = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const snap = await fetchWorkspace();
      setWorkspace(snap);
      setLastSyncedAt(new Date().toISOString());
      setErrorBanner(null);
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Unable to reach shared database server.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace(false);
    const interval = setInterval(() => {
      void loadWorkspace(false);
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadWorkspace]);

  function openLogModal(plotId?: string, tab: 'log' | 'plot' = 'log') {
    setLogModalPlotId(plotId);
    setLogModalTab(tab);
    setLogModalOpen(true);
  }

  function handleAskAssistantForPlot(plotId: string) {
    setAssistantPlotId(plotId);
    setActiveTab('assistant');
  }

  function handleInspectPlot(plotId: string) {
    setSelectedPlotId(plotId);
    setActiveTab('plots');
  }

  async function handleSubmitLog(payload: {
    plotId: string;
    moisturePct: number;
    ph: number;
    tempC: number;
    ecMs: number;
    rainfallMm: number;
    note: string;
    loggedBy: string;
    healthStatus?: HealthStatus;
  }) {
    await createSensorLogEntry(payload);
    await loadWorkspace(false);
  }

  async function handleSubmitPlot(payload: {
    name: string;
    region: string;
    crop: string;
    variety: string;
    growthStage: string;
    areaHa: number;
    soilType: string;
    moisturePct: number;
    ph: number;
    nitrogenPpm: number;
    phosphorusPpm: number;
    potassiumPpm: number;
    tempC: number;
    lastIrrigated: string;
    contributor: string;
    notes: string;
  }) {
    await createPlotEntry(payload);
    await loadWorkspace(false);
  }

  async function handleUpdatePlotStage(
    plotId: string,
    payload: { growthStage: string; healthStatus: HealthStatus; notes: string }
  ) {
    await updatePlotEntry(plotId, payload);
    await loadWorkspace(false);
  }

  async function handleDeletePlot(plotId: string) {
    await deletePlotEntry(plotId);
    await loadWorkspace(false);
  }

  async function handleCreateTask(payload: {
    plotId: string;
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    dueDate: string;
    assignedBy: string;
    notes: string;
  }) {
    await createTaskEntry(payload);
    await loadWorkspace(false);
  }

  async function handleToggleTaskStatus(taskId: string, nextStatus: TaskStatus) {
    await updateTaskStatusEntry(taskId, nextStatus);
    await loadWorkspace(false);
  }

  async function handleDeleteTask(taskId: string) {
    await deleteTaskEntry(taskId);
    await loadWorkspace(false);
  }

  async function handleSaveAdvisory(payload: {
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
  }) {
    await createAdvisoryEntry(payload);
    await loadWorkspace(false);
  }

  async function handleUpvoteAdvisory(id: string) {
    await upvoteAdvisory(id);
    await loadWorkspace(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
          >
            FieldLedger
          </a>

          {/* Zone 2: 4 Single-line Navigation Links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            {(
              [
                ['overview', 'Overview'],
                ['plots', 'Field Plots'],
                ['assistant', 'Smart Assistant'],
                ['advisories', 'Shared Advisories'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  activeTab === key
                    ? 'text-slate-900 border-emerald-700'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => openLogModal(undefined, 'log')}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Log Field Data
            </button>
          </div>
        </div>

        {/* Mobile Nav Row (keeps total sticky height <= 15% of mobile viewport) */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600"
        >
          {(
            [
              ['overview', 'Overview'],
              ['plots', 'Field Plots'],
              ['assistant', 'Smart Assistant'],
              ['advisories', 'Shared Advisories'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`py-1 whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === key
                  ? 'text-slate-900 border-emerald-700'
                  : 'border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Subtle Workspace Sync Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Shared Public Database · Anyone can inspect plots, log telemetry, and contribute advisories
          </div>
          <button
            type="button"
            onClick={() => void loadWorkspace(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Synced {formatRelativeTime(lastSyncedAt)}</span>
          </button>
        </div>

        {errorBanner && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center justify-between gap-4">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => void loadWorkspace(true)}
              className="px-3 py-1.5 text-xs font-medium text-red-900 bg-white border border-red-300 rounded-lg cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <OverviewView
            plots={workspace.plots}
            tasks={workspace.tasks}
            advisoryCount={workspace.advisories.length}
            loading={loading}
            onNavigate={setActiveTab}
            onAskAssistantForPlot={handleAskAssistantForPlot}
            onInspectPlot={handleInspectPlot}
            onOpenLogModal={(id) => openLogModal(id, 'log')}
            onCreateTask={handleCreateTask}
            onToggleTaskStatus={handleToggleTaskStatus}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'plots' && (
          <PlotsView
            plots={workspace.plots}
            sensorLogs={workspace.sensorLogs}
            selectedPlotId={selectedPlotId}
            onSelectPlot={setSelectedPlotId}
            onOpenLogModal={openLogModal}
            onAskAssistantForPlot={handleAskAssistantForPlot}
            onUpdatePlotStage={handleUpdatePlotStage}
            onDeletePlot={handleDeletePlot}
          />
        )}

        {activeTab === 'assistant' && (
          <AssistantView
            plots={workspace.plots}
            initialPlotId={assistantPlotId}
            onSaveAdvisory={handleSaveAdvisory}
            onScheduleTask={handleCreateTask}
          />
        )}

        {activeTab === 'advisories' && (
          <AdvisoriesView
            advisories={workspace.advisories}
            plots={workspace.plots}
            onUpvote={handleUpvoteAdvisory}
            onCreateAdvisory={handleSaveAdvisory}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>FieldLedger · Open Agronomy Database &amp; Smart Farming Assistant</span>
          <span>All field logs, tasks, and advisories persist in shared storage</span>
        </div>
      </footer>

      <LogDataModal
        open={logModalOpen}
        plots={workspace.plots}
        initialPlotId={logModalPlotId}
        initialTab={logModalTab}
        onClose={() => setLogModalOpen(false)}
        onSubmitLog={handleSubmitLog}
        onSubmitPlot={handleSubmitPlot}
      />
    </div>
  );
}
