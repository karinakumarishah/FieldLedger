import { useState } from 'react';
import {
  ArrowRight,
  CheckSquare,
  Plus,
  Sparkles,
  Square,
  Clock,
  Trash2,
} from 'lucide-react';
import type {
  FarmPlot,
  FieldTask,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from '../types';
import {
  HealthStatusText,
  ResilientImage,
  formatRelativeTime,
} from './SharedUI';

interface OverviewViewProps {
  plots: FarmPlot[];
  tasks: FieldTask[];
  advisoryCount: number;
  loading: boolean;
  onNavigate: (tab: 'overview' | 'plots' | 'assistant' | 'advisories') => void;
  onAskAssistantForPlot: (plotId: string) => void;
  onInspectPlot: (plotId: string) => void;
  onOpenLogModal: (plotId?: string) => void;
  onCreateTask: (payload: {
    plotId: string;
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    dueDate: string;
    assignedBy: string;
    notes: string;
  }) => Promise<void>;
  onToggleTaskStatus: (taskId: string, nextStatus: TaskStatus) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  Pending: 'In Progress',
  'In Progress': 'Completed',
  Completed: 'Pending',
};

export function OverviewView({
  plots,
  tasks,
  advisoryCount,
  loading,
  onNavigate,
  onAskAssistantForPlot,
  onInspectPlot,
  onOpenLogModal,
  onCreateTask,
  onToggleTaskStatus,
  onDeleteTask,
}: OverviewViewProps) {
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [taskPlotId, setTaskPlotId] = useState(plots[0]?.id ?? '');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('Irrigation');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Normal');
  const [taskDue, setTaskDue] = useState(() => new Date().toISOString().slice(0, 10));
  const [taskAuthor, setTaskAuthor] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  const totalAreaHa = plots.reduce((acc, p) => acc + p.areaHa, 0);
  const openTasks = tasks.filter((t) => t.status !== 'Completed').length;
  const attentionPlots = plots.filter((p) => p.healthStatus !== 'Optimal').length;

  async function handleQuickTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetPlotId = taskPlotId || plots[0]?.id;
    if (!targetPlotId || !taskTitle.trim()) return;
    setSubmittingTask(true);
    try {
      await onCreateTask({
        plotId: targetPlotId,
        title: taskTitle.trim(),
        category: taskCategory,
        priority: taskPriority,
        dueDate: taskDue,
        assignedBy: taskAuthor.trim() || 'Community Grower',
        notes: '',
      });
      setTaskTitle('');
      setShowQuickTask(false);
    } finally {
      setSubmittingTask(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero 2-column split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <p className="text-xs font-medium text-emerald-700 tracking-wide">
              Open Community Agronomy Registry
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-[1.15] [text-wrap:balance]">
              Open-access farm telemetry and AI crop intelligence.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              Anyone can inspect shared field moisture, soil pH, and NPK logs, schedule irrigation cycles, and run Gemini agronomy diagnostics grounded in live plot records.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('assistant')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Ask Smart Assistant</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('plots')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Browse Field Plots</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative rounded-xl overflow-hidden border border-slate-200 min-h-[260px]">
          <ResilientImage
            src="/src/assets/images/hero_agronomy_field_1795499331310.jpg"
            alt="Precision irrigated agricultural crop rows at sunrise"
            fallbackTitle="Precision Irrigated Field Rows"
            className="w-full h-full lg:h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
            <p className="text-xs text-slate-200">
              Shared SQLite Database · Open Read &amp; Write Access
            </p>
            <p className="text-sm font-semibold text-white mt-0.5">
              {plots.length} active plots · {attentionPlots} flagged for review
            </p>
          </div>
        </div>
      </section>

      {/* Full-width 4-column KPI strip */}
      <section
        aria-label="Farm database metrics"
        className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
      >
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Shared Field Plots</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {loading ? '—' : plots.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {attentionPlots === 0 ? 'All nominal' : `${attentionPlots} need attention`}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Total Monitored Area</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {loading ? '—' : `${totalAreaHa.toFixed(1)} ha`}
          </div>
          <div className="mt-1 text-xs text-slate-500">Across active crop blocks</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Open Field Tasks</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {loading ? '—' : openTasks}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {tasks.length} total scheduled
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Community Advisories</div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {loading ? '—' : advisoryCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Saved AI &amp; grower notes</div>
        </div>
      </section>

      {/* 2-Column Operational Workspace */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Field Telemetry Table */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Live Field Telemetry
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shared plot conditions updated by community growers
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenLogModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Log Reading</span>
            </button>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : plots.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-600">
                No field plots in the shared database yet.
              </p>
              <button
                type="button"
                onClick={() => onOpenLogModal()}
                className="mt-4 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                Register First Plot
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                    <th className="py-2.5 pl-6 pr-3">Plot &amp; Crop</th>
                    <th className="py-2.5 px-3 text-right">Moisture</th>
                    <th className="py-2.5 px-3 text-right">pH</th>
                    <th className="py-2.5 px-3 text-right">Temp</th>
                    <th className="py-2.5 px-3">Condition</th>
                    <th className="py-2.5 pl-3 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {plots.map((plot) => (
                    <tr
                      key={plot.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 pl-6 pr-3">
                        <button
                          type="button"
                          onClick={() => onInspectPlot(plot.id)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {plot.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {plot.crop} · {plot.growthStage} · {formatRelativeTime(plot.updatedAt)}
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800">
                        {plot.moisturePct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800">
                        {plot.ph.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800">
                        {plot.tempC.toFixed(1)}°C
                      </td>
                      <td className="py-3 px-3">
                        <HealthStatusText status={plot.healthStatus} />
                      </td>
                      <td className="py-3 pl-3 pr-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onAskAssistantForPlot(plot.id)}
                          className="text-xs font-medium text-emerald-700 hover:text-emerald-900 mr-3 cursor-pointer"
                        >
                          Diagnose
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectPlot(plot.id)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Shared Field Schedule */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Shared Field Tasks
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click status icon to advance workflow
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!taskPlotId && plots[0]) setTaskPlotId(plots[0].id);
                setShowQuickTask((prev) => !prev);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {showQuickTask ? 'Cancel' : 'Add Task'}
            </button>
          </div>

          {showQuickTask && (
            <form
              onSubmit={handleQuickTaskSubmit}
              className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Plot
                </label>
                <select
                  value={taskPlotId || plots[0]?.id || ''}
                  onChange={(e) => setTaskPlotId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                >
                  {plots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.crop})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Task Action
                </label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Run 2-hour drip irrigation cycle"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-900"
                  >
                    <option value="Irrigation">Irrigation</option>
                    <option value="Fertilization">Fertilization</option>
                    <option value="Scouting">Scouting</option>
                    <option value="Harvest">Harvest</option>
                    <option value="Soil Prep">Soil Prep</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-900"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={taskAuthor}
                    onChange={(e) => setTaskAuthor(e.target.value)}
                    placeholder="Grower name"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-900"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submittingTask || plots.length === 0}
                className="w-full py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {submittingTask ? 'Saving...' : 'Save Shared Task'}
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No field tasks scheduled.
              </div>
            ) : (
              tasks.slice(0, 7).map((task) => {
                const nextStatus = NEXT_STATUS[task.status];
                return (
                  <div
                    key={task.id}
                    className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTaskStatus(task.id, nextStatus)}
                      title={`Mark as ${nextStatus}`}
                      className="mt-0.5 text-slate-500 hover:text-emerald-700 shrink-0 cursor-pointer"
                    >
                      {task.status === 'Completed' ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                      ) : task.status === 'In Progress' ? (
                        <Clock className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium leading-snug ${
                          task.status === 'Completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="mt-1 text-xs text-slate-500 truncate">
                        <span>{task.plotName ?? 'Plot'}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{task.category}</span>
                        <span aria-hidden="true"> · </span>
                        <span
                          className={
                            task.priority === 'Urgent'
                              ? 'text-red-700 font-medium'
                              : task.priority === 'High'
                                ? 'text-amber-700 font-medium'
                                : ''
                          }
                        >
                          {task.priority}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums">{task.dueDate}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={`Delete task ${task.title}`}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
