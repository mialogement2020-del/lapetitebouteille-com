import { useState, useEffect } from "react";
import { History, CheckCircle, XCircle, Clock, Mail, Users, AlertTriangle, RefreshCw, Calendar, Filter, Download } from "lucide-react";
import { convertToCSV, downloadCSV, formatDateForCSV } from "@/lib/csvExport";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

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

// Preset filter options
const DATE_PRESETS = [
  { value: "all", label: "Tout l'historique" },
  { value: "7days", label: "7 derniers jours" },
  { value: "30days", label: "30 derniers jours" },
  { value: "thisMonth", label: "Ce mois-ci" },
  { value: "lastMonth", label: "Mois dernier" },
  { value: "custom", label: "Période personnalisée" },
];

export function ReportHistory() {
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filteredCount, setFilteredCount] = useState(0);

  // Calculate date range based on preset
  const getDateRange = () => {
    const now = new Date();
    
    switch (datePreset) {
      case "7days":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "30days":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "thisMonth":
        return { start: startOfMonth(now), end: endOfDay(now) };
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfDay(subDays(startOfMonth(now), 1)) };
      case "custom":
        return { 
          start: startDate ? startOfDay(startDate) : undefined, 
          end: endDate ? endOfDay(endDate) : undefined 
        };
      default:
        return { start: undefined, end: undefined };
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      
      let query = supabase
        .from("report_history")
        .select("*")
        .order("sent_at", { ascending: false });

      if (start) {
        query = query.gte("sent_at", start.toISOString());
      }
      if (end) {
        query = query.lte("sent_at", end.toISOString());
      }

      // Always limit to reasonable number
      query = query.limit(100);

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
      setFilteredCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching report history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [datePreset, startDate, endDate]);

  const handleExportCSV = () => {
    if (!history || history.length === 0) {
      toast({
        title: "Export impossible",
        description: "Aucun rapport à exporter",
        variant: "destructive",
      });
      return;
    }

    const columns = [
      { key: "sent_at" as const, header: "Date d'envoi" },
      { key: "report_type" as const, header: "Type" },
      { key: "recipients" as const, header: "Destinataires" },
      { key: "out_of_stock_count" as const, header: "Ruptures" },
      { key: "low_stock_count" as const, header: "Stock faible" },
      { key: "critical_stock_count" as const, header: "Critique" },
      { key: "total_alerts_count" as const, header: "Total alertes" },
      { key: "trend_percentage" as const, header: "Tendance (%)" },
      { key: "send_status" as const, header: "Statut" },
      { key: "error_message" as const, header: "Erreur" },
    ];

    const exportData = history.map((item) => ({
      ...item,
      sent_at: formatDateForCSV(item.sent_at),
      recipients: item.recipients.join(", "),
      send_status: item.send_status === "success" ? "Envoyé" : item.send_status === "failed" ? "Échec" : "En cours",
      trend_percentage: item.trend_percentage ?? 0,
      error_message: item.error_message || "",
    }));

    const csv = convertToCSV(exportData, columns);
    const filename = `historique-rapports-${format(new Date(), "yyyy-MM-dd")}.csv`;
    downloadCSV(csv, filename);

    toast({
      title: "Export réussi",
      description: `${history.length} rapport(s) exporté(s) en CSV`,
    });
  };

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

  // Filter controls UI component
  const FilterControls = () => (
    <div className="bg-cream/5 border border-gold/10 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm text-cream font-medium">
        <Filter className="h-4 w-4 text-primary" />
        Filtrer par période
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preset selector */}
        <div className="space-y-2">
          <Label className="text-cream text-xs">Période</Label>
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="bg-noir border-gold/30 text-cream">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-noir border-gold/30">
              {DATE_PRESETS.map((preset) => (
                <SelectItem 
                  key={preset.value} 
                  value={preset.value}
                  className="text-cream hover:bg-cream/10"
                >
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom date range */}
        {datePreset === "custom" && (
          <>
            <div className="space-y-2">
              <Label className="text-cream text-xs">Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-noir border-gold/30 text-cream hover:bg-cream/5"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {startDate ? format(startDate, "d MMM yyyy", { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-noir border-gold/30" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date > new Date() || (endDate ? date > endDate : false)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-cream text-xs">Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-noir border-gold/30 text-cream hover:bg-cream/5"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {endDate ? format(endDate, "d MMM yyyy", { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-noir border-gold/30" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date > new Date() || (startDate ? date < startDate : false)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}
      </div>

      {/* Results info */}
      {datePreset !== "all" && (
        <div className="text-xs text-cream/50">
          {filteredCount} rapport(s) trouvé(s) pour cette période
        </div>
      )}
    </div>
  );

  if (history.length === 0 && datePreset === "all") {
    return (
      <div className="space-y-4">
        <FilterControls />
        <div className="bg-cream/5 border border-gold/10 rounded-lg p-6 text-center">
          <History className="h-10 w-10 text-cream/30 mx-auto mb-3" />
          <p className="text-cream/60">Aucun rapport envoyé pour le moment</p>
          <p className="text-sm text-cream/40 mt-1">
            Les rapports apparaîtront ici après leur premier envoi
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterControls />
      
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-cream flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Historique des rapports ({history.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={history.length === 0}
            className="border-gold/30 text-cream hover:bg-gold/10"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHistory}
            className="text-cream/60 hover:text-cream"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-cream/5 border border-gold/10 rounded-lg p-6 text-center">
          <Calendar className="h-10 w-10 text-cream/30 mx-auto mb-3" />
          <p className="text-cream/60">Aucun rapport pour cette période</p>
          <p className="text-sm text-cream/40 mt-1">
            Essayez de sélectionner une autre plage de dates
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
