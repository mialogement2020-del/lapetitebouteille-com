import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type AuditAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "approve" 
  | "reject" 
  | "restock" 
  | "status_change"
  | "login"
  | "export";

export type AuditEntityType = 
  | "product" 
  | "category" 
  | "order" 
  | "review" 
  | "promo_code" 
  | "user" 
  | "stock"
  | "report"
  | "settings";

interface UseAuditLogsOptions {
  entityType?: AuditEntityType;
  action?: AuditAction;
  limit?: number;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const { entityType, action, limit = 50 } = options;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("admin_audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      if (action) {
        query = query.eq("action", action);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs((data as AuditLog[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, action, limit]);

  // Log an action
  const logAction = useCallback(async (
    actionType: AuditAction,
    entityTypeParam: AuditEntityType,
    entityId?: string,
    entityName?: string,
    oldValues?: Json,
    newValues?: Json
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("admin_audit_logs")
        .insert([{
          user_id: user.id,
          user_email: user.email,
          action: actionType,
          entity_type: entityTypeParam,
          entity_id: entityId || null,
          entity_name: entityName || null,
          old_values: oldValues || null,
          new_values: newValues || null,
          user_agent: navigator.userAgent,
        }]);

      if (error) throw error;
    } catch (error) {
      console.error("Error logging audit action:", error);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("audit-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_audit_logs",
        },
        (payload) => {
          const newLog = payload.new as AuditLog;
          
          // Check filters
          if (entityType && newLog.entity_type !== entityType) return;
          if (action && newLog.action !== action) return;

          setLogs((prev) => [newLog, ...prev.slice(0, limit - 1)]);
          setTotalCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs, entityType, action, limit]);

  return {
    logs,
    isLoading,
    totalCount,
    logAction,
    refetch: fetchLogs,
  };
}

// Export a standalone function for use outside of React components
export async function logAuditAction(
  actionType: AuditAction,
  entityTypeParam: AuditEntityType,
  entityId?: string,
  entityName?: string,
  oldValues?: Json,
  newValues?: Json
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("admin_audit_logs")
      .insert([{
        user_id: user.id,
        user_email: user.email,
        action: actionType,
        entity_type: entityTypeParam,
        entity_id: entityId || null,
        entity_name: entityName || null,
        old_values: oldValues || null,
        new_values: newValues || null,
        user_agent: navigator.userAgent,
      }]);
  } catch (error) {
    console.error("Error logging audit action:", error);
  }
}
