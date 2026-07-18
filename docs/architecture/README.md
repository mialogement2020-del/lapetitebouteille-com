# LPB Architecture Registry

P4.1 formalise les conventions d'extension de La Petite Bouteille sans reecrire les modules existants.

## Objectifs

- declarer les modules, capacites, evenements, RPC, Edge Functions et taches planifiees ;
- rendre les dependances visibles ;
- permettre l'adoption progressive des contrats versionnes ;
- fournir des metadonnees a P3.5 Observability ;
- proteger strictement le P0 financier.

## Documents

- [Module Registry](module-registry.md)
- [Capability Registry](capability-registry.md)
- [Event Catalog](event-catalog.md)
- [API Conventions](api-conventions.md)
- [Dependency Map](dependency-map.md)
- [ADR Index](adr/README.md)

## Regle P0

P4.1 peut documenter, declarer et observer le P0. Il ne peut pas modifier wallets, commissions, commandes, paiements, retraits, ledger, snapshots financiers, Revenue Engine ou Commission Pool.

## Adoption

Phase 1 : declarer et documenter.

Phase 2 : appliquer les standards aux nouveaux modules.

Phase 3 : moderniser progressivement les anciens points a risque.
