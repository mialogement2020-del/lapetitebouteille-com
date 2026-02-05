 import { motion } from "framer-motion";
 import { ArrowRight, Star, ChevronDown } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Link } from "react-router-dom";
import heroBackground from "@/assets/hero-wine-cellar.jpg";
 
 const HeroSection = () => {
   return (
     <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-noir pt-24">
       {/* Background Image with Overlay */}
       <div
         className="absolute inset-0 bg-cover bg-center bg-no-repeat"
         style={{
          backgroundImage: `url(${heroBackground})`,
         }}
       >
         <div className="absolute inset-0 bg-gradient-to-b from-noir/95 via-noir/70 to-noir" />
       </div>
 
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
       <div className="relative z-10 container mx-auto px-4">
         <div className="max-w-4xl mx-auto text-center">
           {/* Badge */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6 }}
             className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm"
           >
             <Star className="h-4 w-4 text-primary fill-primary animate-pulse" />
             <span className="text-sm font-medium text-primary tracking-wide">Collection Premium 2026</span>
           </motion.div>
 
           {/* Heading */}
           <motion.h1
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.1 }}
             className="font-display text-5xl md:text-6xl lg:text-8xl font-semibold text-cream leading-[0.95] mb-8"
           >
             L'Art de la
             <br />
             <span className="text-gradient-gold">Dégustation</span>
           </motion.h1>
 
           {/* Subtitle */}
           <motion.p
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.2 }}
             className="text-lg md:text-xl text-cream/70 mb-12 max-w-2xl mx-auto leading-relaxed font-light"
           >
             Explorez notre collection exclusive de grands crus, champagnes prestigieux 
             et spiritueux d'exception. Livraison express au Cameroun.
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
                 Découvrir la Collection
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
                 Devenir Ambassadeur
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
               { value: "500+", label: "Crus d'Exception" },
               { value: "2000+", label: "Clients Satisfaits" },
               { value: "24h", label: "Livraison Express" },
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
       </div>
 
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
             EXCELLENCE DEPUIS 2020
           </span>
           <div className="w-px h-24 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
         </motion.div>
       </div>
     </section>
   );
 };
 
 export default HeroSection;