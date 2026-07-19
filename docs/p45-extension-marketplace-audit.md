# P4.5 Marketplace App Store & Extension Marketplace - Audit

## Statut

GO avec reserves.

Le P0 financier reste isole. Le module ne modifie aucun wallet, commission, commande, paiement, retrait, ledger, snapshot financier, Revenue Engine ou Commission Pool.

## Existant reutilise

- P4.1: `platform_extension_modules`, `platform_capability_registry`, `platform_event_catalog`, `platform_feature_flags`, contrats RPC.
- P4.2: `api_gateway_endpoints`, API keys, logs et OpenAPI.
- P4.3: `integration_hub_connectors`, compatibilite connecteurs.
- P4.4: `developer_portal_members`, documentation developpeur et sandbox.
- P3.5: `platform_observability_services`.

## Manques identifies

- Aucun catalogue officiel d'extensions.
- Pas de cycle installation/desactivation/rollback controle.
- Pas de validation unique des permissions, APIs, capabilities, events et connecteurs.
- Pas de sandbox extension.
- Pas d'historique append-only des operations App Store.

## Architecture retenue

P4.5 ajoute un registre d'extensions qui reference les registres existants sans les dupliquer.

Tables principales:

- `extension_marketplace_publishers`
- `extension_marketplace_extensions`
- `extension_marketplace_versions`
- `extension_marketplace_installations`
- `extension_marketplace_operations`
- `extension_marketplace_validation_findings`
- `extension_marketplace_sandbox_runs`
- `extension_marketplace_usage_daily`

## Reserves

- Le catalogue public reste desactive.
- Les installations production doivent rester a rollout limite par feature flag.
- Toute extension demandant une surface financiere est bloquee.
- Les signatures/digests doivent etre obligatoires avant production.

## Recommandation

GO avec reserves pour P4.5. Ne pas ouvrir le catalogue public avant validation juridique, commerciale et securite.
