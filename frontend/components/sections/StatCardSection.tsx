'use client'

import type { StatCard } from '@/lib/types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  data: StatCard
}

const directionMeta = {
  up: { Icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  down: { Icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10' },
  neutral: { Icon: Minus, color: 'text-slate-400', bg: 'bg-slate-400/10' },
}

export function StatCardSection({ data }: Props) {
  const meta = directionMeta[data.direction] || directionMeta.neutral
  const { Icon } = meta

  return (
    <div className="flex items-center justify-between p-5 rounded-xl bg-surface-2 border border-surface-3">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{data.label}</p>
        <p className="text-3xl font-bold text-white tabular-nums">{data.value}</p>
        {data.change && (
          <p className={clsx('text-sm mt-1 font-medium', meta.color)}>{data.change}</p>
        )}
      </div>
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', meta.bg)}>
        <Icon className={clsx('w-6 h-6', meta.color)} strokeWidth={2} />
      </div>
    </div>
  )
}
