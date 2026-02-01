import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Address = Tables<"addresses">;

export function useAddresses() {
  const { user } = useAuthContext();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const addAddress = useCallback(async (address: Omit<Address, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!user) return { error: { message: "Non authentifié" } };

    try {
      // If this is the first address or is_default is true, set all others to false
      if (address.is_default) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase
        .from("addresses")
        .insert({
          ...address,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchAddresses();
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }, [user, fetchAddresses]);

  const updateAddress = useCallback(async (id: string, updates: Partial<Address>) => {
    if (!user) return { error: { message: "Non authentifié" } };

    try {
      // If setting as default, unset all others first
      if (updates.is_default) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { error } = await supabase
        .from("addresses")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      await fetchAddresses();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }, [user, fetchAddresses]);

  const deleteAddress = useCallback(async (id: string) => {
    if (!user) return { error: { message: "Non authentifié" } };

    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      await fetchAddresses();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }, [user, fetchAddresses]);

  const setDefaultAddress = useCallback(async (id: string) => {
    return updateAddress(id, { is_default: true });
  }, [updateAddress]);

  return {
    addresses,
    loading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refetch: fetchAddresses,
  };
}
