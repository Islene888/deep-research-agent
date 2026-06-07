'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listTasks, deleteTask } from '@/lib/api'
import type { Task } from '@/lib/types'
import {
  ArrowLeft, TrendingUp, CheckCircle2, Loader2, AlertCircle,
  Clock, Trash2, Search, BarChart2, Brain,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'

const STATUS_META: Record<string, { Icon: React.ComponentType<{ className?: string }>, color: string, label: string }> = {
  completed:          { Icon: CheckCircle2, color: 'text-emerald-400',  label: 'Completed' },
  running:            { Icon: Loader2,      color: 'text-accent',       label: 'Running' },
  pending:            { Icon: Clock,        color: 'text-amber-400',    label: 'Pending' },
  queued:             { Icon: Clock,        color: 'text-amber-400',    label: 'Queued' },
  awaiting_approval:  { Icon: Brain,        color: 'text-violet-400',   label: 'Review Plan' },
  failed:             { Icon: AlertCircle,  color: 'text-red-400',      label: 'Failed' },
  cancelled:          { Icon: AlertCircle,  color: 'text-slate-500',    label: 'Cancelled' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    listTasks(50, 0)
      .then(setTasks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks
    const q = search.toLowerCase()
    return tasks.filter(t => t.question.toLowerCase().includes(q))
  }, [tasks, search])

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalSources = tasks.reduce((s, t) => s + (t.result?.sources_count ?? 0), 0)

  const handleDelete = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    setDeletingId(taskId)
    try {
      await deleteTask(taskId)
      setTasks(prev => prev.filter(t => t.task_id !== taskId))
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(52,211,153,0.04) 0%, transparent 50%), #080d18' }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-surface-3 bg-surface-1/60 backdrop-blur sticky top-0 z-10">
        <button
          onClick={() => router.push('/')}
          className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors text-slate-500 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-surface-0" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-white">Research History</span>
        </div>
        <span className="ml-auto text-xs text-slate-500">{tasks.length} reports</span>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8">

        {/* Summary stats */}
        {!loading && tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total Reports', value: tasks.length, Icon: BarChart2, color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
              { label: 'Completed',     value: completedCount, Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Sources Read',  value: totalSources,  Icon: Search, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
            ].map(({ label, value, Icon, color, bg }) => (
              <div key={label} className={`flex items-center gap-3 p-3 rounded-xl border ${bg}`}>
                <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                <div>
                  <p className="text-lg font-bold text-white leading-none">{value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search bar */}
        {tasks.length > 3 && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter research history…"
              className="w-full bg-surface-1 border border-surface-3 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/40 transition-colors"
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && tasks.length === 0 && (
          <div className="text-center py-24">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-surface-3 flex items-center justify-center mx-auto mb-4">
              <BarChart2 className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">No research history yet.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 text-accent text-sm hover:underline"
            >
              Start your first research →
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading && search && filtered.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">No results for "{search}"</p>
        )}

        {/* Task list */}
        <AnimatePresence initial={false}>
          <ul className="space-y-2">
            {filtered.map((task, i) => {
              const statusMeta = STATUS_META[task.status] ?? STATUS_META.queued
              const { Icon } = statusMeta
              return (
                <motion.li
                  key={task.task_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.025 }}
                  onClick={() => router.push(`/research/${task.task_id}`)}
                  className="group flex items-center gap-4 p-4 rounded-2xl border border-surface-3 bg-surface-1 hover:border-surface-3 hover:bg-surface-2 cursor-pointer transition-all duration-150"
                >
                  <Icon
                    className={clsx(
                      'w-4 h-4 shrink-0',
                      statusMeta.color,
                      task.status === 'running' && 'animate-spin',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate group-hover:text-white transition-colors">
                      {task.question}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {formatDate(task.created_at)}
                      {task.status === 'completed' && task.result && (
                        <span className="ml-2 text-slate-700">
                          · {task.result.sources_count} sources · {task.result.sections?.length ?? 0} sections
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={clsx(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                      task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      task.status === 'awaiting_approval' ? 'bg-violet-500/10 text-violet-400' :
                      task.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-surface-2 text-slate-500',
                    )}>
                      {statusMeta.label}
                    </span>
                    <button
                      onClick={e => handleDelete(e, task.task_id)}
                      disabled={deletingId === task.task_id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all"
                    >
                      {deletingId === task.task_id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </AnimatePresence>
      </div>
    </div>
  )
}
