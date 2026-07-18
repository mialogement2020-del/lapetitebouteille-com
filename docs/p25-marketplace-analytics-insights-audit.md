# P2.5 - Marketplace Analytics & Insights Engine

## Statut

GO technique pour déploiement contrôlé.

Le P0 financier reste figé en observation/stabilisation. P2.5 ne modifie aucun wallet, aucune commission, aucune commande, aucun paiement, aucun retrait, aucun ledger, aucun Revenue Engine et aucun Commission Pool.

## Audit initial

Sources disponibles et réutilisées :

- P2.1 Studio Image Marketplace : conformité image, statut de traitement, images refusées ou en attente.
- P2.2 Coach IA Marketplace : score boutique, recommandations, analyses produits.
- P2.3 SEO Marketplace : score SEO, découvrabilité, propositions SEO.
- P2.4 Catalogue Intelligence : qualité catalogue, complétude, doublons, propositions d’enrichissement.
- Marketplace : boutiques vendeurs, produits, catégories.

Données manquantes pour une version future :

- vraies impressions/visites par fiche Marketplace ;
- clics par source ;
- taux de conversion vendeur indépendant des commandes financières ;
- historique de partages sociaux par vendeur.

Ces données pourront être ajoutées ensuite via `analytics_events`, sans toucher au P0.

## Architecture

Tables créées :

- `marketplace_analytics_daily_snapshots` : snapshot quotidien par boutique ;
- `marketplace_analytics_alerts` : alertes append-only ;
- `marketplace_analytics_export_logs` : journal des exports.

RPC :

- `calculate_marketplace_analytics_snapshot(shop_id, date)` : agrège les sources P2 et crée/met à jour un snapshot analytique ;
- `export_marketplace_analytics(scope, format, shop_id, days)` : retourne les données exportables selon les permissions.

Vues vendeur :

- `my_marketplace_analytics_dashboard`
- `my_marketplace_analytics_trends`
- `my_marketplace_analytics_alerts`

Vues admin :

- `admin_marketplace_analytics_overview`
- `admin_marketplace_analytics_shop_rankings`
- `admin_marketplace_analytics_trends`

## Indicateurs

Vendeur :

- produits actifs ;
- santé boutique ;
- qualité catalogue ;
- score image ;
- score SEO ;
- découvrabilité ;
- complétude ;
- recommandations en attente ;
- produits à enrichir ;
- produits peu visibles ;
- doublons candidats ;
- progression dans le temps.

Admin :

- santé globale Marketplace ;
- boutiques analysées ;
- scores moyens ;
- actions en attente ;
- doublons détectés ;
- enrichissements validés ;
- boutiques les plus complètes ;
- boutiques à accompagner ;
- catégories et marques représentées.

## Alertes

Alertes générées :

- chute de qualité ;
- hausse ou backlog de doublons ;
- images refusées/en attente ;
- produits incomplets persistants ;
- enrichissements non validés ;
- produits peu visibles.

## Exports

Exports disponibles dans l’interface :

- CSV ;
- XLSX compatible Excel ;
- PDF via document téléchargeable.

Les exports passent par RPC et respectent les vues filtrées vendeur/admin.

## RLS et sécurité

- Un vendeur lit uniquement les snapshots, alertes et exports liés à sa boutique.
- Un admin avec permission `marketplace_analytics` ou droits P2 supérieurs voit la vue globale.
- Les alertes sont append-only.
- Les exports sont journalisés.
- Aucune permission d’écriture directe n’est accordée aux utilisateurs sur les tables analytics.

## Tests

Tests ajoutés :

- présence des tables, vues et RPC ;
- agrégation des sources P2.1 à P2.4 ;
- exports ;
- permissions ;
- absence de mutations P0 ;
- raccordement admin/vendeur.

## Risques restants

- Les tendances seront faibles tant que peu de snapshots quotidiens existent.
- Les exports PDF sont volontairement simples et pourront évoluer vers un rendu PDF plus sophistiqué.
- La découvrabilité réelle dépendra de futurs événements de consultation/clic.

## Recommandation

GO P2.5.

Après déploiement, exécuter un recalcul initial puis observer plusieurs jours de snapshots avant de considérer les tendances comme fiables.

Ne pas lancer P2.6 avant validation terrain des tableaux de bord vendeur et admin.
