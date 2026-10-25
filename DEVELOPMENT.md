# Développement de PhotoMosaic Wall

Depuis `/workspace/photomosaic-wall`, avec Node.js 24 et npm :

```sh
npm ci
npm run dev -- --hostname 0.0.0.0
```

La page d’accueil fonctionne sans service externe. Les routes du studio affichent un état de connexion tant que Supabase n’est pas configuré.

Configurer `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans les paramètres de l’environnement ou dans un fichier `.env.local` ignoré par Git. Utiliser uniquement la clé publique du client Supabase, jamais une clé service-role. Redémarrer le serveur après toute modification ; reconstruire les bundles de production.

La base attend les tables décrites dans `lib/db.schema.sql`, les buckets de stockage `tiles` et `backgrounds`, ainsi que les politiques d’accès adaptées à votre projet. Aucun schéma ni aucune donnée distante n’ont été modifiés pendant ce travail. Autoriser le domaine du projet Supabase dans les paramètres réseau si nécessaire.

```sh
npm run check
node --test tests/mosaic.test.mjs
npm run build
npm start -- --hostname 0.0.0.0
```

Arrêter le serveur de développement avant le build : les deux utilisent `.next`. Aucun serveur d’impression n’est inclus ; la fonction d’impression existante nécessite un service sur la machine participante au port 4000. La caméra nécessite l’autorisation du navigateur et un contexte sécurisé.

## Changements et validation

Le design reprend le système blanc/violet/lavande du dépôt `leeveo/photomosaic-website` (référence `663191e925a97ee3785e30c10bc745760a866121`). Accueil, navigation, studio et photobooth ont été harmonisés, avec états de chargement et d’erreur explicites.

Corrections : effets Zustand qui relançaient les chargements, attribution infinie sur grille pleine, compte à rebours avec effets dans un setter React, double soumission de photo, `Buffer` indisponible dans le navigateur, gestion des images chargées depuis le cache, overlay appliqué deux fois, effacement du setup avant sauvegarde, ratio des étiquettes rectangulaires, QR code pointant vers localhost, configuration ESLint et double configuration Next.js. Le formulaire de création refuse aussi d’écraser un identifiant déjà utilisé et limite la résolution du plan imprimable.

Les tests automatisés couvrent les positions libres, la grille pleine, les dimensions invalides et le chargement/échec des images. L’accueil et les états sans configuration ont été contrôlés dans Chromium en 1440 px et 390 px, sans débordement horizontal ni erreur JavaScript. Les opérations réelles de création, lecture, stockage, capture et impression restent à vérifier avec le projet Supabase et les appareils concernés.
