# P3.2 - Workflow & Case Resolution Engine

## Statut

P3.2 transforme les dossiers detectes par P3.1 en workflows de resolution suivis, assignables et auditables.

Le module organise le travail humain. Il ne valide pas automatiquement une decision sensible, ne publie pas automatiquement une correction et ne modifie aucun flux financier.

Le P0 financier reste fige en observation/stabilisation.

## Audit initial

P3.1 etait stable pour :

- detecter des anomalies Marketplace ;
- creer des dossiers explicables ;
- afficher une file admin ;
- afficher au vendeur les dossiers explicitement visibles ;
- historiser les changements principaux.

Manques couverts par P3.2 :

- cycle de vie plus fin que les statuts P3.1 ;
- assignation a une personne, une equipe et des observateurs ;
- commentaires separes entre notes internes et messages vendeur ;
- checklist par type de dossier ;
- echeance, retard, temps passe et proposition d'escalade ;
- vues admin/vendeur separees ;
- journal workflow append-only.

## Architecture SQL

Tables ajoutees :

- `marketplace_workflow_statuses`
- `marketplace_resolution_teams`
- `marketplace_case_assignments`
- `marketplace_case_comments`
- `marketplace_case_checklist_templates`
- `marketplace_case_checklist_items`
- `marketplace_case_escalations`
- `marketplace_case_workflow_events`

Colonnes ajoutees a `marketplace_governance_cases` :

- `workflow_status_code`
- `responsible_team_id`
- `due_at`
- `first_assigned_at`
- `last_assigned_at`
- `resolution_started_at`
- `resolved_at`
- `closed_at`
- `reopened_count`
- `time_spent_minutes`
- `workflow_metadata`

## Cycle de vie

Statuts configurables :

- `new`
- `to_analyze`
- `in_progress`
- `info_requested`
- `waiting_vendor`
- `vendor_replied`
- `to_validate`
- `resolved`
- `closed`
- `reopened`

Chaque statut est mappe vers le statut P3.1 pour conserver la compatibilite avec les anciens ecrans et rapports.

## RPC

RPC ajoutees :

- `initialize_marketplace_case_resolution(case_id)`
- `suggest_marketplace_case_assignees(case_id)`
- `assign_marketplace_governance_case(case_id, assignee_id, team_id, observer_ids, note)`
- `transition_marketplace_governance_case(case_id, workflow_status_code, comment, vendor_visible)`
- `add_marketplace_case_comment(case_id, body, visibility, comment_type, attachments)`
- `update_marketplace_case_checklist_item(item_id, is_completed, note)`
- `scan_marketplace_case_escalations(limit)`

Les suggestions d'assignation et les escalades restent indicatives. L'admin doit valider humainement.

## Vues

Admin :

- `admin_marketplace_case_resolution_queue`
- `admin_marketplace_case_resolution_overview`
- `admin_marketplace_case_comments`
- `admin_marketplace_case_checklist_items`
- `admin_marketplace_case_escalations`

Vendeur :

- `my_marketplace_case_resolution_cases`
- `my_marketplace_case_comments`
- `my_marketplace_case_checklist_items`

Les vues vendeur filtrent uniquement les dossiers visibles et les commentaires `visibility = 'vendor'`.

## RLS et securite

- Admin : acces global via `marketplace_workflow_is_admin()`.
- Vendeur : acces uniquement a ses dossiers visibles.
- Commentaires internes : invisibles cote vendeur.
- Journal workflow : append-only, modification et suppression bloquees.
- Commentaires : append-only, modification et suppression bloquees.
- Escalades : lecture admin uniquement.
- Checklist : lecture admin et vendeur concerne ; modification uniquement par RPC admin.

## Interfaces

Admin :

- file de resolution P3.2 ;
- initialisation du workflow ;
- suggestion d'equipe responsable ;
- changement de statut workflow ;
- notes internes ;
- messages visibles vendeur ;
- checklist de resolution ;
- escalades proposees ;
- tendances et notifications P3.1 conservees.

Vendeur :

- dossiers visibles de sa boutique ;
- statut workflow lisible ;
- checklist visible ;
- messages LPB visibles ;
- reponse vendeur via RPC securisee ;
- aucune note interne exposee.

## Non-regression P0

P3.2 ne modifie pas :

- wallets ;
- commissions ;
- commandes ;
- paiements ;
- retraits ;
- Revenue Engine ;
- Commission Pool ;
- ledger ;
- snapshots financiers.

Le module ne fait que creer et lire des objets de workflow Marketplace.

## Tests

Tests ajoutes :

- `p32WorkflowCaseResolutionMigration.test.ts`
- `p32WorkflowCaseResolutionIntegration.test.ts`

Test P3.1 ajuste :

- `p31MarketplaceGovernanceIntegration.test.ts`

Couverture :

- schema SQL ;
- statuts workflow ;
- assignation ;
- commentaires ;
- checklist ;
- escalades proposition-only ;
- vues admin/vendeur ;
- RLS attendue ;
- absence de mutation P0 ;
- integration admin/vendeur.

## Risques restants

- Les escalades sont proposees mais pas encore reliees a un canal push/email dedie.
- Les assignations d'utilisateurs precis dependent de la qualite des roles admin existants.
- Les delais par type de dossier devront etre ajustes apres usage reel.
- Les pieces jointes sont structurees en JSONB mais l'upload documentaire pourra etre renforce plus tard.

## Recommandation GO / NO-GO

GO P3.2 avec reserves normales de stabilisation.

Conditions avant module suivant :

- appliquer la migration SQL ;
- publier le frontend ;
- verifier qu'un vendeur ne voit pas les notes internes ;
- tester un dossier image, SEO et doublon ;
- confirmer que les escalades restent bien des propositions ;
- garder P0 strictement fige.
