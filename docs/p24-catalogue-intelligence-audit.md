# P2.4 - Catalogue Intelligence Engine

## Statut

GO technique pour intégration contrôlée.

Le P0 financier reste figé en observation. Ce module ne modifie ni wallets, ni commissions, ni commandes, ni paiements, ni retraits, ni ledger, ni snapshots financiers.

## Audit de l'existant

La Marketplace disposait déjà de briques utiles :

- Studio Image Marketplace pour la conformité visuelle.
- Coach IA Marketplace pour les recommandations vendeur.
- SEO Marketplace pour la découvrabilité.
- Tables produits, boutiques vendeurs, catégories et rôles Marketplace.

Les limites restantes côté catalogue :

- absence de référentiel officiel d'attributs produit ;
- marques non normalisées ;
- variantes produits non structurées ;
- doublons détectables seulement manuellement ;
- qualité catalogue non mesurée de façon indépendante ;
- propositions IA non centralisées entre admin et vendeur.

## Architecture SQL

La migration `20260718113000_p24_catalogue_intelligence_engine.sql` ajoute :

- `catalogue_attribute_definitions` : attributs officiels et règles de validation ;
- `catalogue_brand_references` : marques canoniques, alias et producteurs ;
- `catalogue_category_taxonomy` : arbre taxonomique officiel ;
- `catalogue_product_variants` : variantes volume, format, packaging, millésime, coffret ;
- `catalogue_product_quality_snapshots` : scores append-only de qualité catalogue ;
- `catalogue_ai_enrichment_proposals` : propositions IA traçables ;
- `catalogue_duplicate_candidates` : candidats doublons avec score et signaux ;
- `catalogue_intelligence_events` : journal append-only des décisions.

## RPC

- `analyze_catalogue_product(product_id)` calcule un score catalogue et détecte les champs manquants, incohérences, marque probable, taxonomie probable et doublons.
- `update_catalogue_enrichment_proposal_status(...)` trace les décisions vendeur/admin sur les propositions.
- `update_catalogue_duplicate_candidate_status(...)` réserve la décision doublon à l'admin.

## RLS

- Les vendeurs lisent uniquement leurs produits, scores et propositions.
- Les admins autorisés lisent et pilotent la vue globale.
- Les référentiels sont lisibles par les utilisateurs authentifiés lorsqu'ils sont actifs.
- Les événements restent append-only et consultables selon propriété ou permission admin.

## Interfaces

Admin :

- score moyen catalogue par boutique ;
- fiches sous 70 % ;
- propositions IA ;
- doublons candidats ;
- référentiels attributs, marques et taxonomie ;
- analyse rapide par UUID produit.

Vendeur :

- score qualité de ses fiches ;
- champs manquants ;
- alertes de normalisation ;
- propositions à approuver/rejeter/archiver ;
- fiches encore non analysées.

## Tests

Tests ajoutés :

- migration P2.4 et absence de mutation P0 ;
- RLS et vues admin/vendeur ;
- raccordement admin/vendeur ;
- absence d'actions financières dans les composants P2.4.

## Risques restants

- Les scores de qualité sont heuristiques au départ et doivent être calibrés avec les données réelles.
- Les référentiels marques/taxonomie doivent être enrichis progressivement.
- Les propositions approuvées ne modifient pas encore automatiquement la fiche produit : c'est volontaire pour éviter les publications non contrôlées.
- La fusion réelle de doublons doit rester manuelle tant que les règles métier Marketplace ne sont pas stabilisées.

## Recommandation

Activer P2.4 en observation, analyser les fiches Marketplace réelles, enrichir les référentiels, puis seulement ensuite lancer P2.5.
