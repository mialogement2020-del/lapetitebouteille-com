import { motion, useScroll, useTransform } from "framer-motion";
import { Truck, Shield, Clock, Award, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

const trustIcons = [Truck, Shield, Clock, Award];

const TrustSection = () => {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [50, 0, 0, -50]);
  
  return (
    <section ref={sectionRef} className="py-20 bg-noir relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      {/* Gold accent lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4">
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
          style={{ opacity, y }}
        >
          {trustIcons.map((Icon, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="text-center group"
            >
              <motion.div 
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors"
              >
                <Icon className="h-7 w-7 text-primary" />
              </motion.div>
              <h3 className="font-display text-xl font-semibold text-cream mb-2">
                {t(`trustSection.feature${index + 1}Title`)}
              </h3>
              <p className="text-sm text-cream/60">
                {t(`trustSection.feature${index + 1}Desc`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
