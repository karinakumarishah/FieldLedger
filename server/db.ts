import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  Advisory,
  AdvisoryUrgency,
  FarmPlot,
  FieldTask,
  HealthStatus,
  SensorLog,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  WorkspaceSnapshot,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'fieldledger.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS plots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    crop TEXT NOT NULL,
    variety TEXT NOT NULL,
    growth_stage TEXT NOT NULL,
    area_ha REAL NOT NULL,
    soil_type TEXT NOT NULL,
    moisture_pct REAL NOT NULL,
    ph REAL NOT NULL,
    nitrogen_ppm INTEGER NOT NULL,
    phosphorus_ppm INTEGER NOT NULL,
    potassium_ppm INTEGER NOT NULL,
    temp_c REAL NOT NULL,
    health_status TEXT NOT NULL,
    last_irrigated TEXT NOT NULL,
    contributor TEXT NOT NULL,
    image_url TEXT NOT NULL,
    notes TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sensor_logs (
    id TEXT PRIMARY KEY,
    plot_id TEXT NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    moisture_pct REAL NOT NULL,
    ph REAL NOT NULL,
    temp_c REAL NOT NULL,
    ec_ms REAL NOT NULL,
    rainfall_mm REAL NOT NULL,
    note TEXT NOT NULL,
    logged_by TEXT NOT NULL,
    recorded_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    plot_id TEXT NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    due_date TEXT NOT NULL,
    assigned_by TEXT NOT NULL,
    notes TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS advisories (
    id TEXT PRIMARY KEY,
    plot_id TEXT REFERENCES plots(id) ON DELETE SET NULL,
    plot_name TEXT NOT NULL,
    crop TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    irrigation_plan TEXT NOT NULL,
    nutrient_plan TEXT NOT NULL,
    pest_risk TEXT NOT NULL,
    urgency TEXT NOT NULL,
    author TEXT NOT NULL,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

function seedInitialData(): void {
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM plots').get() as { count: number };
  if (countRow.count > 0) {
    return;
  }

  const now = Date.now();
  const isoAgo = (hours: number) => new Date(now - hours * 3600_000).toISOString();
  const isoAhead = (days: number) => new Date(now + days * 86400_000).toISOString().slice(0, 10);

  const insertPlot = db.prepare(`
    INSERT INTO plots (
      id, name, region, crop, variety, growth_stage, area_ha, soil_type,
      moisture_pct, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, temp_c,
      health_status, last_irrigated, contributor, image_url, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedPlots = [
    [
      'plot-north-wheat',
      'North Ridge Block A',
      'Salinas Valley',
      'Winter Wheat',
      'Hard Red Paso',
      'Heading',
      18.4,
      'Clay Loam',
      42.5,
      6.6,
      54,
      36,
      148,
      19.4,
      'Optimal',
      '2026-11-22',
      'Elena Alvarez',
      '/src/assets/images/crop_wheat_plot_1795499332277.jpg',
      'Uniform stand density across upper bench; flag leaf health strong after foliar boron.',
      isoAgo(3),
    ],
    [
      'plot-greenhouse-tomato',
      'South Trellis House 2',
      'Central Coast',
      'Heirloom Tomato',
      'Cherokee Purple',
      'Fruiting',
      2.6,
      'Sandy Loam',
      31.2,
      6.1,
      46,
      42,
      172,
      23.8,
      'Watch',
      '2026-11-21',
      'Marcus Chen',
      '/src/assets/images/crop_tomato_vines_1795499332447.jpg',
      'Slight afternoon wilting on rows 7-10; drip emitter pressure check scheduled.',
      isoAgo(5),
    ],
    [
      'plot-west-orchard',
      'West Terrace Orchard',
      'Ventura Foothills',
      'Hass Avocado',
      'Hass on Duke 7',
      'Fruit Set',
      11.2,
      'Silty Loam',
      24.8,
      6.9,
      38,
      28,
      134,
      21.6,
      'Action Needed',
      '2026-11-18',
      'Priya Nair',
      '/src/assets/images/crop_orchard_rows_1795499332904.jpg',
      'Root-zone tensiometer reading 48 kPa at 30 cm depth; zinc and deep soak recommended.',
      isoAgo(2),
    ],
    [
      'plot-riverbend-brassica',
      'Riverbend Parcel 4',
      'San Joaquin North',
      'Romaine Lettuce',
      'Green Towers',
      'Vegetative',
      9.5,
      'Alluvial Loam',
      51.0,
      6.7,
      68,
      45,
      165,
      17.9,
      'Optimal',
      '2026-11-23',
      'David Okafor',
      '/src/assets/images/hero_agronomy_field_1795499331310.jpg',
      'Subsurface drip running 45 min cycles at dawn; zero downy mildew lesions detected.',
      isoAgo(1),
    ],
    [
      'plot-east-citrus',
      'East Slope Citrus',
      'Riverside Basin',
      'Valencia Orange',
      'Olinda Valencia',
      'Maturation',
      14.0,
      'Sandy Clay Loam',
      36.4,
      7.1,
      44,
      31,
      142,
      22.5,
      'Optimal',
      '2026-11-22',
      'Hannah Lindqvist',
      '/src/assets/images/crop_orchard_rows_1795499332904.jpg',
      'Brix tracking 11.4 on south canopy samples; potassium top-dress completed last week.',
      isoAgo(8),
    ],
    [
      'plot-mesa-covercrop',
      'Mesa Rotation Strip',
      'Salinas Valley',
      'Crimson Clover & Rye',
      'Cover Mix B',
      'Vegetative',
      6.8,
      'Loam',
      29.5,
      5.8,
      32,
      24,
      118,
      18.2,
      'Watch',
      '2026-11-19',
      'Samir Patel',
      '/src/assets/images/crop_wheat_plot_1795499332277.jpg',
      'Soil pH drifting slightly acidic on west edge; agricultural lime trial planned.',
      isoAgo(14),
    ],
  ];

  for (const row of seedPlots) {
    insertPlot.run(...row);
  }

  const insertLog = db.prepare(`
    INSERT INTO sensor_logs (
      id, plot_id, moisture_pct, ph, temp_c, ec_ms, rainfall_mm, note, logged_by, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedLogs = [
    ['log-1', 'plot-north-wheat', 40.2, 6.6, 18.5, 1.2, 0.0, 'Morning probe check before wind shift.', 'Elena Alvarez', isoAgo(48)],
    ['log-2', 'plot-north-wheat', 44.1, 6.6, 19.0, 1.3, 4.2, 'Light overnight shower replenished topsoil.', 'Elena Alvarez', isoAgo(24)],
    ['log-3', 'plot-north-wheat', 42.5, 6.6, 19.4, 1.2, 0.0, 'Steady moisture retention at 20 cm depth.', 'Elena Alvarez', isoAgo(3)],
    ['log-4', 'plot-greenhouse-tomato', 36.0, 6.2, 22.4, 1.8, 0.0, 'Post-fertigation EC nominal.', 'Marcus Chen', isoAgo(36)],
    ['log-5', 'plot-greenhouse-tomato', 31.2, 6.1, 23.8, 1.9, 0.0, 'Midday drop on south rows; check manifold valve.', 'Marcus Chen', isoAgo(5)],
    ['log-6', 'plot-west-orchard', 28.4, 6.9, 20.8, 1.1, 0.0, 'Dry Santa Ana breeze increasing ET0.', 'Priya Nair', isoAgo(28)],
    ['log-7', 'plot-west-orchard', 24.8, 6.9, 21.6, 1.1, 0.0, 'Moisture dipped below 26% threshold.', 'Priya Nair', isoAgo(2)],
    ['log-8', 'plot-riverbend-brassica', 51.0, 6.7, 17.9, 1.4, 0.0, 'Post-irrigation saturation even across beds.', 'David Okafor', isoAgo(1)],
    ['log-9', 'plot-east-citrus', 36.4, 7.1, 22.5, 1.5, 0.0, 'Canopy sensor calibrated cleanly.', 'Hannah Lindqvist', isoAgo(8)],
    ['log-10', 'plot-mesa-covercrop', 29.5, 5.8, 18.2, 0.9, 1.5, 'Acidic pocket confirmed near drainage swale.', 'Samir Patel', isoAgo(14)],
  ];

  for (const row of seedLogs) {
    insertLog.run(...row);
  }

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, plot_id, title, category, priority, status, due_date, assigned_by, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedTasks = [
    ['task-1', 'plot-west-orchard', 'Run 4-hour deep drip irrigation cycle', 'Irrigation', 'Urgent', 'Pending', isoAhead(0), 'Priya Nair', 'Target 32% volumetric moisture at 30 cm root zone.', isoAgo(2)],
    ['task-2', 'plot-greenhouse-tomato', 'Inspect drip emitter pressure on rows 7-10', 'Irrigation', 'High', 'In Progress', isoAhead(1), 'Marcus Chen', 'Flush lateral lines and verify 15 PSI regulator.', isoAgo(5)],
    ['task-3', 'plot-mesa-covercrop', 'Broadcast calcitic lime at 1.2 t/ha on west edge', 'Soil Prep', 'Normal', 'Pending', isoAhead(3), 'Samir Patel', 'Raise soil pH from 5.8 toward 6.4 target.', isoAgo(12)],
    ['task-4', 'plot-north-wheat', 'Scout flag leaves for stripe rust lesions', 'Scouting', 'Normal', 'Completed', isoAhead(-1), 'Elena Alvarez', 'Checked 40 random stems; zero pustules found.', isoAgo(20)],
    ['task-5', 'plot-east-citrus', 'Collect pre-harvest Brix and acid ratio samples', 'Harvest', 'Normal', 'Pending', isoAhead(4), 'Hannah Lindqvist', 'Sample 20 fruit from north and south quadrants.', isoAgo(7)],
    ['task-6', 'plot-riverbend-brassica', 'Side-dress calcium nitrate prior to head closure', 'Fertilization', 'High', 'Pending', isoAhead(2), 'David Okafor', 'Apply 25 kg N/ha via fertigation injector.', isoAgo(4)],
  ];

  for (const row of seedTasks) {
    insertTask.run(...row);
  }

  const insertAdvisory = db.prepare(`
    INSERT INTO advisories (
      id, plot_id, plot_name, crop, title, summary, irrigation_plan, nutrient_plan,
      pest_risk, urgency, author, helpful_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedAdvisories = [
    [
      'adv-1',
      'plot-west-orchard',
      'West Terrace Orchard',
      'Hass Avocado',
      'Root-zone moisture recovery and zinc foliar timing',
      'Soil moisture has fallen to 24.8% in silty loam during active fruit set, raising stress risk for shallow feeder roots. Deep pulsed irrigation paired with foliar zinc sulfate will stabilize fruit retention.',
      'Apply two 2-hour pulsed drip sets separated by a 6-hour soak window to move wetting front to 45 cm without runoff.',
      'Foliar chelated zinc (0.5%) early morning; hold nitrogen top-dress until moisture recovers above 30%.',
      'Monitor for persea mite bronzing on sun-exposed leaves during dry wind events.',
      'Immediate',
      'Priya Nair',
      14,
      isoAgo(2),
    ],
    [
      'adv-2',
      'plot-greenhouse-tomato',
      'South Trellis House 2',
      'Heirloom Tomato',
      'Preventing blossom-end rot during peak fruiting load',
      'Rapid fruit sizing combined with uneven lateral pressure on rows 7-10 can restrict calcium transport to distal fruit tissue. Stabilizing emitter uniformity and moderate EC is recommended.',
      'Split daily irrigation into 4 short 12-minute pulses between 07:00 and 15:00 to prevent midday moisture swings.',
      'Keep potassium-to-calcium ratio balanced; supplement 40 ppm soluble calcium nitrate in feed tank.',
      'Inspect lower canopy air circulation to prevent Botrytis gray mold in humid mornings.',
      'Monitor',
      'Marcus Chen',
      11,
      isoAgo(6),
    ],
    [
      'adv-3',
      'plot-north-wheat',
      'North Ridge Block A',
      'Winter Wheat',
      'Heading-stage moisture conservation for grain fill',
      'Clay loam moisture at 42.5% and pH 6.6 are right inside the optimal envelope for heading winter wheat. Avoid over-watering to preserve root aeration and protein concentration.',
      'Hold irrigation for 5 days unless soil moisture drops below 34% or daytime highs exceed 26°C.',
      'Nitrogen at 54 ppm is sufficient through early grain fill; no additional granular N required.',
      'Routine aphid and stripe rust check along windward field border every 4 days.',
      'Routine',
      'Elena Alvarez',
      9,
      isoAgo(16),
    ],
    [
      'adv-4',
      'plot-mesa-covercrop',
      'Mesa Rotation Strip',
      'Crimson Clover & Rye',
      'Correcting mild soil acidity for legume nodulation',
      'At pH 5.8, Rhizobium nitrogen fixation efficiency in crimson clover declines noticeably. Incorporating fine-grind agricultural lime before winter rains maximizes spring biomass.',
      'Standard rain-fed moisture maintenance; irrigate 15 mm lightly after lime application to speed reaction.',
      'Apply 1.2 tonnes/ha fine calcitic limestone; follow with rhizobial soil health check in 30 days.',
      'Low pest pressure; watch slug activity along damp swale margins.',
      'Monitor',
      'Samir Patel',
      7,
      isoAgo(22),
    ],
  ];

  for (const row of seedAdvisories) {
    insertAdvisory.run(...row);
  }
}

seedInitialData();

function mapPlotRow(r: Record<string, unknown>): FarmPlot {
  return {
    id: String(r.id),
    name: String(r.name),
    region: String(r.region),
    crop: String(r.crop),
    variety: String(r.variety),
    growthStage: String(r.growth_stage),
    areaHa: Number(r.area_ha),
    soilType: String(r.soil_type),
    moisturePct: Number(r.moisture_pct),
    ph: Number(r.ph),
    nitrogenPpm: Number(r.nitrogen_ppm),
    phosphorusPpm: Number(r.phosphorus_ppm),
    potassiumPpm: Number(r.potassium_ppm),
    tempC: Number(r.temp_c),
    healthStatus: r.health_status as HealthStatus,
    lastIrrigated: String(r.last_irrigated),
    contributor: String(r.contributor),
    imageUrl: String(r.image_url),
    notes: String(r.notes),
    updatedAt: String(r.updated_at),
  };
}

function mapLogRow(r: Record<string, unknown>): SensorLog {
  return {
    id: String(r.id),
    plotId: String(r.plot_id),
    plotName: r.plot_name ? String(r.plot_name) : undefined,
    moisturePct: Number(r.moisture_pct),
    ph: Number(r.ph),
    tempC: Number(r.temp_c),
    ecMs: Number(r.ec_ms),
    rainfallMm: Number(r.rainfall_mm),
    note: String(r.note),
    loggedBy: String(r.logged_by),
    recordedAt: String(r.recorded_at),
  };
}

function mapTaskRow(r: Record<string, unknown>): FieldTask {
  return {
    id: String(r.id),
    plotId: String(r.plot_id),
    plotName: r.plot_name ? String(r.plot_name) : undefined,
    title: String(r.title),
    category: r.category as TaskCategory,
    priority: r.priority as TaskPriority,
    status: r.status as TaskStatus,
    dueDate: String(r.due_date),
    assignedBy: String(r.assigned_by),
    notes: String(r.notes),
    createdAt: String(r.created_at),
  };
}

function mapAdvisoryRow(r: Record<string, unknown>): Advisory {
  return {
    id: String(r.id),
    plotId: r.plot_id ? String(r.plot_id) : null,
    plotName: String(r.plot_name),
    crop: String(r.crop),
    title: String(r.title),
    summary: String(r.summary),
    irrigationPlan: String(r.irrigation_plan),
    nutrientPlan: String(r.nutrient_plan),
    pestRisk: String(r.pest_risk),
    urgency: r.urgency as AdvisoryUrgency,
    author: String(r.author),
    helpfulCount: Number(r.helpful_count),
    createdAt: String(r.created_at),
  };
}

export function getWorkspaceSnapshot(): WorkspaceSnapshot {
  const plotRows = db.prepare('SELECT * FROM plots ORDER BY updated_at DESC').all() as Record<string, unknown>[];
  const logRows = db
    .prepare(
      `SELECT l.*, p.name AS plot_name
       FROM sensor_logs l
       LEFT JOIN plots p ON p.id = l.plot_id
       ORDER BY l.recorded_at DESC
       LIMIT 60`
    )
    .all() as Record<string, unknown>[];
  const taskRows = db
    .prepare(
      `SELECT t.*, p.name AS plot_name
       FROM tasks t
       LEFT JOIN plots p ON p.id = t.plot_id
       ORDER BY CASE t.status WHEN 'Pending' THEN 0 WHEN 'In Progress' THEN 1 ELSE 2 END, t.due_date ASC`
    )
    .all() as Record<string, unknown>[];
  const advisoryRows = db
    .prepare('SELECT * FROM advisories ORDER BY created_at DESC LIMIT 60')
    .all() as Record<string, unknown>[];

  return {
    plots: plotRows.map(mapPlotRow),
    sensorLogs: logRows.map(mapLogRow),
    tasks: taskRows.map(mapTaskRow),
    advisories: advisoryRows.map(mapAdvisoryRow),
  };
}

export function getPlotById(id: string): FarmPlot | null {
  const row = db.prepare('SELECT * FROM plots WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapPlotRow(row) : null;
}

export function getRecentLogsForPlot(plotId: string, limit = 6): SensorLog[] {
  const rows = db
    .prepare('SELECT * FROM sensor_logs WHERE plot_id = ? ORDER BY recorded_at DESC LIMIT ?')
    .all(plotId, limit) as Record<string, unknown>[];
  return rows.map(mapLogRow);
}

export function createPlot(input: Omit<FarmPlot, 'id' | 'updatedAt'>): FarmPlot {
  const id = `plot-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO plots (
      id, name, region, crop, variety, growth_stage, area_ha, soil_type,
      moisture_pct, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, temp_c,
      health_status, last_irrigated, contributor, image_url, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.region,
    input.crop,
    input.variety,
    input.growthStage,
    input.areaHa,
    input.soilType,
    input.moisturePct,
    input.ph,
    input.nitrogenPpm,
    input.phosphorusPpm,
    input.potassiumPpm,
    input.tempC,
    input.healthStatus,
    input.lastIrrigated,
    input.contributor,
    input.imageUrl,
    input.notes,
    now
  );

  db.prepare(`
    INSERT INTO sensor_logs (
      id, plot_id, moisture_pct, ph, temp_c, ec_ms, rainfall_mm, note, logged_by, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `log-${crypto.randomUUID().slice(0, 8)}`,
    id,
    input.moisturePct,
    input.ph,
    input.tempC,
    1.3,
    0,
    'Initial baseline field entry.',
    input.contributor,
    now
  );

  return getPlotById(id)!;
}

export function updatePlot(
  id: string,
  updates: Partial<
    Pick<
      FarmPlot,
      | 'growthStage'
      | 'healthStatus'
      | 'lastIrrigated'
      | 'moisturePct'
      | 'ph'
      | 'tempC'
      | 'nitrogenPpm'
      | 'phosphorusPpm'
      | 'potassiumPpm'
      | 'notes'
    >
  >
): FarmPlot | null {
  const existing = getPlotById(id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const next = {
    growthStage: updates.growthStage ?? existing.growthStage,
    healthStatus: updates.healthStatus ?? existing.healthStatus,
    lastIrrigated: updates.lastIrrigated ?? existing.lastIrrigated,
    moisturePct: updates.moisturePct ?? existing.moisturePct,
    ph: updates.ph ?? existing.ph,
    tempC: updates.tempC ?? existing.tempC,
    nitrogenPpm: updates.nitrogenPpm ?? existing.nitrogenPpm,
    phosphorusPpm: updates.phosphorusPpm ?? existing.phosphorusPpm,
    potassiumPpm: updates.potassiumPpm ?? existing.potassiumPpm,
    notes: updates.notes ?? existing.notes,
  };

  db.prepare(`
    UPDATE plots
    SET growth_stage = ?, health_status = ?, last_irrigated = ?,
        moisture_pct = ?, ph = ?, temp_c = ?,
        nitrogen_ppm = ?, phosphorus_ppm = ?, potassium_ppm = ?,
        notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.growthStage,
    next.healthStatus,
    next.lastIrrigated,
    next.moisturePct,
    next.ph,
    next.tempC,
    next.nitrogenPpm,
    next.phosphorusPpm,
    next.potassiumPpm,
    next.notes,
    now,
    id
  );

  return getPlotById(id);
}

export function deletePlot(id: string): boolean {
  const res = db.prepare('DELETE FROM plots WHERE id = ?').run(id);
  return res.changes > 0;
}

export function createSensorLog(input: {
  plotId: string;
  moisturePct: number;
  ph: number;
  tempC: number;
  ecMs: number;
  rainfallMm: number;
  note: string;
  loggedBy: string;
  healthStatus?: HealthStatus;
}): SensorLog | null {
  const plot = getPlotById(input.plotId);
  if (!plot) {
    return null;
  }

  const id = `log-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  db.exec('BEGIN');
  try {
    db.prepare(`
      INSERT INTO sensor_logs (
        id, plot_id, moisture_pct, ph, temp_c, ec_ms, rainfall_mm, note, logged_by, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.plotId,
      input.moisturePct,
      input.ph,
      input.tempC,
      input.ecMs,
      input.rainfallMm,
      input.note,
      input.loggedBy,
      now
    );

    const derivedStatus: HealthStatus =
      input.healthStatus ??
      (input.moisturePct < 26 || input.ph < 5.5 || input.ph > 7.8
        ? 'Action Needed'
        : input.moisturePct < 33 || input.ph < 6.0 || input.ph > 7.4
          ? 'Watch'
          : 'Optimal');

    db.prepare(`
      UPDATE plots
      SET moisture_pct = ?, ph = ?, temp_c = ?, health_status = ?, updated_at = ?
      WHERE id = ?
    `).run(input.moisturePct, input.ph, input.tempC, derivedStatus, now, input.plotId);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const row = db
    .prepare(
      `SELECT l.*, p.name AS plot_name
       FROM sensor_logs l
       LEFT JOIN plots p ON p.id = l.plot_id
       WHERE l.id = ?`
    )
    .get(id) as Record<string, unknown>;

  return mapLogRow(row);
}

export function createTask(input: {
  plotId: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string;
  assignedBy: string;
  notes: string;
}): FieldTask | null {
  const plot = getPlotById(input.plotId);
  if (!plot) {
    return null;
  }

  const id = `task-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks (
      id, plot_id, title, category, priority, status, due_date, assigned_by, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)
  `).run(id, input.plotId, input.title, input.category, input.priority, input.dueDate, input.assignedBy, input.notes, now);

  const row = db
    .prepare(
      `SELECT t.*, p.name AS plot_name
       FROM tasks t
       LEFT JOIN plots p ON p.id = t.plot_id
       WHERE t.id = ?`
    )
    .get(id) as Record<string, unknown>;

  return mapTaskRow(row);
}

export function updateTaskStatus(id: string, status: TaskStatus): FieldTask | null {
  const res = db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
  if (res.changes === 0) {
    return null;
  }
  const row = db
    .prepare(
      `SELECT t.*, p.name AS plot_name
       FROM tasks t
       LEFT JOIN plots p ON p.id = t.plot_id
       WHERE t.id = ?`
    )
    .get(id) as Record<string, unknown>;
  return mapTaskRow(row);
}

export function deleteTask(id: string): boolean {
  const res = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return res.changes > 0;
}

export function createAdvisory(input: {
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
}): Advisory {
  const id = `adv-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  let verifiedPlotId: string | null = null;
  if (input.plotId) {
    const found = getPlotById(input.plotId);
    if (found) {
      verifiedPlotId = found.id;
    }
  }

  db.prepare(`
    INSERT INTO advisories (
      id, plot_id, plot_name, crop, title, summary, irrigation_plan,
      nutrient_plan, pest_risk, urgency, author, helpful_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    id,
    verifiedPlotId,
    input.plotName,
    input.crop,
    input.title,
    input.summary,
    input.irrigationPlan,
    input.nutrientPlan,
    input.pestRisk,
    input.urgency,
    input.author,
    now
  );

  const row = db.prepare('SELECT * FROM advisories WHERE id = ?').get(id) as Record<string, unknown>;
  return mapAdvisoryRow(row);
}

export function incrementAdvisoryHelpful(id: string): Advisory | null {
  const res = db.prepare('UPDATE advisories SET helpful_count = helpful_count + 1 WHERE id = ?').run(id);
  if (res.changes === 0) {
    return null;
  }
  const row = db.prepare('SELECT * FROM advisories WHERE id = ?').get(id) as Record<string, unknown>;
  return mapAdvisoryRow(row);
}
