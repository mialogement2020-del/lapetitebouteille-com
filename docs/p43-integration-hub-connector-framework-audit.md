# P4.3 Integration Hub & Connector Framework - Audit Initial

## Statut

GO implementation progressive.

P4.3 ne livre aucun connecteur metier specifique. Le module cree uniquement la couche d'accueil commune pour les futurs connecteurs ERP, CRM, paiement, logistique, IA, marketing, BI, communication ou storage.

## Constat architecture

- P4.1 fournit deja le Module Registry, Capability Registry, Event Catalog, Feature Flags et Scheduled Task Registry.
- P4.2 fournit l'API Gateway, les endpoints versionnes, les logs de requetes, le rate limiting et le moteur webhook generique.
- P3.5 fournit l'observabilite technique et les alertes.
- Les Edge Functions existent mais ne sont pas encore organisees comme connecteurs installables.
- Les secrets existent cote Supabase/Lovable, mais ne doivent jamais etre copies en clair dans les tables applicatives.

## Points d'entree reutilisables

- `platform_extension_modules` pour declarer le module P4.3.
- `platform_capability_registry` pour les operations connector registry, configuration, synchronisation, health et compatibility.
- `platform_event_catalog` pour les evenements `connector.*`.
- `platform_feature_flags` pour activer les connecteurs par phase.
- `api_gateway_endpoints` pour exposer plus tard des endpoints versionnes.
- `platform_observability_services` pour monitorer le Hub.

## Besoins communs aux futurs connecteurs

- Cycle de vie standard: installer, activer, desactiver, maintenance, deprecier.
- Configuration par environnement et organisation.
- References de secrets sans stockage en clair.
- Synchronisations manuelles, planifiees, incrementales et retries.
- Historique append-only.
- Health score exploitable par l'administration.
- Controle de compatibilite avec capabilities/events P4.
- RLS admin-only.

## Risques identifies

### Eleve

- Exposer des secrets en clair dans des configurations.
- Permettre a un connecteur futur de contourner l'API Gateway ou le P0 financier.
- Activer automatiquement un connecteur sans validation de compatibilite.

### Moyen

- Multiplication de conventions propres a chaque fournisseur si le registre n'est pas impose.
- Scheduler trop agressif si le parallelisme n'est pas limite.
- Observabilite partielle si les connecteurs n'enregistrent pas leurs runs.

### Faible

- Dashboard vide au lancement, car aucun connecteur metier n'est encore installe.

## Decision

Creer un framework generique compose de:

- `integration_hub_connectors`
- `integration_hub_connector_configs`
- `integration_hub_sync_jobs`
- `integration_hub_sync_runs`
- `integration_hub_lifecycle_events`
- `integration_hub_compatibility_findings`

Les mutations sensibles passent par RPC admin-only. Les journaux de run et cycle de vie sont append-only.

## Non-regression P0

P4.3 ne modifie pas:

- wallets
- commissions
- commandes
- paiements
- retraits
- Revenue Engine
- Commission Pool
- ledger
- snapshots financiers

Les connecteurs futurs devront utiliser uniquement les APIs autorisees et ne pourront pas contourner les controles financiers.

## Recommandation

GO avec reserves.

Reserves:

- Ne pas activer de connecteur metier avant une specification separee.
- Exiger un secret manager externe ou Supabase Secrets pour toute cle sensible.
- Garder `p4.integration_hub.connector_execution` desactive tant que le dispatcher automatique n'est pas valide.
