'use client'

import type { StatCard } from '@/lib/types'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { clsx } from 'clsx'

const dirMeta = {
  up: {
    Icon: TrendingUp,
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/10',
  },
  down: {
    Icon: TrendingDown,
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    glow: 'shadow-red-500/10',
  },
  neutral: {
    Icon: Minus,
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    glow: 'shadow-slate-500/5',
  },
}

interface Props {
  stats: StatCard[]
}

export function StatHighlights({ stats }: Props) {
  if (!stats || stats.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {stats.slice(0, 3).map((s, i) => {
        const meta = dirMeta[s.direction] ?? dirMeta.neutral
        const { Icon } = meta
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.35, ease: 'easeOut' }}
            className={clsx(
              'relative flex flex-col p-4 rounded-2xl border overflow-hidden shadow-lg',
              meta.bg, meta.border, meta.glow,
            )}
          >
            {/* Background glow blob */}
            <div className={clsx(
              'absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-30 blur-xl',
              s.direction === 'up' ? 'bg-emerald-500' :
              s.direction === 'down' ? 'bg-red-500' : 'bg-slate-500',
            )} />

            <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 font-medium">
              {s.label}
            </p>

            <div className="flex items-end justify-between gap-2">
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.15, duration: 0.3 }}
                className="text-2xl font-bold text-white tabular-nums leading-none"
              >
                {s.value}
              </motion.p>
              <div className={clsx('p-1.5 rounded-lg shrink-0', meta.bg)}>
                <Icon className={clsx('w-4 h-4', meta.text)} strokeWidth={2.5} />
              </div>
            </div>

            {s.change && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 + 0.25 }}
                className={clsx('text-xs font-semibold mt-2', meta.text)}
              >
                {s.change}
              </motion.p>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
