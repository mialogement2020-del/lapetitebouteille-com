import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Star, ChevronDown } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Link } from "react-router-dom";
import heroBackground from "@/assets/hero-wine-cellar.webp";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
 
 const HeroSection = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);
  
   return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-noir pt-24"
    >
       {/* Background Image with Overlay */}
      <motion.div
        className="absolute inset-[-20%] bg-cover bg-center bg-no-repeat will-change-transform"
         style={{ y: backgroundY }}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
       >
        <img
          src={heroBackground}
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          className="h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-noir/90 via-noir/60 to-noir" />
      </motion.div>
 
       {/* Decorative Elements */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <motion.div 
           animate={{ y: [0, -30, 0] }}
           transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-1/4 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" 
         />
         <motion.div 
           animate={{ y: [0, 20, 0] }}
           transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
           className="absolute bottom-1/4 right-10 w-96 h-96 bg-secondary/15 rounded-full blur-3xl" 
         />
         <motion.div 
           animate={{ y: [0, -15, 0] }}
           transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute top-1/3 right-1/4 w-48 h-48 bg-primary/5 rounded-full blur-3xl" 
         />
         
         {/* Subtle grid pattern */}
         <div 
           className="absolute inset-0 opacity-[0.02]"
           style={{
             backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
             backgroundSize: '50px 50px'
           }}
         />
       </div>
 
       {/* Content */}
      <motion.div 
        className="relative z-10 container mx-auto px-4"
        style={{ y: textY, opacity }}
      >
         <div className="max-w-4xl mx-auto text-center">
           {/* Badge */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6 }}
             className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm"
           >
             <Star className="h-4 w-4 text-primary fill-primary animate-pulse" />
             <span className="text-sm font-medium text-primary tracking-wide">{t("hero.badge")}</span>
           </motion.div>
 
           {/* Heading */}
           <motion.h1
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.1 }}
             className="font-display text-5xl md:text-6xl lg:text-8xl font-semibold text-cream leading-[0.95] mb-8"
           >
             {t("hero.titleLine1")}
             <br />
             <span className="text-gradient-gold">{t("hero.titleHighlight")}</span>
           </motion.h1>
 
           {/* Subtitle */}
           <motion.p
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.2 }}
             className="text-lg md:text-xl text-cream/70 mb-12 max-w-2xl mx-auto leading-relaxed font-light"
           >
             {t("hero.subtitle")}
           </motion.p>
 
           {/* CTA Buttons */}
           <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.3 }}
             className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
           >
             <Button
               asChild
               size="lg"
               className="bg-gradient-gold text-noir font-semibold text-lg px-10 py-7 hover:opacity-90 shadow-gold shine-effect rounded-full"
             >
               <Link to="/catalogue">
                 {t("hero.ctaPrimary")}
                 <ArrowRight className="ml-2 h-5 w-5" />
               </Link>
             </Button>
             <Button
               asChild
               variant="outline"
               size="lg"
               className="border-cream/20 text-cream hover:bg-cream/5 text-lg px-10 py-7 rounded-full backdrop-blur-sm"
             >
               <Link to="/ambassadeur">
                 {t("hero.ctaSecondary")}
               </Link>
             </Button>
           </motion.div>
 
           {/* Stats */}
           <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.4 }}
             className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
           >
             {[
               { value: "500+", label: t("hero.stat1") },
               { value: "2000+", label: t("hero.stat2") },
               { value: "24h", label: t("hero.stat3") },
             ].map((stat, index) => (
               <motion.div 
                 key={index} 
                 className="text-center"
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.5 + index * 0.1 }}
               >
                 <div className="text-3xl md:text-4xl font-semibold text-primary font-display">
                   {stat.value}
                 </div>
                 <div className="text-sm text-cream/50 mt-2 tracking-wide">{stat.label}</div>
               </motion.div>
             ))}
           </motion.div>
         </div>
      </motion.div>
 
       {/* Scroll Indicator */}
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 1, duration: 0.6 }}
         className="absolute bottom-12 left-1/2 -translate-x-1/2"
       >
         <motion.div
           animate={{ y: [0, 10, 0] }}
           transition={{ repeat: Infinity, duration: 1.5 }}
           className="flex flex-col items-center gap-2 text-cream/40"
         >
           <span className="text-xs uppercase tracking-widest">Découvrir</span>
           <ChevronDown className="h-5 w-5" />
         </motion.div>
       </motion.div>
 
       {/* Decorative side elements */}
       <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2">
         <motion.div 
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.8 }}
           className="flex flex-col items-center gap-4"
         >
           <div className="w-px h-24 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
           <span className="text-xs text-cream/30 tracking-widest transform -rotate-90 whitespace-nowrap">
             {t("hero.since")}
           </span>
           <div className="w-px h-24 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
         </motion.div>
       </div>
     </section>
   );
 };
 
 export default HeroSection;