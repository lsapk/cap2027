# Cap 2027

PWA en français pour suivre les candidatures à la présidentielle de 2027, comparer deux personnes, explorer les propositions par thème, les votes et les déclarations publiques.

## Utilisation

- Ouvrir le site publié. Le site Sites est privé au propriétaire pour cette première publication ; son audience n’est pas modifiée automatiquement. Pour les proches, configurer ensuite le partage du site avec les personnes concernées.
- Les données politiques publiques peuvent être consultées sans connexion Supabase. Créer un compte ou utiliser un compte existant du projet pour synchroniser les favoris et les catégories d’alertes et accéder à l’assistant.
- Si Supabase demande une confirmation par e-mail, confirmer l’adresse puis revenir sur Cap 2027 pour se connecter. Le projet Supabase est partagé avec d’autres applications : son URL de redirection et ses modèles d’e-mail existants sont conservés.
- Installer depuis le menu du navigateur ; sur iOS, Partager → Sur l’écran d’accueil. Une première ouverture en ligne est nécessaire au cache hors connexion.

## Sources et collecte

La source officielle fait référence pour les scrutins et déclarations HATVP. Les registres de candidatures, synthèses de propositions et prises de parole proviennent de réutilisateurs indépendants : être hébergé sur data.gouv.fr ne rend pas une compilation officielle.

- Hémicycle : registre de candidatures, source et date par entrée. Licence Ouverte 2.0.
- 2027etmoi : registre complémentaire, biographies structurées, votes, mandats, prises de parole et sources des annonces. Données sous Licence Ouverte 2.0. Le code de ce fournisseur n’est pas réutilisé.
- PromethEUs / Swipe 2027 : propositions classées par thème, sources, période et limites. Licence Ouverte 2.0.
- HATVP : index officiel des déclarations et de leur état de publication. Licence Ouverte Etalab. Rapprochement exact sur prénom et nom ; aucune donnée manquante n’est déduite.
- Conseil constitutionnel : découverte des jeux de parrainages 2027 sur data.gouv.fr, avec contrôle de l’identifiant du producteur officiel, de l’année, du domaine du fichier et du schéma JSON. Un nouveau schéma bloque l’import et nécessite une adaptation. L’affichage ne prétend pas être un flux continu.
- Portraits : auteur, licence et lien Commons indiqués sur les fiches. Les photos restent sous leur licence d’origine.

La fonction `cap27-api` collecte les données toutes les 30 minutes via le job Supabase Cron `cap2027-refresh-public-data`. Un verrou atomique limite les rafraîchissements à une fois toutes les 25 minutes. Les biographies et l’index HATVP sont réutilisés pendant 12 heures. Une panne d’une source essentielle conserve le dernier relevé valide. Le navigateur consulte le relevé distant chaque minute, et conserve sa dernière copie publique dans IndexedDB pour la consultation hors ligne.

Les positions d’avant 2027 restent identifiées par leur période. Les différences de statut entre registres sont signalées et leurs pièces restent visibles. Le catalogue n’a aucune garantie d’exhaustivité ; la sélection des votes ne permet pas de calculer un taux de présence.

## Assistant

L’assistant demande une session Supabase valide et ne reçoit que les documents publics récupérés pour la question. Les requêtes et réponses ne sont pas enregistrées dans une table de conversation. Le fournisseur reçoit la question et un court historique au moment de la requête.

La fonction réutilise, côté serveur uniquement, la connexion IA déjà configurée sur ce projet (`LOVABLE_API_KEY`), avec un maximum de 20 questions par utilisateur et par jour. Les appels consomment les crédits existants du fournisseur. Le modèle est configurable via `CAP27_AI_MODEL`. Une absence de clé, des crédits épuisés ou une erreur fournisseur sont signalés ; aucune réponse de démonstration n’est substituée.

Les documents sont sélectionnés par mots-clés et contexte candidat, et les réponses comportent une liste de références. L’assistant n’effectue pas une recherche exhaustive du Web ; les sources contradictoires ou anciennes nécessitent une vérification humaine. Aucun profil politique ni score de vote personnalisé n’est calculé.

## Comptes et confidentialité

Projet retenu : `xzgdfetnjnwrberyddmf` (connexion Leny.grivel), le projet `candidat-insight-2027` étant impossible à réactiver à cause de la limite de projets gratuits actifs.

Tables ajoutées : `cap27_snapshot`, `cap27_preferences`, `cap27_jobs`, `cap27_ai_usage`. Toutes ont RLS. Les préférences sont limitées à `auth.uid() = user_id` en lecture et en écriture. Les fonctions de quota et de verrou ne sont pas exécutables par les rôles clients. La clé publique Supabase du client est volontairement publique ; aucune clé serveur n’est dans le code livré.

Les informations politiques agrégées sont lisibles via l’API publique du projet, indépendamment du portail privé Sites. Les préférences personnelles ne le sont pas. Les alertes de cette version sont un fil dans l’application : les e-mails et notifications système en arrière-plan ne sont pas activés.

## Développement

Node.js 22 ou 24.

```sh
npm ci
npm run dev -- --port 8765
npm run build
npm test
node scripts/verify-api.mjs
```

`src/config.ts` contient uniquement l’URL et la clé publique du projet. Pour un autre Supabase, appliquer `supabase/schema.sql` sur un projet neuf, déployer `supabase/cap27-api.ts` avec `scripts/data-core.mjs`, remplacer les valeurs publiques et configurer le fournisseur IA côté serveur. Ne pas rejouer le schéma initial sur une base déjà installée.

`npm run data:refresh` régénère le relevé de départ. La production utilise le relevé distant mis à jour par la fonction Supabase, sans nécessiter de republier le site.

## Vérifications effectuées

- Compilation TypeScript et production.
- Tests des parseurs CSV, des liens, des références candidat, des sources parlementaires et HATVP, et de l’absence de faux décompte de parrainages.
- Vérification réelle de la lecture du relevé, de l’invisibilité des préférences sans connexion, du refus des RPC serveur au rôle anonyme et du refus de l’assistant sans session utilisateur.
- Vérification navigateur de la recherche, de la fiche, du comparateur et du filtrage thématique sur ordinateur et téléphone.

Le parcours de connexion avec le vrai compte, la synchronisation entre deux appareils et une réponse effective du fournisseur IA demandent une session utilisateur : ils ne sont pas présentés comme validés de bout en bout. Le projet Supabase existant possède par ailleurs des avis de configuration et de version antérieurs à cette application ; ils n’ont pas été modifiés dans ce travail.
