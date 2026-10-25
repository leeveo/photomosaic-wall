# Comptes, événements privés et Stripe

Le code fournit `/signup`, `/login`, `/logout`, `/reset-password` et `/account`, en français et anglais. Le studio exige une session d'organisateur et un abonnement Stripe actif. La sécurité des données est assurée par les politiques SQL (RLS), pas par les redirections du navigateur.

## Activation en production

1. Sauvegarder la base et prévoir une fenêtre de maintenance : la migration rend les buckets `tiles` et `backgrounds` privés et remplace les anciennes politiques publiques sur les tables de l'application. Les anciens liens sans invitation ne donneront plus accès aux photos. Les URL signées déjà émises restent utilisables jusqu'à leur expiration (une heure pour les nouvelles URL).
2. Vérifier les tables du schéma `lib/db.schema.sql`, puis appliquer `supabase/migrations/20261025_accounts_and_events.sql` via les migrations Supabase ou l'éditeur SQL administrateur. Ne pas recréer/effacer les tables existantes. Le script conserve les événements existants avec `owner_id NULL` : aucun nouvel inscrit ne les récupère automatiquement.
3. Dans Supabase Auth, activer les comptes e-mail/mot de passe, la confirmation d'e-mail et les connexions anonymes pour les invités. Configurer un SMTP de production, les limites de débit et la protection anti-abus adaptées au service. Définir Site URL avec le domaine de production et autoriser exactement `https://VOTRE-DOMAINE/account` et `https://VOTRE-DOMAINE/reset-password` comme URL de redirection. Ajouter séparément les domaines de test souhaités.
4. Le propriétaire désigné des anciens événements est **`marcmenu707@gmail.com`**. Créer ce compte via `/signup` et confirmer son e-mail, puis exécuter `supabase/admin/assign_legacy_events.sql` dans l'éditeur SQL administrateur. Le script exige un unique compte confirmé et non anonyme, attribue uniquement les événements dont `owner_id IS NULL`, et journalise l'attribution. Il peut être relancé sans réattribuer les événements déjà possédés. Il ne change ni les abonnements ni le statut des événements : les anciens événements restés en brouillon pourront être publiés depuis le studio après activation de l'abonnement.

5. Dans Stripe, créer un produit et son prix récurrent. Activer le portail client. Créer un endpoint `https://VOTRE-DOMAINE/api/billing/webhook` pour `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Le webhook vérifie la signature, relit l'abonnement Stripe et applique les événements de manière idempotente. Le retour de Checkout seul n'accorde jamais un abonnement.
6. Configurer les variables ci-dessous dans Vercel (test et production séparément), puis redéployer. Ne jamais envoyer les secrets dans le chat ou les committer.

| Variable | Usage |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique de ce même projet |
| `NEXT_PUBLIC_SITE_URL` | Origine HTTPS canonique du site |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret serveur Supabase, jamais `NEXT_PUBLIC_` |
| `STRIPE_SECRET_KEY` | Secret Stripe serveur |
| `STRIPE_PRICE_ID` | Identifiant du prix récurrent autorisé |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature de cet endpoint Stripe |

7. Tester en mode Stripe test : inscription, confirmation, connexion, Checkout, activation par webhook, portail, annulation et déconnexion. Créer deux comptes et vérifier qu'aucun ne peut lire ou modifier les données de l'autre. Tester aussi un invité dans une fenêtre privée avec le nouveau QR code. Configurer ensuite les clés, prix et webhook du mode live.

## Comportements et limites

- Le studio liste les événements par pages de 24 ; la photothèque charge 48 photos par page et exporte la page affichée en ZIP. Les statistiques de la liste sont calculées en base sur les événements correspondant au filtre.
- Un brouillon est enregistré à chaque étape. La configuration complète est sauvegardée dans une transaction. Les fichiers envoyés avant un échec de transaction peuvent rester orphelins ; prévoir un nettoyage différé des objets non référencés et des réservations expirées.
- Les invitations incluent un jeton dans le fragment du lien. Seuls les participants qui possèdent le lien peuvent rejoindre l'événement. Révoquer les invitations invalide aussi les QR codes précédents. Un invité n'a jamais accès au studio.
- La réservation d'une case expire après cinq minutes et empêche deux participants de choisir la même case. Une photo refusée conserve sa case jusqu'à sa suppression. La mosaïque publique affiche uniquement les photos approuvées ; elle reçoit les mises à jour Realtime avec repli par polling.
- Les comptes sans abonnement actif ne peuvent pas gérer le studio. Les données restent conservées. Un abonnement `past_due`, `unpaid`, `canceled` ou expiré n'accorde pas d'accès ; aucune période d'essai implicite.
- La migration doit être appliquée sur le bon projet Supabase. Aucun changement de base distant ni paiement réel n'a été effectué dans cet environnement. Les tests PostgreSQL locaux ne remplacent pas le test d'intégration sur Supabase et Stripe.

## Vérification locale

`npm run check`, `npm test`, `npm run build`.

Les tests SQL exécutent la migration sur PostgreSQL embarqué (PGlite) et vérifient RLS, accès croisés, stockage, modération, réservation, révocation, sauvegarde atomique et idempotence des événements de facturation.
