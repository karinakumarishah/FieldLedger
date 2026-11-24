export type HealthStatus = 'Optimal' | 'Watch' | 'Action Needed';

export type TaskCategory =
  | 'Irrigation'
  | 'Fertilization'
  | 'Scouting'
  | 'Harvest'
  | 'Soil Prep';

export type TaskPriority = 'Normal' | 'High' | 'Urgent';

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export type AdvisoryUrgency = 'Routine' | 'Monitor' | 'Immediate';

export interface FarmPlot {
  id: string;
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
  healthStatus: HealthStatus;
  lastIrrigated: string;
  contributor: string;
  imageUrl: string;
  notes: string;
  updatedAt: string;
}

export interface SensorLog {
  id: string;
  plotId: string;
  plotName?: string;
  moisturePct: number;
  ph: number;
  tempC: number;
  ecMs: number;
  rainfallMm: number;
  note: string;
  loggedBy: string;
  recordedAt: string;
}

export interface FieldTask {
  id: string;
  plotId: string;
  plotName?: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignedBy: string;
  notes: string;
  createdAt: string;
}

export interface Advisory {
  id: string;
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
  helpfulCount: number;
  createdAt: string;
}

export interface WorkspaceSnapshot {
  plots: FarmPlot[];
  sensorLogs: SensorLog[];
  tasks: FieldTask[];
  advisories: Advisory[];
}

export interface AssistantAnalysisResult {
  title: string;
  summary: string;
  irrigationPlan: string;
  nutrientPlan: string;
  pestRisk: string;
  urgency: AdvisoryUrgency;
  recommendedTask: {
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    dueDays: number;
  };
}
