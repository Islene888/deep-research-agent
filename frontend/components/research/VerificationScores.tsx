'use client'

import { motion } from 'framer-motion'

interface Props {
  scores: Record<string, number>
  subQuestions: string[]
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-400'
  return 'bg-red-500'
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Strong'
  if (score >= 50) return 'OK'
  return 'Weak'
}

export function VerificationScores({ scores, subQuestions }: Props) {
  const qs = subQuestions.filter(q => q in scores)
  if (qs.length === 0) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
        Verification Confidence
      </p>

      <div className="space-y-2.5">
        {qs.map((q) => {
          const score = scores[q] ?? 0
          return (
            <div key={q}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-white/60 truncate max-w-[75%]" title={q}>
                  {q.length > 55 ? q.slice(0, 52) + '…' : q}
                </p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  score >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                  score >= 50 ? 'bg-amber-400/20 text-amber-300' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {scoreLabel(score)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${scoreColor(score)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
