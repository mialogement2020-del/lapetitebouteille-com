# Capability Registry

Une capacite est une fonction logique reutilisable, declaree avant d'etre consommee par un autre module.

## Nommage

Format recommande :

```text
domain.object.action
```

Exemples :

- `marketplace.image.normalize`
- `marketplace.catalog.score`
- `marketplace.seo.analyze`
- `governance.case.create`
- `workflow.task.assign`
- `moderation.content.scan`
- `observability.metric.record`
- `feature.flag.evaluate`

## Contrat

Chaque capacite documente :

- module proprietaire ;
- version ;
- type d'acces ;
- permission ;
- dependances ;
- contrat d'entree ;
- contrat de sortie ;
- statut.
