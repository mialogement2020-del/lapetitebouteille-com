import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, TrendingUp, Wallet, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Users,
    title: "Parrainez vos proches",
    description: "Partagez votre code et gagnez sur chaque commande",
  },
  {
    icon: TrendingUp,
    title: "Commissions multi-niveaux",
    description: "Gagnez sur 3 niveaux de votre réseau",
  },
  {
    icon: Wallet,
    title: "Retraits Mobile Money",
    description: "MTN et Orange Money disponibles",
  },
  {
    icon: Gift,
    title: "Bonus & Récompenses",
    description: "Débloquez des avantages exclusifs",
  },
];

const MLMTeaser = () => {
  return (
    <section className="py-20 lg:py-28 bg-gradient-luxury text-cream relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Programme Ambassadeur</span>
            </div>

            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Gagnez de l'argent en
              <br />
              <span className="text-gradient-gold">recommandant nos produits</span>
            </h2>

            <p className="text-cream/80 text-lg mb-8 leading-relaxed">
              Rejoignez notre programme d'ambassadeurs et transformez votre réseau en source de revenus. 
              Commissions attractives, bonus de performance et avantages exclusifs vous attendent !
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-gold text-noir font-semibold hover:opacity-90 shadow-gold"
              >
                <Link to="/ambassadeur">
                  Devenir Ambassadeur
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-cream/30 text-cream hover:bg-cream/10"
              >
                <Link to="/ambassadeur#comment-ca-marche">
                  Comment ça marche ?
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-6">
              {[
                { value: "8%", label: "Commission Niveau 1" },
                { value: "4%", label: "Commission Niveau 2" },
                { value: "2%", label: "Commission Niveau 3" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary font-display">
                    {stat.value}
                  </div>
                  <div className="text-xs text-cream/60 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Content - Benefits Grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                className="p-6 rounded-xl bg-cream/5 border border-cream/10 hover:border-primary/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">
                  {benefit.title}
                </h3>
                <p className="text-cream/70 text-sm">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 p-6 md:p-8 rounded-2xl bg-gradient-gold text-noir text-center"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <h3 className="font-display text-2xl font-bold mb-2">
                Prêt à commencer ?
              </h3>
              <p className="text-noir/80">
                Inscrivez-vous maintenant et recevez votre code ambassadeur unique
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-noir text-cream hover:bg-noir/90 font-semibold shrink-0"
            >
              <Link to="/inscription">
                Créer mon compte gratuitement
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MLMTeaser;
