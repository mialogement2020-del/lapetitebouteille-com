# ADR 0001 - Module Registry

## Statut

Accepted

## Contexte

LPB contient de nombreux modules P1, P2 et P3, avec routes, RPC, tables et dashboards disperses.

## Decision

Creer `platform_extension_modules` comme registre central declaratif.

## Alternatives

- documentation Markdown seule ;
- refactor massif par domaine.

## Consequences

Les modules restent fonctionnels sans dependance bloquante au registre. Les nouveaux modules doivent etre declares.
