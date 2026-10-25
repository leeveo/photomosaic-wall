import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'PhotoMosaic — Studio événementiel',
  description: 'Des photos individuelles, un souvenir collectif. Créez et animez votre mur photo.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>
}
