import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const REFERRAL_STORAGE_KEY = "product_referral_code";
const REFERRAL_EXPIRY_KEY = "product_referral_expiry";
const REFERRAL_EXPIRY_HOURS = 72;

/**
 * Short link redirect page.
 * Captures the referral code from /r/:code and redirects to the homepage.
 */
export default function ShortLinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (code) {
      // Validate code format
      if (/^[A-Za-z0-9_-]+$/.test(code)) {
        // Store the referral code
        const expiresAt = Date.now() + REFERRAL_EXPIRY_HOURS * 60 * 60 * 1000;
        try {
          sessionStorage.setItem(REFERRAL_STORAGE_KEY, code);
          sessionStorage.setItem(REFERRAL_EXPIRY_KEY, expiresAt.toString());
        } catch {
          console.warn("Could not store referral code");
        }

        // Track the click (fire and forget)
        trackClick(code);
      }
    }

    // Redirect after a brief moment
    const timer = setTimeout(() => setShouldRedirect(true), 500);
    return () => clearTimeout(timer);
  }, [code]);

  // Track click via edge function
  const trackClick = async (refCode: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/track-referral-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: refCode }),
      });
    } catch {
      // Silent fail - tracking is non-critical
    }
  };

  if (shouldRedirect) {
    return <Navigate to="/catalogue" replace />;
  }

  return (
    <div className="min-h-screen bg-noir flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
        <p className="text-cream/70 text-lg">Redirection en cours...</p>
        {code && (
          <p className="text-cream/50 text-sm mt-2">
            Code de parrainage : <span className="text-primary font-mono">{code}</span>
          </p>
        )}
      </div>
    </div>
  );
}
