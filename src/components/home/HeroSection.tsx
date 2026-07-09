import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useHeroConfig, type HeroData } from "@/hooks/useHeroConfig";
import heroBackground from "@/assets/hero-wine-cellar.webp";
import heroBackgroundMobile from "@/assets/hero-wine-cellar-mobile.webp";

const defaultHero: HeroData = {
  media_type: "image",
  background_url: "",
  video_url: "",
  badge_fr: "Cave premium au Cameroun",
  badge_en: "Premium wine shop in Cameroon",
  title_line1_fr: "Vins, champagnes",
  title_line1_en: "Wines, champagnes",
  title_highlight_fr: "et spiritueux",
  title_highlight_en: "and spirits",
  subtitle_fr: "Une selection soignee pour vos cadeaux, diners, evenements et moments d'exception.",
  subtitle_en: "A curated selection for gifts, dinners, events and exceptional moments.",
  cta_primary_label_fr: "Acheter maintenant",
  cta_primary_label_en: "Shop now",
  cta_primary_link: "/catalogue",
  cta_secondary_label_fr: "Voir les champagnes",
  cta_secondary_label_en: "View champagnes",
  cta_secondary_link: "/catalogue/champagnes",
  active_from: "",
  active_until: "",
};

const isLegacySeedHero = (published?: Partial<HeroData> | null) =>
  published?.title_line1_fr === "L'Art de la" ||
  published?.title_highlight_fr === "Petite Bouteille" ||
  published?.title_highlight_fr === "La Petite Bouteille";

const isHeroCurrentlyActive = (hero: HeroData) => {
  const now = Date.now();
  const startsAt = hero.active_from ? new Date(hero.active_from).getTime() : null;
  const endsAt = hero.active_until ? new Date(hero.active_until).getTime() : null;

  if (startsAt && Number.isFinite(startsAt) && now < startsAt) return false;
  if (endsAt && Number.isFinite(endsAt) && now > endsAt) return false;

  return true;
};

const resolveHero = (published?: Partial<HeroData> | null): HeroData => {
  if (isLegacySeedHero(published)) {
    return {
      ...defaultHero,
      media_type: published?.media_type ?? defaultHero.media_type,
      background_url: published?.background_url ?? defaultHero.background_url,
      video_url: published?.video_url ?? defaultHero.video_url,
    };
  }

  return {
    ...defaultHero,
    ...(published ?? {}),
  };
};
 
 const HeroSection = () => {
   const { i18n } = useTranslation();
   const { data: config } = useHeroConfig();
   const resolvedHero = resolveHero(config?.published);
   const hero = isHeroCurrentlyActive(resolvedHero) ? resolvedHero : defaultHero;
   const isEn = i18n.language?.startsWith("en");
   const badge = (isEn ? hero.badge_en : hero.badge_fr) || defaultHero.badge_fr;
   const titleLine1 = (isEn ? hero.title_line1_en : hero.title_line1_fr) || defaultHero.title_line1_fr;
   const titleHighlight = (isEn ? hero.title_highlight_en : hero.title_highlight_fr) || defaultHero.title_highlight_fr;
   const subtitle = (isEn ? hero.subtitle_en : hero.subtitle_fr) || defaultHero.subtitle_fr;
   const primaryLabel = (isEn ? hero.cta_primary_label_en : hero.cta_primary_label_fr) || defaultHero.cta_primary_label_fr;
   const secondaryLabel = (isEn ? hero.cta_secondary_label_en : hero.cta_secondary_label_fr) || defaultHero.cta_secondary_label_fr;
   const useCustomImage = hero.media_type === "image" && !!hero.background_url;
   const useCustomVideo = hero.media_type === "video" && !!hero.video_url;

   return (
    <section
      className="relative flex min-h-[54svh] items-center justify-center overflow-hidden bg-noir px-0 pb-8 pt-24 sm:min-h-[58svh] sm:pt-28 lg:min-h-[62svh]"
    >
       {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
       >
        {useCustomVideo ? (
          <video
            src={hero.video_url}
            aria-hidden="true"
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover object-center"
          />
        ) : useCustomImage ? (
          <img
            src={hero.background_url}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            className="h-full w-full object-cover object-center"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        ) : (
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
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-noir/90 via-noir/68 to-noir" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(214,160,61,0.12),transparent_34%)]" />
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
             className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/12 border border-primary/25 mb-4 backdrop-blur-sm"
           >
             <Sparkles className="h-4 w-4 text-primary" />
             <span className="text-xs sm:text-sm font-medium text-primary tracking-wide">{badge}</span>
           </div>
 
           {/* Heading */}
           <h1
             className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-cream leading-[0.98] mb-4"
           >
             {titleLine1}
             <br />
             <span className="text-gradient-gold"> {titleHighlight}</span>
           </h1>
 
           {/* Subtitle */}
           <p
             className="text-sm md:text-lg text-cream/76 mb-6 max-w-xl mx-auto leading-relaxed font-light"
           >
             {subtitle}
           </p>
 
           {/* CTA Buttons */}
           <div
             className="flex flex-col sm:flex-row items-center justify-center gap-3"
           >
             <Button
               asChild
               size="lg"
               className="bg-gradient-gold text-noir font-semibold text-base px-7 py-5 hover:opacity-90 shadow-gold shine-effect rounded-full"
             >
                <Link to={hero.cta_primary_link || defaultHero.cta_primary_link}>
                  {primaryLabel}
                 <ArrowRight className="ml-2 h-5 w-5" />
               </Link>
             </Button>
             <Button
               asChild
               variant="outline"
               size="lg"
               className="border-cream/20 text-cream hover:bg-cream/5 text-base px-7 py-5 rounded-full backdrop-blur-sm"
             >
                <Link to={hero.cta_secondary_link || defaultHero.cta_secondary_link}>
                  {secondaryLabel}
               </Link>
             </Button>
           </div>
         </div>
      </div>
     </section>
   );
 };
 
 export default HeroSection;
