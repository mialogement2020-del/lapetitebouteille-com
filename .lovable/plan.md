
# 🍷 Plan de Développement - E-commerce Premium d'Alcools Cameroun

## 🎨 Phase 1 : Design System & Structure de Base
- **Thème luxe africain** avec palette Noir (#1A1A1A), Or (#D4AF37), Bordeaux (#7B2D2D), Blanc cassé (#F5F5F5)
- **Typographie** : Playfair Display (titres), Inter (corps de texte)
- **Design mobile-first** avec animations subtiles et élégantes
- Composants réutilisables : boutons, cartes produits, badges

---

## 🏠 Phase 2 : Pages Client Essentielles

### Page d'Accueil
- Hero section immersive avec appel à l'action
- Catégories visuelles (Vins, Champagnes, Spiritueux, Coffrets)
- Nouveautés et promotions du moment
- Section "Gagnez en recommandant" (teaser MLM)

### Catalogue & Recherche
- Grille de produits avec filtres avancés (type, prix, région, cépage)
- Recherche avec autocomplétion
- Tri par popularité, prix, nouveautés

### Fiche Produit Complète
- Galerie photos avec zoom
- Description, notes de dégustation, accords mets-vins
- Prix et disponibilité
- Bouton de partage/parrainage intégré
- Recommandations similaires
- Section avis clients

---

## 🛒 Phase 3 : Parcours d'Achat

### Panier Intelligent
- Persistance entre sessions
- Application automatique code parrain
- Récapitulatif avec calcul automatique

### Checkout Optimisé
- Option achat invité ou création compte
- Champ "Code parrain" visible
- Formulaire adresse de livraison (Yaoundé, Douala)
- Vérification d'âge (18+ obligatoire)
- Résumé commande avant paiement

### Paiements (Architecture prête)
- Interface préparée pour MTN Mobile Money, Orange Money
- Intégration CinetPay/PayDunya (quand compte créé)
- Paiement à la livraison comme option

---

## 👤 Phase 4 : Espace Client

### Authentification
- Inscription/Connexion sécurisée
- Inscription avec code parrain optionnel
- Vérification d'âge à l'inscription

### Espace Personnel
- Historique des commandes avec statuts
- Suivi commande en temps réel
- Liste de souhaits
- Accès au tableau de bord MLM

---

## 💰 Phase 5 : Système MLM / Marketing Relationnel (NOUVEAU)

### Structure Multi-Niveaux (3+ niveaux)
- **Niveau 1** : Filleuls directs (ex: 8% de commission)
- **Niveau 2** : Filleuls de vos filleuls (ex: 4% de commission)
- **Niveau 3** : 3ème génération (ex: 2% de commission)
- Possibilité d'étendre à plus de niveaux

### Tableau de Bord Ambassadeur
- Vue d'ensemble des gains (total, ce mois, en attente)
- Arbre de parrainage visuel (filleuls sur plusieurs niveaux)
- Lien de parrainage unique personnalisable
- Code promo personnel à partager
- Statistiques de performance (clics, inscriptions, conversions)

### Système de Commissions Hybride
- **Commission de base** : Pourcentage sur chaque vente générée
- **Bonus de palier** : Montants fixes lors d'objectifs atteints
  - Ex: 10 000 FCFA à 10 filleuls actifs
  - Ex: 50 000 FCFA à 100 000 FCFA de ventes cumulées
- **Bonus de rang** : Augmentation des % selon le statut

### Système de Rangs & Gamification
- **🥉 Bronze** : 0-10 filleuls actifs
  - Commission de base
  - Badge profil
- **🥈 Argent** : 11-30 filleuls actifs
  - +1% commission tous niveaux
  - Livraison gratuite personnelle
- **🥇 Or** : 31-75 filleuls actifs
  - +2% commission tous niveaux
  - Produits exclusifs en avant-première
  - Support prioritaire
- **💎 Diamant** : 76-150 filleuls actifs
  - +3% commission tous niveaux
  - Cadeaux produits mensuels
  - Invitation événements VIP
- **👑 Élite** : 150+ filleuls actifs
  - Commissions maximales
  - Compte ambassadeur officiel
  - Revenus récurrents sur tout le réseau

### Outils de Partage
- Génération de liens trackés (avec analytics)
- Création de visuels/bannières à partager
- Intégration WhatsApp, Facebook, Instagram
- QR Code personnel
- Mini-site ambassadeur personnalisable

### Gestion des Gains
- **Portefeuille virtuel** avec historique détaillé
- **Option 1 : Crédit boutique**
  - Conversion instantanée en bon d'achat
  - Bonus de conversion (+5% en crédit)
- **Option 2 : Retrait Mobile Money**
  - Virement MTN Money / Orange Money
  - Seuil minimum de retrait (ex: 5 000 FCFA)
  - Délai de traitement (24-48h)
- Historique des transactions
- Factures téléchargeables

### Notifications & Motivation
- Alertes en temps réel (nouveau filleul, nouvelle commission)
- Emails de progression vers le rang suivant
- Classement des meilleurs ambassadeurs
- Challenges mensuels avec récompenses

---

## 🤖 Phase 6 : Assistant IA Sommelier

### Chatbot Conversationnel
- Widget de chat élégant intégré
- Conseils personnalisés selon l'occasion
- Recommandations basées sur le budget
- Suggestions d'accords mets-vins
- Information sur le programme de parrainage

---

## ⚙️ Phase 7 : Back-Office Admin

### Dashboard
- Vue d'ensemble : commandes, CA, stocks bas
- KPIs du programme MLM (nouveaux ambassadeurs, commissions versées)

### Gestion Produits
- CRUD complet (créer, modifier, supprimer)
- Gestion des stocks et alertes
- Import/Export CSV

### Gestion Commandes
- Workflow de traitement
- Suivi des commissions générées par commande
- Attribution automatique aux parrains

### Gestion MLM (Admin)
- Liste des ambassadeurs et leurs statistiques
- Visualisation du réseau complet
- Configuration des taux de commission par niveau
- Configuration des paliers et bonus
- Gestion des rangs et seuils
- Validation/rejet des demandes de retrait
- Historique des paiements versés
- Rapports de performance du réseau
- Détection de comportements suspects

### Promotions
- Codes promo et réductions
- Ventes flash
- Bonus spéciaux pour ambassadeurs

---

## 🗄️ Base de Données (Supabase)

### Tables E-commerce
- `products`, `categories`, `orders`, `order_items`
- `users`, `profiles`, `reviews`, `wishlist`

### Tables MLM
- `referral_codes` : Codes uniques par utilisateur
- `referral_relationships` : Liens parrain-filleul (multi-niveaux)
- `commissions` : Historique des commissions générées
- `wallets` : Portefeuilles virtuels des ambassadeurs
- `wallet_transactions` : Historique des mouvements
- `withdrawal_requests` : Demandes de retrait Mobile Money
- `ambassador_ranks` : Configuration des rangs
- `user_ranks` : Rang actuel de chaque ambassadeur
- `mlm_bonuses` : Bonus et challenges

### Sécurité
- Authentification sécurisée
- RLS (Row Level Security) 
- Rôles admin séparés (table `user_roles`)
- Edge Functions pour calculs de commissions

---

## 📱 Phase 8 : Optimisations

- **Performance** : Chargement < 3 secondes
- **Responsive** : Parfait sur mobile (80% du trafic)
- **SEO** : Métadonnées optimisées
- **PWA** : Installation sur écran d'accueil
- **Partage social** : Open Graph pour liens de parrainage

---

## 📋 Livrables Finaux
- Site e-commerce complet et fonctionnel
- Système MLM multi-niveaux intégré
- Tableau de bord ambassadeur
- Back-office d'administration (produits + MLM)
- Assistant IA conversationnel
- Documentation utilisateur
- Code source documenté
