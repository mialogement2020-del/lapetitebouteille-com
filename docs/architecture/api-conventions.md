# API, RPC And Edge Function Conventions

## RPC

Nommage recommande :

```text
module_action_v1
```

Les RPC existantes ne sont pas renommees brutalement. Les nouvelles RPC doivent documenter :

- module proprietaire ;
- finalite ;
- parametres ;
- retour ;
- permissions ;
- erreurs ;
- idempotence ;
- journalisation ;
- version.

## Edge Functions

Chaque Edge Function doit documenter :

- module proprietaire ;
- authentification ;
- autorisation ;
- contrat d'entree/sortie ;
- timeout ;
- retries ;
- idempotence ;
- metriques ;
- politique d'erreur.

## Depreciation

- annoncer la nouvelle version ;
- maintenir l'ancienne le temps de la migration ;
- documenter les consommateurs ;
- retirer uniquement apres validation.
