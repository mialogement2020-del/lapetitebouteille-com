# P1.2 Calendrier IA des Opportunités Commerciales

## Audit

Le P1 CRM Conseiller donne déjà une base de portefeuille, relances et historique commercial. Le manque identifié est la planification proactive : la plateforme ne sait pas encore transformer les saisons, fêtes, événements familiaux et besoins entreprises en actions commerciales structurées.

Le module P1.2 ajoute cette couche sans toucher au P0 financier. Il ne modifie pas les commandes, les wallets, les commissions, les snapshots financiers, les paiements ou le moteur d'attribution.

## Architecture SQL

Migration : `supabase/migrations/20260716093000_p12_commercial_opportunity_calendar.sql`

Tables principales :

- `commercial_opportunity_events` : événements commerciaux récurrents ou personnalisés.
- `commercial_opportunity_event_products` : produits recommandés par événement.
- `commercial_opportunity_event_categories` : catégories recommandées par événement.
- `commercial_opportunity_campaigns` : campagnes planifiées par l'admin.
- `commercial_opportunity_missions` : missions proposées aux conseillers.
- `commercial_opportunity_marketing_assets` : briefs, scripts, messages, supports visuels.
- `commercial_opportunity_activity_log` : journal append-only des actions admin.

Vues :

- `advisor_commercial_opportunity_calendar` : opportunités actives visibles par les conseillers.
- `advisor_commercial_mission_board` : missions disponibles ou assignées.
- `admin_commercial_opportunity_calendar_report` : pilotage admin.

Fonctions :

- `commercial_calendar_is_admin()` : vérifie rôle admin ou permission dédiée.
- `commercial_calendar_toggle_event()` : active ou met en pause une opportunité.
- `commercial_calendar_archive_event()` : archive sans suppression.
- `commercial_calendar_log_event()` : historise les actions.

## Interfaces

Composant : `src/components/admin/CommercialOpportunityCalendar.tsx`

Onglet admin : `opportunity-calendar`, libellé `Calendrier IA`.

L'écran couvre :

- opportunités du jour ;
- opportunités de la semaine ;
- opportunités du mois ;
- produits recommandés ;
- catégories concernées ;
- clients/villes ciblés ;
- missions commerciales ;
- pilotage admin : création, pause, activation, archivage.

## RLS et permissions

Permission ajoutée : `commercial_calendar`.

Règles :

- les admins ou utilisateurs avec `commercial_calendar` peuvent gérer le module ;
- les conseillers authentifiés lisent uniquement les opportunités actives/planifiées ;
- les missions sont visibles si disponibles ou assignées au conseiller ;
- les assets marketing visibles conseiller doivent être `ready` ou `approved` ;
- le journal d'activité est lisible/écrivable par admin uniquement.

## Événements préchargés

Le seed crée les opportunités structurantes :

- Nouvel An ;
- Saint-Valentin ;
- Journée de la Femme ;
- Ramadan ;
- Pâques ;
- Fête des Mères ;
- Fête des Pères ;
- Mariages ;
- Anniversaires ;
- Baptêmes ;
- Diplômes ;
- Vacances ;
- Rentrée scolaire ;
- Noël ;
- Fin d'année ;
- Événements entreprises ;
- Lancements produits ;
- Promotions LPB.

## Tests prévus

Test ajouté : `src/__tests__/p12CommercialOpportunityCalendarMigration.test.ts`

Il vérifie :

- création des tables ;
- vues conseiller/admin ;
- RLS et permission dédiée ;
- présence des événements clés ;
- absence de mutation P0/finance/order.

## Risques restants

- Les produits et catégories recommandés doivent être enrichis progressivement par l'admin ou un futur moteur IA.
- Les dates mobiles comme Ramadan ou Pâques doivent être ajustées chaque année.
- Les missions restent préparatoires : elles ne déclenchent pas encore d'objectifs IA quotidiens.
- Les campagnes WhatsApp/Email ne sont pas envoyées automatiquement dans cette étape.

## Prochaines priorités

1. Associer les meilleures catégories et produits aux opportunités seedées.
2. Ajouter des missions modèles par événement.
3. Connecter le CRM pour faire remonter les clients à relancer.
4. Préparer le module Objectifs IA quotidiens avec ce calendrier comme source.
