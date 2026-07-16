# P1.3 Objectifs IA quotidiens et hebdomadaires

## Audit de l'existant

La plateforme dispose maintenant de deux briques P1 utiles :

- `P1 CRM Conseiller LPB` : contacts, relances, préférences, opportunités et historique commercial.
- `P1.2 Calendrier IA` : opportunités commerciales, campagnes, produits/catégories recommandés et missions.

Le manque identifié est la transformation opérationnelle : les conseillers ont besoin d'actions courtes, personnalisées et mesurables plutôt que d'une simple liste d'opportunités.

Le P0 financier reste figé. Le module P1.3 ne modifie aucune commande, aucun wallet, aucune commission et aucun calcul financier.

## Proposition d'architecture

Migration : `supabase/migrations/20260716113000_p13_advisor_ai_goals.sql`

Tables :

- `advisor_goal_profiles` : niveau, spécialités, disponibilité, Trust Score et Business Score informatifs.
- `advisor_goal_templates` : modèles d'objectifs quotidiens et hebdomadaires.
- `advisor_goal_assignments` : objectifs assignés aux conseillers.
- `advisor_goal_progress_events` : historique append-only de progression.
- `advisor_goal_generation_runs` : journal des générations admin.

Fonctions :

- `ai_goals_is_admin()` : admin ou permission `ai_goals`.
- `ai_goals_target_for_profile()` : adapte la difficulté selon niveau et disponibilité.
- `admin_generate_advisor_ai_goals()` : génère les objectifs à partir des modèles, profils et opportunités actives.
- `advisor_update_ai_goal_progress()` : incrémente ou corrige la progression d'un objectif.

Vues :

- `advisor_ai_goal_source_context` : contexte CRM + Calendrier IA + profil conseiller.
- `advisor_ai_goals_dashboard` : objectifs visibles par conseiller/admin.
- `advisor_ai_goals_summary` : KPI de progression.
- `admin_ai_goals_effectiveness_report` : efficacité des modèles.

## Interfaces

Composant : `src/components/admin/AdvisorAiGoalsDashboard.tsx`

Onglet : `ai-goals`, libellé `Objectifs IA`.

Vue conseiller :

- objectifs du jour ;
- objectifs quotidiens ;
- objectifs hebdomadaires ;
- objectifs terminés ;
- progression ;
- échéance ;
- suggestion IA ;
- mise à jour de progression.

Vue admin :

- génération d'objectifs quotidiens ;
- génération d'objectifs hebdomadaires ;
- création de modèles ;
- suivi des taux de réussite par modèle.

## RLS

Permission ajoutée : `ai_goals`.

Règles :

- admin/permission `ai_goals` : gérer profils, modèles, assignations et rapports ;
- conseiller : lire uniquement ses objectifs et son profil ;
- conseiller : ajouter sa propre progression ;
- génération globale : admin uniquement.

## Tests

Test ajouté : `src/__tests__/p13AdvisorAiGoalsMigration.test.ts`

Il vérifie :

- tables P1.3 ;
- connexion CRM et Calendrier IA ;
- personnalisation niveau/spécialité/disponibilité ;
- Trust Score et Business Score en lecture seulement ;
- progression et dashboards ;
- RLS ;
- seeds quotidiens/hebdomadaires ;
- absence de mutation P0/finance/order.

## Modèles d'objectifs seedés

Quotidiens :

- partager 3 produits ;
- relancer 2 prospects ;
- contacter 1 client dormant ;
- proposer un coffret cadeau ;
- appeler 1 entreprise ;
- envoyer une offre mariage.

Hebdomadaires :

- obtenir 5 conversations qualifiées ;
- convertir 3 prospects ;
- réactiver 2 anciens clients ;
- obtenir un nouveau client entreprise ;
- vendre une catégorie stratégique ;
- terminer un module LPB Academy.

## Risques restants

- Les scores Trust/Business sont stockés comme contexte mais ne sont pas encore alimentés automatiquement.
- Les objectifs ne valident pas encore automatiquement les preuves via CRM, ventes ou WhatsApp.
- Les modèles doivent être affinés après observation des taux de réussite.
- Les récompenses restent informatives : elles ne déclenchent aucun wallet ni commission.

## Prochaines priorités

1. Alimenter les profils conseillers avec spécialités et disponibilité réelle.
2. Connecter les objectifs aux relances CRM sans automatisation agressive.
3. Ajouter un moteur de suggestions de messages pour chaque objectif.
4. Mesurer les objectifs les plus efficaces avant d'augmenter la difficulté.
