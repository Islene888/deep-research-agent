'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Clock, Loader2 } from 'lucide-react'
import { createTask } from '@/lib/api'

const SUGGESTIONS = [
  "NVIDIA's AI chip revenue growth vs AMD competitive moat",
  "Federal Reserve rate cuts impact on US equity valuations 2025",
  "Apple Vision Pro market opportunity and AR/VR revenue outlook",
  "China economic slowdown risks for US multinationals",
  "Global lithium supply constraints and EV battery cost trajectory",
  "JPMorgan vs Goldman Sachs investment banking Q1 2025 performance",
]

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const submit = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError(null)
    try {
      const { task_id } = await createTask(trimmed)
      router.push(`/research/${task_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start research')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0a0f1a]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <span className="text-sm font-semibold text-white/90 tracking-tight">FinSight</span>
        <a
          href="/history"
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          History
        </a>
      </nav>

      {/* Hero */}
      <motion.div
        className="w-full max-w-2xl flex flex-col items-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <h1 className="text-4xl sm:text-5xl font-semibold text-white text-center leading-tight tracking-tight mb-3">
          What do you want to{' '}
          <span className="text-accent">research</span>?
        </h1>
        <p className="text-white/40 text-base text-center mb-10 max-w-md leading-relaxed">
          Deep financial analysis with live sources, structured reports, and AI verification.
        </p>

        {/* Input */}
        <div className={`w-full relative rounded-2xl transition-all duration-200 ${
          focused
            ? 'shadow-[0_0_0_1px_rgba(52,211,153,0.4),0_8px_40px_rgba(0,0,0,0.4)]'
            : 'shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_24px_rgba(0,0,0,0.3)]'
        } bg-[#111827]`}>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(query)
              }
            }}
            placeholder="Ask any financial research question…"
            rows={3}
            disabled={loading}
            className="w-full bg-transparent px-5 pt-5 pb-14 text-white/90 placeholder-white/25 text-sm leading-relaxed outline-none resize-none disabled:opacity-50"
          />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <span className="text-[11px] text-white/20">
              {query.length > 0 ? `${query.length} chars` : 'Press Enter to research'}
            </span>
            <button
              onClick={() => submit(query)}
              disabled={!query.trim() || loading}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent text-surface-0 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              }
            </button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        <div className="mt-6 w-full">
          <p className="text-[11px] text-white/20 uppercase tracking-widest mb-3 text-center">
            Suggested
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => submit(s)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full border border-white/8 bg-white/4 text-xs text-white/40 hover:text-white/70 hover:border-white/15 hover:bg-white/6 transition-all duration-150 disabled:opacity-40 text-left"
              >
                {s.length > 52 ? s.slice(0, 49) + '…' : s}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
