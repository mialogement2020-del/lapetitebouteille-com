# Module Registry

## Modules Initiaux

| Module | Statut | Role | P0 |
| --- | --- | --- | --- |
| `p0_finance_observation` | observation | moteur financier observe et simule | documente uniquement |
| `p1_commercial_intelligence` | active | CRM, opportunites, objectifs, coachs, academy, scores | aucun impact |
| `p2_marketplace_intelligence` | active | studio image, coach vendeur, SEO, catalogue, analytics | aucun impact |
| `p3_governance_operations` | active | gouvernance, workflow, orchestration, moderation, observabilite | aucun impact |
| `p4_extension_framework` | active | registres, contrats, flags, cartographie | aucun impact |

## Convention

Chaque nouveau module doit declarer :

- `module_key`
- version
- statut
- dependances
- capacites fournies
- evenements produits/consommes
- RPC et Edge Functions
- permissions
- routes
- tables principales
- documentation
