import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ProductGalleryProps {
  mainImage: string | null;
  galleryImages: string[] | null;
  productName: string;
}

export const ProductGallery = ({
  mainImage,
  galleryImages,
  productName,
}: ProductGalleryProps) => {
  const allImages = [
    mainImage || "/placeholder.svg",
    ...(galleryImages || []),
  ].filter(Boolean);
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentImage = allImages[selectedIndex];

  const goToNext = () => {
    setSelectedIndex((prev) => (prev + 1) % allImages.length);
  };

  const goToPrev = () => {
    setSelectedIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-noir group border border-cream/10 shadow-2xl">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-primary/30 rounded-tl-2xl pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-primary/30 rounded-tr-2xl pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-primary/30 rounded-bl-2xl pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-primary/30 rounded-br-2xl pointer-events-none z-10" />
        
        <AnimatePresence mode="wait">
          <motion.img
            key={selectedIndex}
            src={currentImage}
            alt={`${productName} - Image ${selectedIndex + 1}`}
            className="w-full h-full object-cover cursor-zoom-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsZoomed(true)}
          />
        </AnimatePresence>

        {/* Zoom Button */}
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-noir/80 hover:bg-noir text-cream border border-cream/20 rounded-full"
          onClick={() => setIsZoomed(true)}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        {/* Navigation Arrows */}
        {allImages.length > 1 && (
          <>
            <Button
              size="icon"
              variant="secondary"
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-noir/80 hover:bg-noir text-cream border border-cream/20 rounded-full"
              onClick={goToPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-noir/80 hover:bg-noir text-cream border border-cream/20 rounded-full"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-noir/80 text-cream px-4 py-1.5 rounded-full text-sm border border-cream/20 backdrop-blur-sm">
            {selectedIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allImages.map((image, index) => (
            <motion.button
              key={index}
              onClick={() => setSelectedIndex(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                index === selectedIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-cream/10 hover:border-cream/30"
              }`}
            >
              <img
                src={image}
                alt={`${productName} - Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-5xl w-full h-[90vh] p-0 bg-noir/98 border-cream/10">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 text-cream hover:bg-cream/10 z-10 rounded-full"
              onClick={() => setIsZoomed(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            <AnimatePresence mode="wait">
              <motion.img
                key={selectedIndex}
                src={currentImage}
                alt={productName}
                className="max-w-full max-h-full object-contain"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              />
            </AnimatePresence>

            {allImages.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-cream hover:bg-cream/10 rounded-full"
                  onClick={goToPrev}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-cream hover:bg-cream/10 rounded-full"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
