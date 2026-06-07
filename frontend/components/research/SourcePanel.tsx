'use client'

import type { SourceMeta } from '@/lib/types'
import { ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  sources: SourceMeta[]
}

function credMeta(score: number) {
  if (score >= 0.8) return { color: 'bg-emerald-400', text: 'text-emerald-400', label: 'High' }
  if (score >= 0.5) return { color: 'bg-amber-400', text: 'text-amber-400', label: 'Mid' }
  return { color: 'bg-red-400', text: 'text-red-400', label: 'Low' }
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function SourcePanel({ sources }: Props) {
  const high = sources.filter(s => s.credibility_score >= 0.8).length
  const mid = sources.filter(s => s.credibility_score >= 0.5 && s.credibility_score < 0.8).length
  const low = sources.filter(s => s.credibility_score < 0.5).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">
          Sources
        </p>
        <span className="text-[11px] font-semibold text-slate-400">{sources.length}</span>
      </div>

      {/* Credibility breakdown bar */}
      {sources.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <div className="h-1.5 rounded-full overflow-hidden flex gap-px">
            {high > 0 && (
              <div
                className="bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${(high / sources.length) * 100}%` }}
              />
            )}
            {mid > 0 && (
              <div
                className="bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${(mid / sources.length) * 100}%` }}
              />
            )}
            {low > 0 && (
              <div
                className="bg-red-400 rounded-full transition-all duration-500"
                style={{ width: `${(low / sources.length) * 100}%` }}
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            {high > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{high} high</span>}
            {mid > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{mid} mid</span>}
            {low > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />{low} low</span>}
          </div>
        </div>
      )}

      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {sources.map((src, i) => {
            const meta = credMeta(src.credibility_score)
            return (
              <motion.li
                key={src.url}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.025 }}
                className="flex items-start gap-2 p-2 rounded-lg bg-surface-2 border border-surface-3/50 hover:border-surface-3 group transition-colors"
              >
                {/* Index + credibility */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 mt-0.5">
                  <span className="text-[9px] font-mono text-slate-600">{i + 1}</span>
                  <div className={clsx('w-2 h-2 rounded-full', meta.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-slate-300 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                    {src.title || hostname(src.url)}
                  </p>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-slate-600 hover:text-accent transition-colors mt-0.5"
                    onClick={e => e.stopPropagation()}
                  >
                    <span className="truncate max-w-[130px]">{hostname(src.url)}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                </div>

                <span className={clsx('text-[10px] font-bold shrink-0', meta.text)}>
                  {(src.credibility_score * 100).toFixed(0)}%
                </span>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
}
