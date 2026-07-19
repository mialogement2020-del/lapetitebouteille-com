# P4.5 Extension Marketplace

## Objectif

Créer le Marketplace officiel des extensions LPB.

Les extensions utilisent exclusivement les couches autorisees:

- P4.1 Platform Extension Framework
- P4.2 API Gateway
- P4.3 Integration Hub
- P4.4 Developer Portal

## Principe de securite

Une extension ne peut pas acceder directement aux composants internes.

Toute demande doit passer par:

- capabilities declarees;
- endpoints API Gateway;
- events catalogues;
- connecteurs valides;
- feature flags.

## Cycle de vie

1. Soumission extension.
2. Soumission version.
3. Validation compatibilite.
4. Sandbox.
5. Installation limitee.
6. Observation.
7. Activation progressive.
8. Desactivation, desinstallation ou rollback.

## Validation

`admin_validate_extension_version` verifie:

- capabilities manquantes;
- events manquants;
- endpoints API manquants;
- connecteurs manquants;
- signature et integrite;
- demande interdite de surface financiere.

## Sandbox

`admin_run_extension_sandbox` cree un run append-only avec `side_effects = none`.

## Feature flags

Chaque installation cree un flag:

`extension.{extension_key}.{environment}`

En production, le rollout initial reste limite.

## RLS

- Admin: gestion complete.
- Developpeur: lecture de ses propres fiches, versions et findings.
- Operations et sandbox: append-only et admin-only.

## Non-regression P0

Le module ne modifie jamais:

- wallets;
- commissions;
- orders;
- payments;
- withdrawals;
- Revenue Engine;
- Commission Pool;
- ledger;
- snapshots financiers.

## Statut

GO avec reserves:

- catalogue public desactive;
- production limitee;
- signature obligatoire;
- aucune surface P0 directe.
