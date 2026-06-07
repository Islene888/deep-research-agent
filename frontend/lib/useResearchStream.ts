'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { streamUrl } from './api'
import type {
  AgentStep,
  FinalReport,
  InteractionStats,
  ReportSection,
  SourceMeta,
  SSEEvent,
  StreamState,
} from './types'

const STEP_ORDER: AgentStep[] = [
  'plan', 'search', 'read', 'analyze', 'extract', 'synthesize', 'verify', 'report',
]

const INITIAL_STATS: InteractionStats = { search_count: 0, pages_read: 0, llm_calls: 0, total_tokens: 0 }

const INITIAL: StreamState = {
  status: 'idle',
  currentStep: null,
  completedSteps: [],
  thinking: '',
  sources: [],
  sections: [],
  report: null,
  error: null,
  subQuestions: [],
  hitlPause: null,
  interactionStats: INITIAL_STATS,
  verificationScores: {},
}

export function useResearchStream(taskId: string | null) {
  const [state, setState] = useState<StreamState>(INITIAL)
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)

  const dismissHitl = useCallback(() => {
    setState(s => ({ ...s, status: 'running', hitlPause: null }))
  }, [])

  const connect = useCallback(() => {
    if (!taskId) return
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setState(s => ({ ...s, status: 'connecting' }))

    const es = new EventSource(streamUrl(taskId))
    esRef.current = es

    es.onopen = () => {
      retryCountRef.current = 0
      setState(s => ({ ...s, status: 'running', error: null }))
    }

    es.onmessage = (e: MessageEvent<string>) => {
      let data: SSEEvent
      try {
        data = JSON.parse(e.data)
      } catch {
        return
      }

      setState(s => applyEvent(s, data))

      if (data.event === 'done' || data.event === 'error') {
        es.close()
        esRef.current = null
      }
    }

    es.onerror = () => {
      es.close()
      esRef.current = null

      setState(s => {
        if (s.status === 'completed' || s.status === 'error') return s
        return { ...s, status: 'connecting' }
      })

      // exponential back-off: 1s, 2s, 4s, 8s, max 16s
      const delay = Math.min(1000 * 2 ** retryCountRef.current, 16000)
      retryCountRef.current += 1
      retryRef.current = setTimeout(connect, delay)
    }
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    connect()
    return () => {
      esRef.current?.close()
      esRef.current = null
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [taskId, connect])

  return { ...state, dismissHitl }
}

function applyEvent(state: StreamState, event: SSEEvent): StreamState {
  switch (event.event) {
    case 'step_start':
      // Any step after 'plan' starting means HITL was already approved — clear the card
      return {
        ...state,
        currentStep: event.step,
        status: 'running',
        hitlPause: event.step !== 'plan' ? null : state.hitlPause,
      }

    case 'step_done': {
      const completedSteps = state.completedSteps.includes(event.step)
        ? state.completedSteps
        : [...state.completedSteps, event.step]
      const sources =
        event.sources && event.sources.length > 0
          ? mergeSourcesMeta(state.sources, event.sources)
          : state.sources
      const subQuestions =
        event.step === 'plan' && event.sub_questions
          ? event.sub_questions
          : state.subQuestions
      const hitlPause = event.step === 'plan' ? null : state.hitlPause
      const interactionStats = event.interaction_stats
        ? { ...state.interactionStats, ...event.interaction_stats }
        : state.interactionStats
      return { ...state, completedSteps, sources, subQuestions, hitlPause, interactionStats }
    }

    case 'verification_update':
      return {
        ...state,
        verificationScores: { ...state.verificationScores, [event.sub_question]: event.score },
      }

    case 'thinking':
      return { ...state, thinking: event.content }

    case 'section_ready':
      return { ...state, sections: mergeSections(state.sections, event.section, event.section_index) }

    case 'done':
      return {
        ...state,
        status: 'completed',
        report: event.report,
        sources: event.report.sources,
        sections: event.report.sections,
        currentStep: null,
      }

    case 'hitl_pause':
      return {
        ...state,
        status: 'awaiting_approval',
        hitlPause: { active: true, subQuestions: event.sub_questions },
        subQuestions: event.sub_questions,
      }

    case 'error':
      return { ...state, status: 'error', error: event.message }

    default:
      return state
  }
}

function mergeSourcesMeta(existing: SourceMeta[], incoming: SourceMeta[]): SourceMeta[] {
  const seen = new Set(existing.map(s => s.url))
  const fresh = incoming.filter(s => !seen.has(s.url))
  return [...existing, ...fresh]
}

function mergeSections(
  existing: ReportSection[],
  section: ReportSection,
  index: number,
): ReportSection[] {
  const updated = [...existing]
  updated[index] = section
  return updated
}
