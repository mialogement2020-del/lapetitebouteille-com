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
import { fr, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "en" ? enUS : fr;
  const DATE_PRESETS = [
    { value: "all", label: t("adminReports.allHistory") },
    { value: "7days", label: t("adminAnalytics.days7") },
    { value: "30days", label: t("adminAnalytics.days30") },
    { value: "thisMonth", label: t("adminReports.thisMonth") },
    { value: "lastMonth", label: t("adminReports.lastMonth") },
    { value: "custom", label: t("adminReports.customPeriod") },
  ];
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
        title: t("adminReports.exportImpossible"),
        description: t("adminReports.noReportsToExport"),
        variant: "destructive",
      });
      return;
    }

    const columns = [
      { key: "sent_at" as const, header: t("adminReports.startDate") },
      { key: "report_type" as const, header: t("adminAudit.type") },
      { key: "recipients" as const, header: t("adminReports.recipients") },
      { key: "out_of_stock_count" as const, header: t("adminReports.outOfStock") },
      { key: "low_stock_count" as const, header: t("adminReports.lowStockLabel") },
      { key: "critical_stock_count" as const, header: t("adminReports.critical") },
      { key: "total_alerts_count" as const, header: t("adminReports.alertsLabel", { count: "" }).trim() },
      { key: "trend_percentage" as const, header: t("adminReports.trend") + " (%)" },
      { key: "send_status" as const, header: t("adminReports.colStatus") },
      { key: "error_message" as const, header: t("adminReports.sendErrorLabel") },
    ];

    const exportData = history.map((item) => ({
      ...item,
      sent_at: formatDateForCSV(item.sent_at),
      recipients: item.recipients.join(", "),
      send_status: item.send_status === "success" ? t("adminReports.statusSent") : item.send_status === "failed" ? t("adminReports.statusFailed") : t("adminReports.statusPending"),
      trend_percentage: item.trend_percentage ?? 0,
      error_message: item.error_message || "",
    }));

    const csv = convertToCSV(exportData, columns);
    const filename = `historique-rapports-${format(new Date(), "yyyy-MM-dd")}.csv`;
    downloadCSV(csv, filename);

    toast({
      title: t("adminReports.exportSuccess"),
      description: t("adminReports.exportSuccessDesc", { count: history.length }),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("adminReports.statusSent")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("adminReports.statusFailed")}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 text-noir">
            <Clock className="h-3 w-3 mr-1" />
            {t("adminReports.statusPending")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === "en" ? "en-US" : "fr-FR", {
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
        <span className="ml-2 text-cream/60">{t("adminReports.loading")}</span>
      </div>
    );
  }

  // Filter controls UI component
  const FilterControls = () => (
    <div className="bg-cream/5 border border-gold/10 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm text-cream font-medium">
        <Filter className="h-4 w-4 text-primary" />
        {t("adminReports.filterByPeriod")}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preset selector */}
        <div className="space-y-2">
          <Label className="text-cream text-xs">{t("adminReports.period")}</Label>
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
              <Label className="text-cream text-xs">{t("adminReports.startDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-noir border-gold/30 text-cream hover:bg-cream/5"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {startDate ? format(startDate, "d MMM yyyy", { locale: dateLocale }) : t("adminReports.selectDate")}
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
              <Label className="text-cream text-xs">{t("adminReports.endDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-noir border-gold/30 text-cream hover:bg-cream/5"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {endDate ? format(endDate, "d MMM yyyy", { locale: dateLocale }) : t("adminReports.selectDate")}
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
          {t("adminReports.foundReports", { count: filteredCount })}
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
          <p className="text-cream/60">{t("adminReports.noReports")}</p>
          <p className="text-sm text-cream/40 mt-1">
            {t("adminReports.reportsAppear")}
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
          {t("adminReports.historyTitle", { count: history.length })}
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
            {t("adminReports.exportCSV")}
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
          <p className="text-cream/60">{t("adminReports.noReportsPeriod")}</p>
          <p className="text-sm text-cream/40 mt-1">
            {t("adminReports.tryOtherDates")}
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
                        {t("adminReports.alertsLabel", { count: getTotalAlerts(item) })}
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
                        <p className="text-xs text-cream/60">{t("adminReports.outOfStock")}</p>
                      </div>
                      <div className="bg-noir/50 border border-orange-500/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-orange-500">
                          {item.low_stock_count}
                        </p>
                        <p className="text-xs text-cream/60">{t("adminReports.lowStockLabel")}</p>
                      </div>
                      <div className="bg-noir/50 border border-yellow-500/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-yellow-500">
                          {item.critical_stock_count}
                        </p>
                        <p className="text-xs text-cream/60">{t("adminReports.critical")}</p>
                      </div>
                      <div className="bg-noir/50 border border-gold/30 rounded-lg p-3 text-center">
                        <p className={`text-xl font-bold ${
                          (item.trend_percentage ?? 0) > 0 ? "text-destructive" : "text-primary"
                        }`}>
                          {(item.trend_percentage ?? 0) > 0 ? "+" : ""}{item.trend_percentage ?? 0}%
                        </p>
                        <p className="text-xs text-cream/60">{t("adminReports.trend")}</p>
                      </div>
                    </div>

                    {/* Recipients */}
                    <div className="bg-noir/30 border border-gold/10 rounded-lg p-3">
                      <p className="text-xs text-cream/60 mb-2 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {t("adminReports.recipientsLabel")}
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
                          {t("adminReports.sendErrorLabel")}
                        </p>
                        <p className="text-xs text-cream/70">{item.error_message}</p>
                      </div>
                    )}

                    {/* Email ID if success */}
                    {item.send_status === "success" && item.email_id && (
                      <p className="text-xs text-cream/40">
                        {t("adminReports.emailIdLabel", { id: item.email_id })}
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
