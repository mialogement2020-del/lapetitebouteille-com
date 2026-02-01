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
    // Verify age if date of birth is provided
    if (options?.dateOfBirth) {
      const birthDate = new Date(options.dateOfBirth);
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
          date_of_birth: options?.dateOfBirth,
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
        date_of_birth: options?.dateOfBirth ?? null,
        is_age_verified: !!options?.dateOfBirth,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      // Handle referral code if provided
      if (options?.referralCode) {
        await processReferralCode(data.user.id, options.referralCode);
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

async function processReferralCode(userId: string, code: string) {
  try {
    // Find the referrer by code
    const { data: referralCode } = await supabase
      .from("referral_codes")
      .select("user_id, total_signups")
      .or(`code.eq.${code},custom_code.eq.${code}`)
      .eq("is_active", true)
      .single();

    if (referralCode && referralCode.user_id !== userId) {
      // Create the referral relationship
      await supabase.from("referral_relationships").insert({
        referrer_id: referralCode.user_id,
        referred_id: userId,
        referral_code_used: code,
        level: 1,
      });

      // Update referral code stats
      await supabase
        .from("referral_codes")
        .update({ total_signups: (referralCode.total_signups || 0) + 1 })
        .eq("user_id", referralCode.user_id);
    }
  } catch (error) {
    console.error("Error processing referral code:", error);
  }
}
