# ADR 0003 - Event Catalog

## Statut

Accepted

## Decision

Centraliser les evenements dans `platform_event_catalog`.

## Raison

Les evenements deviennent explicables, versionnes et auditables sans mettre en place un streaming complexe.

## Consequences

Les journaux restent append-only lorsqu'ils sont materialises.
