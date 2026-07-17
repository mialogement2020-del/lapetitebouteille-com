# P2.3 - SEO & Discoverability Marketplace

## Objectif

P2.3 ajoute une couche consultative pour améliorer la visibilité des boutiques et produits Marketplace sans publier automatiquement de modification.

Le module mesure :

- qualité SEO des fiches ;
- découvrabilité dans la Marketplace ;
- cohérence des titres, descriptions, catégories et médias ;
- propositions de contenu ;
- synonymes de recherche ;
- entrées publiques destinées au sitemap Marketplace.

## Tables

- `marketplace_seo_product_scores` : snapshots append-only des scores produit.
- `marketplace_seo_shop_scores` : snapshots append-only des scores boutique.
- `marketplace_seo_content_proposals` : propositions SEO à valider.
- `marketplace_seo_proposal_events` : historique append-only des décisions.
- `marketplace_search_synonyms` : synonymes publics actifs et gérés par admin.
- `marketplace_discoverability_events` : événements analytics Marketplace append-only.
- `marketplace_duplicate_candidates` : candidats doublons gérés par admin.

## RPC

- `calculate_marketplace_product_seo(product_id)` : calcule un score produit pour le vendeur propriétaire ou un admin.
- `calculate_marketplace_shop_seo(vendor_shop_id)` : consolide le score boutique.
- `generate_marketplace_seo_product_proposals(product_id)` : crée des propositions non publiées.
- `update_marketplace_seo_proposal_status(proposal_id, status, explanation)` : suit le statut d'une proposition.
- `record_marketplace_discoverability_event(...)` : journalise un événement Marketplace validé.

Les écritures de scores doivent passer par RPC contrôlées. Les vendeurs ne doivent pas insérer directement leurs scores ou snapshots.

## RLS

- Vendeur : lecture de ses propres scores, propositions et événements.
- Admin : supervision via permissions `marketplace_seo`, `marketplace_coach`, `marketplace_image_studio`, `products` ou `full_access`.
- Public : lecture des synonymes actifs et des entrées sitemap Marketplace.
- Historique : scores, snapshots et événements sont append-only.

## Flux vendeur

1. Le vendeur ouvre son panneau SEO.
2. Il lance l'analyse d'une fiche ou de sa boutique.
3. Le moteur calcule les scores via RPC.
4. Le vendeur consulte les problèmes et recommandations.
5. Les propositions restent en brouillon ou en attente, sans publication automatique.

## Flux admin

1. L'admin consulte la vue globale.
2. Il repère les boutiques et produits faibles.
3. Il supervise les synonymes et doublons.
4. Il peut recalculer les scores ou suivre les propositions.

## Sitemap

La vue `public_marketplace_sitemap_entries` expose les routes publiques Marketplace éligibles.
Le script `scripts/generate-sitemap.mjs` les ajoute à `public/sitemap.xml`.

## Analytics

Les événements de découvrabilité sont strictement consultatifs. Ils ne modifient aucun score directement et ne déclenchent aucune action financière.

## Limites

- Les scores sont heuristiques et devront être ajustés avec les données réelles.
- Les événements analytics doivent rester filtrés et limités pour éviter le bruit.
- La génération de contenus reste une proposition, pas une publication automatique.

## Non-régression P0

P2.3 ne modifie pas :

- wallets ;
- commissions ;
- commandes ;
- paiements ;
- retraits ;
- Revenue Engine ;
- Commission Pool ;
- ledger ;
- snapshots financiers ;
- attribution financière.

## Tests principaux

- migration P2.3 ;
- intégration vendeur SEO ;
- sitemap Marketplace ;
- non-régression P0 ;
- durcissement P2-S1 contre les insertions directes et les événements invalides.
