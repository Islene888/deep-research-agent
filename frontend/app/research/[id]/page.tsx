'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useResearchStream } from '@/lib/useResearchStream'
import { StepTimeline } from '@/components/research/StepTimeline'
import { SourcePanel } from '@/components/research/SourcePanel'
import { StatHighlights } from '@/components/research/StatHighlights'
import { SectionRenderer } from '@/components/research/SectionRenderer'
import { InteractionStats } from '@/components/research/InteractionStats'
import { VerificationScores } from '@/components/research/VerificationScores'
import { getTask, resumeTask } from '@/lib/api'
import { exportReportAsMarkdown } from '@/lib/export'
import type { Task } from '@/lib/types'
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Brain,
  Search,
  FileText,
  Layers,
  PlusCircle,
  Trash2,
  PlayCircle,
  Download,
} from 'lucide-react'
import { clsx } from 'clsx'

const CONFIDENCE_STYLE = {
  high: 'text-emerald-400/80 border-emerald-400/20',
  medium: 'text-amber-400/80 border-amber-400/20',
  low: 'text-white/30 border-white/10',
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  plan: <Brain className="w-4 h-4" />,
  search: <Search className="w-4 h-4" />,
  read: <FileText className="w-4 h-4" />,
  analyze: <Layers className="w-4 h-4" />,
  extract: <Layers className="w-4 h-4" />,
  synthesize: <Brain className="w-4 h-4" />,
  verify: <CheckCircle2 className="w-4 h-4" />,
  report: <FileText className="w-4 h-4" />,
}

const STEP_LABEL: Record<string, string> = {
  plan: 'Decomposing your question…',
  search: 'Searching for sources…',
  read: 'Reading and extracting content…',
  analyze: 'Analyzing findings…',
  extract: 'Extracting key data points…',
  synthesize: 'Synthesizing insights…',
  verify: 'Verifying findings quality…',
  report: 'Writing report…',
}

