# ADR 0005 - Feature Flags

## Statut

Accepted

## Decision

Ajouter `platform_feature_flags` pour activer, limiter ou desactiver rapidement une fonctionnalite.

## Limite

Un flag ne remplace jamais RLS ni les permissions serveur.

## Consequences

Les changements de flags sont historises dans `platform_feature_flag_history`.
