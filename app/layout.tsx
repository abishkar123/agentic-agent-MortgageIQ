import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MortgageIQ Agent Swarm',
  description: 'Multi-agent mortgage assistant powered by Mastra',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