export default function ResearchPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = typeof params.id === 'string' ? params.id : null

  const [task, setTask] = useState<Task | null>(null)
  const [copied, setCopied] = useState(false)

  const stream = useResearchStream(taskId)

  useEffect(() => {
    if (!taskId) return
    getTask(taskId).then(setTask).catch(() => {})
  }, [taskId])

  const question = task?.question ?? '…'
  const isRunning = stream.status === 'running' || stream.status === 'connecting'
  const isAwaitingApproval = stream.status === 'awaiting_approval'
  const isDone = stream.status === 'completed'
  const isError = stream.status === 'error'

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!taskId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Invalid task ID
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a] overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-white/6 bg-[#0a0f1a]/80 backdrop-blur">
        <button
          onClick={() => router.push('/')}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white/70"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <span className="text-sm text-white/60 truncate mr-auto">{question}</span>

        <StatusPill status={stream.status} />

        {stream.report && (
          <button
            onClick={() => exportReportAsMarkdown(stream.report!)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 text-xs text-white/30 hover:text-white/60 hover:border-white/15 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        )}

        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 text-xs text-white/30 hover:text-white/60 hover:border-white/15 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Share'}
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <aside className="w-64 shrink-0 flex flex-col border-r border-white/6 overflow-y-auto">
          <div className="p-5 space-y-4">
            <StepTimeline
              currentStep={stream.currentStep}
              completedSteps={stream.completedSteps}
              thinking={stream.thinking}
              status={stream.status}
            />
            <InteractionStats
              stats={stream.interactionStats}
              isRunning={isRunning}
            />
            {Object.keys(stream.verificationScores).length > 0 && (
              <VerificationScores
                scores={stream.verificationScores}
                subQuestions={stream.subQuestions}
              />
            )}
            {stream.sources.length > 0 && (
              <div className="border-t border-surface-3 pt-4">
                <SourcePanel sources={stream.sources} />
              </div>
            )}
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">

            {/* ── HITL approval card ── */}
            <AnimatePresence>
              {stream.hitlPause?.active && taskId && (
                <HitlApprovalCard
                  taskId={taskId}
                  initialQuestions={stream.hitlPause.subQuestions}
                  onApproved={stream.dismissHitl}
                />
              )}
            </AnimatePresence>

            {/* ── Live research progress (shown while running, before sections) ── */}
            <AnimatePresence>
              {isRunning && stream.sections.length === 0 && (
                <motion.div
                  key="live-progress"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {/* Current step */}
                  {stream.currentStep && (
                    <div className="flex items-center gap-3 py-2">
                      <Loader2 className="w-3.5 h-3.5 text-accent/70 animate-spin shrink-0" />
                      <p className="text-sm text-white/60">
                        {STEP_LABEL[stream.currentStep]}
                      </p>
                    </div>
                  )}

                  {/* Live thinking text */}
                  <AnimatePresence mode="wait">
                    {stream.thinking && (
                      <motion.div
                        key={stream.thinking}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-2.5 py-2"
                      >
                        <div className="mt-1.5 w-1 h-1 rounded-full bg-accent/50 shrink-0" />
                        <p className="text-xs text-white/30 leading-relaxed break-all">
                          {stream.thinking}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sub-questions from plan step */}
                  <AnimatePresence>
                    {stream.subQuestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-white/8 overflow-hidden"
                      >
                        <div className="px-4 py-2.5 border-b border-white/6 flex items-center gap-2">
                          <span className="text-[11px] text-white/30 uppercase tracking-widest">
                            Research Plan
                          </span>
                          <span className="ml-auto text-[11px] text-white/20">
                            {stream.subQuestions.length} questions
                          </span>
                        </div>
                        <ul>
                          {stream.subQuestions.map((q, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="flex items-start gap-3 px-4 py-2.5 border-b border-white/4 last:border-0"
                            >
                              <span className="mt-0.5 text-[10px] text-white/20 w-4 shrink-0 tabular-nums">
                                {i + 1}
                              </span>
                              <span className="text-xs text-white/50 leading-relaxed">{q}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sources progress */}
                  <AnimatePresence>
                    {stream.sources.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 py-2"
                      >
                        <Search className="w-3.5 h-3.5 text-white/25 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-white/30">Sources collected</span>
                            <span className="text-xs text-accent/70 tabular-nums">{stream.sources.length}</span>
                          </div>
                          <div className="h-px bg-white/8 overflow-hidden">
                            <motion.div
                              className="h-full bg-accent/50"
                              animate={{ width: `${Math.min(stream.sources.length * 10, 100)}%` }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Skeleton */}
                  {stream.subQuestions.length === 0 && (
                    <div className="space-y-3 pt-2">
                      {[80, 60, 70].map((w, n) => (
                        <div key={n} className="h-2.5 rounded shimmer-bg" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Executive summary ── */}
            <AnimatePresence>
              {stream.report && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pb-8 border-b border-white/8"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[11px] font-medium text-white/30 uppercase tracking-widest">
                      Executive Summary
                    </span>
                    <span className={clsx(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                      CONFIDENCE_STYLE[stream.report.confidence],
                    )}>
                      {stream.report.confidence} confidence
                    </span>
                  </div>
                  <p className="text-[17px] text-white/80 leading-[1.75] font-light">
                    {stream.report.executive_summary}
                  </p>
                  <p className="mt-4 text-xs text-white/20">
                    {stream.report.sources_count} sources · {stream.report.sub_questions.length} sub-questions
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Stat highlights ── */}
            {stream.report?.stat_highlights && stream.report.stat_highlights.length > 0 && (
              <div className="pb-6 border-b border-white/8">
                <StatHighlights stats={stream.report.stat_highlights} />
              </div>
            )}

            {/* ── Sections (streamed in one by one) ── */}
            <div className="space-y-0 pt-2">
              {stream.sections.map((section, i) =>
                section ? (
                  <SectionRenderer key={i} section={section} index={i} />
                ) : null,
              )}
            </div>

            {/* ── Error ── */}
            {isError && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-300">Research failed</p>
                  <p className="text-xs text-red-400/70 mt-0.5">{stream.error}</p>
                </div>
              </div>
            )}

            {/* ── Done ── */}
            {isDone && stream.sections.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex items-center gap-2 text-xs text-white/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-accent/40" />
                Research complete · {stream.report?.sources_count ?? 0} sources
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; dot?: string }> = {
    connecting: { label: 'Connecting', dot: 'bg-amber-400 animate-pulse' },
    running: { label: 'Researching', dot: 'bg-accent animate-pulse' },
    awaiting_approval: { label: 'Review Plan', dot: 'bg-violet-400' },
    completed: { label: 'Complete', dot: 'bg-emerald-400' },
    error: { label: 'Failed', dot: 'bg-red-400' },
    idle: { label: 'Loading', dot: 'bg-white/20' },
  }

  const current = meta[status] ?? meta.idle
  return (
    <span className="flex items-center gap-1.5 text-xs text-white/40 font-medium">
      {current.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} />}
      {current.label}
    </span>
  )
}

function HitlApprovalCard({
  taskId,
  initialQuestions,
  onApproved,
}: {
  taskId: string
  initialQuestions: string[]
  onApproved: () => void
}) {
  const [questions, setQuestions] = useState<string[]>(initialQuestions)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateQuestion = (i: number, value: string) => {
    setQuestions(prev => prev.map((q, idx) => (idx === i ? value : q)))
  }

  const removeQuestion = (i: number) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== i))
  }

  const addQuestion = () => {
    setQuestions(prev => [...prev, ''])
  }

  const handleApprove = async () => {
    const valid = questions.map(q => q.trim()).filter(Boolean)
    if (valid.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await resumeTask(taskId, valid)
      onApproved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume')
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      key="hitl-approval"
      initial={{ opacity: 0, scale: 0.97, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-white/10 bg-[#111827] overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
        <Brain className="w-4 h-4 text-white/40 shrink-0" />
        <div>
          <p className="text-sm font-medium text-white/80">Review Research Plan</p>
          <p className="text-xs text-white/30 mt-0.5">
            Edit sub-questions before the agent proceeds
          </p>
        </div>
      </div>

      <div className="p-5 space-y-2">
        {questions.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-2"
          >
            <span className="mt-2.5 text-[10px] text-white/20 w-4 shrink-0 text-center tabular-nums">
              {i + 1}
            </span>
            <input
              type="text"
              value={q}
              onChange={e => updateQuestion(i, e.target.value)}
              className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white/70 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
              placeholder="Sub-question…"
            />
            <button
              onClick={() => removeQuestion(i)}
              disabled={questions.length <= 1}
              className="mt-2 p-1 rounded text-white/20 hover:text-red-400/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}

        <button
          onClick={addQuestion}
          disabled={questions.length >= 10}
          className="flex items-center gap-2 px-3 py-2 text-xs text-white/25 hover:text-white/50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Add sub-question
        </button>
      </div>

      {error && (
        <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15">
          <AlertCircle className="w-3.5 h-3.5 text-red-400/70 shrink-0" />
          <span className="text-xs text-red-400/70">{error}</span>
        </div>
      )}

      <div className="px-5 pb-5">
        <button
          onClick={handleApprove}
          disabled={submitting || questions.filter(q => q.trim()).length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent/90 hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-[#0a0f1a] text-sm font-semibold transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
          {submitting ? 'Starting…' : 'Approve & Continue'}
        </button>
      </div>
    </motion.div>
  )
}
