# Dependency Map

La cartographie officielle est stockee en base dans :

- `platform_extension_modules.dependencies`
- `platform_capability_registry.dependencies`
- `platform_event_catalog.known_consumers`

Le script `scripts/analyze-architecture.mjs` produit une analyse statique consultable dans :

```text
docs/architecture/generated/architecture-scan.json
```

Cette analyse n'est pas bloquante. Elle signale les RPC et Edge Functions non documentees afin de guider l'adoption progressive.
