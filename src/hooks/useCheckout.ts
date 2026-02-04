import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCartContext } from "@/contexts/CartContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { AddressFormData } from "@/components/checkout/AddressForm";
import type { PaymentMethod } from "@/components/checkout/PaymentMethodSelect";
import type { AppliedCode } from "@/components/checkout/UnifiedCodeInput";

// Commission rates for each level
const COMMISSION_RATES = [
  { level: 1, rate: 8 },
  { level: 2, rate: 4 },
  { level: 3, rate: 2 },
];

// Function to generate MLM commissions for all levels
async function generateMLMCommissions(orderId: string, referrerId: string, orderTotal: number) {
  let currentReferrerId: string | null = referrerId;
  
  for (const { level, rate } of COMMISSION_RATES) {
    if (!currentReferrerId) break;

    // Check if this referrer has a bonus rate from their rank
    const { data: userRank } = await supabase
      .from("user_ranks")
      .select("current_rank")
      .eq("user_id", currentReferrerId)
      .single();

    let bonusRate = 0;
    if (userRank?.current_rank) {
      const { data: rankConfig } = await supabase
        .from("rank_config")
        .select("bonus_percentage")
        .eq("rank", userRank.current_rank)
        .single();
      bonusRate = rankConfig?.bonus_percentage || 0;
    }

    const effectiveRate = rate + (level === 1 ? bonusRate : 0);
    const commissionAmount = (orderTotal * effectiveRate) / 100;

    // Create the commission record
    await supabase.from("commissions").insert({
      order_id: orderId,
      beneficiary_id: currentReferrerId,
      level,
      commission_rate: effectiveRate,
      bonus_rate: level === 1 ? bonusRate : 0,
      order_amount: orderTotal,
      commission_amount: commissionAmount,
      status: "pending",
    });

    // Update wallet pending balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, pending_balance")
      .eq("user_id", currentReferrerId)
      .single();

    if (wallet) {
      await supabase
        .from("wallets")
        .update({
          pending_balance: (wallet.pending_balance || 0) + commissionAmount,
        })
        .eq("id", wallet.id);

      // Create wallet transaction
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: currentReferrerId,
        type: "commission",
        amount: commissionAmount,
        balance_after: (wallet.pending_balance || 0) + commissionAmount,
        reference_type: "order",
        reference_id: orderId,
        description: `Commission niveau ${level} (${effectiveRate}%)`,
      });
    }

    // Get the next referrer up the chain
    const { data: relationship } = await supabase
      .from("referral_relationships")
      .select("referrer_id")
      .eq("referred_id", currentReferrerId)
      .eq("level", 1)
      .single();

    currentReferrerId = relationship?.referrer_id || null;
  }
}

export function useCheckout() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { items, subtotal, clearCart } = useCartContext();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"address" | "payment" | "confirmation">("address");
  const [addressData, setAddressData] = useState<AddressFormData | null>(null);
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null);

  const deliveryFee = subtotal >= 50000 ? 0 : 2000;
  const discountAmount = appliedCode?.type === "promo" ? appliedCode.data.discountAmount : 0;

  const handleCodeApply = (code: AppliedCode) => {
    setAppliedCode(code);
  };

  const handleCodeRemove = () => {
    setAppliedCode(null);
  };

  const handleAddressSubmit = async (data: AddressFormData) => {
    setAddressData(data);
    // Address saving is now handled in the AddressForm component
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
      // Use city directly as it's now stored with proper capitalization
      const cityLabel = addressData.city;
      const total = subtotal - discountAmount + deliveryFee;

      // Generate order number
      const { data: orderNumberData } = await supabase
        .rpc("generate_order_number");

      const orderNumber = orderNumberData || `CMD-${Date.now()}`;

      // Determine referrer_id and referral_code_used
      let referrerId: string | null = null;
      let referralCodeUsed: string | null = null;
      let promoCodeUsed: string | null = null;

      if (appliedCode?.type === "referral") {
        referrerId = appliedCode.data.referrerId;
        referralCodeUsed = appliedCode.data.code;
      } else if (appliedCode?.type === "promo") {
        promoCodeUsed = appliedCode.data.code;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id || null,
          order_number: orderNumber,
          subtotal,
          delivery_fee: deliveryFee,
          discount_amount: discountAmount,
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
          referral_code_used: referralCodeUsed || promoCodeUsed || null,
          referrer_id: referrerId,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Increment promo code usage count if applied
      if (appliedCode?.type === "promo") {
        const { data: promoData } = await supabase
          .from("promo_codes")
          .select("used_count")
          .eq("code", appliedCode.data.code)
          .single();
        
        if (promoData) {
          await supabase
            .from("promo_codes")
            .update({ used_count: (promoData.used_count || 0) + 1 })
            .eq("code", appliedCode.data.code);
        }
      }

      // If referral code was used, update referral_codes stats
      if (appliedCode?.type === "referral") {
        const { data: refData } = await supabase
          .from("referral_codes")
          .select("total_orders, total_revenue")
          .eq("code", appliedCode.data.code)
          .single();
        
        if (refData) {
          await supabase
            .from("referral_codes")
            .update({
              total_orders: (refData.total_orders || 0) + 1,
              total_revenue: (refData.total_revenue || 0) + total,
            })
            .eq("code", appliedCode.data.code);
        }

        // Generate commissions for MLM (multi-level)
        await generateMLMCommissions(order.id, referrerId!, total);
      }

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

      // Send confirmation email if email is provided
      const customerEmail = addressData.email?.trim();
      if (customerEmail) {
        try {
          const emailResponse = await supabase.functions.invoke('send-order-confirmation', {
            body: {
              email: customerEmail,
              orderNumber,
              customerName: addressData.fullName,
              items: orderItems.map(item => ({
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
              })),
              subtotal,
              discountAmount,
              promoCode: appliedCode?.type === "promo" ? appliedCode.data.code : undefined,
              deliveryFee,
              total,
              shippingAddress: {
                city: cityLabel,
                neighborhood: addressData.neighborhood || '',
                street: addressData.streetAddress,
                phone: addressData.phone,
              },
              paymentMethod: method,
            },
          });
          
          if (emailResponse.error) {
            console.warn('Email confirmation failed:', emailResponse.error);
          }
        } catch (emailError) {
          console.warn('Failed to send confirmation email:', emailError);
          // Don't fail the order if email fails
        }
      }

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
    appliedCode,
    handleCodeApply,
    handleCodeRemove,
    handleAddressSubmit,
    handlePaymentSubmit,
  };
}
