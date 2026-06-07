'use client'

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface Slice {
  label: string
  value: number
}

interface Props {
  data: { slices: Slice[] }
}

const COLORS = [
  '#34d399', '#60a5fa', '#f59e0b', '#f87171',
  '#a78bfa', '#fb923c', '#34d3c0', '#e879f9',
]

const TOOLTIP_STYLE = {
  background: '#0f1824',
  border: '1px solid #1e2d40',
  borderRadius: 8,
  fontSize: 12,
  color: '#f1f5f9',
}

export function MarketShareSection({ data }: Props) {
  const slices = data.slices ?? []
  if (slices.length === 0) return null

  const total = slices.reduce((s, d) => s + d.value, 0)
  const chartData = slices.map(s => ({ name: s.label, value: s.value }))

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [typeof v === 'number' ? `${v.toFixed(1)}%` : `${v ?? ''}`, 'Share']}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Breakdown list */}
      <div className="w-full grid grid-cols-2 gap-1.5 mt-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-xs text-slate-300 truncate">{s.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-white tabular-nums">{s.value.toFixed(1)}%</span>
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${Math.round((s.value / total) * 48)}px`,
                  background: COLORS[i % COLORS.length],
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
