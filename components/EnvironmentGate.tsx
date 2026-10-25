import { T } from '@/components/LanguageProvider'
import Link from 'next/link'
import { isSupabaseConfigured } from '@/lib/supabase'
import Brand from './Brand'

export default function EnvironmentGate({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) return children
  return <section className="connection-page"><Brand /><section className="wall-panel connection-card">
    <span className="wall-eyebrow"><T text={"Votre espace événementiel"} /></span>
    <h1><T text={"Connectons votre studio."} /></h1>
    <p><T text={"La connexion au service de stockage des projets est nécessaire pour créer une mosaïque et accueillir les photos de vos invités."} /></p>
    <p><T text={"La configuration du service est à terminer par l’administrateur. Réessayez une fois la connexion activée."} /></p>
    <Link className="btn-primary" href="/"><T text={"Retour à l’accueil"} /></Link>
  </section></section>
}
