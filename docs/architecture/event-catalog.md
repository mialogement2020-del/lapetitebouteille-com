# Event Catalog

Les evenements sont des faits append-only. Ils decrivent ce qui s'est passe, sans declencher automatiquement une decision sensible.

## Convention

```text
domain.object.verb
```

Exemples :

- `marketplace.product.created`
- `marketplace.product.updated`
- `marketplace.image.analysis_completed`
- `governance.case.opened`
- `workflow.case.assigned`
- `moderation.review_required`
- `observability.alert.created`
- `architecture.registry.updated`
- `feature_flag.updated`

## Versionnement

Les payloads sont versionnes explicitement : `v1`, `v1.1`, `v2`.

Une version ne doit pas etre cassee silencieusement. Les anciennes versions restent disponibles pendant une periode de coexistence documentee.
