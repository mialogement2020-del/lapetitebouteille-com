# P1.7 - Business Score & Trust Score Engine

## Audit

Les modules P1 creent deja beaucoup de signaux utiles : CRM, objectifs IA, Academy, supports IA, marketplace et historique client. Il manquait un moteur commun pour lire ces signaux et transformer l'activite en indicateurs de qualite, fiabilite et accompagnement.

Le P1.7 ajoute ce moteur en mode analytique uniquement. Il ne modifie aucun wallet, aucune commission, aucune commande, aucun Commission Pool, aucun Revenue Engine et aucun composant P0.

## Architecture

- `business_score_profiles` : profil score par utilisateur.
- `business_score_snapshots` : historique append-only des scores.
- `business_score_events` : journal append-only des calculs et signaux.
- `business_score_badges` : catalogue de badges automatiques.
- `business_score_user_badges` : badges obtenus.
- `business_score_recommendations` : recommandations IA d'accompagnement.
- `calculate_business_trust_score()` : RPC de calcul manuel ou admin.

## Signaux Business Score

- commandes terminees ;
- activite CRM ;
- objectifs IA termines ;
- progression Academy ;
- certifications ;
- supports commerciaux generes ;
- qualite marketplace ;
- satisfaction client.

## Signaux Trust Score

- annulations ;
- remboursements ;
- signaux fraude ;
- conformite marketplace ;
- certifications ;
- qualite des fiches produits.

## Interfaces

- Onglet admin `Scores IA`.
- Score personnel : Business, Trust, Global et niveau.
- Points forts et axes d'amelioration.
- Badges automatiques.
- Recommandations IA.
- Leaderboard admin.
- Alertes d'accompagnement.

## RLS

- Chaque utilisateur voit ses propres scores, badges et recommandations.
- Les admins autorises voient le classement, les alertes et peuvent recalculer un score.
- Les snapshots et events sont append-only.

## Tests

Le test `p17BusinessTrustScoreMigration.test.ts` verifie :

- creation des tables ;
- RPC de calcul ;
- vues utilisateur et admin ;
- badges et recommandations ;
- RLS et append-only ;
- absence de mutation P0 et financiere.

## Risques restants

- Les poids de scoring sont une premiere version observation.
- Les scores doivent etre calibres avec plusieurs semaines de donnees reelles.
- Les badges experts seront plus precis quand les contenus Academy et donnees marketplace seront plus riches.

## Prochaine etape conseillee

Publier le module, executer la migration, recalculer les scores des principaux conseillers, puis observer les alertes avant d'utiliser ces scores pour recommander missions, formations et opportunites.
