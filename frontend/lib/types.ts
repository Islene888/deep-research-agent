// ── Section data types (mirrors backend/agent/schemas.py) ─────────────────────

export interface StatCard {
  label: string
  value: string
  change: string
  direction: 'up' | 'down' | 'neutral'
}

export interface TrendPoint {
  label: string
  value: number
}

export interface TrendChart {
  x_label: string
  y_label: string
  unit: string
  series: TrendPoint[]
}

export interface ComparisonRow {
  metric: string
  values: Record<string, string>
}

export interface ComparisonTable {
  entities: string[]
  rows: ComparisonRow[]
}

export interface RiskItem {
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
}

export interface TimelineEvent {
  date: string
  event: string
}

export interface KeyQuote {
  text: string
  source: string
  citation_index: number
}

export type SectionType =
  | 'stat_card'
  | 'trend_chart'
  | 'comparison_table'
  | 'risk_matrix'
  | 'timeline'
  | 'text'
  | 'key_quote'
  | 'market_share'

export type SectionData =
  | StatCard
  | TrendChart
  | ComparisonTable
  | RiskItem[]
  | TimelineEvent[]
  | string
  | KeyQuote

export interface ReportSection {
  type: SectionType
  title: string
  data: SectionData
  citations: number[]
  confidence: 'low' | 'medium' | 'high'
}

// ── Final report ──────────────────────────────────────────────────────────────

export interface SourceMeta {
  title: string
  url: string
  credibility_score: number
}

export interface FinalReport {
  question: string
  executive_summary: string
  stat_highlights: StatCard[]
  sections: ReportSection[]
  sources: SourceMeta[]
  confidence: 'low' | 'medium' | 'high'
  sources_count: number
  sub_questions: string[]
}

// ── SSE event shapes ──────────────────────────────────────────────────────────

export type AgentStep =
  | 'plan'
  | 'search'
  | 'read'
  | 'analyze'
  | 'extract'
  | 'synthesize'
  | 'verify'
  | 'report'

export interface InteractionStats {
  search_count: number
  pages_read: number
  llm_calls: number
  total_tokens: number
}

export interface StepStartEvent {
  event: 'step_start'
  step: AgentStep
}

export interface StepDoneEvent {
  event: 'step_done'
  step: AgentStep
  sources_read?: number
  sources?: SourceMeta[]
  sub_questions?: string[]
  findings_count?: number
  interaction_stats?: InteractionStats
}

export interface VerificationUpdateEvent {
  event: 'verification_update'
  sub_question: string
  score: number
  has_finding: boolean
}

export interface ThinkingEvent {
  event: 'thinking'
  content: string
}

export interface SectionReadyEvent {
  event: 'section_ready'
  section: ReportSection
  section_index: number
}

export interface DoneEvent {
  event: 'done'
  report: FinalReport
}

export interface ErrorEvent {
  event: 'error'
  message: string
}

export interface HitlPauseEvent {
  event: 'hitl_pause'
  sub_questions: string[]
}

export type SSEEvent =
  | StepStartEvent
  | StepDoneEvent
  | ThinkingEvent
  | SectionReadyEvent
  | DoneEvent
  | ErrorEvent
  | HitlPauseEvent
  | VerificationUpdateEvent

// ── API task model ────────────────────────────────────────────────────────────

export interface Task {
  task_id: string
  status: 'pending' | 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled'
  question: string
  created_at: string
  completed_at?: string
  result?: FinalReport
  error?: string
}

// ── Stream state ──────────────────────────────────────────────────────────────

export interface HitlState {
  active: boolean
  subQuestions: string[]
}

export interface StreamState {
  status: 'idle' | 'connecting' | 'running' | 'awaiting_approval' | 'completed' | 'error'
  currentStep: AgentStep | null
  completedSteps: AgentStep[]
  thinking: string
  sources: SourceMeta[]
  sections: ReportSection[]
  report: FinalReport | null
  error: string | null
  subQuestions: string[]
  hitlPause: HitlState | null
  interactionStats: InteractionStats
  verificationScores: Record<string, number>
}
