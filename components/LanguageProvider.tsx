'use client'

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'
import { translations } from '@/lib/translations'

type Language = 'fr' | 'en'
const LanguageContext = createContext({ language: 'fr' as Language, setLanguage: (language: Language) => { void language }, t: (text: string) => text })
const subscribe = (listener: () => void) => {
  window.addEventListener('storage', listener)
  window.addEventListener('photomosaic-language', listener)
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('photomosaic-language', listener) }
}
let selectedLanguage: Language | undefined
function snapshot(): Language {
  try { return selectedLanguage || (localStorage.getItem('photomosaic-language') === 'en' ? 'en' : 'fr') }
  catch { return selectedLanguage || 'fr' }
}
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribe, snapshot, () => 'fr' as Language)
  useEffect(() => { document.documentElement.lang = language }, [language])
  const setLanguage = (value: Language) => {
    selectedLanguage = value
    try { localStorage.setItem('photomosaic-language', value) } catch {}
    window.dispatchEvent(new Event('photomosaic-language'))
  }
  const t = (text: string) => language === 'en' ? translations[text] || text : text
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}
export const useLanguage = () => useContext(LanguageContext)
export function T({ text }: { text: string }) { return useLanguage().t(text) }
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage()
  return <div className="studio-language" role="group" aria-label={language === 'fr' ? 'Langue' : 'Language'}>{(['fr','en'] as const).map(value => <button key={value} type="button" aria-pressed={language === value} onClick={() => setLanguage(value)}>{value.toUpperCase()}</button>)}</div>
}
