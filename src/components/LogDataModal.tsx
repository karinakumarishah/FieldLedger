import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { FarmPlot, HealthStatus } from '../types';

interface LogDataModalProps {
  open: boolean;
  plots: FarmPlot[];
  initialPlotId?: string;
  initialTab?: 'log' | 'plot';
  onClose: () => void;
  onSubmitLog: (payload: {
    plotId: string;
    moisturePct: number;
    ph: number;
    tempC: number;
    ecMs: number;
    rainfallMm: number;
    note: string;
    loggedBy: string;
    healthStatus?: HealthStatus;
  }) => Promise<void>;
  onSubmitPlot: (payload: {
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
  }) => Promise<void>;
}

export function LogDataModal({
  open,
  plots,
  initialPlotId,
  initialTab = 'log',
  onClose,
  onSubmitLog,
  onSubmitPlot,
}: LogDataModalProps) {
  const [tab, setTab] = useState<'log' | 'plot'>(initialTab);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sensor Log fields
  const [plotId, setPlotId] = useState(initialPlotId || plots[0]?.id || '');
  const [moisturePct, setMoisturePct] = useState('38.0');
  const [ph, setPh] = useState('6.5');
  const [tempC, setTempC] = useState('21.0');
  const [ecMs, setEcMs] = useState('1.3');
  const [rainfallMm, setRainfallMm] = useState('0');
  const [loggedBy, setLoggedBy] = useState('');
  const [logNote, setLogNote] = useState('');

  // New Plot fields
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [crop, setCrop] = useState('');
  const [variety, setVariety] = useState('');
  const [growthStage, setGrowthStage] = useState('Vegetative');
  const [areaHa, setAreaHa] = useState('4.5');
  const [soilType, setSoilType] = useState('Loam');
  const [plotMoisture, setPlotMoisture] = useState('40.0');
  const [plotPh, setPlotPh] = useState('6.6');
  const [plotTemp, setPlotTemp] = useState('20.0');
  const [nitrogen, setNitrogen] = useState('48');
  const [phosphorus, setPhosphorus] = useState('34');
  const [potassium, setPotassium] = useState('145');
  const [contributor, setContributor] = useState('');
  const [plotNotes, setPlotNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setTab(plots.length === 0 ? 'plot' : initialTab);
    setErrorMsg(null);
    const chosenId = initialPlotId || plots[0]?.id || '';
    setPlotId(chosenId);
    const match = plots.find((p) => p.id === chosenId);
    if (match) {
      setMoisturePct(String(match.moisturePct));
      setPh(String(match.ph));
      setTempC(String(match.tempC));
    }
  }, [open, initialPlotId, initialTab, plots]);

  if (!open) return null;

  async function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plotId) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSubmitLog({
        plotId,
        moisturePct: Number(moisturePct),
        ph: Number(ph),
        tempC: Number(tempC),
        ecMs: Number(ecMs),
        rainfallMm: Number(rainfallMm),
        note: logNote.trim() || 'Routine field telemetry update.',
        loggedBy: loggedBy.trim() || 'Community Grower',
      });
      setLogNote('');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to log reading.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePlotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !crop.trim()) {
      setErrorMsg('Plot name and crop are required.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSubmitPlot({
        name: name.trim(),
        region: region.trim() || 'Shared Cooperative',
        crop: crop.trim(),
        variety: variety.trim() || 'Standard',
        growthStage,
        areaHa: Number(areaHa) || 1,
        soilType,
        moisturePct: Number(plotMoisture) || 38,
        ph: Number(plotPh) || 6.5,
        nitrogenPpm: Number(nitrogen) || 45,
        phosphorusPpm: Number(phosphorus) || 32,
        potassiumPpm: Number(potassium) || 140,
        tempC: Number(plotTemp) || 20,
        lastIrrigated: new Date().toISOString().slice(0, 10),
        contributor: contributor.trim() || 'Community Grower',
        notes: plotNotes.trim() || 'Added to shared field database.',
      });
      setName('');
      setCrop('');
      setVariety('');
      setPlotNotes('');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to register plot.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Log Field Data"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('log')}
              disabled={plots.length === 0}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === 'log'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
              }`}
            >
              Log Sensor Reading
            </button>
            <button
              type="button"
              onClick={() => setTab('plot')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === 'plot'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register New Plot
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          {tab === 'log' ? (
            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Field Plot
                </label>
                <select
                  value={plotId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPlotId(id);
                    const p = plots.find((item) => item.id === id);
                    if (p) {
                      setMoisturePct(String(p.moisturePct));
                      setPh(String(p.ph));
                      setTempC(String(p.tempC));
                    }
                  }}
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                >
                  {plots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.crop}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Moisture (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={moisturePct}
                    onChange={(e) => setMoisturePct(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Soil pH
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="3"
                    max="10"
                    required
                    value={ph}
                    onChange={(e) => setPh(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="-15"
                    max="60"
                    required
                    value={tempC}
                    onChange={(e) => setTempC(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    EC (mS/cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="15"
                    value={ecMs}
                    onChange={(e) => setEcMs(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Rain (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="500"
                    value={rainfallMm}
                    onChange={(e) => setRainfallMm(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Logged By
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={loggedBy}
                    onChange={(e) => setLoggedBy(e.target.value)}
                    placeholder="Your name"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Field Observation Note
                </label>
                <textarea
                  rows={2}
                  maxLength={400}
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  placeholder="Describe soil appearance, leaf turgor, or irrigation check..."
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Reading'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePlotSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Plot Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., East Valley Block C"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g., Central Valley"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Crop *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    placeholder="e.g., Sweet Corn"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Variety
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                    placeholder="e.g., Jubilee Hybrid"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Stage
                  </label>
                  <select
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-2"
                  >
                    <option value="Seedling">Seedling</option>
                    <option value="Vegetative">Vegetative</option>
                    <option value="Flowering">Flowering</option>
                    <option value="Fruiting">Fruiting</option>
                    <option value="Heading">Heading</option>
                    <option value="Harvest Ready">Harvest Ready</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Area (ha)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={areaHa}
                    onChange={(e) => setAreaHa(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Soil Type
                  </label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-2"
                  >
                    <option value="Loam">Loam</option>
                    <option value="Clay Loam">Clay Loam</option>
                    <option value="Sandy Loam">Sandy Loam</option>
                    <option value="Silty Loam">Silty Loam</option>
                    <option value="Alluvial Loam">Alluvial Loam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Moisture (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={plotMoisture}
                    onChange={(e) => setPlotMoisture(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Soil pH
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={plotPh}
                    onChange={(e) => setPlotPh(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={plotTemp}
                    onChange={(e) => setPlotTemp(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    N (ppm)
                  </label>
                  <input
                    type="number"
                    value={nitrogen}
                    onChange={(e) => setNitrogen(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-2.5 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    P (ppm)
                  </label>
                  <input
                    type="number"
                    value={phosphorus}
                    onChange={(e) => setPhosphorus(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-2.5 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    K (ppm)
                  </label>
                  <input
                    type="number"
                    value={potassium}
                    onChange={(e) => setPotassium(e.target.value)}
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-2.5 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={contributor}
                    onChange={(e) => setContributor(e.target.value)}
                    placeholder="Grower"
                    className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={plotNotes}
                  onChange={(e) => setPlotNotes(e.target.value)}
                  placeholder="Soil baseline, irrigation system, or crop history..."
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  {saving ? 'Registering...' : 'Register Shared Plot'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
