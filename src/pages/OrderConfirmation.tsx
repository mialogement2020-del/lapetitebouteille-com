import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Package, Truck, Phone, ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order");
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-noir">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-8"
            >
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="font-display text-4xl text-cream mb-4">
                {t("orderConfirmation.title")}
              </h1>
              <p className="text-cream/60 text-lg mb-2">
                {t("orderConfirmation.thanks")}
              </p>
              {orderNumber && (
                <p className="text-primary font-semibold text-xl mb-8">
                  {t("orderConfirmation.orderNumberPrefix")} {orderNumber}
                </p>
              )}
            </motion.div>

            {/* Order Status Steps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-cream/5 rounded-xl border border-gold/20 p-6 mb-8"
            >
              <h2 className="font-display text-xl text-cream mb-6">
                {t("orderConfirmation.nextSteps")}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-cream">{t("orderConfirmation.preparingTitle")}</p>
                    <p className="text-sm text-cream/60">
                      {t("orderConfirmation.preparingDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="h-5 w-5 text-cream/60" />
                  </div>
                  <div>
                    <p className="font-medium text-cream/60">{t("orderConfirmation.deliveryTitle")}</p>
                    <p className="text-sm text-cream/40">
                      {t("orderConfirmation.deliveryDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-cream/60" />
                  </div>
                  <div>
                    <p className="font-medium text-cream/60">{t("orderConfirmation.smsTitle")}</p>
                    <p className="text-sm text-cream/40">
                      {t("orderConfirmation.smsDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/catalogue">
                <Button className="bg-gradient-gold text-noir font-semibold gap-2">
                  {t("orderConfirmation.continueShopping")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/suivi-commande">
                <Button variant="outline" className="border-gold/30 text-cream hover:bg-cream/10 gap-2">
                  <Package className="h-4 w-4" />
                  {t("orderConfirmation.trackOrder")}
                </Button>
              </Link>
            </motion.div>

            {/* Contact Info */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-cream/50 text-sm mt-8"
            >
              {t("orderConfirmation.questions")}{" "}
              <a href="tel:+237674069458" className="text-primary hover:underline">
                +237 674 069 458
              </a>
            </motion.p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
