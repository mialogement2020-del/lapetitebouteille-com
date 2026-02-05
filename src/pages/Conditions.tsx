 import { motion } from "framer-motion";
 import Header from "@/components/layout/Header";
 import Footer from "@/components/layout/Footer";
 
 export default function Conditions() {
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
               Conditions Générales d'Utilisation
             </h1>
             
             <div className="prose prose-invert prose-gold max-w-none space-y-8">
               <p className="text-cream/70 text-lg">
                 Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
               </p>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">1. Présentation</h2>
                 <p className="text-cream/70">
                   La Petite Bouteille est une plateforme e-commerce spécialisée dans la vente de vins et spiritueux premium au Cameroun. 
                   En accédant à notre site et en utilisant nos services, vous acceptez d'être lié par les présentes conditions générales d'utilisation.
                 </p>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">2. Conditions d'Accès</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>
                     <strong className="text-cream">Âge minimum :</strong> Vous devez avoir au moins 18 ans pour utiliser notre site et acheter nos produits. 
                     En passant commande, vous certifiez avoir l'âge légal pour acheter des boissons alcoolisées au Cameroun.
                   </p>
                   <p>
                     <strong className="text-cream">Compte utilisateur :</strong> La création d'un compte nécessite des informations exactes et à jour. 
                     Vous êtes responsable de la confidentialité de vos identifiants de connexion.
                   </p>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">3. Commandes et Paiements</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>
                     <strong className="text-cream">Processus de commande :</strong> Une commande n'est confirmée qu'après validation du paiement ou acceptation du paiement à la livraison.
                   </p>
                   <p>
                     <strong className="text-cream">Moyens de paiement acceptés :</strong>
                   </p>
                   <ul className="list-disc list-inside space-y-1 ml-4">
                     <li>MTN Mobile Money</li>
                     <li>Orange Money</li>
                     <li>Paiement à la livraison (Cash on Delivery)</li>
                   </ul>
                   <p>
                     <strong className="text-cream">Prix :</strong> Tous les prix sont affichés en Francs CFA (FCFA) et incluent les taxes applicables.
                   </p>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">4. Livraison</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>
                     <strong className="text-cream">Zones de livraison :</strong> Nous livrons actuellement à Yaoundé, Douala, et d'autres villes principales du Cameroun.
                   </p>
                   <p>
                     <strong className="text-cream">Délais :</strong> Livraison express sous 24h pour Yaoundé et Douala. Délais variables pour les autres villes.
                   </p>
                   <p>
                     <strong className="text-cream">Frais de livraison :</strong> Livraison gratuite pour les commandes supérieures à 50 000 FCFA.
                   </p>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">5. Programme Ambassadeur</h2>
                 <div className="space-y-4 text-cream/70">
                   <p>
                     Notre programme de parrainage permet aux utilisateurs de gagner des commissions sur les ventes générées par leur réseau.
                   </p>
                   <ul className="list-disc list-inside space-y-1 ml-4">
                     <li>Niveau 1 (filleuls directs) : 8% de commission</li>
                     <li>Niveau 2 : 4% de commission</li>
                     <li>Niveau 3 : 2% de commission</li>
                   </ul>
                   <p>
                     Les retraits sont disponibles via MTN Money et Orange Money, avec un minimum de 5 000 FCFA.
                   </p>
                 </div>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">6. Propriété Intellectuelle</h2>
                 <p className="text-cream/70">
                   Tous les contenus présents sur ce site (textes, images, logos, marques) sont protégés par le droit de la propriété intellectuelle. 
                   Toute reproduction ou utilisation non autorisée est strictement interdite.
                 </p>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">7. Limitation de Responsabilité</h2>
                 <p className="text-cream/70">
                   La Petite Bouteille ne saurait être tenue responsable des dommages directs ou indirects résultant de l'utilisation de ce site 
                   ou de l'impossibilité de l'utiliser. Nous nous réservons le droit de modifier ces conditions à tout moment.
                 </p>
               </section>
 
               <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                 <h2 className="font-display text-2xl text-primary mb-4">8. Contact</h2>
                 <p className="text-cream/70">
                   Pour toute question concernant ces conditions, vous pouvez nous contacter :
                 </p>
                 <ul className="list-none space-y-2 mt-4 text-cream/70">
                   <li>📧 Email : contact@lapetitebouteille.com</li>
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