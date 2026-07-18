# P3.5 Platform Observability & Health Engine

## Statut

GO implementation. Module technique uniquement, sans logique metier et sans impact financier.

## Audit Initial

La plateforme contient deja plusieurs modules avec journaux ou vues de pilotage : P1 CRM/IA, P2 Marketplace Intelligence, P3 Gouvernance/Workflow/Moderation, Edge Functions et tables Supabase. Le besoin manquant etait une couche transversale qui centralise les signaux techniques sans modifier les modules observes.

## Architecture

Le moteur P3.5 ajoute :

- registre des services observes ;
- metriques append-only ;
- logs centralises append-only ;
- regles d'alertes configurables ;
- alertes avec diagnostic, causes probables et recommandations ;
- runs de scan technique ;
- vues admin pour tableaux de bord.

## RLS

Toutes les tables P3.5 sont protegees par RLS. L'acces est reserve aux administrateurs ou permissions techniques compatibles (`full_access`, `security`, `audit`, `analytics`, `marketplace_governance`, `marketplace_analytics`, `products`).

## Non-Regression P0

La migration ne modifie pas les wallets, commissions, commandes, paiements, retraits, ledger, snapshots financiers, Revenue Engine ou Commission Pool. Les scans lisent uniquement les tables techniques P1/P2/P3 et les tables catalogue necessaires a la sante publique.

## Tableaux De Bord

Le dashboard admin "Observabilite" expose :

- score de sante plateforme ;
- services actifs ;
- alertes ouvertes et critiques ;
- logs et erreurs recentes ;
- scans recents ;
- sante des files ;
- tendances de metriques ;
- actions sur alertes.

## Alertes Initiales

- RPC en echec ;
- Edge Function indisponible ;
- file bloquee ;
- hausse des erreurs ;
- ralentissement important ;
- migration incomplete.

## Recommandation GO / NO-GO Pour P4

GO technique apres application SQL et publication UI. P4 peut demarrer lorsque P3.5 affiche un scan sans migration manquante critique et que les alertes ouvertes sont soit resolues soit documentees.
