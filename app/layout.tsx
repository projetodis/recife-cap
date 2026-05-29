import type { Metadata } from 'next'
import './globals.css'
import { getConfigs } from '@/lib/config'
import ThemeProvider from '@/components/ThemeProvider'
import StagingBanner from '@/components/StagingBanner'

export async function generateMetadata(): Promise<Metadata> {
  const configs = await getConfigs()
  return {
    title: configs.nome_sistema || 'Recife Cap',
    description: configs.slogan || 'Filantropia Premiável',
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const configs = await getConfigs()

  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <StagingBanner />
        <ThemeProvider initialConfigs={configs}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
