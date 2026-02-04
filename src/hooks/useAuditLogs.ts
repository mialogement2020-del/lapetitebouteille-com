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
  page?: number;
  dateFrom?: Date;
  dateTo?: Date;
  userEmail?: string;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [uniqueUsers, setUniqueUsers] = useState<string[]>([]);

  const { entityType, action, limit = 20, page = 1, dateFrom, dateTo, userEmail } = options;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("admin_audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      if (action) {
        query = query.eq("action", action);
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }
      if (userEmail) {
        query = query.eq("user_email", userEmail);
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
  }, [entityType, action, limit, page, dateFrom, dateTo, userEmail]);

  // Fetch unique users for filter
  const fetchUniqueUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("user_email")
        .not("user_email", "is", null);

      if (error) throw error;

      const emails = [...new Set((data || []).map((d) => d.user_email).filter(Boolean))] as string[];
      setUniqueUsers(emails);
    } catch (error) {
      console.error("Error fetching unique users:", error);
    }
  }, []);

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

  // Fetch data and subscribe to realtime updates
  useEffect(() => {
    fetchLogs();
    fetchUniqueUsers();

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
          if (userEmail && newLog.user_email !== userEmail) return;
          if (dateFrom && new Date(newLog.created_at) < dateFrom) return;
          if (dateTo && new Date(newLog.created_at) > dateTo) return;

          // Only add to first page
          if (page === 1) {
            setLogs((prev) => [newLog, ...prev.slice(0, limit - 1)]);
          }
          setTotalCount((prev) => prev + 1);
          
          // Update unique users if new email (use functional update to avoid stale closure)
          if (newLog.user_email) {
            setUniqueUsers((prev) => {
              if (prev.includes(newLog.user_email!)) return prev;
              return [...prev, newLog.user_email!];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Note: fetchLogs and fetchUniqueUsers are stable callbacks, other deps are filter values
  }, [fetchLogs, fetchUniqueUsers, entityType, action, limit, page, dateFrom, dateTo, userEmail]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    logs,
    isLoading,
    totalCount,
    totalPages,
    currentPage: page,
    uniqueUsers,
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
