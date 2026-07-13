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
import type { Json } from "@/integrations/supabase/types";

interface GiftPackagingOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  display_order: number | null;
}

interface CheckoutRpcResponse {
  success?: boolean;
  order_id?: string;
  order_number?: string;
  total?: number;
  error?: string;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Une erreur est survenue lors de la commande";

export function useCheckout() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { items, clearCart } = useCartContext();
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
      const cartPayload = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        packaging_option_id: item.packaging_option_id || null,
      }));

      const { data: rpcData, error: rpcError } = await supabase.rpc("create_order_from_checkout", {
        _cart_items: cartPayload as Json,
        _address: {
          fullName: addressData.fullName,
          email: addressData.email || "",
          phone: addressData.phone,
          paymentPhone: phone || "",
          city: addressData.city,
          neighborhood: addressData.neighborhood || "",
          streetAddress: addressData.streetAddress,
          additionalInfo: addressData.additionalInfo || "",
        } as Json,
        _payment_method: method,
        _code_type: appliedCode?.type ?? null,
        _code: appliedCode?.data.code ?? null,
        _gift_packaging_id: giftPackaging?.id ?? null,
        _gift_message: giftMessage || null,
      });

      if (rpcError) throw rpcError;

      const result = rpcData as CheckoutRpcResponse | null;
      if (!result?.success || !result.order_number || !result.order_id) {
        throw new Error(result?.error || "La commande n'a pas pu etre creee");
      }

      const orderNumber = result.order_number;

      if (method === "mtn_money" || method === "orange_money") {
        const paymentResponse = await supabase.functions.invoke("initiate-mobile-money-payment", {
          body: {
            orderId: result.order_id,
            paymentMethod: method,
            paymentPhone: phone || addressData.phone,
          },
        });

        if (paymentResponse.error) {
          throw paymentResponse.error;
        }
      }

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
      if (user?.id) {
        try {
          await supabase.functions.invoke('send-order-push-notification', {
            body: {
              userId: user.id,
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

    } catch (error: unknown) {
      console.error("Checkout error:", error);
      toast({
        title: "Erreur",
        description: getErrorMessage(error),
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
