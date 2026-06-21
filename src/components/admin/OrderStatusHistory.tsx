import { useTranslation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, ArrowRight, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusHistoryEntry {
  id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

interface OrderStatusHistoryProps {
  orderId: string;
}

const statusLabels: Record<string, string> = {
  pending: t("adminOrders.status.pending"),
  confirmed: t("adminOrders.status.confirmed"),
  processing: t("adminOrders.status.processing"),
  shipped: t("adminOrders.status.shipped"),
  delivered: t("adminOrders.status.delivered"),
  cancelled: t("adminOrders.status.cancelled"),
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-500",
  confirmed: "text-blue-500",
  processing: "text-purple-500",
  shipped: "text-indigo-500",
  delivered: "text-green-500",
  cancelled: "text-red-500",
};

export function OrderStatusHistory({ orderId }: OrderStatusHistoryProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["order-status-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return data as StatusHistoryEntry[];
    },
    enabled: !!orderId,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return t("adminOrders.history.creation");
    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "text-cream/60";
    return statusColors[status] || "text-cream";
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full bg-cream/10" />
        <Skeleton className="h-12 w-full bg-cream/10" />
        <Skeleton className="h-12 w-full bg-cream/10" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-cream/50 text-sm text-center py-4">
        {t("adminOrders.history.noHistory")}
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
      {history.map((entry, index) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-cream/5 border border-gold/10"
        >
          <div className="flex-shrink-0 mt-0.5">
            <Clock className="h-4 w-4 text-cream/40" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${getStatusColor(entry.previous_status)}`}>
                {getStatusLabel(entry.previous_status)}
              </span>
              <ArrowRight className="h-3 w-3 text-cream/40" />
              <span className={`text-sm font-medium ${getStatusColor(entry.new_status)}`}>
                {getStatusLabel(entry.new_status)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-cream/50">
                {formatDate(entry.changed_at)}
              </span>
              {entry.changed_by && (
                <span className="flex items-center gap-1 text-xs text-cream/40">
                  <User className="h-3 w-3" />
                  {t("adminOrders.history.admin")}
                </span>
              )}
            </div>
            {entry.notes && (
              <p className="text-xs text-cream/60 mt-1">{entry.notes}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
