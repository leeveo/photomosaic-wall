import Link from 'next/link'
import { isSupabaseConfigured } from '@/lib/supabase'
import Brand from './Brand'

export default function EnvironmentGate({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) return children
  return <main className="connection-page"><Brand /><section className="wall-panel connection-card">
    <span className="wall-eyebrow">Votre espace événementiel</span>
    <h1>Connectons votre studio.</h1>
    <p>La connexion au service de stockage des projets est nécessaire pour créer une mosaïque et accueillir les photos de vos invités.</p>
    <p>La configuration du service est à terminer par l’administrateur. Réessayez une fois la connexion activée.</p>
    <Link className="btn-primary" href="/">Retour à l’accueil</Link>
  </section></main>
}
