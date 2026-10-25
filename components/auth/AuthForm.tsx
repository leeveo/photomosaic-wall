'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Brand from '@/components/Brand'
import { LanguageSwitch, useLanguage } from '@/components/LanguageProvider'
import EnvironmentGate from '@/components/EnvironmentGate'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup' | 'reset'
export default function AuthForm({ mode }: { mode: Mode }) {
  const { language } = useLanguage()
  const tr = (fr: string, en: string) => language === 'fr' ? fr : en
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [resetRequested, setResetRequested] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setFailed(false); setMessage('')
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setMessage(tr('Mot de passe modifié. Vous pouvez accéder à votre compte.', 'Password updated. You can now access your account.'))
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/account` } })
        if (error) throw error
        if (data.session) router.replace('/account')
        else setMessage(tr('Consultez votre e-mail pour confirmer votre inscription. Si vous possédez déjà un compte, connectez-vous.', 'Check your email to confirm your registration. If you already have an account, sign in.'))
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        router.replace('/admin')
      }
    } catch {
      setFailed(true)
      setMessage(tr('Action impossible. Vérifiez vos informations, la confirmation de votre e-mail et réessayez.', 'Unable to continue. Check your details and email confirmation, then try again.'))
    } finally { setBusy(false) }
  }
  const reset = async () => {
    if (!email || busy) { setMessage(tr('Indiquez votre adresse e-mail.', 'Enter your email address.')); return }
    setBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
      if (error) throw error
      setResetRequested(true); setFailed(false)
      setMessage(tr('Si ce compte existe, un lien de réinitialisation vous sera envoyé.', 'If this account exists, a password reset link will be sent.'))
    } catch { setFailed(true); setMessage(tr('Envoi impossible. Réessayez plus tard.', 'Unable to send. Please try again later.')) }
    finally { setBusy(false) }
  }
  return <EnvironmentGate><main className="auth-page"><header><Brand /><LanguageSwitch /></header><section className="auth-card"><span className="studio-eyebrow">PHOTOMOSAIC STUDIO</span><h1>{mode === 'signup' ? tr('Créez votre espace.', 'Create your workspace.') : mode === 'reset' ? tr('Un nouveau départ.', 'A fresh start.') : tr('Heureux de vous revoir.', 'Welcome back.')}</h1><p>{tr('Un compte personnel. Vos événements, vos souvenirs.', 'Your personal account. Your events, your memories.')}</p><form onSubmit={submit}>
    {mode !== 'reset' && <label>{tr('Adresse e-mail', 'Email address')}<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}
    <label>{mode === 'reset' ? tr('Nouveau mot de passe', 'New password') : tr('Mot de passe', 'Password')}<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 1 : 12} required value={password} onChange={e => setPassword(e.target.value)} /></label>
    {mode !== 'login' && <small>{tr('12 caractères minimum.', 'At least 12 characters.')}</small>}
    <button className="studio-primary" disabled={busy}>{busy ? tr('Veuillez patienter…', 'Please wait…') : mode === 'signup' ? tr('Créer mon compte', 'Create account') : mode === 'reset' ? tr('Enregistrer le mot de passe', 'Save password') : tr('Se connecter', 'Sign in')}</button>
    </form>{message && <p className={failed ? 'wall-error' : 'auth-notice'} role={failed ? 'alert' : 'status'}>{message}</p>}
    {mode === 'login' && <button className="auth-text-button" disabled={busy || resetRequested} onClick={reset}>{tr('Mot de passe oublié ?', 'Forgot password?')}</button>}
    <div className="auth-links"><Link href={mode === 'signup' ? '/login' : '/signup'}>{mode === 'signup' ? tr('Déjà un compte ? Se connecter', 'Already registered? Sign in') : tr('Pas encore de compte ? Inscription', 'New here? Create an account')}</Link>{mode === 'reset' && <Link href="/account">{tr('Mon compte', 'My account')}</Link>}<Link href="/">{tr('Retour au site', 'Back to website')}</Link></div></section></main></EnvironmentGate>
}
