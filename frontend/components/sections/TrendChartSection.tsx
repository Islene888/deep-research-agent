'use client'

import { useState } from 'react'
import type { TrendChart } from '@/lib/types'
import {
  ResponsiveContainer,
  AreaChart,
  BarChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'

interface Props {
  data: TrendChart
}

type ChartType = 'area' | 'bar'

const TOOLTIP_STYLE = {
  background: '#0f1824',
  border: '1px solid #1e2d40',
  borderRadius: 10,
  fontSize: 12,
  color: '#f1f5f9',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

const AXIS_TICK = { fill: '#475569', fontSize: 11 }

export function TrendChartSection({ data }: Props) {
  const [type, setType] = useState<ChartType>('area')

  if (!data.series || data.series.length === 0) {
    return <p className="text-slate-500 text-sm">No trend data available.</p>
  }

  const avg =
    data.series.reduce((sum, p) => sum + p.value, 0) / data.series.length

  const formatVal = (v: number | string) =>
    `${data.unit.startsWith('$') ? data.unit : ''}${v}${!data.unit.startsWith('$') ? data.unit : ''}`

  return (
    <div>
      {/* Header row with toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">{data.x_label}</span>
          <span className="text-xs text-slate-500">→</span>
          <span className="text-xs text-slate-400 font-medium">{data.y_label}</span>
          {data.unit && (
            <span className="px-1.5 py-0.5 rounded bg-surface-3 text-[10px] text-slate-500 font-mono">
              {data.unit}
            </span>
          )}
        </div>

        {/* Chart type toggle */}
        <div className="flex rounded-lg overflow-hidden border border-surface-3">
          {(['area', 'bar'] as ChartType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
                type === t
                  ? 'bg-accent/20 text-accent'
                  : 'bg-surface-2 text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'area' ? 'Line' : 'Bar'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        {type === 'area' ? (
          <AreaChart data={data.series} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}${!data.unit.startsWith('$') ? data.unit : ''}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [formatVal(v as number), data.y_label]} />
            <ReferenceLine
              y={avg}
              stroke="#475569"
              strokeDasharray="4 4"
              label={{ value: 'avg', fill: '#475569', fontSize: 10, position: 'insideTopRight' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#trendGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#34d399', stroke: '#0f1824', strokeWidth: 2 }}
            />
          </AreaChart>
        ) : (
          <BarChart data={data.series} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${v}${!data.unit.startsWith('$') ? data.unit : ''}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [formatVal(v as number), data.y_label]} />
            <ReferenceLine
              y={avg}
              stroke="#475569"
              strokeDasharray="4 4"
              label={{ value: 'avg', fill: '#475569', fontSize: 10, position: 'insideTopRight' }}
            />
            <Bar
              dataKey="value"
              fill="url(#barGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
