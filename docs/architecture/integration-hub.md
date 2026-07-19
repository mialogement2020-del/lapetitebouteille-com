# P4.3 Integration Hub & Connector Framework

## Objectif

Integration Hub est la couche generique qui permet a LPB de gerer les futurs connecteurs externes sans les coupler directement au coeur de la plateforme.

Il ne contient pas de connecteur ERP, CRM, paiement, logistique ou IA specifique. Il definit le contrat commun permettant de les accueillir plus tard.

## Architecture

Le module s'appuie sur:

- P4.1 Platform Extension Framework
- P4.2 API & Integration Gateway
- P3.5 Platform Observability

Tables principales:

- `integration_hub_connectors`: registre central.
- `integration_hub_connector_configs`: configuration sans secret en clair.
- `integration_hub_sync_jobs`: scheduler et file de synchronisation.
- `integration_hub_sync_runs`: executions append-only.
- `integration_hub_lifecycle_events`: journal append-only.
- `integration_hub_compatibility_findings`: incompatibilites capabilities/events.

## Cycle de vie

Statuts supportes:

- `installed`
- `enabled`
- `disabled`
- `maintenance`
- `deprecated`
- `experimental`

Les changements de statut passent par `admin_set_integration_connector_status` et sont historises.

## Configuration

Les configurations sont separees par:

- environnement
- organisation
- schema de validation
- parametres requis
- parametres optionnels
- references de secrets

Les secrets ne doivent jamais etre stockes dans `config_values`.

## Synchronisation

Le Hub prepare:

- synchronisation immediate
- synchronisation planifiee
- synchronisation incrementale
- retry
- interruption/reprise
- limitation du parallelisme via `sync_policy`

P4.3 ne lance pas encore de connecteur fournisseur. Le scheduler est declare en mode experimental.

## Health Engine

`integration_hub_calculate_health` calcule un score base sur:

- taux de succes
- latence moyenne
- runs echoues
- retries en attente

Statuts:

- `healthy`
- `warning`
- `critical`
- `unknown`

## Compatibilite

Chaque connecteur declare:

- capabilities utilisees
- evenements consommes
- evenements produits
- version Gateway requise
- contrat de compatibilite

`admin_check_integration_connector_compatibility` compare ces besoins avec P4.1.

## Feature Flags

Flags initiaux:

- `p4.integration_hub.admin_dashboard`
- `p4.integration_hub.connector_execution`

L'execution automatique reste desactivee tant que le framework n'a pas recu un GO explicite.

## Securite

Acces admin-only via RLS et vues `admin_integration_hub_*`.

Les journaux de runs et de cycle de vie sont append-only.

## Non-regression P0

Interdiction de modifier:

- wallets
- commissions
- commandes
- paiements
- retraits
- Revenue Engine
- Commission Pool
- ledger
- snapshots financiers

Les connecteurs futurs devront passer par API Gateway et respecter les controles P0.

## Statut GO

GO AVEC RESERVES.

P4.3 est pret comme framework generique. Les connecteurs metiers doivent etre traites dans des modules separes.
