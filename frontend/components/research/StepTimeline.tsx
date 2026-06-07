'use client'

import { motion } from 'framer-motion'
import type { AgentStep } from '@/lib/types'
import { clsx } from 'clsx'
import {
  Brain,
  Search,
  BookOpen,
  BarChart2,
  Layers,
  GitMerge,
  ShieldCheck,
  FileText,
  type LucideIcon,
} from 'lucide-react'

const STEPS: { id: AgentStep; label: string; Icon: LucideIcon }[] = [
  { id: 'plan',       label: 'Plan',       Icon: Brain },
  { id: 'search',     label: 'Search',     Icon: Search },
  { id: 'read',       label: 'Read',       Icon: BookOpen },
  { id: 'analyze',    label: 'Analyze',    Icon: BarChart2 },
  { id: 'extract',    label: 'Extract',    Icon: Layers },
  { id: 'synthesize', label: 'Synthesize', Icon: GitMerge },
  { id: 'verify',     label: 'Verify',     Icon: ShieldCheck },
  { id: 'report',     label: 'Report',     Icon: FileText },
]

interface Props {
  currentStep: AgentStep | null
  completedSteps: AgentStep[]
  thinking: string
  status: 'idle' | 'connecting' | 'running' | 'awaiting_approval' | 'completed' | 'error'
}

export function StepTimeline({ currentStep, completedSteps, thinking, status }: Props) {
  return (
    <div>
      <p className="text-[10px] text-white/20 uppercase tracking-widest mb-4 font-medium">
        Pipeline
      </p>
      <ul className="space-y-0.5">
        {STEPS.map((step, i) => {
          const isDone = completedSteps.includes(step.id)
          const isActive = currentStep === step.id

          return (
            <li key={step.id}>
              <div className={clsx(
                'flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors duration-200',
                isActive && 'bg-white/5',
              )}>
                <step.Icon
                  className={clsx(
                    'w-3.5 h-3.5 shrink-0 transition-colors duration-200',
                    isDone && 'text-accent/70',
                    isActive && 'text-white/80',
                    !isDone && !isActive && 'text-white/15',
                  )}
                  strokeWidth={1.5}
                />
                <span className={clsx(
                  'text-xs transition-colors duration-200',
                  isDone && 'text-white/40',
                  isActive && 'text-white/80 font-medium',
                  !isDone && !isActive && 'text-white/20',
                )}>
                  {step.label}
                </span>
                {isActive && (
                  <motion.span
                    className="ml-auto w-1 h-1 rounded-full bg-accent"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
                {isDone && (
                  <span className="ml-auto w-1 h-1 rounded-full bg-white/20" />
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {thinking && status === 'running' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 rounded-xl bg-white/4 border border-white/6"
        >
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1.5">Thinking</p>
          <p className="text-[11px] text-white/40 leading-relaxed line-clamp-4">{thinking}</p>
        </motion.div>
      )}
    </div>
  )
}
