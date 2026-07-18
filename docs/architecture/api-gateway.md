# P4.2 API & Integration Gateway

## Objectif

P4.2 fournit un point d'entree unifie pour les integrations LPB internes et externes.

Il ajoute:

- API Registry
- Gateway Edge Function
- Webhook Engine
- Rate Limiting
- Request Logs
- Documentation OpenAPI
- Dashboard Admin

## Routing

Chaque endpoint doit etre declare dans `api_gateway_endpoints`.

Champs critiques:

- `endpoint_key`
- `module_key`
- `capability_key`
- `path`
- `http_method`
- `version`
- `route_type`
- `target_name`
- `auth_modes`
- `required_roles`
- `rate_limit_policy`

## Registry

Le registre API ne remplace pas P4.1. Il s'appuie sur:

- `platform_extension_modules`
- `platform_capability_registry`
- `platform_event_catalog`
- `platform_rpc_contracts`
- `platform_edge_function_contracts`

## Webhooks

Le webhook engine repose sur:

- `api_gateway_webhook_subscriptions`
- `api_gateway_webhook_events`
- `api_gateway_webhook_deliveries`

Les evenements doivent exister dans le P4.1 Event Catalog avant publication.

## Rate limits

Les quotas sont par:

- endpoint
- user
- api_key
- IP ou role dans les evolutions futures

Les buckets sont stockes dans `api_gateway_rate_limit_buckets`.

## Edge Function

`api-gateway`:

- resolve endpoint par `path` + `method`
- valide auth mode
- verifie role admin si requis
- applique rate limit
- route vers `read_view`, `rpc` ou endpoint documentaire
- journalise l'appel

## Securite

- Les cles API stockent uniquement prefixe et hash.
- Les logs sont append-only.
- Les endpoints admin restent soumis a RLS et roles.
- Les webhooks utilisent un secret hash et une signature preview; la signature runtime complete sera portee par le worker de livraison.

## Isolation P0

Le gateway ne modifie jamais les flux financiers P0. Tout endpoint P0 expose doit etre lecture, observation ou simulation explicite.

