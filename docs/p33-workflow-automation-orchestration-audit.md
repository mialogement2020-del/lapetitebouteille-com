# P3.3 Workflow Automation & Orchestration Engine

## Audit initial

P3.1 detecte les anomalies Marketplace et P3.2 les transforme en dossiers resolubles par des humains. Le besoin restant etait d'automatiser les operations repetitives sans donner au systeme le pouvoir de prendre des decisions sensibles.

Constats principaux :

- Les dossiers P3.2 disposent deja d'evenements, commentaires, checklists, escalades et notifications.
- Les operations repetitives etaient manuelles : creer des rappels, notifier l'admin, preparer une checklist, proposer une escalade.
- Les modules P2 et P3 n'ont pas besoin d'acces aux wallets, commissions, commandes ou paiements.
- Le moteur doit rester auditable, desactivable et limite a la preparation du travail humain.

## Architecture

Migration ajoutee :

- `supabase/migrations/20260718210000_p33_workflow_automation_orchestration.sql`

Tables :

- `marketplace_workflow_automation_rules` : regles actives/inactives, trigger, conditions, actions, priorite, compteurs.
- `marketplace_workflow_automation_queue` : file d'attente des jobs a traiter.
- `marketplace_workflow_automation_executions` : journal append-only des executions.
- `marketplace_workflow_automation_tasks` : taches, rappels et demandes d'information produits par les automations.
- `marketplace_workflow_automation_schedules` : preparation de jobs recurrents ou programmes.

RPC :

- `admin_create_marketplace_workflow_automation_rule`
- `admin_toggle_marketplace_workflow_automation_rule`
- `admin_schedule_marketplace_workflow_reminder`
- `process_marketplace_workflow_automation_queue`
- `process_marketplace_workflow_scheduler`

Actions autorisees :

- `send_notification`
- `create_task`
- `schedule_reminder`
- `assign_checklist`
- `request_information`
- `propose_escalation`
- `open_sub_case`

Actions sensibles volontairement exclues :

- suspension automatique d'une boutique ;
- suppression automatique d'un produit ;
- modification automatique d'une commande ;
- mouvement wallet ;
- creation ou paiement de commission ;
- capture ou remboursement financier.

## Interface admin

Fichier modifie :

- `src/components/admin/MarketplaceGovernanceDashboard.tsx`

Nouvel onglet :

- `Automations`

Fonctions visibles :

- compteur de regles actives ;
- jobs en attente ;
- executions 24h ;
- taches ouvertes ;
- creation de regles limitees aux actions non sensibles ;
- activation/desactivation de regles ;
- traitement manuel de la file ;
- consultation queue/executions/taches.

Le vendeur ne dispose d'aucun controle sur les automations.

## RLS et securite

Toutes les tables P3.3 ont RLS active.

Principes :

- lecture admin uniquement ;
- ecriture admin uniquement pour regles, taches et schedules ;
- traitement service/admin ;
- historique d'execution append-only ;
- vue admin filtree par `marketplace_workflow_automation_is_admin()`.

## Non-regression P0

Le module ne modifie pas :

- `wallets`
- `commissions`
- `orders`
- `payments`
- `withdrawal_requests`
- `financial_ledger_entries`
- `revenue_engine_snapshots`
- `commission_pool_snapshots`

Il ne fait que preparer des actions de workflow non financieres.

## Tests ajoutes

- `src/__tests__/p33WorkflowAutomationMigration.test.ts`
- `src/__tests__/p33WorkflowAutomationIntegration.test.ts`

Couverture :

- tables, RPC et vues P3.3 ;
- historique append-only ;
- actions non sensibles uniquement ;
- absence de mutation P0 ;
- integration admin ;
- absence d'exposition vendeur.

## Procedure de deploiement

1. Merger la branche GitHub.
2. Publier dans Lovable si un publish est propose.
3. Appliquer la migration SQL :
   `supabase/migrations/20260718210000_p33_workflow_automation_orchestration.sql`
4. Ouvrir Admin > Marketplace Governance > Automations.
5. Verifier les regles seed, la file et les executions.
6. Lancer "Traiter la file" uniquement pour tester une petite quantite.

## GO / NO-GO

Recommandation : GO avec reserves.

Conditions GO :

- migration appliquee sans erreur ;
- onglet admin visible ;
- aucune erreur RPC lors du traitement manuel ;
- aucune table P0 modifiee ;
- executions visibles dans le journal.

Reserves :

- le cron automatique peut etre branche plus tard ;
- les regles initiales doivent etre observees quelques jours ;
- toute nouvelle action doit rester non sensible par defaut.
