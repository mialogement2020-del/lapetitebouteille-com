# P1.6 - LPB Academy & Certification Engine

## Audit

LPB dispose deja de modules commerciaux P1 utiles aux conseillers : CRM, calendrier d'opportunites, objectifs IA, coach conversationnel et generateur de supports. Il manquait une couche de formation structuree pour transformer ces outils en competences mesurables.

Le P1.6 ajoute cette couche sans modifier le P0 financier. Le module ne cree aucun mouvement financier, aucune commission et aucune modification de commande.

## Architecture

- `academy_learning_paths` : parcours de formation.
- `academy_courses` : cours publies ou brouillons, formats texte, video, PDF, quiz, exercice, cas pratique, simulation ou ressource.
- `academy_lessons` : contenu detaille par cours.
- `academy_quizzes` et `academy_quiz_questions` : validations de connaissances.
- `academy_user_progress` : progression personnelle.
- `academy_quiz_attempts` : tentatives de quiz.
- `academy_certifications` : certifications officielles LPB.
- `academy_user_certifications` : certificats obtenus ou en validation.
- `academy_activity_log` : historique append-only.

## RLS

- Les utilisateurs authentifies lisent les contenus publies.
- Chaque utilisateur lit et met a jour uniquement sa propre progression.
- Les administrateurs `academy`, `full_access` ou roles P1 superieurs gerent les contenus.
- L'historique `academy_activity_log` est append-only.

## Interfaces

- Onglet admin `Academy`.
- Vue conseiller : progression globale, modules, reprise de cours, validation de test, simulation d'echec.
- Vue certifications : statut, score, validation admin si necessaire.
- Vue admin : creation rapide de cours brouillon et statistiques par cours.

## Tests

Le test `p16AcademyCertificationMigration.test.ts` verifie :

- creation des tables Academy ;
- RPC de demarrage, completion, quiz et certification ;
- vues conseiller/admin ;
- RLS et historique append-only ;
- absence de mutation P0, wallet, commandes et commissions.

## Risques restants

- Les contenus de cours doivent etre enrichis editorialement par LPB.
- Les vrais quiz peuvent ensuite etre remplis question par question depuis l'admin.
- Les certifications expertes sont preparees mais requierent une validation humaine tant que les contenus experts ne sont pas complets.

## Prochaine etape conseillee

Publier le module, executer la migration Supabase, puis creer les premiers contenus reels : vente responsable, objections, vente en gros, entreprise et marketplace.
