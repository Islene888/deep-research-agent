'use client'

import type { KeyQuote } from '@/lib/types'
import { Quote } from 'lucide-react'

interface Props {
  data: KeyQuote
}

export function KeyQuoteSection({ data }: Props) {
  return (
    <blockquote className="relative pl-5 border-l-2 border-accent/50">
      <Quote className="absolute -left-1 -top-1 w-4 h-4 text-accent/40 rotate-180" strokeWidth={1.5} />
      <p className="text-slate-200 text-sm leading-relaxed italic">"{data.text}"</p>
      <footer className="mt-2 flex items-center gap-2">
        <span className="text-xs text-slate-500">— {data.source}</span>
        {data.citation_index != null && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-3 text-[10px] text-slate-400 font-mono">
            {data.citation_index}
          </span>
        )}
      </footer>
    </blockquote>
  )
}
