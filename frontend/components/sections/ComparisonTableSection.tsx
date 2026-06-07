'use client'

import { useState } from 'react'
import type { ComparisonTable } from '@/lib/types'
import { clsx } from 'clsx'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip,
} from 'recharts'

interface Props {
  data: ComparisonTable
}

type ViewMode = 'table' | 'radar'

function parseNumeric(v: string): number | null {
  const clean = v.replace(/[%$,x+B]/g, '').trim()
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

function rowExtremes(row: { metric: string; values: Record<string, string> }, entities: string[]) {
  const nums = entities.map(e => parseNumeric(row.values[e] ?? ''))
  if (nums.every(n => n === null)) return { best: null, worst: null }
  const validNums = nums.filter((n): n is number => n !== null)
  const max = Math.max(...validNums)
  const min = Math.min(...validNums)
  if (max === min) return { best: null, worst: null }
  return {
    best: entities[nums.indexOf(max)],
    worst: entities[nums.indexOf(min)],
  }
}

// Normalize each metric row to 0-100 scale for radar chart
function buildRadarData(data: ComparisonTable) {
  return data.rows.map(row => {
    const nums = data.entities.map(e => parseNumeric(row.values[e] ?? '') ?? 0)
    const max = Math.max(...nums, 1)
    const point: Record<string, number | string> = { subject: row.metric }
    data.entities.forEach((e, i) => {
      point[e] = Math.round((nums[i] / max) * 100)
    })
    return point
  })
}

const RADAR_COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#f87171', '#a78bfa']
const TOOLTIP_STYLE = {
  background: '#0f1824',
  border: '1px solid #1e2d40',
  borderRadius: 8,
  fontSize: 11,
  color: '#f1f5f9',
}

// Can we show radar? Need ≥2 entities and ≥3 rows with numeric data
function canShowRadar(data: ComparisonTable): boolean {
  if (data.entities.length < 2) return false
  const numericRows = data.rows.filter(row =>
    data.entities.some(e => parseNumeric(row.values[e] ?? '') !== null)
  )
  return numericRows.length >= 3
}

export function ComparisonTableSection({ data }: Props) {
  const [view, setView] = useState<ViewMode>('table')
  const showToggle = canShowRadar(data)

  if (!data.rows || data.rows.length === 0) {
    return <p className="text-slate-500 text-sm">No comparison data.</p>
  }

  return (
    <div>
      {/* Toggle */}
      {showToggle && (
        <div className="flex justify-end mb-4">
          <div className="flex rounded-lg overflow-hidden border border-surface-3">
            {(['table', 'radar'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-[11px] font-semibold transition-colors capitalize ${
                  view === v
                    ? 'bg-accent/20 text-accent'
                    : 'bg-surface-2 text-slate-500 hover:text-slate-300'
                }`}
              >
                {v === 'table' ? 'Table' : 'Radar'}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'table' ? (
        <TableView data={data} />
      ) : (
        <RadarView data={data} />
      )}
    </div>
  )
}

function TableView({ data }: { data: ComparisonTable }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2.5 pr-4 pl-1 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap border-b border-surface-3">
              Metric
            </th>
            {data.entities.map(e => (
              <th key={e} className="text-right py-2.5 px-3 text-xs font-bold text-accent uppercase tracking-wider whitespace-nowrap border-b border-surface-3">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => {
            const { best, worst } = rowExtremes(row, data.entities)
            return (
              <tr
                key={i}
                className={clsx(
                  'border-b border-surface-3/40 transition-colors hover:bg-surface-2/40',
                  i % 2 === 0 ? 'bg-transparent' : 'bg-surface-2/20',
                )}
              >
                <td className="py-3 pr-4 pl-1 text-slate-300 font-medium text-xs whitespace-nowrap">
                  {row.metric}
                </td>
                {data.entities.map(e => {
                  const isBest = e === best
                  const isWorst = e === worst
                  return (
                    <td
                      key={e}
                      className={clsx(
                        'py-3 px-3 text-right tabular-nums text-sm font-semibold whitespace-nowrap',
                        isBest && 'text-emerald-400',
                        isWorst && 'text-red-400',
                        !isBest && !isWorst && 'text-slate-200',
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {isBest && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                        {isWorst && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
                        {row.values[e] ?? '—'}
                      </span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex items-center gap-4 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-slate-500">Best in row</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[10px] text-slate-500">Lowest in row</span>
        </div>
      </div>
    </div>
  )
}

function RadarView({ data }: { data: ComparisonTable }) {
  const radarData = buildRadarData(data)

  return (
    <div>
      <p className="text-[10px] text-slate-600 mb-3 text-center">
        Values normalized to 0–100 scale per metric
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#1e2d40" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#64748b', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#475569', fontSize: 9 }}
            tickCount={4}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [`${v ?? ''}`, '']}
          />
          {data.entities.map((entity, i) => (
            <Radar
              key={entity}
              name={entity}
              dataKey={entity}
              stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
              fill={RADAR_COLORS[i % RADAR_COLORS.length]}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={{ r: 3, fill: RADAR_COLORS[i % RADAR_COLORS.length] }}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
