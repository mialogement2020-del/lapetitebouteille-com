import { ArrowRight, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBackground from "@/assets/hero-wine-cellar.webp";
import heroBackgroundMobile from "@/assets/hero-wine-cellar-mobile.webp";
 
 const HeroSection = () => {
   return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-noir pt-24"
    >
       {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
       >
        <picture>
          <source media="(max-width: 767px)" srcSet={heroBackgroundMobile} />
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
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-noir/90 via-noir/60 to-noir" />
      </div>
 
       {/* Decorative Elements */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
      <div 
        className="relative z-10 container mx-auto px-4"
      >
         <div className="max-w-4xl mx-auto text-center">
           {/* Badge */}
           <div
             className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm"
           >
             <Star className="h-4 w-4 text-primary fill-primary animate-pulse" />
             <span className="text-sm font-medium text-primary tracking-wide">Selection prestigieuse</span>
           </div>
 
           {/* Heading */}
           <h1
             className="font-display text-5xl md:text-6xl lg:text-8xl font-semibold text-cream leading-[0.95] mb-8"
           >
             L'Art de la degustation
             <br />
             <span className="text-gradient-gold">La Petite Bouteille</span>
           </h1>
 
           {/* Subtitle */}
           <p
             className="text-lg md:text-xl text-cream/70 mb-12 max-w-2xl mx-auto leading-relaxed font-light"
           >
             Decouvrez notre collection exclusive.
           </p>
 
           {/* CTA Buttons */}
           <div
             className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
           >
             <Button
               asChild
               size="lg"
               className="bg-gradient-gold text-noir font-semibold text-lg px-10 py-7 hover:opacity-90 shadow-gold shine-effect rounded-full"
             >
                <Link to="/catalogue">
                  Explorer la collection
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
                  Devenir ambassadeur
               </Link>
             </Button>
           </div>
 
           {/* Stats */}
           <div
             className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
           >
             {[
               { value: "500+", label: "References" },
               { value: "2000+", label: "Clients servis" },
               { value: "24h", label: "Livraison rapide" },
             ].map((stat, index) => (
               <div 
                 key={index} 
                 className="text-center"
               >
                 <div className="text-3xl md:text-4xl font-semibold text-primary font-display">
                   {stat.value}
                 </div>
                 <div className="text-sm text-cream/50 mt-2 tracking-wide">{stat.label}</div>
               </div>
             ))}
           </div>
         </div>
      </div>
 
       {/* Scroll Indicator */}
       <div
         className="absolute bottom-12 left-1/2 -translate-x-1/2"
       >
         <div
           className="flex flex-col items-center gap-2 text-cream/40"
         >
           <span className="text-xs uppercase tracking-widest">Decouvrir</span>
           <ChevronDown className="h-5 w-5" />
         </div>
       </div>
 
       {/* Decorative side elements */}
       <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2">
         <div 
           className="flex flex-col items-center gap-4"
         >
           <div className="w-px h-24 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
           <span className="text-xs text-cream/30 tracking-widest transform -rotate-90 whitespace-nowrap">
             Depuis 2024
           </span>
           <div className="w-px h-24 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
         </div>
       </div>
     </section>
   );
 };
 
 export default HeroSection;
