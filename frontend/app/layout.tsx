import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinSight — AI Financial Research',
  description: 'Deep financial research powered by MiroThinker AI',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        {children}
      </body>
    </html>
  )
}
