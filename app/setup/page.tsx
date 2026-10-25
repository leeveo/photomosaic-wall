 'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AccessGate from '@/components/auth/AccessGate'
import CreateProject from '@/components/CreateProject'
import { LanguageSwitch, useLanguage } from '@/components/LanguageProvider'
function Editor() {
  const params = useSearchParams()
  const { language } = useLanguage()
  return <main className="studio-main"><header className="studio-topbar"><Link href="/admin">{language === 'fr' ? 'Retour au studio' : 'Back to studio'}</Link><LanguageSwitch /></header><div className="studio-editor"><CreateProject initialSlug={params.get('id') || ''} /></div></main>
}
export default function SetupPage() { return <AccessGate><Suspense><Editor /></Suspense></AccessGate> }
