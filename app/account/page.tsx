'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import AccessGate from '@/components/auth/AccessGate'
import Brand from '@/components/Brand'
import { LanguageSwitch, useLanguage } from '@/components/LanguageProvider'
function Account() {
  const { session, active, error, refresh } = useAuth()
  const { language } = useLanguage()
  const tr = (fr: string, en: string) => language === 'fr' ? fr : en
  useEffect(() => { if (active) return; const timer = setInterval(() => void refresh(), 5000); return () => clearInterval(timer) }, [active, refresh])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const billing = async (action: 'checkout' | 'portal') => {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch(`/api/billing/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` } })
      const data = await response.json()
      if (!response.ok || typeof data.url !== 'string') throw new Error()
      const url = new URL(data.url)
      if (url.protocol !== 'https:' || !['checkout.stripe.com','billing.stripe.com'].includes(url.hostname)) throw new Error()
      window.location.assign(url.href)
    } catch { setMessage(tr('Le service de paiement est indisponible. Réessayez plus tard.', 'Billing is unavailable. Please try again later.')); setBusy(false) }
  }
  return <main className="auth-page"><header><Brand /><LanguageSwitch /></header><section className="auth-card"><span className="studio-eyebrow">PHOTOMOSAIC</span><h1>{tr('Mon compte', 'My account')}</h1><p>{session?.user.email}</p><p className="auth-notice">{error ? tr('Vérification de l’abonnement indisponible.', 'Subscription verification is unavailable.') : active ? tr('Votre abonnement est actif.', 'Your subscription is active.') : tr('Votre abonnement n’est pas actif.', 'Your subscription is not active.')}</p><p>{tr('Après un paiement, l’activation est confirmée automatiquement par Stripe. Elle peut prendre quelques instants.', 'After payment, Stripe confirms activation automatically. This may take a moment.')}</p><div className="auth-links"><button className="studio-primary" disabled={busy} onClick={() => billing(active ? 'portal' : 'checkout')}>{active ? tr('Gérer mon abonnement', 'Manage subscription') : tr('Activer mon abonnement', 'Activate subscription')}</button><button className="btn-secondary" onClick={() => void refresh()}>{tr('Actualiser mon statut', 'Refresh status')}</button><Link href="/admin">{tr('Accéder au studio', 'Open studio')}</Link><Link href="/logout">{tr('Me déconnecter', 'Sign out')}</Link></div>{message && <p className="wall-error" role="alert">{message}</p>}</section></main>
}
export default function AccountPage() { return <AccessGate paid={false}><Account /></AccessGate> }
