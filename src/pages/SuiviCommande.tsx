import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, Phone, Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface OrderDetails {
  order_number: string;
  status: string;
  total: number;
  shipping_full_name: string;
  shipping_city: string;
  shipping_neighborhood: string | null;
  shipping_street: string | null;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    product_image: string | null;
  }>;
}

const STATUS_CONFIG: Record<string, { key: string; color: string; icon: any; step: number }> = {
  pending: { key: "pending", color: "text-yellow-500", icon: Clock, step: 1 },
  confirmed: { key: "confirmed", color: "text-blue-500", icon: CheckCircle2, step: 2 },
  processing: { key: "processing", color: "text-purple-500", icon: Package, step: 3 },
  shipped: { key: "shipped", color: "text-orange-500", icon: Truck, step: 4 },
  delivered: { key: "delivered", color: "text-green-500", icon: CheckCircle2, step: 5 },
  cancelled: { key: "cancelled", color: "text-red-500", icon: XCircle, step: 0 },
};

const STEPS = [
  { key: "pending" },
  { key: "confirmed" },
  { key: "processing" },
  { key: "shipped" },
  { key: "delivered" },
];

export default function SuiviCommande() {
  const { t, i18n } = useTranslation();
  const [searchMethod, setSearchMethod] = useState<"phone" | "email">("phone");
  const [orderNumber, setOrderNumber] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOrder(null);

    if (!orderNumber.trim() || !identifier.trim()) {
      setError(t("trackOrder.fillAllFields"));
      return;
    }

    setIsLoading(true);

    try {
      // Use the secure lookup_guest_order function that validates credentials
      const { data, error: rpcError } = await supabase.rpc("lookup_guest_order", {
        _order_number: orderNumber.trim(),
        _identifier: identifier.trim(),
        _method: searchMethod,
      });

      if (rpcError) {
        console.error("Search error:", rpcError);
        setError(t("trackOrder.searchError"));
        return;
      }

      // Parse the JSONB response
      const result = data as { success: boolean; error?: string; order?: any; items?: any[] };

      if (!result.success) {
        setError(
          result.error ||
            (searchMethod === "phone"
              ? t("trackOrder.notFoundPhone")
              : t("trackOrder.notFoundEmail"))
        );
        return;
      }

      // Set order data from secure function response
      setOrder({
        order_number: result.order.order_number,
        status: result.order.status,
        total: result.order.total,
        shipping_full_name: result.order.shipping_full_name,
        shipping_city: result.order.shipping_city,
        shipping_neighborhood: result.order.shipping_neighborhood,
        shipping_street: result.order.shipping_street,
        created_at: result.order.created_at,
        items: result.items || [],
      });

      toast({
        title: t("trackOrder.foundTitle"),
        description: t("trackOrder.foundDesc", { order: result.order.order_number }),
      });
    } catch (err: any) {
      console.error("Search error:", err);
      setError(t("trackOrder.genericError"));
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "fr-FR").format(price) + " FCFA";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === "en" ? "en-US" : "fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusConfig = order ? STATUS_CONFIG[order.status] || STATUS_CONFIG.pending : null;

  return (
    <div className="min-h-screen bg-noir">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-cream/60 hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("trackOrder.back")}
          </Link>

          <div className="max-w-2xl mx-auto">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-noir" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-cream mb-2">
                {t("trackOrder.title")}
              </h1>
              <p className="text-cream/60">
                {t("trackOrder.subtitle")}
              </p>
            </motion.div>

            {/* Search Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-noir-light/50 rounded-xl border border-gold/20 p-6 md:p-8 mb-8"
            >
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber" className="text-cream">
                    {t("trackOrder.orderNumber")}
                  </Label>
                  <Input
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder={t("trackOrder.orderNumberPlaceholder")}
                    className="bg-noir/50 border-gold/30 text-cream placeholder:text-cream/40"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-cream">{t("trackOrder.verifyMethod")}</Label>
                  <RadioGroup
                    value={searchMethod}
                    onValueChange={(v) => setSearchMethod(v as "phone" | "email")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="phone" id="phone" className="border-gold/30" />
                      <Label htmlFor="phone" className="text-cream/80 cursor-pointer flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {t("trackOrder.phone")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="email" id="email" className="border-gold/30" />
                      <Label htmlFor="email" className="text-cream/80 cursor-pointer flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t("trackOrder.email")}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-cream">
                    {searchMethod === "phone" ? t("trackOrder.phoneLabel") : t("trackOrder.emailLabel")}
                  </Label>
                  <Input
                    id="identifier"
                    type={searchMethod === "phone" ? "tel" : "email"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={searchMethod === "phone" ? t("trackOrder.phonePlaceholder") : t("trackOrder.emailPlaceholder")}
                    className="bg-noir/50 border-gold/30 text-cream placeholder:text-cream/40"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-gold text-noir font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-noir border-t-transparent" />
                      {t("trackOrder.searching")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      {t("trackOrder.searchBtn")}
                    </span>
                  )}
                </Button>
              </form>
            </motion.div>

            {/* Order Details */}
            {order && statusConfig && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Status Card */}
                <div className="bg-noir-light/50 rounded-xl border border-gold/20 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-cream/60 text-sm">{t("trackOrder.orderLabel")}</p>
                      <p className="text-primary font-semibold text-lg">{order.order_number}</p>
                    </div>
                    <div className={`flex items-center gap-2 ${statusConfig.color}`}>
                      <statusConfig.icon className="h-5 w-5" />
                      <span className="font-medium">{t(`trackOrder.status.${statusConfig.key}`)}</span>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  {order.status !== "cancelled" && (
                    <div className="relative">
                      <div className="flex justify-between mb-2">
                        {STEPS.map((step, index) => {
                          const isActive = statusConfig.step >= index + 1;
                          const isCurrent = statusConfig.step === index + 1;
                          return (
                            <div key={step.key} className="flex flex-col items-center flex-1">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isActive
                                    ? "bg-primary text-noir"
                                    : "bg-cream/10 text-cream/40"
                                } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-noir" : ""}`}
                              >
                                {isActive ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <span className="text-xs">{index + 1}</span>
                                )}
                              </div>
                              <span
                                className={`text-xs mt-2 text-center ${
                                  isActive ? "text-primary" : "text-cream/40"
                                }`}
                              >
                                {t(`trackOrder.stepLabel.${step.key}`)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Progress Line */}
                      <div className="absolute top-4 left-4 right-4 h-0.5 bg-cream/10 -z-10">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${((statusConfig.step - 1) / (STEPS.length - 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Info */}
                <div className="bg-noir-light/50 rounded-xl border border-gold/20 p-6">
                  <h3 className="font-display text-lg text-cream mb-4">{t("trackOrder.detailsTitle")}</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-cream/60">{t("trackOrder.date")}</span>
                      <span className="text-cream">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cream/60">{t("trackOrder.recipient")}</span>
                      <span className="text-cream">{order.shipping_full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cream/60">{t("trackOrder.address")}</span>
                      <span className="text-cream text-right">
                        {order.shipping_city}
                        {order.shipping_neighborhood && `, ${order.shipping_neighborhood}`}
                      </span>
                    </div>
                    <div className="border-t border-gold/20 pt-3 flex justify-between">
                      <span className="text-cream font-medium">{t("trackOrder.total")}</span>
                      <span className="text-primary font-semibold">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                {order.items.length > 0 && (
                  <div className="bg-noir-light/50 rounded-xl border border-gold/20 p-6">
                    <h3 className="font-display text-lg text-cream mb-4">{t("trackOrder.itemsTitle")}</h3>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-cream/5 overflow-hidden flex-shrink-0">
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-cream/20" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-cream truncate">{item.product_name}</p>
                              <p className="text-muted-foreground text-sm">
                                {item.quantity} × {formatPrice(item.unit_price)}
                              </p>
                            </div>
                          <p className="text-primary font-medium">
                            {formatPrice(item.quantity * item.unit_price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Support */}
                <div className="text-center">
                  <p className="text-cream/50 text-sm">
                    {t("trackOrder.supportQuestions")}{" "}
                    <a href="tel:+237600000000" className="text-primary hover:underline">
                      +237 6 XX XX XX XX
                    </a>
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
