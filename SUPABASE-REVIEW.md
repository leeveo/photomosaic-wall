# Connexion Supabase et priorités produit

## Diagnostic établi

Le message « Impossible de charger les événements » signifie que le bundle a trouvé une URL et une clé au build. Il ne valide ni la clé, ni les permissions, ni le schéma du projet. Le tableau de bord interrompait auparavant tout le chargement si l'une des lectures `projects`, `setups` ou `tiles` échouait. La correction conserve les événements lisibles, distingue les erreurs et masque les compteurs incomplets.

Dans l'environnement de développement, les variables Supabase sont absentes. L'accès réseau au déploiement Vercel et au domaine Supabase historique est refusé par le proxy. Aucune lecture authentifiée, écriture ou migration distante n'a été effectuée. La connexion en production reste donc à confirmer.

Dans les paramètres du projet Vercel, vérifier l'URL du projet Supabase contenant les anciens événements et sa clé publique cliente. Variables : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Appliquer aux environnements concernés, Production et/ou Preview. Redéployer ensuite : les variables NEXT_PUBLIC sont intégrées au build. Ne jamais utiliser de clé service-role côté navigateur.

Si le nouveau message concerne le schéma : comparer les tables et colonnes avec `lib/db.schema.sql`, sans réinitialiser la base existante. S'il concerne les droits : vérifier les politiques et la session attendue ; ne pas désactiver RLS globalement. Une liste vide avec HTTP 200 peut aussi être un filtrage RLS ou un mauvais projet, pas nécessairement une base vide.

## Améliorations recommandées

1. **Accès organisateurs et séparation des événements.** Le code actuel ne comporte pas de parcours de connexion organisateur ; le SQL fourni ne définit pas de politiques RLS. Ajouter une authentification, un propriétaire par événement et des droits adaptés aux invités, puis vérifier les politiques réellement déployées.
2. **Création fiable avec brouillons.** Le wizard crée le projet avant la fin, puis écrit séparément le design, le flyer et la configuration. Un abandon ou un échec peut laisser un projet incomplet. Prévoir un statut brouillon, une reprise, et une finalisation transactionnelle côté serveur. Empêcher les doubles soumissions et afficher les erreurs près des champs.
3. **Mosaïque en direct et capture concurrente.** Le rafraîchissement se fait par polling ; plusieurs invités peuvent choisir la même case. Réserver/attribuer les cases côté serveur et gérer les collisions avec reprise, puis utiliser Realtime pour l'affichage.
4. **Volume et performance.** Paginer les événements/photos (les lectures actuelles peuvent atteindre la limite de résultats Supabase), calculer les compteurs côté serveur et stocker les images dans Storage plutôt que les images base64 dans `setups`.
5. **Outils événementiels.** Ajouter duplication de modèle, archivage, modération des photos, téléchargement ZIP, export haute définition et journal des opérations. Les accompagner d'états de progression et d'annulation.

Les traductions d'interface doivent rester distinctes des contenus édités par l'organisateur. Les parcours réels de création, lecture et capture nécessitent encore une validation sur un projet de test connecté.
