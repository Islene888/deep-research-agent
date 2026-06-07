'use client'

import { motion } from 'framer-motion'
import type { InteractionStats } from '@/lib/types'

interface Props {
  stats: InteractionStats
  isRunning: boolean
}

const METRICS = [
  { key: 'search_count' as const, icon: '🔍', label: 'Searches' },
  { key: 'pages_read' as const, icon: '📄', label: 'Pages Read' },
  { key: 'llm_calls' as const, icon: '🧠', label: 'LLM Calls' },
  { key: 'total_tokens' as const, icon: '🔢', label: 'Tokens' },
]

function fmt(n: number, key: string): string {
  if (key === 'total_tokens') return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
  return String(n)
}

export function InteractionStats({ stats, isRunning }: Props) {
  const hasData = Object.values(stats).some(v => v > 0)
  if (!hasData && !isRunning) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          Effective Interaction Scaling
        </span>
        {isRunning && (
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {METRICS.map(({ key, icon, label }) => (
          <motion.div
            key={key}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-base leading-none">{icon}</span>
            <div className="min-w-0">
              <motion.p
                className="text-sm font-semibold text-white tabular-nums"
                key={stats[key]}
                initial={{ scale: 1.2, color: '#a78bfa' }}
                animate={{ scale: 1, color: '#ffffff' }}
                transition={{ duration: 0.3 }}
              >
                {fmt(stats[key], key)}
              </motion.p>
              <p className="text-[10px] text-white/40 leading-none mt-0.5">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
