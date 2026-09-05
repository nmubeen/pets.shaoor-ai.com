"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import type { PetWeightHistory, WeightPoint } from "@/lib/growth";

const th = "text-left text-[.68rem] uppercase tracking-[.05em] text-muted font-semibold px-4 py-2.5 border-b border-line";

/** Hand-rolled SVG line chart — no charting dependency for one simple plot. */
function WeightChart({ points }: { points: WeightPoint[] }) {
  const W = 640;
  const H = 220;
  const PAD_L = 44;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 28;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const times = points.map((p) => new Date(p.dateIso + "T00:00:00Z").getTime());
  const weights = points.map((p) => p.weightKg);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const wPad = Math.max((maxW - minW) * 0.2, 0.5);
  const yMin = Math.max(0, minW - wPad);
  const yMax = maxW + wPad;

  const xFor = (t: number) => PAD_L + (maxT === minT ? plotW / 2 : ((t - minT) / (maxT - minT)) * plotW);
  const yFor = (w: number) => PAD_T + plotH - ((w - yMin) / (yMax - yMin || 1)) * plotH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(new Date(p.dateIso + "T00:00:00Z").getTime()).toFixed(1)} ${yFor(p.weightKg).toFixed(1)}`)
    .join(" ");

  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Weight over time">
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W - PAD_R} y1={yFor(t)} y2={yFor(t)} stroke="var(--line)" strokeWidth="1" />
          <text x={PAD_L - 8} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--muted)">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      <text x={PAD_L} y={H - 8} fontSize="10" fill="var(--muted)" textAnchor="start">
        {points[0].date}
      </text>
      <text x={W - PAD_R} y={H - 8} fontSize="10" fill="var(--muted)" textAnchor="end">
        {points[points.length - 1].date}
      </text>
      {points.length > 1 && <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" />}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xFor(new Date(p.dateIso + "T00:00:00Z").getTime())}
          cy={yFor(p.weightKg)}
          r="4.5"
          fill="var(--primary)"
          stroke="var(--surface)"
          strokeWidth="1.5"
        >
          <title>
            {p.date} — {p.weightKg} kg
          </title>
        </circle>
      ))}
    </svg>
  );
}

export function GrowthPanel({
  history,
  initialPetId,
}: {
  history: PetWeightHistory[];
  /** Seeds the selected pet — set when arriving from a pet card's "Growth" quick-link (see HealthView). Falls back to the usual "first pet with data" default when unset or not found. */
  initialPetId?: string;
}) {
  const [petId, setPetId] = useState(
    () =>
      (initialPetId && history.find((h) => h.petId === initialPetId)?.petId) ??
      history.find((h) => h.points.length > 0)?.petId ??
      history[0]?.petId ??
      ""
  );
  const selected = history.find((h) => h.petId === petId);

  if (history.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted">
        Add a pet first — weight is captured when you log a visit.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 max-w-xs">
        <span className="text-[.68rem] uppercase tracking-[.05em] text-muted">Pet</span>
        <select
          value={petId}
          onChange={(e) => setPetId(e.target.value)}
          className="bg-paper border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary transition"
        >
          {history.map((h) => (
            <option key={h.petId} value={h.petId}>
              {h.petName}
              {h.points.length > 0 ? ` (${h.points.length})` : ""}
            </option>
          ))}
        </select>
      </label>

      {!selected || selected.points.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          No weight logged yet for {selected?.petName ?? "this pet"} — weight is captured when you log a visit with
          a weight entered.
        </Card>
      ) : (
        <Card className="p-5">
          <WeightChart points={selected.points} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-2">
                  <th className={th}>Date</th>
                  <th className={th}>Weight</th>
                </tr>
              </thead>
              <tbody>
                {[...selected.points].reverse().map((p, i) => (
                  <tr key={i} className="border-b border-line last:border-none">
                    <td className="px-4 py-2.5 text-muted">{p.date}</td>
                    <td className="px-4 py-2.5 font-mono">{p.weightKg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
