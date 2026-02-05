 import { motion } from "framer-motion";
 import Header from "@/components/layout/Header";
 import Footer from "@/components/layout/Footer";
 
 export default function Confidentialite() {
   return (
     <div className="min-h-screen bg-noir">
       <Header />
       <main className="pt-24 pb-16">
         <div className="container mx-auto px-4 max-w-4xl">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
           >
             <h1 className="font-display text-4xl md:text-5xl font-semibold text-cream mb-8">
               Politique de Confidentialité
             </h1>
             
             <div className="prose prose-invert prose-gold max-w-none space-y-8">
               <p className="text-cream/70 text-lg">
                 Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
               </p>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">1. Introduction</h2>
                 <p className="text-cream/70">
                   La Petite Bouteille s'engage à protéger votre vie privée. Cette politique de confidentialité explique comment nous collectons, 
                   utilisons et protégeons vos informations personnelles lorsque vous utilisez notre site et nos services.
                 </p>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">2. Données Collectées</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>Nous collectons les informations suivantes :</p>
                   <ul className="list-disc list-inside space-y-2 ml-4">
                     <li><strong className="text-cream">Informations d'identification :</strong> nom, prénom, email, numéro de téléphone, date de naissance</li>
                     <li><strong className="text-cream">Informations de livraison :</strong> adresse postale complète</li>
                     <li><strong className="text-cream">Informations de paiement :</strong> numéro de téléphone Mobile Money (nous ne stockons pas les détails de paiement)</li>
                     <li><strong className="text-cream">Données de navigation :</strong> cookies, adresse IP, pages visitées</li>
                     <li><strong className="text-cream">Historique d'achat :</strong> commandes passées, produits consultés, wishlist</li>
                   </ul>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">3. Utilisation des Données</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>Vos données sont utilisées pour :</p>
                   <ul className="list-disc list-inside space-y-2 ml-4">
                     <li>Traiter et livrer vos commandes</li>
                     <li>Gérer votre compte et votre espace personnel</li>
                     <li>Envoyer des confirmations de commande et mises à jour de livraison</li>
                     <li>Gérer le programme ambassadeur et calculer les commissions</li>
                     <li>Améliorer nos services et personnaliser votre expérience</li>
                     <li>Vous informer de nos offres et promotions (avec votre consentement)</li>
                     <li>Respecter nos obligations légales, notamment la vérification de l'âge</li>
                   </ul>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">4. Protection des Données</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>Nous mettons en œuvre des mesures de sécurité robustes :</p>
                   <ul className="list-disc list-inside space-y-2 ml-4">
                     <li>Chiffrement SSL/TLS pour toutes les communications</li>
                     <li>Stockage sécurisé avec chiffrement des données sensibles</li>
                     <li>Accès restreint aux données personnelles</li>
                     <li>Authentification forte pour les comptes utilisateurs</li>
                     <li>Protection contre les mots de passe compromis</li>
                   </ul>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">5. Partage des Données</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>
                     Nous ne vendons jamais vos données personnelles. Vos informations peuvent être partagées uniquement avec :
                   </p>
                   <ul className="list-disc list-inside space-y-2 ml-4">
                     <li><strong className="text-cream">Services de livraison :</strong> pour assurer la livraison de vos commandes</li>
                     <li><strong className="text-cream">Processeurs de paiement :</strong> MTN et Orange pour les transactions Mobile Money</li>
                     <li><strong className="text-cream">Autorités légales :</strong> si requis par la loi</li>
                   </ul>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">6. Cookies</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>Nous utilisons des cookies pour :</p>
                   <ul className="list-disc list-inside space-y-2 ml-4">
                     <li>Maintenir votre session de connexion</li>
                     <li>Sauvegarder votre panier d'achat</li>
                     <li>Analyser le trafic du site (statistiques anonymes)</li>
                     <li>Personnaliser votre expérience de navigation</li>
                   </ul>
                   <p className="mt-4">
                     Vous pouvez désactiver les cookies dans les paramètres de votre navigateur, 
                     mais certaines fonctionnalités du site pourraient ne plus fonctionner correctement.
                   </p>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">7. Vos Droits</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>Vous disposez des droits suivants concernant vos données :</p>
                   <ul className="list-disc list-inside space-y-2 ml-4">
                     <li><strong className="text-cream">Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
                     <li><strong className="text-cream">Droit de rectification :</strong> corriger vos informations inexactes</li>
                     <li><strong className="text-cream">Droit à l'effacement :</strong> demander la suppression de vos données</li>
                     <li><strong className="text-cream">Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                     <li><strong className="text-cream">Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                   </ul>
                   <p className="mt-4">
                     Pour exercer ces droits, contactez-nous à l'adresse : privacy@lapetitebouteille.com
                   </p>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">8. Conservation des Données</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>Nous conservons vos données personnelles pendant :</p>
                   <ul className="list-disc list-inside space-y-2 ml-4">
                     <li>La durée de vie de votre compte utilisateur</li>
                     <li>5 ans après votre dernière commande (obligations légales)</li>
                     <li>3 ans pour les données de navigation et statistiques</li>
                   </ul>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">9. Modifications</h2>
                 <p className="text-cream/70">
                   Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
                   Toute modification sera publiée sur cette page avec une nouvelle date de mise à jour. 
                   Nous vous encourageons à consulter régulièrement cette page.
                 </p>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">10. Contact</h2>
                 <p className="text-cream/70">
                   Pour toute question concernant cette politique de confidentialité :
                 </p>
                 <ul className="list-none space-y-2 mt-4 text-cream/70">
                   <li>📧 Email : privacy@lapetitebouteille.com</li>
                   <li>📞 Téléphone : +237 6XX XXX XXX</li>
                   <li>📍 Adresse : Yaoundé, Cameroun</li>
                 </ul>
               </section>
             </div>
           </motion.div>
         </div>
       </main>
       <Footer />
     </div>
   );
 }