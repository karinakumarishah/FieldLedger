import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sprout,
} from 'lucide-react';
import type { AdvisoryUrgency, HealthStatus, SensorLog } from '../types';

export function ResilientImage({
  src,
  alt,
  fallbackTitle,
  className = '',
}: {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-800 text-slate-200 p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sprout className="w-8 h-8 text-emerald-400 mb-2" aria-hidden="true" />
        <span className="text-sm font-medium text-center text-slate-100">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function HealthStatusText({ status }: { status: HealthStatus }) {
  if (status === 'Optimal') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Optimal</span>
      </span>
    );
  }
  if (status === 'Watch') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Watch</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Action Needed</span>
    </span>
  );
}

export function UrgencyText({ urgency }: { urgency: AdvisoryUrgency }) {
  if (urgency === 'Immediate') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Immediate</span>
      </span>
    );
  }
  if (urgency === 'Monitor') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Monitor</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Routine</span>
    </span>
  );
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const diffSec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 14) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MoistureSparkline({ logs }: { logs: SensorLog[] }) {
  const ordered = [...logs].reverse();
  if (ordered.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
        Log at least two readings to view moisture trend.
      </div>
    );
  }

  const width = 420;
  const height = 96;
  const padX = 12;
  const padY = 12;
  const minVal = Math.max(0, Math.min(...ordered.map((l) => l.moisturePct)) - 5);
  const maxVal = Math.min(100, Math.max(...ordered.map((l) => l.moisturePct)) + 5);
  const range = Math.max(10, maxVal - minVal);

  const points = ordered.map((l, idx) => {
    const x = padX + (idx / (ordered.length - 1)) * (width - padX * 2);
    const y = height - padY - ((l.moisturePct - minVal) / range) * (height - padY * 2);
    return { x, y, val: l.moisturePct, date: l.recordedAt };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-24 overflow-visible"
        role="img"
        aria-label="Soil moisture trend"
      >
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="#E2E8F0"
          strokeWidth="1"
        />
        <line
          x1={padX}
          y1={padY}
          x2={width - padX}
          y2={padY}
          stroke="#F1F5F9"
          strokeWidth="1"
        />
        <polyline
          fill="none"
          stroke="#15803D"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="3.5"
            fill="#FFFFFF"
            stroke="#15803D"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums mt-1">
        <span>{formatRelativeTime(ordered[0].recordedAt)} ({ordered[0].moisturePct.toFixed(1)}%)</span>
        <span>Latest ({ordered[ordered.length - 1].moisturePct.toFixed(1)}%)</span>
      </div>
    </div>
  );
}
