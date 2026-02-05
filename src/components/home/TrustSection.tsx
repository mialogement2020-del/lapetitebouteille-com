import { motion } from "framer-motion";
import { Truck, Shield, Clock, Award, Sparkles } from "lucide-react";

const trustFeatures = [
  {
    icon: Truck,
    title: "Livraison Premium",
    description: "Express 24h sur Yaoundé & Douala",
  },
  {
    icon: Shield,
    title: "Paiement Sécurisé",
    description: "Mobile Money & Paiement à la livraison",
  },
  {
    icon: Clock,
    title: "Conciergerie 7j/7",
    description: "Service client dédié et personnalisé",
  },
  {
    icon: Award,
    title: "Authenticité Certifiée",
    description: "Produits 100% garantis d'origine",
  },
];

const TrustSection = () => {
  return (
    <section className="py-20 bg-noir relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      {/* Gold accent lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {trustFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center group"
            >
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors"
              >
                <feature.icon className="h-7 w-7 text-primary" />
              </motion.div>
              <h3 className="font-display text-xl font-semibold text-cream mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-cream/60">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
