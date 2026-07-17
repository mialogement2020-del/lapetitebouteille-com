# P2.1 - Studio Image Marketplace LPB

## Audit de depart

Le catalogue LPB dispose deja d'outils d'upload, de remplacement massif et de moderation produit. En revanche, une image vendeur Marketplace pouvait encore etre pensee comme une simple image produit, alors que le standard catalogue LPB impose un controle visuel strict avant publication.

Le risque principal est commercial et qualite: fond decoratif, watermark, texte, QR code, numero WhatsApp, personne, produit coupe ou image non homogene. Ces erreurs degradent la confiance, le SEO visuel, les supports commerciaux et la coherence premium du catalogue.

## Architecture retenue

Le module P2.1 ajoute une couche Marketplace dediee:

1. Depot de l'image originale.
2. Creation d'un job de controle.
3. Analyse IA ou simulation admin.
4. Score de conformite.
5. Decision automatique selon seuil.
6. Publication automatique si le score le permet, sinon validation admin.
7. Journal append-only de toutes les decisions.

Le module ne modifie pas les flux financiers:

- aucun wallet;
- aucune commission;
- aucune commande;
- aucun calcul P0;
- aucun Commission Pool.

La seule mutation metier autorisee est le remplacement de `products.image_url` quand une image Marketplace est approuvee ou auto-publiee.

## SQL et RLS

Migration: `supabase/migrations/20260717093000_p21_marketplace_image_studio.sql`

Tables:

- `marketplace_image_studio_rules`
- `marketplace_image_studio_jobs`
- `marketplace_image_studio_events`

Vues:

- `seller_marketplace_image_studio_jobs`
- `admin_marketplace_image_studio_queue`
- `marketplace_image_studio_dashboard`

RPC:

- `marketplace_image_studio_create_job`
- `marketplace_image_studio_record_analysis`
- `marketplace_image_studio_review_job`
- `marketplace_image_studio_score_decision`

RLS:

- le vendeur voit ses propres jobs;
- l'admin voit et gere toute la file;
- les evenements sont append-only;
- les regles sont visibles aux utilisateurs authentifies mais modifiables seulement par admin.

## Seuils de decision

- 90 a 100: publication automatique.
- 75 a 89: correction automatique puis publication.
- 50 a 74: validation admin.
- 0 a 49: refus ou nouvelle image demandee.

## Interface

Composant ajoute:

- `src/components/admin/MarketplaceImageStudioDashboard.tsx`

Onglet admin:

- `Studio Images`

Fonctions disponibles:

- voir la file de controle;
- comparer image originale et image LPB;
- consulter score, problemes et corrections;
- approuver;
- refuser;
- demander une nouvelle image;
- rejouer le traitement;
- simuler le worker IA en attendant l'automatisation complete.

## Tests

Test ajoute:

- `src/__tests__/p21MarketplaceImageStudioMigration.test.ts`

Il verifie:

- presence des tables et vues;
- seuils de conformite;
- regles visuelles LPB;
- historique append-only;
- RLS vendeur/admin;
- absence de mutation finance/P0.

## Risques restants

Le module cree le pipeline et la console, mais la correction image automatique complete necessite un worker/Edge Function dedie avec un moteur image. Le bouton de simulation admin permet de valider le flux sans lancer de traitement IA couteux ou non controle.

Pour la production complete, il faudra brancher:

- upload prive vendeur;
- stockage de l'original dans un bucket prive;
- worker de detourage/normalisation;
- generation WebP et miniatures;
- detection automatique des elements interdits.
