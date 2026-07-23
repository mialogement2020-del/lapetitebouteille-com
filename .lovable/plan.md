## P4.5.1 — Pricing Management System

Système complet de gestion des prix catalogue, sans toucher au P0 financier (wallets, orders, payments, revenue engine, ledger, snapshots).

### Périmètre
Uniquement les prix **catalogue** (products, product_packaging_options, wholesale_*). Les tables financières restent intactes.

### 1. Base de données (migrations)

**Table `pricing_margin_rules`** — hiérarchie de marges
- `scope` : `global` | `category` | `brand` | `supplier` | `product`
- `scope_id` : uuid nullable (id catégorie/produit/etc.)
- `margin_retail_percent`, `margin_wholesale_percent`
- `priority` calculée : product(5) > brand(4) > supplier(3) > category(2) > global(1)
- `is_active`, timestamps, `created_by`

**Table `pricing_history`** — journal append-only
- `action` : `margin_update` | `price_recalc` | `rollback` | `simulation`
- `actor_id`, `scope`, `scope_id`
- `old_margin`, `new_margin`, `old_price`, `new_price`
- `affected_products` (jsonb : liste ids + prix avant/après)
- `reason`, `parent_history_id` (pour rollback)

**Table `pricing_simulations`** — simulations sauvegardées
- config marges proposée, résultats calculés (jsonb), `applied_at`

**Extension `products`**
- `supplier_id` (référence brands/suppliers si absent), déjà existants : `purchase_price`, `markup_percent_override`, `price`, `wholesale_price_carton`

**Extension `product_packaging_options`**
- Déjà présent : `bottle_quantity`, `total_price`, `discount_tiers`. Ajouter `min_wholesale_quantity` (nombre min de packages), `is_wholesale_tier`.

**RLS** : lecture publique sur règles actives, écriture réservée aux admins avec permission `pricing_admin` (via `admin_permissions` ou nouveau rôle dans `user_roles`).

### 2. Pricing Engine (SQL functions)

- `public.resolve_product_margin(product_id, mode: 'retail'|'wholesale')` SECURITY DEFINER : parcourt la hiérarchie et retourne la marge applicable.
- `public.compute_product_price(product_id, mode)` : `purchase_price × (1 + margin/100)`.
- `public.simulate_margin_change(rules jsonb)` : retourne liste produits impactés + delta prix, sans écrire.
- `public.apply_margin_change(rules jsonb, reason text)` : recalcule tous les prix concernés, met à jour `products.price` et `product_packaging_options.total_price`, insère `pricing_history`.
- `public.rollback_pricing_change(history_id uuid)` : restaure les prix depuis `affected_products`.

### 3. Dashboard Admin

Nouvel onglet **"Pricing Management"** avec sous-sections :

1. **Marges** : table hiérarchique (global → catégorie → marque → fournisseur → produit), édition inline retail/gros.
2. **Simulation** : formulaire "modifier marge X → simuler", table des impacts, bouton "Appliquer".
3. **Historique** : timeline avec filtres (utilisateur, scope, date), bouton "Rollback" par entrée.
4. **Produits impactés** : vue explorateur après changement.
5. **Exports** : CSV / Excel via `xlsx` skill (marges, prix actuels, historique, simulations).
6. **Gros — Paliers libres** : édition des `product_packaging_options` avec ajout illimité de paliers (déjà partiel via `discount_tiers` — on étend l'UI).

Composants clés :
- `PricingDashboard.tsx` (container)
- `PricingMarginsTable.tsx`
- `PricingSimulator.tsx`
- `PricingHistoryTimeline.tsx`
- `PricingRollbackDialog.tsx`
- `PricingExports.tsx`
- `WholesaleQuantityEditor.tsx` (paliers libres par produit)

### 4. Catalogue — affichage

`ProductCard.tsx` : ajouter badges format disponibles.
```
À partir de 4 500 FCFA
🏷️ Détail  📦 Carton  🗃️ Caisse
```
Basé sur : `products.price` (détail), `products.available_in_case`, `product_packaging_options` (carton/caisse). Le prix affiché est le **minimum** entre détail unitaire et prix unitaire du plus gros carton (si visible).

Contrôle stock à l'ajout au panier : déjà partiel, on renforce (`stock_quantity` sur products et packaging_options).

### 5. Sécurité & permissions

- Nouveau rôle applicatif `pricing_admin` dans `app_role` enum OU permission dans `admin_permissions`.
- Toutes les fonctions SQL `SECURITY DEFINER` vérifient `has_role(auth.uid(), 'admin') OR has_pricing_permission(auth.uid())`.
- Historique **append-only** : politique RLS interdit UPDATE/DELETE sur `pricing_history`.

### 6. Observabilité (P3.5)

Insert dans `platform_observability_metrics` :
- `pricing.recalc.count`
- `pricing.recalc.duration_ms`
- `pricing.recalc.errors`
- `pricing.rollback.count`

### 7. Tests
- `pricing_engine.test.ts` : résolution hiérarchie, calcul prix, simulation.
- `pricing_rollback.test.ts` : rollback restaure valeurs.
- `pricing_permissions.test.ts` : RLS bloque non-admins.
- `pricing_history_append_only.test.ts` : UPDATE/DELETE refusés.
- `wholesale_quantity.test.ts` : paliers libres, stock.

### 8. Non-régression P0

Aucune modification sur : `wallets*`, `orders`, `order_items`, `payment_*`, `commissions`, `revenue_engine_*`, `financial_ledger_entries`, `*_snapshots`. Test dédié : `p0_isolation_pms.test.ts` vérifie l'absence de dépendances SQL.

### 9. Livrables & rapport final

Documentation : `docs/p45-pricing-management-system.md` (architecture, contrats SQL, matrice permissions).
Rapport final avec verdict **GO / GO AVEC RÉSERVES / NO-GO** basé sur : tests verts, isolation P0 vérifiée, migrations idempotentes.

### Déroulé d'exécution proposé

1. Migration SQL 1 : tables + RLS + fonctions moteur.
2. Migration SQL 2 : simulate/apply/rollback + historique + observabilité.
3. UI Admin : dashboard + sous-onglets.
4. UI Catalogue : badges formats.
5. Tests + doc + rapport.

C'est un chantier volumineux (~4-6 turns). Je peux commencer par les migrations SQL dès validation.
