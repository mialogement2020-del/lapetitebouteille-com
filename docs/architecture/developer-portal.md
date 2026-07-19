# P4.4 Developer Portal & SDK Platform

## Objectif

Centraliser l'experience developpeur LPB: documentation, APIs, webhooks, capabilities, events, SDK, sandbox, cles API, changelog et support.

## Principes

- Le portail expose les interfaces autorisees.
- Le portail ne modifie aucune logique metier existante.
- Le P0 financier reste exclu.
- Les secrets ne sont jamais affiches apres creation.
- La sandbox ne produit aucun effet de bord production.

## Tables

- `developer_portal_members`: developpeurs autorises.
- `developer_portal_apps`: applications et quotas.
- `developer_portal_api_key_events`: historique append-only des cles.
- `developer_portal_sandbox_runs`: executions sandbox append-only.
- `developer_portal_docs_pages`: documentation editee.
- `developer_portal_sdk_packages`: SDK officiels et exemples.
- `developer_portal_changelog_entries`: evolution API/SDK.
- `developer_portal_support_tickets`: support technique.

## API Keys

Les cles sont stockees dans `api_gateway_api_keys` afin de reutiliser P4.2.

`developer_create_api_key` retourne le secret une seule fois. Les vues ne montrent ensuite que `key_prefix`, statut, scopes et dates.

## Sandbox

`developer_run_sandbox` simule un scenario avec:

- `sandbox = true`
- `side_effects = none`
- payload echo
- signature demo non utilisable en production

## Documentation automatique

`developer_portal_docs_catalog` combine:

- pages documentaires P4.4
- endpoints P4.2
- capabilities P4.1
- events P4.1

`developer_portal_openapi` genere une specification OpenAPI depuis `api_gateway_endpoints`.

## SDK TypeScript

Le SDK officiel initial est declare comme `@lapetitebouteille/sdk` en statut `alpha`.

Il doit encapsuler:

- authentification;
- appels API;
- webhooks;
- erreurs;
- retries;
- versionnement.

## RLS

- Les administrateurs voient tout.
- Les developpeurs voient leur membership, leurs apps, leurs cles, leurs runs sandbox et la documentation publiee.
- Les historiques cle/sandbox sont append-only.

## Non-regression P0

Le module ne contient aucune instruction de mutation sur:

- wallets;
- commissions;
- orders;
- payments;
- withdrawals;
- financial ledger;
- accounting snapshots;
- revenue engine;
- commission pool.

## GO / NO-GO

GO avec reserves:

- garder self-service public desactive;
- valider juridiquement les conditions developpeur avant ouverture externe;
- stabiliser le SDK TypeScript avant publication publique.
