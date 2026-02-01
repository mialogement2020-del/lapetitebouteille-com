import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCartContext } from "@/contexts/CartContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { AddressFormData } from "@/components/checkout/AddressForm";
import type { PaymentMethod } from "@/components/checkout/PaymentMethodSelect";

export function useCheckout() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { items, subtotal, clearCart } = useCartContext();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"address" | "payment" | "confirmation">("address");
  const [addressData, setAddressData] = useState<AddressFormData | null>(null);

  const deliveryFee = subtotal >= 50000 ? 0 : 2000;

  const handleAddressSubmit = async (data: AddressFormData) => {
    setAddressData(data);

    // Save address for authenticated users
    if (user?.id) {
      try {
        const cityLabel = data.city === "yaounde" ? "Yaoundé" : "Douala";
        
        await supabase.from("addresses").upsert({
          user_id: user.id,
          full_name: data.fullName,
          phone: data.phone,
          city: cityLabel,
          neighborhood: data.neighborhood,
          street_address: data.streetAddress,
          additional_info: data.additionalInfo || null,
          is_default: true,
        }, {
          onConflict: "user_id,is_default",
        });
      } catch (error) {
        console.error("Failed to save address:", error);
      }
    }

    setStep("payment");
  };

  const handlePaymentSubmit = async (method: PaymentMethod, phone?: string) => {
    if (!addressData || items.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const cityLabel = addressData.city === "yaounde" ? "Yaoundé" : "Douala";
      const total = subtotal + deliveryFee;

      // Generate order number
      const { data: orderNumberData } = await supabase
        .rpc("generate_order_number");

      const orderNumber = orderNumberData || `CMD-${Date.now()}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id || null,
          order_number: orderNumber,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: "pending",
          payment_method: method,
          payment_status: method === "cash_on_delivery" ? "pending" : "pending",
          shipping_full_name: addressData.fullName,
          shipping_phone: addressData.phone,
          shipping_city: cityLabel,
          shipping_neighborhood: addressData.neighborhood,
          shipping_street: addressData.streetAddress,
          shipping_notes: addressData.additionalInfo || null,
          guest_phone: !user?.id ? addressData.phone : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product?.name || "Produit",
        product_image: item.product?.image_url || null,
        quantity: item.quantity,
        unit_price: item.product?.price || 0,
        total_price: (item.product?.price || 0) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      await clearCart();

      // For mobile money, we would integrate with payment gateway here
      // For now, redirect to confirmation
      toast({
        title: "Commande confirmée !",
        description: `Votre commande ${orderNumber} a été enregistrée.`,
      });

      setStep("confirmation");
      navigate(`/commande-confirmee?order=${orderNumber}`);

    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la commande",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    step,
    setStep,
    addressData,
    isLoading,
    handleAddressSubmit,
    handlePaymentSubmit,
  };
}
