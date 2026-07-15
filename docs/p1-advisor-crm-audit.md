# P1 CRM Conseiller LPB - Audit et architecture

## Audit de l'existant

- `profiles` contient les identites client utiles : nom, email, telephone, langue, date de naissance. Ces donnees sont reutilisables, mais le CRM ne doit pas les copier en masse.
- `orders` contient les donnees commerciales client utiles : nom livraison, email invite, telephone, ville, statut, total, date. Les donnees sensibles finance/P0 restent exclues.
- `order_items` et les vues client existantes permettent de reconstruire l'historique commercial sans exposer cout d'achat, marge, snapshots comptables ou secrets de paiement.
- `addresses` peut aider a enrichir ville/quartier, mais le P1 ne duplique pas encore les adresses.
- `referral_codes` et `referral_relationships` indiquent l'attribution/parrainage existant. Le CRM peut s'en servir plus tard pour proposer un rattachement, sans creer de commission.
- `admin_permissions` gere deja les permissions fines admin. Le P1 ajoute la permission `crm`.
- Les risques majeurs identifies sont la fuite d'un portefeuille conseiller vers un autre, les doublons email/telephone, les notes privees trop visibles, et l'exposition involontaire des marges.

## Architecture retenue

Le CRM est un module autonome :

- `crm_contacts` : portefeuille de contacts avec proprietaire `owner_advisor_id`.
- `crm_contact_preferences` : preferences commerciales structurees et preparatoires aux modules IA.
- `crm_notes` : notes commerciales, avec protection supplementaire pour les notes sensibles.
- `crm_tasks` : relances et rappels internes.
- `crm_events` : anniversaires, mariages, evenements, rendez-vous.
- `crm_opportunities` : pipeline commercial simple.
- `crm_activity_log` : journal append-only des actions CRM.
- `crm_contact_order_summary` : vue commerciale des commandes liees sans donnees finance/P0.
- `crm_duplicate_candidates` : detection de doublons, sans fusion automatique.
- `crm_dashboard_summary` : KPI du portefeuille et de l'activite CRM.

## Securite et RLS

- Un conseiller lit et modifie uniquement ses propres contacts.
- Un admin ou un utilisateur avec permission `crm` peut consulter et administrer le module.
- Les notes sensibles ne sont pas visibles par tous les admins par defaut.
- Les transferts sont faits via `admin_transfer_crm_contact()` et journalises.
- Les activites CRM sont append-only : ni modification ni suppression.
- Aucune table P0/finance n'est modifiee.

## Parcours utilisateur

1. Le conseiller ouvre l'onglet `CRM Conseiller`.
2. Il cree un contact ou recherche dans son portefeuille.
3. Il modifie le statut relationnel.
4. Il planifie une relance.
5. Il ajoute une note commerciale.
6. Il consulte les commandes associees visibles sans donnees internes.
7. L'admin peut auditer, transferer ou archiver un contact si necessaire.

## Deploiement

1. Merger la branche GitHub.
2. Publier dans Lovable.
3. Copier/coller et executer la migration :
   `supabase/migrations/20260715165000_p1_advisor_crm.sql`
4. Verifier que l'onglet `CRM Conseiller` apparait dans l'admin.
5. Creer un contact test, une relance, une note, puis archiver le contact test.

## Retour arriere

Le retour arriere fonctionnel consiste a retirer l'onglet de l'interface. Les tables SQL sont additives et ne suppriment pas de donnees existantes. En production, ne pas supprimer les tables CRM sans export prealable, car elles contiennent des donnees personnelles.

## Risques restants

- La vraie fusion de doublons reste volontairement manuelle et non implementee.
- L'import CSV est prepare conceptuellement mais non active.
- Les suggestions IA ne sont pas activees : le CRM collecte les donnees necessaires pour les modules futurs.
- Les regles de retention/suppression RGPD devront etre formalisees avec les conditions commerciales finales.
