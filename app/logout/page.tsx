'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { LanguageSwitch, useLanguage } from '@/components/LanguageProvider'
import Brand from '@/components/Brand'
export default function LogoutPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const logout = async () => {
    setBusy(true)
    try {
      if (isSupabaseConfigured) { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error }
      router.replace('/login'); router.refresh()
    } catch { setError(true); setBusy(false) }
  }
  return <main className="connection-page"><Brand /><LanguageSwitch /><div className="auth-card"><h1>{language === 'fr' ? 'Quitter votre session ?' : 'Sign out of your session?'}</h1><p>{language === 'fr' ? 'Vos événements sont conservés dans votre compte.' : 'Your events remain saved in your account.'}</p><button className="studio-primary" onClick={logout} disabled={busy}>{language === 'fr' ? 'Me déconnecter' : 'Sign out'}</button><button className="btn-secondary" onClick={() => router.push('/admin')}>{language === 'fr' ? 'Annuler' : 'Cancel'}</button>{error && <p role="alert">{language === 'fr' ? 'Déconnexion impossible. Réessayez.' : 'Unable to sign out. Please try again.'}</p>}</div></main>
}
