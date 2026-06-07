'use client'

import type { RiskItem } from '@/lib/types'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  data: RiskItem[]
}

const severityMeta = {
  high: {
    Icon: AlertTriangle,
    label: 'High',
    dot: 'bg-red-500',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
  },
  medium: {
    Icon: AlertCircle,
    label: 'Medium',
    dot: 'bg-amber-500',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  low: {
    Icon: Info,
    label: 'Low',
    dot: 'bg-sky-500',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    badge: 'bg-sky-500/20 text-sky-400',
  },
}

export function RiskMatrixSection({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-slate-500 text-sm">No risk data available.</p>
  }

  const sorted = [...data].sort(
    (a, b) =>
      ['high', 'medium', 'low'].indexOf(a.severity) -
      ['high', 'medium', 'low'].indexOf(b.severity),
  )

  return (
    <div className="space-y-2.5">
      {sorted.map((risk, i) => {
        const meta = severityMeta[risk.severity] || severityMeta.medium
        const { Icon } = meta
        return (
          <div
            key={i}
            className={clsx(
              'flex gap-3 p-3.5 rounded-xl border',
              meta.border,
              meta.bg,
            )}
          >
            <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0', meta.text)} strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-slate-100">{risk.title}</p>
                <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide', meta.badge)}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{risk.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
