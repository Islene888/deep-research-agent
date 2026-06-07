'use client'

import { motion } from 'framer-motion'
import type { ReportSection } from '@/lib/types'
import { StatCardSection } from '@/components/sections/StatCardSection'
import { TrendChartSection } from '@/components/sections/TrendChartSection'
import { ComparisonTableSection } from '@/components/sections/ComparisonTableSection'
import { RiskMatrixSection } from '@/components/sections/RiskMatrixSection'
import { TimelineSection } from '@/components/sections/TimelineSection'
import { TextSection } from '@/components/sections/TextSection'
import { KeyQuoteSection } from '@/components/sections/KeyQuoteSection'
import { MarketShareSection } from '@/components/sections/MarketShareSection'

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'bg-emerald-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-500',
}

interface Props {
  section: ReportSection
  index: number
}

export function SectionRenderer({ section, index }: Props) {
  const isDataViz = ['trend_chart', 'comparison_table', 'risk_matrix', 'market_share'].includes(section.type)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group"
    >
      {/* Section title row */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${CONFIDENCE_DOT[section.confidence] ?? CONFIDENCE_DOT.medium}`} />
        <h3 className="text-base font-semibold text-white/90 leading-snug flex-1">{section.title}</h3>
      </div>

      {/* Section content */}
      <div className={`pl-[18px] ${isDataViz ? '' : ''}`}>
        <SectionBody section={section} />
      </div>

      {/* Divider */}
      <div className="mt-8 border-t border-white/5" />
    </motion.div>
  )
}

function SectionBody({ section }: { section: ReportSection }) {
  switch (section.type) {
    case 'stat_card':
      return <StatCardSection data={section.data as Parameters<typeof StatCardSection>[0]['data']} />
    case 'trend_chart':
      return <TrendChartSection data={section.data as Parameters<typeof TrendChartSection>[0]['data']} />
    case 'comparison_table':
      return <ComparisonTableSection data={section.data as Parameters<typeof ComparisonTableSection>[0]['data']} />
    case 'risk_matrix':
      return <RiskMatrixSection data={section.data as Parameters<typeof RiskMatrixSection>[0]['data']} />
    case 'timeline':
      return <TimelineSection data={section.data as Parameters<typeof TimelineSection>[0]['data']} />
    case 'text':
      return <TextSection data={section.data as string} citations={section.citations} />
    case 'key_quote':
      return <KeyQuoteSection data={section.data as Parameters<typeof KeyQuoteSection>[0]['data']} />
    case 'market_share':
      return <MarketShareSection data={section.data as unknown as Parameters<typeof MarketShareSection>[0]['data']} />
    default:
      return <p className="text-white/30 text-sm">Unknown section type: {section.type}</p>
  }
}
