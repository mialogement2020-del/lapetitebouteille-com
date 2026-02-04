import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          isAuthenticated: !!session?.user,
        });
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        isAuthenticated: !!session?.user,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    options?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      dateOfBirth?: string;
      referralCode?: string;
    }
  ) => {
    // Convert DD/MM/YYYY to YYYY-MM-DD for storage
    let isoDateOfBirth: string | undefined;
    if (options?.dateOfBirth) {
      const parts = options.dateOfBirth.split("/");
      if (parts.length === 3) {
        isoDateOfBirth = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Verify age if date of birth is provided
    if (isoDateOfBirth) {
      const birthDate = new Date(isoDateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        return { error: { message: "Vous devez avoir au moins 18 ans pour vous inscrire." } };
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: options?.firstName,
          last_name: options?.lastName,
          phone: options?.phone,
          date_of_birth: isoDateOfBirth,
          referral_code_used: options?.referralCode,
        },
      },
    });

    if (error) {
      return { error };
    }

    // If signup successful and we have a user, create profile
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        first_name: options?.firstName ?? null,
        last_name: options?.lastName ?? null,
        phone: options?.phone ?? null,
        date_of_birth: isoDateOfBirth ?? null,
        is_age_verified: !!isoDateOfBirth,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      // Handle referral code using secure server-side function
      if (options?.referralCode) {
        await processReferralCodeSecure(options.referralCode);
      }
    }

    return { data, error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  }, []);

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
}

// Secure server-side referral code processing using RPC
async function processReferralCodeSecure(code: string) {
  try {
    // Sanitize input - only allow alphanumeric, hyphen, underscore
    const sanitizedCode = code.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // If sanitization changed the code, it's invalid
    if (sanitizedCode !== code || !sanitizedCode) {
      console.error("Invalid referral code format");
      return;
    }

    // Use secure server-side function to create referral relationship
    const { data, error } = await supabase.rpc('create_referral_relationship', {
      _referral_code: sanitizedCode
    });

    if (error) {
      console.error("Error processing referral code:", error);
      return;
    }

    // Type-safe check for response
    const result = data as { success?: boolean; error?: string } | null;
    if (result && !result.success) {
      console.warn("Referral code processing failed:", result.error);
    }
  } catch (error) {
    console.error("Error processing referral code:", error);
  }
}
