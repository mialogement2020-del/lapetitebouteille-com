import { motion } from "framer-motion";
import { Truck, Shield, Clock, Award } from "lucide-react";

const trustFeatures = [
  {
    icon: Truck,
    title: "Livraison Express",
    description: "Yaoundé & Douala sous 24h",
  },
  {
    icon: Shield,
    title: "Paiement Sécurisé",
    description: "Mobile Money & paiement à la livraison",
  },
  {
    icon: Clock,
    title: "Service Client",
    description: "Disponible 7j/7 pour vous aider",
  },
  {
    icon: Award,
    title: "Qualité Garantie",
    description: "Produits 100% authentiques",
  },
];

const TrustSection = () => {
  return (
    <section className="py-16 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {trustFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-7 w-7 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
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
