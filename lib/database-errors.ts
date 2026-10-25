/** Return safe, actionable messages without exposing database response details. */
export function databaseErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code || ''
  if (code === '42501') return 'Accès refusé par Supabase. Vérifiez les droits et les politiques d’accès du projet.'
  if (['PGRST301', 'PGRST302', 'PGRST303'].includes(code) || /invalid api key|invalid jwt/i.test(error?.message || '')) return 'La clé Supabase est invalide ou la session a expiré. Vérifiez la configuration du déploiement.'
  if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code)) return 'Le schéma Supabase ne correspond pas à l’application. Vérifiez les tables et les colonnes requises.'
  if (code === '23505') return 'Cet identifiant existe déjà. Choisissez un autre identifiant.'
  if (/fetch|network/i.test(error?.message || '')) return 'Supabase est inaccessible. Vérifiez la connexion réseau et l’URL du projet.'
  return 'L’opération Supabase a échoué. Vérifiez le projet connecté et ses droits d’accès.'
}
