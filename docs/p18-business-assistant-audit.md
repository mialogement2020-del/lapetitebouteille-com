# P1.8 - LPB Business Assistant IA

## Audit de l'existant

Les modules P1 deja disponibles couvrent chacun un usage specialise :

- CRM Conseiller : portefeuille client, relances, opportunites et historique.
- Calendrier IA : opportunites commerciales, campagnes, produits et missions.
- Objectifs IA : actions quotidiennes et hebdomadaires.
- Coach IA : analyse de conversations et reponses pretes a envoyer.
- Supports IA : generation de contenus commerciaux.
- Academy : progression, quiz et certifications.
- Business Score & Trust Score : qualite, fiabilite, performance et recommandations.

Le besoin P1.8 est de centraliser ces signaux dans un assistant d'aide a la decision. Il ne remplace aucun module et ne doit jamais modifier le P0 financier.

## Architecture livree

Migration : `supabase/migrations/20260716230000_p18_business_assistant.sql`

Tables ajoutees :

- `business_assistant_context_snapshots` : resume explicable d'un contexte utilisateur.
- `business_assistant_recommendations` : recommandations actionnables.
- `business_assistant_alerts` : alertes intelligentes.
- `business_assistant_questions` : historique Q/R append-only.
- `business_assistant_summaries` : resumes quotidien, hebdo, mensuel et bilan personnel.

Vues ajoutees :

- `business_assistant_source_context`
- `my_business_assistant_dashboard`
- `my_business_assistant_recommendations`
- `my_business_assistant_alerts`
- `my_business_assistant_qa_history`
- `my_business_assistant_summaries`
- `admin_business_assistant_overview`

Fonctions ajoutees :

- `generate_business_assistant_snapshot(period, user_id)`
- `ask_business_assistant(question)`
- `generate_business_assistant_summary(summary_type)`

## Interfaces

Composant : `src/components/admin/BusinessAssistantDashboard.tsx`

Onglet admin ajoute : `Assistant IA`

Fonctions UI :

- generation du resume du jour ;
- question/reponse explicable ;
- affichage des actions prioritaires ;
- alertes intelligentes ;
- produits/campagnes/cours recommandes ;
- generation de bilans ;
- vue globale admin.

## RLS et securite

Chaque utilisateur lit ses propres donnees.

L'admin lit les vues globales via `business_assistant_is_admin()`.

Les snapshots et questions sont append-only pour conserver l'historique des raisonnements.

## Garantie P0

P1.8 ne modifie pas :

- wallets ;
- commissions ;
- commandes ;
- Commission Pool ;
- Revenue Engine ;
- fonctions P0 ;
- soldes ;
- statuts de paiement.

Le module lit des signaux P1 et catalogue, puis ecrit uniquement dans les tables `business_assistant_*`.

## Tests

Test ajoute :

- `src/__tests__/p18BusinessAssistantMigration.test.ts`

Il verifie :

- tables ;
- vues ;
- fonctions ;
- RLS ;
- historique append-only ;
- explicabilite ;
- absence de mutation P0/finance.

## Risques restants

- Les reponses sont heuristiques et non connectees a un modele IA externe.
- Les recommandations dependent de la qualite des donnees CRM, Academy, objectifs et scores.
- Les vues P1 doivent etre publiees en production avant la migration P1.8.
- Les futures integrations IA devront conserver la regle : conseil uniquement, pas d'action financiere.

## Prochaine priorite

Tester en production avec des donnees reelles :

1. Generer un snapshot.
2. Poser plusieurs questions.
3. Verifier les recommandations.
4. Verifier les alertes.
5. Confirmer que P0 reste inchangé.
