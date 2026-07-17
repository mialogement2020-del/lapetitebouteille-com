# P2.2 - Coach IA Marketplace

## Audit

Le P2.1 a pose le controle qualite image Marketplace. Le P2.2 ajoute une couche de conseil vendeur sans modifier les ventes, les commandes, les wallets, les commissions ni le P0 financier.

Constats principaux :

- Les vendeurs ont besoin d'un score lisible pour comprendre la qualite de leur boutique.
- Les fiches produits doivent etre analysees sur plusieurs axes : titre, description, image, SEO, completude, stock et conformite.
- Les recommandations doivent etre justifiees pour etre actionnables et auditables.
- Les administrateurs ont besoin d'une vue globale pour identifier les boutiques ou categories faibles.
- Les donnees doivent rester cloisonnees : un vendeur ne voit que ses analyses et recommandations.

## Architecture SQL

Migration : `supabase/migrations/20260717113000_p22_marketplace_coach.sql`

Tables ajoutees :

- `marketplace_coach_product_analyses` : snapshot append-only de chaque analyse produit.
- `marketplace_coach_recommendations` : recommandations priorisees et justifiees.
- `marketplace_coach_shop_snapshots` : score global boutique et synthese commerciale.
- `marketplace_coach_events` : journal append-only des actions du coach.

Fonctions ajoutees :

- `analyze_marketplace_product(product_id)` : calcule les scores d'une fiche et cree les recommandations utiles.
- `generate_marketplace_coach_shop_snapshot(vendor_shop_id)` : consolide la qualite d'une boutique.
- `update_marketplace_coach_recommendation_status(recommendation_id, status)` : marque une recommandation comme acceptee, terminee ou ignoree.

Sources utilisees :

- `products`
- `vendor_shops`
- `marketplace_image_studio_jobs`
- `business_scores`
- `analytics_events`
- `reviews`

## RLS et securite

Le module ajoute la permission admin `marketplace_coach`.

Regles principales :

- un vendeur accede uniquement aux analyses, snapshots, recommandations et evenements de sa boutique ;
- un admin autorise peut voir la vue globale ;
- les historiques d'analyses, snapshots et evenements sont append-only ;
- aucune fonction ne modifie `wallets`, `commissions`, `orders`, `revenue_engine_snapshots` ou `commission_pool_snapshots`.

## Interfaces

Composant ajoute :

- `src/components/admin/MarketplaceCoachDashboard.tsx`

Onglet admin ajoute :

- `marketplace-coach` : Coach Marketplace.

Fonctionnalites UI :

- score global boutique ;
- scores qualite fiche, image, SEO et completude ;
- analyse rapide d'une fiche par UUID produit ;
- generation d'un snapshot boutique ;
- liste des recommandations prioritaires ;
- historique des analyses produit ;
- synthese boutique : forces, faiblesses, opportunites ;
- vue admin des boutiques les plus faibles.

## Tests

Test ajoute :

- `src/__tests__/p22MarketplaceCoachMigration.test.ts`

Ce test verifie :

- creation des tables ;
- fonctions RPC ;
- integration Studio Image, scores, analytics et avis ;
- RLS vendeur/admin ;
- absence de mutation P0, wallets, commissions ou commandes.

## Risques restants

- Les scores sont heuristiques et devront etre ajustes avec les donnees reelles de conversion.
- Les statistiques de consultation dependent de la qualite de `analytics_events`.
- Les recommandations restent consultatives : elles ne modifient pas automatiquement les fiches.
- Le moteur devra etre enrichi plus tard par un vrai modele IA si les donnees deviennent suffisantes.

## Conclusion

Le P2.2 est concu comme un assistant vendeur Marketplace independant des flux financiers. Il ameliore la qualite des boutiques, aide les vendeurs a prioriser leurs actions et donne a l'administration une vision globale de la sante commerciale Marketplace.
