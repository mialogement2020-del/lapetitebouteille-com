# ADR 0006 - P0 Isolation

## Statut

Accepted

## Decision

P4.1 peut documenter, declarer et observer le P0, mais ne peut jamais modifier sa logique.

## Interdictions

- wallets ;
- commissions ;
- commandes ;
- paiements ;
- retraits ;
- Revenue Engine ;
- Commission Pool ;
- ledger ;
- snapshots financiers ;
- calculs de marge.

## Consequence

Toute correction P0 reste traitee separement comme bug, securite ou coherence financiere.
