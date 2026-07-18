# ADR 0002 - Capability Registry

## Statut

Accepted

## Decision

Declarer les capacites transverses dans `platform_capability_registry` avec contrats d'entree/sortie.

## Raison

Cela reduit les appels implicites entre modules et clarifie ce qu'un module expose.

## Consequences

Les anciens appels restent autorises. Les nouvelles capacites doivent etre documentees avant consommation.
