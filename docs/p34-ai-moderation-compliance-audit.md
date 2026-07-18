# P3.4 AI Moderation & Compliance Engine

## Audit initial

P3.4 s'appuie sur les couches existantes :

- P2.1 Studio Image : score et statut de conformité visuelle.
- P2.2 Coach Marketplace : recommandations ouvertes sur les fiches.
- P2.3 SEO Marketplace : score SEO et découvrabilité.
- P2.4 Catalogue Intelligence : qualité catalogue, attributs, doublons.
- P2.5 Analytics : priorisation future par tendances.
- P3.1 Governance : dossiers et notifications.
- P3.2 Case Resolution : workflow humain.
- P3.3 Automation : rappels, tâches et propositions non sensibles.

Le manque identifié était un moteur transversal capable de détecter les violations de conformité sans supprimer ni bloquer automatiquement les contenus.

## Architecture

Migration :

- `supabase/migrations/20260718230000_p34_ai_moderation_compliance_engine.sql`

Tables :

- `marketplace_compliance_policies` : référentiel de règles administrables.
- `marketplace_compliance_findings` : anomalies détectées et file de modération.
- `marketplace_compliance_scores` : score indépendant de conformité.
- `marketplace_compliance_events` : historique append-only.

RPC :

- `scan_marketplace_compliance(limit)` : analyse les produits Marketplace et crée des propositions.
- `update_marketplace_compliance_finding_status(...)` : décision admin explicite, avec création optionnelle de dossier Governance.

Vues admin :

- `admin_marketplace_compliance_overview`
- `admin_marketplace_compliance_queue`
- `admin_marketplace_compliance_policy_stats`
- `admin_marketplace_compliance_shop_stats`
- `admin_marketplace_compliance_trends`

Vue vendeur :

- `my_marketplace_compliance_findings`

## Contrôles automatiques

Le moteur détecte notamment :

- descriptions trop courtes ;
- descriptions dupliquées ou insuffisantes ;
- liens externes et contacts interdits ;
- image absente ou score Studio Image faible ;
- images en double ;
- informations obligatoires manquantes ;
- score SEO faible ;
- score catalogue faible ;
- recommandations Coach non traitées.

Chaque détection produit :

- justification ;
- éléments analysés ;
- niveau de confiance ;
- impact estimé ;
- actions recommandées.

## Score de conformité

Le Compliance Score est séparé de :

- Business Score ;
- Trust Score ;
- Catalogue Quality Score.

Sous-scores :

- `catalogue_compliance_score`
- `image_compliance_score`
- `seo_compliance_score`
- `marketplace_compliance_score`
- `global_compliance_score`

## Files de modération

Statuts :

- `to_review`
- `to_fix`
- `to_complete`
- `to_validate`
- `compliant`
- `rejection_proposed`
- `archived`

Important : `rejection_proposed` reste une proposition. Aucun contenu n'est supprimé automatiquement.

## Interfaces

Admin :

- nouvel onglet `Compliance IA` dans le dashboard Governance ;
- scan manuel ;
- file de modération ;
- changement de statut ;
- création optionnelle de dossier Governance ;
- vues par règle et par boutique.

Vendeur :

- nouvel onglet `Conformité` dans le panneau Governance Marketplace ;
- lecture de ses propres alertes ;
- actions attendues ;
- aucun accès aux RPC admin.

## RLS et sécurité

Principes :

- admin : lecture globale et décisions ;
- vendeur : lecture uniquement des findings de sa boutique ;
- événements append-only ;
- aucune suppression automatique ;
- aucune suspension automatique ;
- aucune mutation des produits par P3.4.

## Non-régression P0

P3.4 ne modifie pas :

- wallets ;
- commissions ;
- commandes ;
- paiements ;
- retraits ;
- Revenue Engine ;
- Ledger ;
- snapshots financiers.

## Tests

Ajoutés :

- `src/__tests__/p34AiModerationComplianceMigration.test.ts`
- `src/__tests__/p34AiModerationComplianceIntegration.test.ts`

Ils vérifient :

- tables/RPC/vues ;
- historique append-only ;
- score indépendant ;
- absence de suppression automatique ;
- absence de mutation P0 ;
- cockpit admin ;
- panneau vendeur read-only.

## Déploiement

1. Merger la branche P3.4.
2. Publier Lovable si demandé.
3. Appliquer la migration :
   `supabase/migrations/20260718230000_p34_ai_moderation_compliance_engine.sql`
4. Ouvrir Admin > Governance > Compliance IA.
5. Lancer un scan limité.
6. Vérifier que les anomalies créent uniquement des propositions.

## GO / NO-GO P3.5

Recommandation : GO avec réserves.

Conditions avant P3.5 :

- migration appliquée sans erreur ;
- scan manuel OK ;
- vendeurs ne voient que leurs alertes ;
- aucune décision destructive ;
- aucun impact P0 ;
- observation pendant quelques jours sur les règles les plus déclenchées.
