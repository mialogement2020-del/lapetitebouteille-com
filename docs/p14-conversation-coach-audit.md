# P1.4 - LPB Coach IA Conversationnel

## Objectif

Le P1.4 ajoute un assistant commercial pour les Conseillers LPB. Il analyse un message client, detecte le contexte commercial, propose des reponses pretes a adapter et recommande des produits disponibles.

Le module ne doit jamais envoyer de message automatiquement. Le conseiller reste responsable de la reponse finale.

## Perimetre fonctionnel

- Analyse de messages WhatsApp, Messenger, email, SMS, note d'appel ou question libre.
- Detection du budget, de l'occasion, de la ville, de l'urgence, du type client et des objections.
- Suggestions de reponses en formats court, professionnel, chaleureux, premium, WhatsApp, email et SMS.
- Recommandations produit : principale, alternative premium, alternative economique, upsell ou reponse a objection.
- Bibliotheque de scripts : premier contact, relance, remerciement, panier abandonne, anniversaire, mariage, entreprise, gros et objection prix.
- Feedback conseiller : vente gagnee, perdue, sans reponse ou a relancer.
- Tableau de pilotage admin sur l'usage et les resultats.

## Architecture SQL

Migration : `supabase/migrations/20260716143000_p14_conversation_coach.sql`

Tables principales :

- `coach_conversation_sessions`
- `coach_conversation_recommendations`
- `coach_response_variants`
- `coach_script_templates`
- `coach_conversation_feedback`
- `coach_activity_log`

Vues :

- `advisor_conversation_coach_dashboard`
- `advisor_coach_script_library`
- `admin_conversation_coach_report`

RPC :

- `coach_analyze_conversation`
- `coach_record_feedback`

## Securite et confidentialite

Le module respecte les limites suivantes :

- RLS active sur toutes les tables.
- Un conseiller ne lit que ses propres analyses.
- Les scripts actifs sont lisibles par les utilisateurs authentifies.
- Les rapports globaux sont reserves admin.
- Le journal `coach_activity_log` est append-only.
- Le module ne lit pas les couts d'achat, marges, snapshots comptables, P0, Commission Pool ou Revenue Engine.

## Separation avec le P0 financier

Le P1.4 est strictement commercial.

Il ne modifie pas :

- wallets ;
- commissions ;
- commandes ;
- produits ;
- P0 ;
- P0.5 Simulation Engine ;
- MLM ;
- retraits ;
- accounting snapshots.

## Interfaces

Interface ajoutee :

- `src/components/admin/ConversationCoachDashboard.tsx`

Integration admin :

- nouvel onglet `Coach IA`
- permission `conversation_coach`
- fallback autorise via CRM, Calendrier IA ou Objectifs IA selon le profil admin.

## Tests

Test ajoute :

- `src/__tests__/p14ConversationCoachMigration.test.ts`

Couverture :

- creation des tables et vues ;
- fonctions d'analyse et feedback ;
- scripts et variantes ;
- RLS ;
- absence de mutation financiere ;
- absence d'exposition des donnees financieres internes.

## Risques restants

- Les recommandations produit sont deterministes et simples : elles devront etre ameliorees plus tard par un vrai moteur IA ou un service de ranking.
- Le module ne connecte pas encore automatiquement les objectifs IA, le calendrier et le CRM dans un scoring unifie.
- Les scripts doivent etre enrichis par l'equipe commerciale apres observation terrain.
- Les messages copies par le conseiller ne sont pas encore historises comme "envoyes" puisque l'envoi reste externe a LPB.

## Prochaine evolution possible

Quand P1.4 sera stabilise, il pourra alimenter :

- coach de vente par categorie ;
- suggestion WhatsApp contextualisee ;
- CRM relance automatique non intrusive ;
- analyse des objections les plus rentables a traiter ;
- bibliotheque de scripts par segment client.
