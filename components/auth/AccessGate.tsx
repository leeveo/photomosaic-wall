'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import EnvironmentGate from '@/components/EnvironmentGate'

function SignedIn({ children, paid }: { children: React.ReactNode; paid: boolean }) {
  const { session, active, loading, error } = useAuth()
  const { language } = useLanguage()
  const router = useRouter()
  const signedIn = Boolean(session && !session.user.is_anonymous)
  useEffect(() => { if (!loading && !signedIn) router.replace('/login') }, [loading, signedIn, router])
  if (loading || !signedIn) return <div className="connection-page" role="status">{language === 'fr' ? 'Vérification de votre compte…' : 'Checking your account…'}</div>
  if (paid && !active) return <section className="connection-page"><div className="wall-panel connection-card"><h1>{language === 'fr' ? 'Votre espace vous attend.' : 'Your workspace awaits.'}</h1><p>{error ? (language === 'fr' ? 'Impossible de vérifier votre abonnement. Réessayez depuis votre compte.' : 'Unable to verify your subscription. Try again from your account.') : (language === 'fr' ? 'Activez votre abonnement pour créer et gérer vos événements.' : 'Activate your subscription to create and manage your events.')}</p><Link className="studio-primary" href="/account">{language === 'fr' ? 'Gérer mon abonnement' : 'Manage my subscription'}</Link><Link className="btn-secondary" href="/logout">{language === 'fr' ? 'Déconnexion' : 'Sign out'}</Link></div></section>
  return <div key={session!.user.id}>{children}</div>
}
export default function AccessGate({ children, paid = true }: { children: React.ReactNode; paid?: boolean }) {
  return <EnvironmentGate><SignedIn paid={paid}>{children}</SignedIn></EnvironmentGate>
}
