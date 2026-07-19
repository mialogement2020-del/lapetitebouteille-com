# P4.4 Developer Portal & SDK Platform - Audit

## Statut

GO avec reserves pour P4.4.

Le P0 financier reste isole. Le module ne modifie aucun wallet, commission, commande, paiement, retrait, ledger ou snapshot financier.

## Audit initial

P4.1 fournit deja les registres de modules, capabilities, events, RPC, Edge Functions, feature flags et taches planifiees.

P4.2 fournit le Gateway API, les endpoints versionnes, les cles API, les webhooks, les rate limits, les logs et une vue OpenAPI.

P4.3 fournit le framework de connecteurs, les configs sans secret en clair, les jobs de synchronisation, la compatibilite et la sante.

P3.5 fournit l'observabilite plateforme, reutilisable par le portail.

## Manques identifies

- Aucun portail developpeur consolide.
- Pas de separation explicite entre admin et developpeur partenaire.
- Pas de sandbox standardisee.
- Pas de registre SDK officiel.
- Pas de changelog developpeur.
- Pas de documentation unifiee reliant APIs, capabilities et events.

## Architecture retenue

Le module P4.4 ajoute:

- `developer_portal_members`
- `developer_portal_apps`
- `developer_portal_api_key_events`
- `developer_portal_sandbox_runs`
- `developer_portal_docs_pages`
- `developer_portal_sdk_packages`
- `developer_portal_changelog_entries`
- `developer_portal_support_tickets`

Le portail reutilise:

- `api_gateway_api_keys`
- `api_gateway_endpoints`
- `platform_capability_registry`
- `platform_event_catalog`
- `integration_hub_connectors`
- `platform_observability_services`

## Risques

- Le self-service public doit rester desactive tant que le cadre juridique et contractuel n'est pas pret.
- Les cles API doivent etre visibles une seule fois.
- Les scopes production doivent etre strictement limites.
- Le SDK TypeScript est en alpha et doit rester documente comme tel.

## Recommandation

Activer P4.4 en mode admin/developer controle. Garder `p4.developer_portal.public_self_service` desactive.
