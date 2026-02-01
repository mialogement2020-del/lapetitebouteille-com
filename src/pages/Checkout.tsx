import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingBag, MapPin, CreditCard, Check } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { AddressForm } from "@/components/checkout/AddressForm";
import { PaymentMethodSelect } from "@/components/checkout/PaymentMethodSelect";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { useCartContext } from "@/contexts/CartContext";
import { useCheckout } from "@/hooks/useCheckout";

const STEPS = [
  { id: "address", label: "Livraison", icon: MapPin },
  { id: "payment", label: "Paiement", icon: CreditCard },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, isLoading: cartLoading } = useCartContext();
  const {
    step,
    setStep,
    isLoading,
    handleAddressSubmit,
    handlePaymentSubmit,
  } = useCheckout();

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && items.length === 0) {
      navigate("/catalogue");
    }
  }, [items, cartLoading, navigate]);

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-noir flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen bg-noir">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Link */}
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-2 text-cream/60 hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au catalogue
          </Link>

          {/* Page Title */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-noir" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-cream">Finaliser ma commande</h1>
              <p className="text-cream/60">Livraison express à Yaoundé et Douala</p>
            </div>
          </div>

          {/* Steps Indicator */}
          <div className="flex items-center gap-4 mb-10">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => index < currentStepIndex && setStep(s.id as any)}
                  disabled={index > currentStepIndex}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    index === currentStepIndex
                      ? "bg-primary text-noir font-semibold"
                      : index < currentStepIndex
                      ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                      : "bg-cream/10 text-cream/40"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <s.icon className="h-4 w-4" />
                  )}
                  <span className="text-sm">{s.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      index < currentStepIndex ? "bg-primary" : "bg-cream/20"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Forms Column */}
            <div className="lg:col-span-2">
              <div className="bg-noir-light/50 rounded-xl border border-gold/20 p-6 md:p-8">
                <AnimatePresence mode="wait">
                  {step === "address" && (
                    <motion.div
                      key="address"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <AddressForm onSubmit={handleAddressSubmit} isLoading={isLoading} />
                    </motion.div>
                  )}

                  {step === "payment" && (
                    <motion.div
                      key="payment"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => setStep("address")}
                        className="mb-4 text-cream/60 hover:text-primary"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Modifier l'adresse
                      </Button>
                      <PaymentMethodSelect onSubmit={handlePaymentSubmit} isLoading={isLoading} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-1">
              <OrderSummary />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
