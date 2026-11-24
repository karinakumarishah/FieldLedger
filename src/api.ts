import type {
  Advisory,
  AdvisoryUrgency,
  AssistantAnalysisResult,
  FarmPlot,
  FieldTask,
  HealthStatus,
  SensorLog,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  WorkspaceSnapshot,
} from './types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error === 'string' && data.error.length > 0
        ? data.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function fetchWorkspace(): Promise<WorkspaceSnapshot> {
  return requestJson<WorkspaceSnapshot>('/api/workspace');
}

export function createPlotEntry(payload: {
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
}): Promise<FarmPlot> {
  return requestJson<FarmPlot>('/api/plots', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePlotEntry(
  id: string,
  payload: Partial<Pick<FarmPlot, 'growthStage' | 'healthStatus' | 'lastIrrigated' | 'notes'>>
): Promise<FarmPlot> {
  return requestJson<FarmPlot>(`/api/plots/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deletePlotEntry(id: string): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(`/api/plots/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function createSensorLogEntry(payload: {
  plotId: string;
  moisturePct: number;
  ph: number;
  tempC: number;
  ecMs: number;
  rainfallMm: number;
  note: string;
  loggedBy: string;
  healthStatus?: HealthStatus;
}): Promise<SensorLog> {
  return requestJson<SensorLog>('/api/logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createTaskEntry(payload: {
  plotId: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string;
  assignedBy: string;
  notes: string;
}): Promise<FieldTask> {
  return requestJson<FieldTask>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTaskStatusEntry(id: string, status: TaskStatus): Promise<FieldTask> {
  return requestJson<FieldTask>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function deleteTaskEntry(id: string): Promise<{ deleted: boolean }> {
  return requestJson<{ deleted: boolean }>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function createAdvisoryEntry(payload: {
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
}): Promise<Advisory> {
  return requestJson<Advisory>('/api/advisories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function upvoteAdvisory(id: string): Promise<Advisory> {
  return requestJson<Advisory>(`/api/advisories/${encodeURIComponent(id)}/helpful`, {
    method: 'POST',
  });
}

export function analyzeWithAssistant(payload: {
  question: string;
  plotId?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<AssistantAnalysisResult> {
  return requestJson<AssistantAnalysisResult>('/api/assistant/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
