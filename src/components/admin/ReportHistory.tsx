import { useState, useEffect } from "react";
import { History, CheckCircle, XCircle, Clock, Mail, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

interface ReportHistoryItem {
  id: string;
  sent_at: string;
  report_type: string;
  recipients: string[];
  out_of_stock_count: number;
  low_stock_count: number;
  critical_stock_count: number;
  total_alerts_count: number;
  trend_percentage: number | null;
  send_status: string;
  error_message: string | null;
  email_id: string | null;
}

export function ReportHistory() {
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("report_history")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching report history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Envoyé
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Échec
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 text-noir">
            <Clock className="h-3 w-3 mr-1" />
            En cours
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getTotalAlerts = (item: ReportHistoryItem) => {
    return item.out_of_stock_count + item.low_stock_count + item.critical_stock_count;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-cream/60">Chargement...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-cream/5 border border-gold/10 rounded-lg p-6 text-center">
        <History className="h-10 w-10 text-cream/30 mx-auto mb-3" />
        <p className="text-cream/60">Aucun rapport envoyé pour le moment</p>
        <p className="text-sm text-cream/40 mt-1">
          Les rapports apparaîtront ici après leur premier envoi
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-cream flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Historique des rapports ({history.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchHistory}
          className="text-cream/60 hover:text-cream"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="max-h-[400px]">
        <Accordion type="single" collapsible className="space-y-2">
          {history.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AccordionItem
                value={item.id}
                className="border border-gold/20 rounded-lg bg-cream/5 px-4"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(item.send_status)}
                      <span className="text-sm text-cream">
                        {formatDate(item.sent_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-cream/60 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {getTotalAlerts(item)} alertes
                      </span>
                      <span className="text-cream/60 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {item.recipients.length}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4 pt-2">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-noir/50 border border-destructive/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-destructive">
                          {item.out_of_stock_count}
                        </p>
                        <p className="text-xs text-cream/60">Ruptures</p>
                      </div>
                      <div className="bg-noir/50 border border-orange-500/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-orange-500">
                          {item.low_stock_count}
                        </p>
                        <p className="text-xs text-cream/60">Stock faible</p>
                      </div>
                      <div className="bg-noir/50 border border-yellow-500/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-yellow-500">
                          {item.critical_stock_count}
                        </p>
                        <p className="text-xs text-cream/60">Critique</p>
                      </div>
                      <div className="bg-noir/50 border border-gold/30 rounded-lg p-3 text-center">
                        <p className={`text-xl font-bold ${
                          (item.trend_percentage ?? 0) > 0 ? "text-destructive" : "text-primary"
                        }`}>
                          {(item.trend_percentage ?? 0) > 0 ? "+" : ""}{item.trend_percentage ?? 0}%
                        </p>
                        <p className="text-xs text-cream/60">Tendance</p>
                      </div>
                    </div>

                    {/* Recipients */}
                    <div className="bg-noir/30 border border-gold/10 rounded-lg p-3">
                      <p className="text-xs text-cream/60 mb-2 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Destinataires
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.recipients.map((email, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs bg-cream/10 text-cream"
                          >
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Error message if failed */}
                    {item.send_status === "failed" && item.error_message && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                        <p className="text-xs text-destructive font-medium mb-1">
                          Erreur d'envoi
                        </p>
                        <p className="text-xs text-cream/70">{item.error_message}</p>
                      </div>
                    )}

                    {/* Email ID if success */}
                    {item.send_status === "success" && item.email_id && (
                      <p className="text-xs text-cream/40">
                        ID Email: {item.email_id}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
