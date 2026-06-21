import { motion, useScroll, useTransform } from "framer-motion";
 import { Link } from "react-router-dom";
 import { Users, TrendingUp, Wallet, Gift, ArrowRight, Sparkles, Truck, Shield, Clock, Award } from "lucide-react";
 import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
 
const benefitIcons = [Users, TrendingUp, Wallet, Gift];
const trustIcons = [Truck, Shield, Clock, Award];
 
 const MLMTeaser = () => {
   const { t } = useTranslation();
   const sectionRef = useRef<HTMLElement>(null);
   
   const { scrollYProgress } = useScroll({
     target: sectionRef,
     offset: ["start end", "center center"]
   });
   
   const leftX = useTransform(scrollYProgress, [0, 0.5], [-100, 0]);
   const rightX = useTransform(scrollYProgress, [0, 0.5], [100, 0]);
   const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
   
   return (
     <section ref={sectionRef} className="py-24 lg:py-32 bg-noir text-cream relative overflow-hidden">
       {/* Background Decorations */}
       <div className="absolute inset-0 pointer-events-none">
         <motion.div 
           animate={{ y: [0, -20, 0], opacity: [0.05, 0.1, 0.05] }}
           transition={{ duration: 8, repeat: Infinity }}
           className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" 
         />
         <motion.div 
           animate={{ y: [0, 20, 0], opacity: [0.05, 0.15, 0.05] }}
           transition={{ duration: 6, repeat: Infinity, delay: 1 }}
           className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-3xl" 
         />
         
         {/* Subtle pattern */}
         <div 
           className="absolute inset-0 opacity-[0.02]"
           style={{
             backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
             backgroundSize: '40px 40px'
           }}
         />
       </div>
 
       <div className="container mx-auto px-4 relative z-10">
         <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
           {/* Left Content */}
           <motion.div
             initial={{ opacity: 0, x: -50 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             style={{ x: leftX, opacity }}
           >
             <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               whileInView={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.2, duration: 0.5 }}
               viewport={{ once: true }}
               className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm"
             >
               <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary tracking-wide">{t("mlmTeaser.badge")}</span>
             </motion.div>
 
             <motion.h2 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3, duration: 0.7 }}
               viewport={{ once: true }}
               className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold mb-8 leading-[1.1]"
             >
                {t("mlmTeaser.titleLine1")}
                <br />
                <span className="text-gradient-gold">{t("mlmTeaser.titleHighlight")}</span>
             </motion.h2>
 
             <motion.p 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4, duration: 0.6 }}
               viewport={{ once: true }}
               className="text-cream/70 text-lg mb-10 leading-relaxed max-w-lg"
             >
                {t("mlmTeaser.description")}
             </motion.p>
 
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5, duration: 0.6 }}
               viewport={{ once: true }}
               className="flex flex-col sm:flex-row gap-4"
             >
               <Button
                 asChild
                 size="lg"
                 className="bg-gradient-gold text-noir font-semibold hover:opacity-90 shadow-gold h-14 px-8 rounded-full shine-effect"
               >
                 <Link to="/ambassadeur">
                    {t("mlmTeaser.ctaPrimary")}
                   <ArrowRight className="ml-2 h-5 w-5" />
                 </Link>
               </Button>
               <Button
                 asChild
                 variant="outline"
                 size="lg"
                 className="border-cream/20 text-cream hover:bg-cream/5 h-14 px-8 rounded-full"
               >
                 <Link to="/ambassadeur#comment-ca-marche">
                    {t("mlmTeaser.ctaSecondary")}
                 </Link>
               </Button>
             </motion.div>
 
             {/* Stats */}
             <div className="mt-12 grid grid-cols-3 gap-8">
               {[
                  { value: "8%", label: t("mlmTeaser.level1") },
                  { value: "4%", label: t("mlmTeaser.level2") },
                  { value: "2%", label: t("mlmTeaser.level3") },
               ].map((stat, index) => (
                 <motion.div 
                   key={index} 
                   className="text-center"
                   initial={{ opacity: 0, scale: 0.8 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   viewport={{ once: true }}
                   transition={{ delay: 0.6 + index * 0.15, type: "spring", stiffness: 200 }}
                 >
                   <div className="text-3xl md:text-4xl font-semibold text-primary font-display">
                     {stat.value}
                   </div>
                   <div className="text-xs text-cream/50 mt-2 tracking-wide uppercase">{stat.label}</div>
                 </motion.div>
               ))}
             </div>
           </motion.div>
 
           {/* Right Content - Benefits Grid */}
           <motion.div
             initial={{ opacity: 0, x: 50 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
             style={{ x: rightX, opacity }}
             className="grid grid-cols-1 sm:grid-cols-2 gap-5"
           >
              {benefitIcons.map((Icon, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 30, scale: 0.9 }}
                 whileInView={{ opacity: 1, y: 0, scale: 1 }}
                 viewport={{ once: true }}
                 transition={{ 
                   duration: 0.5, 
                   delay: 0.4 + index * 0.12,
                   ease: [0.25, 0.46, 0.45, 0.94]
                 }}
                 whileHover={{ y: -8, scale: 1.02 }}
                 className="p-7 rounded-2xl bg-cream/[0.03] border border-cream/10 hover:border-primary/30 hover:bg-cream/[0.05] transition-all duration-300 group"
               >
                 <motion.div 
                   whileHover={{ scale: 1.15, rotate: 10 }}
                   transition={{ type: "spring", stiffness: 300 }}
                   className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors"
                 >
                    <Icon className="h-6 w-6 text-primary" />
                 </motion.div>
                 <h3 className="font-display text-xl font-semibold mb-2">
                    {t(`mlmTeaser.benefit${index + 1}Title`)}
                 </h3>
                 <p className="text-cream/60 text-sm leading-relaxed">
                    {t(`mlmTeaser.benefit${index + 1}Desc`)}
                 </p>
               </motion.div>
             ))}
           </motion.div>
         </div>
 
        {/* Trust Features Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          {trustIcons.map((Icon, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              className="text-center group"
            >
              <motion.div 
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors"
              >
                <Icon className="h-6 w-6 text-primary" />
              </motion.div>
              <h3 className="font-display text-lg font-semibold text-cream mb-1">
                {t(`trustSection.feature${index + 1}Title`)}
              </h3>
              <p className="text-sm text-cream/60">
                {t(`trustSection.feature${index + 1}Desc`)}
              </p>
            </motion.div>
          ))}
        </motion.div>

         {/* Bottom CTA Banner */}
         <motion.div
           initial={{ opacity: 0, y: 50, scale: 0.95 }}
           whileInView={{ opacity: 1, y: 0, scale: 1 }}
           viewport={{ once: true }}
           transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
           whileHover={{ scale: 1.02 }}
           className="mt-20 p-8 md:p-10 rounded-3xl bg-gradient-gold text-noir shine-effect"
         >
           <div className="flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="text-left">
               <h3 className="font-display text-3xl font-semibold mb-2">
                  {t("mlmTeaser.readyTitle")}
               </h3>
               <p className="text-noir/80">
                  {t("mlmTeaser.readyDesc")}
               </p>
             </div>
             <Button
               asChild
               size="lg"
               className="bg-noir text-cream hover:bg-noir/90 font-semibold shrink-0 h-14 px-10 rounded-full"
             >
               <Link to="/inscription">
                  {t("mlmTeaser.readyCta")}
               </Link>
             </Button>
           </div>
         </motion.div>
       </div>
     </section>
   );
 };
 
 export default MLMTeaser;