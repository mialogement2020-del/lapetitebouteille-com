 import { motion, useScroll, useTransform } from "framer-motion";
 import { Link } from "react-router-dom";
 import { ArrowRight } from "lucide-react";
 import { useRef } from "react";
 import { useTranslation } from "react-i18next";
 import { useHomeCategories } from "@/hooks/useHomeCategories";
 
 const CategoriesSection = () => {
   const { t, i18n } = useTranslation();
   const { data: categories } = useHomeCategories({ visibleOnly: true });
   const sectionRef = useRef<HTMLElement>(null);
   
   const { scrollYProgress } = useScroll({
     target: sectionRef,
     offset: ["start end", "center center"]
   });
   
   const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);
   const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
   
   return (
     <section ref={sectionRef} className="py-24 lg:py-32 bg-cream relative">
       {/* Decorative line */}
       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
 
       <div className="container mx-auto px-4">
         {/* Section Header */}
         <motion.div
           initial={{ opacity: 0, y: 40 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8, ease: "easeOut" }}
           className="text-center mb-16 lg:mb-20"
         >
           <motion.span 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.2, duration: 0.6 }}
             className="text-primary text-sm uppercase tracking-[0.3em] font-medium mb-4 block"
           >
              {t("categoriesSection.eyebrow")}
           </motion.span>
           <motion.h2 
             initial={{ opacity: 0, y: 30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.3, duration: 0.7 }}
             className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-noir mb-6"
           >
              {t("categoriesSection.titlePart1")} <span className="text-secondary">{t("categoriesSection.titleHighlight")}</span>
           </motion.h2>
           <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("categoriesSection.subtitle")}
           </p>
         </motion.div>
 
         {/* Categories Grid */}
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-6"
           style={{ scale, opacity }}
         >
            {(categories ?? []).map((category, index) => {
              const isEn = i18n.language?.startsWith("en");
              const title = (isEn ? category.title_en : category.title_fr) || category.title_fr;
              const description = (isEn ? category.description_en : category.description_fr) || category.description_fr;
              return (
             <motion.div
               key={category.id}
               initial={{ opacity: 0, y: 50, scale: 0.9 }}
               whileInView={{ opacity: 1, y: 0, scale: 1 }}
               viewport={{ once: true }}
               transition={{ 
                 duration: 0.6, 
                 delay: index * 0.15,
                 ease: [0.25, 0.46, 0.45, 0.94]
               }}
               whileHover={{ y: -10 }}
             >
               <Link
                 to={category.href}
                 className="group block relative h-96 rounded-2xl overflow-hidden shadow-elegant hover:shadow-luxury transition-shadow duration-500 bg-gradient-to-br from-secondary via-noir to-primary"
               >
                 {/* Image */}
                 <img
                   src={category.image_url}
                    alt={title}
                   className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                 />
                 
                 {/* Overlay */}
                 <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/60 to-noir/10 group-hover:from-noir/90 transition-all duration-500" />
 
                 {/* Content */}
                 <div className="absolute inset-0 p-8 flex flex-col justify-end">
                   <motion.div
                     initial={{ y: 20, opacity: 0 }}
                     whileInView={{ y: 0, opacity: 1 }}
                     transition={{ delay: 0.2 + index * 0.1 }}
                   >
                     <h3 className="font-display text-3xl font-semibold text-cream mb-3 group-hover:text-primary transition-colors">
                        {title}
                     </h3>
                     <p className="text-cream/70 text-sm mb-5">
                        {description}
                     </p>
                     <div className="flex items-center text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        {t("categoriesSection.discover")}
                       <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-2" />
                     </div>
                   </motion.div>
                 </div>
 
                 {/* Border Glow on Hover */}
                 <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-primary/30 transition-all duration-500" />
               </Link>
             </motion.div>
              );
            })}
         </motion.div>
       </div>
     </section>
   );
 };
 
 export default CategoriesSection;
