# P3.1 - Marketplace Governance & Automation Engine

## Statut

P3.1 est concu comme un moteur de gouvernance et d'aide a la decision. Il ouvre, explique, priorise et historise des dossiers de revue Marketplace. Il n'execute aucune action sensible automatiquement.

Le P0 financier reste fige en observation/stabilisation.

## Audit initial

Sources P2 disponibles et reutilisees :

- P2.1 Studio Image Marketplace : signaux de conformite image via les alertes agregees.
- P2.2 Coach IA Marketplace : recommandations et qualite fiche via P2.5.
- P2.3 SEO Marketplace : visibilite, SEO faible, propositions en attente via P2.5.
- P2.4 Catalogue Intelligence : qualite catalogue et doublons candidats.
- P2.5 Marketplace Analytics : alertes, scores, tendances, boutiques a accompagner.
- P1.7 Business/Trust Score : permission preparee pour gouvernance, sans calcul financier.

Donnees manquantes identifiees :

- Workflow central de dossiers.
- Historique append-only des decisions.
- Notifications internes gouvernance.
- Vue vendeur limitee aux dossiers visibles.
- RPC admin pour scanner, classer et cloturer les dossiers.

## Architecture

Tables ajoutees :

- `marketplace_governance_case_types`
- `marketplace_governance_cases`
- `marketplace_governance_case_history`
- `marketplace_governance_notifications`
- `marketplace_governance_notification_preferences`

Vues ajoutees :

- `admin_marketplace_governance_overview`
- `admin_marketplace_governance_queue`
- `admin_marketplace_governance_trends`
- `admin_marketplace_governance_notifications`
- `my_marketplace_governance_cases`
- `my_marketplace_governance_notifications`
- `my_marketplace_governance_case_history`

RPC ajoutees :

- `scan_marketplace_governance_cases(limit)`
- `create_marketplace_governance_case(...)`
- `update_marketplace_governance_case(...)`
- `comment_marketplace_governance_case(...)`
- `mark_marketplace_governance_notification_read(id)`

## Workflow

1. Le moteur lit les alertes P2.5 et les doublons P2.4.
2. Il cree un dossier s'il n'existe pas deja pour la source.
3. Le dossier contient probleme, explication, donnees utilisees, impacts et actions recommandees.
4. L'admin decide : nouveau, en cours, attente, valide, refuse, archive.
5. Chaque changement est inscrit dans l'historique append-only.
6. Le vendeur ne voit un dossier que si `is_vendor_visible = true`.

## RLS et securite

- Admin : vision globale via `marketplace_governance_is_admin()`.
- Vendeur : lecture uniquement des dossiers visibles qui lui appartiennent.
- Historique : append-only, modification/suppression bloquees.
- Notifications : admin global, vendeur par destinataire.
- Actions sensibles reservees aux RPC securisees.

## Non-regression P0

La migration ne contient aucune mutation sur :

- wallets
- commissions
- orders
- payments
- withdrawals
- Revenue Engine
- ledger
- snapshots financiers

Le module P3.1 ne produit que des dossiers, historiques et notifications.

## Interfaces

Admin :

- onglet `Gouvernance Marketplace`
- scan automatique
- file de traitement
- detail d'un dossier
- changement statut/priorite
- historique append-only
- tendances et notifications

Vendeur :

- onglet `Gouvernance`
- dossiers visibles de sa boutique
- explications et actions recommandees
- reponse/commentaire vers l'administration

## Tests

Tests ajoutes :

- `p31MarketplaceGovernanceMigration.test.ts`
- `p31MarketplaceGovernanceIntegration.test.ts`

Couverture :

- schema SQL
- historique append-only
- RPC
- vues admin/vendeur
- permissions
- absence de mutation P0
- integration des onglets
- vendeur sans droit de mise a jour directe

## Risques restants

- Les dossiers generes depuis P2.5 dependent de la qualite des snapshots analytics.
- Les notifications internes sont pretes mais ne remplacent pas encore email/SMS/push.
- Les actions recommandees restent textuelles : l'execution concrete doit rester manuelle et separee.
- Les seuils de priorite devront etre ajustes avec l'usage reel.

## Recommandation GO / NO-GO

GO P3.1 avec reserves normales de stabilisation.

Conditions avant P3.2 :

- appliquer la migration SQL ;
- verifier le scan sur donnees reelles ;
- confirmer que les vendeurs ne voient que leurs dossiers visibles ;
- garder P0 strictement fige ;
- surveiller les doublons de dossiers pendant les premiers jours.
