'use client'

import { motion } from 'framer-motion'
import type { TimelineEvent } from '@/lib/types'

interface Props {
  data: TimelineEvent[]
}

export function TimelineSection({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-slate-500 text-sm">No timeline data.</p>
  }

  return (
    <div className="relative pl-4">
      {/* Vertical track */}
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-accent/40 via-surface-3 to-surface-3" />

      <ul className="space-y-5">
        {data.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex gap-4"
          >
            {/* Node */}
            <div className="relative shrink-0 mt-1">
              <div className={`w-3.5 h-3.5 rounded-full border-2 border-surface-0 ${
                i === 0 ? 'bg-accent shadow-sm shadow-accent/40' : 'bg-surface-3'
              }`} />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <time className="block text-[11px] font-mono font-semibold text-accent/70 mb-0.5 tracking-wide">
                {item.date}
              </time>
              <p className="text-sm text-slate-200 leading-snug">{item.event}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
