import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCartContext } from "@/contexts/CartContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { AddressFormData } from "@/components/checkout/AddressForm";
import type { PaymentMethod } from "@/components/checkout/PaymentMethodSelect";
import type { AppliedCode } from "@/components/checkout/UnifiedCodeInput";
import { useProductReferral } from "@/hooks/useProductReferral";

// Generate MLM commissions using atomic server-side function
async function generateMLMCommissions(orderId: string, referrerId: string, orderTotal: number) {
  try {
    const { data, error } = await supabase.rpc('generate_mlm_commissions', {
      _order_id: orderId,
      _referrer_id: referrerId,
      _order_total: orderTotal
    });

    if (error) {
      console.error('Commission generation error:', error);
      return { success: false, error: error.message };
    }

    // Type-safe response handling
    const result = data as { success?: boolean; error?: string; commissions?: unknown[] } | null;
    if (result && !result.success) {
      console.error('Commission generation failed:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, commissions: result?.commissions || [] };
  } catch (error: any) {
    console.error('Error generating commissions:', error);
    return { success: false, error: error.message };
  }
}

interface GiftPackagingOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  display_order: number | null;
}

export function useCheckout() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { items, subtotal, clearCart } = useCartContext();
  const { getStoredReferralCode, clearStoredReferralCode } = useProductReferral();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"address" | "payment" | "confirmation">("address");
  const [addressData, setAddressData] = useState<AddressFormData | null>(null);
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null);
  const [giftPackaging, setGiftPackaging] = useState<GiftPackagingOption | null>(null);
  const [giftMessage, setGiftMessage] = useState("");
  const [autoReferralApplied, setAutoReferralApplied] = useState(false);

  // Auto-apply stored referral code from product links
  const applyStoredReferralCode = useCallback(async () => {
    // Don't apply if already applied or if there's already a code
    if (autoReferralApplied || appliedCode) return;
    
    const storedCode = getStoredReferralCode();
    if (!storedCode) return;

    try {
      // Validate the referral code
      const { data, error } = await supabase.rpc('validate_referral_code', {
        _code: storedCode
      });

      // Type-safe response handling
      const result = data as { is_valid?: boolean; code?: string } | null;
      
      if (error || !result?.is_valid) {
        // Invalid code, clear it
        clearStoredReferralCode();
        return;
      }

      // Get referrer ID for the applied code
      const { data: referrerId } = await supabase.rpc('get_referrer_id_from_code', {
        _code: storedCode
      });

      // Apply the referral code automatically
      setAppliedCode({
        type: "referral",
        data: {
          code: storedCode,
          referrerId: referrerId || "",
        },
      });

      setAutoReferralApplied(true);

      toast({
        title: "🎁 Code de parrainage appliqué",
        description: "Un ami vous a recommandé ! Son parrainage a été pris en compte.",
      });
    } catch (error) {
      console.error("Error applying stored referral:", error);
      clearStoredReferralCode();
    }
  }, [autoReferralApplied, appliedCode, getStoredReferralCode, clearStoredReferralCode]);

  // Check for stored referral on mount
  useEffect(() => {
    applyStoredReferralCode();
  }, [applyStoredReferralCode]);

  const deliveryFee = subtotal >= 50000 ? 0 : 2000;
  const discountAmount = appliedCode?.type === "promo" ? appliedCode.data.discountAmount : 0;
  const giftPackagingPrice = giftPackaging?.price || 0;

  const handleCodeApply = (code: AppliedCode) => {
    setAppliedCode(code);
  };

  const handleCodeRemove = () => {
    setAppliedCode(null);
  };

  const handleGiftPackagingChange = (option: GiftPackagingOption | null) => {
    setGiftPackaging(option);
  };

  const handleGiftMessageChange = (message: string) => {
    setGiftMessage(message);
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
      // Resolve the authenticated user at submit time so RLS receives the
      // exact user_id even if the React auth context is still hydrating.
      const { data: sessionData } = await supabase.auth.getSession();
      const checkoutUserId = user?.id ?? sessionData.session?.user?.id ?? null;

      // Use city directly as it's now stored with proper capitalization
      const cityLabel = addressData.city;
      const total = subtotal - discountAmount + giftPackagingPrice + deliveryFee;

      // Generate order number
      const { data: orderNumberData } = await supabase
        .rpc("generate_order_number");

      const orderNumber = orderNumberData || `CMD-${Date.now()}`;

      // Determine referrer_id and referral_code_used
      let referrerId: string | null = null;
      let referralCodeUsed: string | null = null;
      let promoCodeUsed: string | null = null;

      if (appliedCode?.type === "referral") {
        referralCodeUsed = appliedCode.data.code;
        
        // Securely resolve referrer_id from code using server-side function
        const { data: resolvedReferrerId, error: resolveError } = await supabase
          .rpc('get_referrer_id_from_code', { _code: referralCodeUsed });
        
        if (resolveError) {
          console.error('Error resolving referrer:', resolveError);
        } else {
          referrerId = resolvedReferrerId;
        }
      } else if (appliedCode?.type === "promo") {
        promoCodeUsed = appliedCode.data.code;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: checkoutUserId,
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
          guest_email: !user?.id ? addressData.email?.trim() || null : null,
          guest_phone: !user?.id ? addressData.phone : null,
          referral_code_used: referralCodeUsed || promoCodeUsed || null,
          referrer_id: referrerId,
          gift_packaging_id: giftPackaging?.id || null,
          gift_message: giftMessage || null,
          gift_packaging_price: giftPackagingPrice,
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

      // Send confirmation email - for both guests and authenticated users
      try {
        // The edge function now securely fetches order data from the database
        const emailResponse = await supabase.functions.invoke('send-order-confirmation', {
          body: {
            orderNumber,
          },
        });
        
        if (emailResponse.error) {
          console.warn('Email confirmation failed:', emailResponse.error);
        }
      } catch (emailError) {
        console.warn('Failed to send confirmation email:', emailError);
        // Don't fail the order if email fails
      }

      // Send push notification for order confirmation if user is authenticated
      if (checkoutUserId) {
        try {
          await supabase.functions.invoke('send-order-push-notification', {
            body: {
              userId: checkoutUserId,
              orderNumber,
              status: 'confirmed',
              customerName: addressData.fullName,
            },
          });
        } catch (pushError) {
          console.warn('Failed to send push notification:', pushError);
        }
      }

      // Clear cart and stored referral code
      await clearCart();
      clearStoredReferralCode();

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
    giftPackaging,
    giftMessage,
    handleCodeApply,
    handleCodeRemove,
    handleGiftPackagingChange,
    handleGiftMessageChange,
    handleAddressSubmit,
    handlePaymentSubmit,
  };
}
