import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

const REFERRAL_STORAGE_KEY = "product_referral_code";
const REFERRAL_EXPIRY_KEY = "product_referral_expiry";
const REFERRAL_EXPIRY_HOURS = 72; // Code valid for 72 hours

interface StoredReferral {
  code: string;
  expiresAt: number;
}

/**
 * Hook to manage product referral tracking.
 * Captures referral codes from product URLs (?ref=CODE) and stores them
 * for automatic application at checkout.
 */
export function useProductReferral() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthContext();

  // Store referral code with expiration
  const storeReferralCode = useCallback((code: string) => {
    const expiresAt = Date.now() + REFERRAL_EXPIRY_HOURS * 60 * 60 * 1000;
    
    try {
      sessionStorage.setItem(REFERRAL_STORAGE_KEY, code);
      sessionStorage.setItem(REFERRAL_EXPIRY_KEY, expiresAt.toString());
    } catch {
      // SessionStorage might be disabled
      console.warn("Could not store referral code");
    }
  }, []);

  // Track click via edge function
  const trackReferralClick = useCallback(async (code: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/track-referral-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch {
      // Silent fail - tracking is non-critical
    }
  }, []);

  // Capture referral code from URL on mount
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      // Validate the code format (alphanumeric, hyphen, underscore)
      if (/^[A-Za-z0-9_-]+$/.test(refCode)) {
        storeReferralCode(refCode);
        // Track the click
        trackReferralClick(refCode);
      }
      
      // Clean the URL (remove ref param)
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("ref");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, storeReferralCode, trackReferralClick]);

  // Get stored referral code (if valid)
  const getStoredReferralCode = useCallback((): string | null => {
    try {
      const code = sessionStorage.getItem(REFERRAL_STORAGE_KEY);
      const expiryStr = sessionStorage.getItem(REFERRAL_EXPIRY_KEY);
      
      if (!code || !expiryStr) return null;
      
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() > expiry) {
        // Expired, clean up
        clearStoredReferralCode();
        return null;
      }
      
      return code;
    } catch {
      return null;
    }
  }, []);

  // Clear stored referral code
  const clearStoredReferralCode = useCallback(() => {
    try {
      sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
      sessionStorage.removeItem(REFERRAL_EXPIRY_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Get the current user's referral code for sharing
  const getUserReferralCode = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from("referral_codes")
        .select("code, custom_code")
        .eq("user_id", user.id)
        .single();
      
      if (error || !data) return null;
      
      return data.custom_code || data.code;
    } catch {
      return null;
    }
  }, [user]);

  // Generate a shareable product link with referral code
  const generateProductReferralLink = useCallback(async (productSlug: string): Promise<string> => {
    const baseUrl = `${window.location.origin}/produit/${productSlug}`;
    const refCode = await getUserReferralCode();
    
    if (refCode) {
      return `${baseUrl}?ref=${refCode}`;
    }
    
    return baseUrl;
  }, [getUserReferralCode]);

  // Check if there's a stored referral (for UI indicators)
  const hasStoredReferral = useCallback((): boolean => {
    return getStoredReferralCode() !== null;
  }, [getStoredReferralCode]);

  return {
    getStoredReferralCode,
    clearStoredReferralCode,
    getUserReferralCode,
    generateProductReferralLink,
    hasStoredReferral,
    storeReferralCode,
  };
}
