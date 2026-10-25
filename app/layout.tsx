import type { Metadata } from 'next'
import '../globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'

export const metadata: Metadata = {
  title: 'PhotoMosaic — Studio événementiel',
  description: 'Des photos individuelles, un souvenir collectif. Créez et animez votre mur photo.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body><LanguageProvider>{children}</LanguageProvider></body></html>
}
