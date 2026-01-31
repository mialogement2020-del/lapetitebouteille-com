import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const categories = [
  {
    id: "vins",
    title: "Vins",
    description: "Rouges, blancs et rosés d'exception",
    image: "https://images.unsplash.com/photo-1474722883778-792e7990302f?q=80&w=600",
    href: "/vins",
  },
  {
    id: "champagnes",
    title: "Champagnes",
    description: "Les plus grandes maisons",
    image: "https://images.unsplash.com/photo-1594372365401-d5551c1c5cd6?q=80&w=600",
    href: "/champagnes",
  },
  {
    id: "spiritueux",
    title: "Spiritueux",
    description: "Whisky, Cognac, Rhum...",
    image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=600",
    href: "/spiritueux",
  },
  {
    id: "coffrets",
    title: "Coffrets Cadeaux",
    description: "L'art d'offrir",
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=600",
    href: "/coffrets",
  },
];

const CategoriesSection = () => {
  return (
    <section className="py-20 lg:py-28 bg-cream">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 lg:mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-noir mb-4">
            Nos <span className="text-secondary">Catégories</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explorez notre collection soigneusement sélectionnée pour satisfaire les palais les plus exigeants
          </p>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                to={category.href}
                className="group block relative h-80 rounded-xl overflow-hidden shadow-elegant"
              >
                {/* Image */}
                <img
                  src={category.image}
                  alt={category.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/50 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <h3 className="font-display text-2xl font-bold text-cream mb-2 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-cream/70 text-sm mb-4">
                    {category.description}
                  </p>
                  <div className="flex items-center text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Explorer
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>

                {/* Border Glow on Hover */}
                <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/50 transition-colors" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
