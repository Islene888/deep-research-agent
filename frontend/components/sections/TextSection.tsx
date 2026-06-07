'use client'

interface Props {
  data: string
  citations?: number[]
}

export function TextSection({ data, citations }: Props) {
  const paragraphs = (data ?? '').split(/\n\n+/).filter(Boolean)

  return (
    <div className="space-y-4">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-[15px] text-white/65 leading-[1.8] font-light">
          {para.trim()}
        </p>
      ))}

      {citations && citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3">
          {citations.map(c => (
            <span
              key={c}
              className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] text-white/30 font-mono bg-white/5 border border-white/8 hover:text-accent hover:border-accent/30 transition-colors cursor-default"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
