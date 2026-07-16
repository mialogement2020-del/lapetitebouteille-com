# P1.5 - LPB Commercial Asset Generator IA

## Objectif

Le P1.5 ajoute un generateur de supports commerciaux pour les Conseillers LPB, vendeurs Marketplace et partenaires. Il transforme les donnees commerciales disponibles en messages, fiches, mini catalogues, flyers, offres et contenus partageables.

Le module ne modifie aucun flux financier. Il produit uniquement des contenus commerciaux et trace leur utilisation.

## Supports couverts

- messages WhatsApp ;
- emails commerciaux ;
- SMS ;
- publications reseaux sociaux ;
- stories ;
- fiches produits ;
- catalogues PDF ;
- flyers et affiches ;
- offres entreprises ;
- devis commerciaux ;
- cartes de visite numeriques ;
- QR de mini-boutique ;
- pages de campagne.

## Architecture SQL

Migration : `supabase/migrations/20260716170000_p15_commercial_asset_generator.sql`

Tables :

- `commercial_asset_templates`
- `commercial_asset_generations`
- `commercial_asset_exports`
- `commercial_asset_events`

Vues :

- `advisor_commercial_asset_template_library`
- `advisor_commercial_asset_dashboard`
- `admin_commercial_asset_report`

RPC :

- `generate_commercial_asset`
- `request_commercial_asset_export`
- `record_commercial_asset_event`

## Personnalisation

Chaque support peut integrer automatiquement :

- nom du conseiller ;
- contact ;
- photo de profil si disponible ;
- lien ambassadeur ;
- mini-boutique ;
- QR personnel ;
- produits recommandes ;
- images officielles produit.

## Bibliotheque de modeles

Modeles initiaux officiels :

- Promotion week-end WhatsApp ;
- Story cadeau premium ;
- Offre entreprise ;
- Flyer mariage ;
- Mini catalogue conseiller ;
- Carte de visite digitale.

Les admins peuvent publier de nouveaux modeles officiels.

## Export

La migration prepare et trace les demandes d'export :

- PDF ;
- PNG ;
- JPEG ;
- WebP.

Les exports sont actuellement places en statut `requested`. Une Edge Function ou un moteur visuel pourra transformer ces demandes en fichiers reels.

## Statistiques

Le module trace :

- supports generes ;
- demandes d'export ;
- partages ;
- clics ;
- conversions ;
- performance par createur.

## RLS et securite

- Chaque conseiller voit ses propres generations.
- L'admin voit les rapports globaux.
- Les modeles actifs sont lisibles par les utilisateurs authentifies.
- La gestion des modeles officiels est reservee admin.
- Le journal `commercial_asset_events` est append-only.

## Separation avec le P0 financier

Le P1.5 ne modifie pas :

- wallets ;
- commissions ;
- commandes ;
- produits ;
- moteur P0 ;
- P0.5 Simulation Engine ;
- MLM ;
- retraits ;
- accounting snapshots.

Il lit uniquement des donnees commerciales publiques/autorisees : profil conseiller, referral code, produits actifs et images produit.

## Interface

Interface ajoutee :

- `src/components/admin/CommercialAssetGeneratorDashboard.tsx`

Integration admin :

- onglet `Supports IA`
- permission `commercial_assets`

## Tests

Test ajoute :

- `src/__tests__/p15CommercialAssetGeneratorMigration.test.ts`

Le test verifie :

- tables et vues ;
- fonctions RPC ;
- modeles officiels ;
- RLS ;
- absence de mutation financiere et P0.

## Risques restants

- Les exports PDF/PNG/JPEG/WebP sont demandes et traces, mais pas encore rendus en fichier final par une Edge Function.
- La generation de visuels reste basee sur templates et images officielles ; le Studio Image Marketplace pourra enrichir cette partie.
- Les conversions sont a enregistrer via tracking ou integration future avec les commandes, sans modifier le P0.
