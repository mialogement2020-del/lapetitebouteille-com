# P4.2 API & Integration Gateway - Audit Initial

## Statut

GO implementation progressive.

P4.2 ne remplace pas brutalement les appels RPC ou Edge Functions existants. Le risque de regression serait trop eleve. La bonne approche est une gateway declarative, observable et versionnee, puis une migration progressive des integrations futures.

## Constat architecture

- RPC existantes: nombreuses RPC appelees depuis `src/`, souvent sans registre central visible.
- Edge Functions: 26 fonctions detectees dans `supabase/functions`.
- Webhooks: flux Mobile Money et notifications existent, mais sans moteur webhook generique unifie.
- Taches planifiees: plusieurs fonctions sont utilisables en cron, mais les conventions sont dispersees.
- P4.1 fournit deja Module Registry, Capability Registry, Event Catalog et contrats RPC/Edge: P4.2 doit les reutiliser.

## Risques identifies

### Eleve

- Absence de point d'entree commun pour integrateurs externes.
- Contrats API non systematiquement versionnes.
- Rate limiting non centralise.
- Historique webhook et retries non generalises.

### Moyen

- Documentation API manuelle et donc fragile.
- Observabilite API partielle.
- Risque de doublons entre Edge Functions proches.

### Faible

- Nommage heterogene des endpoints et RPC legacy.

## Decision

Creer une gateway progressive:

- `api_gateway_endpoints` comme registre officiel des endpoints.
- `api_gateway_request_logs` append-only.
- `api_gateway_rate_limit_buckets` pour quotas.
- `api_gateway_webhook_subscriptions`, `api_gateway_webhook_events`, `api_gateway_webhook_deliveries` pour webhook engine.
- Edge Function `api-gateway` pour routage controle.
- Dashboard admin et documentation OpenAPI.

## Non-regression P0

P4.2 ne modifie pas:

- wallets
- commissions
- commandes
- paiements
- retraits
- Revenue Engine
- Ledger
- snapshots financiers

Le gateway peut lire ou documenter des APIs autorisees. Il ne change pas la logique financiere.

