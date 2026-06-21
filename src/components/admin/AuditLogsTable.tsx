import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  History,
  User,
  Package,
  ShoppingCart,
  Star,
  Tag,
  Settings,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCcw,
  Download,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  FileSpreadsheet,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useAuditLogs, AuditLog, AuditAction, AuditEntityType } from "@/hooks/useAuditLogs";
import { exportAuditLogsToCSV, exportAuditLogsToPDF } from "@/lib/auditExport";
import { toast } from "sonner";
import { logAuditAction } from "@/hooks/useAuditLogs";
import { AuditLogDiffView } from "./AuditLogDiffView";

const actionIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  approve: Check,
  reject: X,
  restock: RefreshCcw,
  status_change: ArrowUpDown,
  export: Download,
  login: User,
};

const entityIcons: Record<string, React.ElementType> = {
  product: Package,
  category: Tag,
  order: ShoppingCart,
  review: Star,
  promo_code: Tag,
  user: User,
  stock: Package,
  report: FileText,
  settings: Settings,
};

const actionColors: Record<string, string> = {
  create: "text-success bg-success/10 border-success/30",
  update: "text-info bg-info/10 border-info/30",
  delete: "text-destructive bg-destructive/10 border-destructive/30",
  approve: "text-success bg-success/10 border-success/30",
  reject: "text-destructive bg-destructive/10 border-destructive/30",
  restock: "text-warning bg-warning/10 border-warning/30",
  status_change: "text-info bg-info/10 border-info/30",
  export: "text-primary bg-primary/10 border-primary/30",
  login: "text-cream/70 bg-cream/5 border-cream/20",
};

export function AuditLogsTable() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("en") ? enUS : fr;
  const actionLabels: Record<string, string> = {
    create: t("adminAuditExtra.actionLabels.create"),
    update: t("adminAuditExtra.actionLabels.update"),
    delete: t("adminAuditExtra.actionLabels.delete"),
    approve: t("adminAuditExtra.actionLabels.approve"),
    reject: t("adminAuditExtra.actionLabels.reject"),
    restock: t("adminAuditExtra.actionLabels.restock"),
    status_change: t("adminAuditExtra.actionLabels.status_change"),
    export: t("adminAuditExtra.actionLabels.export"),
    login: t("adminAuditExtra.actionLabels.login"),
  };
  const entityLabels: Record<string, string> = {
    product: t("adminAuditExtra.entityLabels.product"),
    category: t("adminAuditExtra.entityLabels.category"),
    order: t("adminAuditExtra.entityLabels.order"),
    review: t("adminAuditExtra.entityLabels.review"),
    promo_code: t("adminAuditExtra.entityLabels.promo_code"),
    user: t("adminAuditExtra.entityLabels.user"),
    stock: t("adminAuditExtra.entityLabels.stock"),
    report: t("adminAuditExtra.entityLabels.report"),
    settings: t("adminAuditExtra.entityLabels.settings"),
  };
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | "all">("all");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const pageSize = 15;

  const { logs, isLoading, totalCount, totalPages, uniqueUsers, refetch } = useAuditLogs({
    entityType: entityFilter === "all" ? undefined : entityFilter,
    action: actionFilter === "all" ? undefined : actionFilter,
    userEmail: userFilter === "all" ? undefined : userFilter,
    dateFrom,
    dateTo,
    limit: pageSize,
    page: currentPage,
  });

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: any) => void, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  const handleExportCSV = async () => {
    if (logs.length === 0) {
      toast.error(t("adminAuditExtra.toastNoData"));
      return;
    }

    setIsExporting(true);
    try {
      exportAuditLogsToCSV(logs);
      await logAuditAction("export", "report", undefined, t("adminAuditExtra.auditExportCSVLabel"));
      toast.success(t("adminAuditExtra.toastCSVSuccess"));
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error(t("adminAuditExtra.toastCSVError"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (logs.length === 0) {
      toast.error(t("adminAuditExtra.toastNoData"));
      return;
    }

    setIsExporting(true);
    try {
      exportAuditLogsToPDF(logs);
      await logAuditAction("export", "report", undefined, t("adminAuditExtra.auditExportPDFLabel"));
      toast.success(t("adminAuditExtra.toastPDFSuccess"));
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error(t("adminAuditExtra.toastPDFError"));
    } finally {
      setIsExporting(false);
    }
  };

  const ActionIcon = (action: string) => {
    const Icon = actionIcons[action] || History;
    return Icon;
  };

  const EntityIcon = (entity: string) => {
    const Icon = entityIcons[entity] || FileText;
    return Icon;
  };

  if (isLoading) {
    return (
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-cream/10" />
          <Skeleton className="h-4 w-64 bg-cream/10" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full bg-cream/10" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="bg-noir/50 border-gold/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gold/5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-gold" />
                  <div>
                    <CardTitle className="text-lg text-cream">{t("adminAuditExtra.title")}</CardTitle>
                    <CardDescription className="text-cream/60">
                      {t("adminAuditExtra.description")}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs border-gold/30 text-cream/70">
                    {t("adminAuditExtra.entriesCount", { count: totalCount })}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-cream/50" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-cream/50" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Filters Row 1 */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-cream/50" />
                  <span className="text-sm text-cream/60">{t("adminAuditExtra.filters")}</span>
                </div>
                <Select
                  value={entityFilter}
                  onValueChange={(v) => handleFilterChange(setEntityFilter, v as AuditEntityType | "all")}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs border-gold/30 bg-noir">
                    <SelectValue placeholder={t("adminAuditExtra.th.type")} />
                  </SelectTrigger>
                  <SelectContent className="bg-noir border-gold/30">
                    <SelectItem value="all">{t("adminAuditExtra.allTypes")}</SelectItem>
                    <SelectItem value="product">{t("adminAuditExtra.entityLabels.products")}</SelectItem>
                    <SelectItem value="order">{t("adminAuditExtra.entityLabels.orders")}</SelectItem>
                    <SelectItem value="review">{t("adminAuditExtra.entityLabels.reviews")}</SelectItem>
                    <SelectItem value="category">{t("adminAuditExtra.entityLabels.categories")}</SelectItem>
                    <SelectItem value="promo_code">{t("adminAuditExtra.entityLabels.promo_codes")}</SelectItem>
                    <SelectItem value="stock">{t("adminAuditExtra.entityLabels.stock")}</SelectItem>
                    <SelectItem value="report">{t("adminAuditExtra.entityLabels.reports")}</SelectItem>
                    <SelectItem value="settings">{t("adminAuditExtra.entityLabels.settings")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={actionFilter}
                  onValueChange={(v) => handleFilterChange(setActionFilter, v as AuditAction | "all")}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs border-gold/30 bg-noir">
                    <SelectValue placeholder={t("adminAuditExtra.th.action")} />
                  </SelectTrigger>
                  <SelectContent className="bg-noir border-gold/30">
                    <SelectItem value="all">{t("adminAuditExtra.allActions")}</SelectItem>
                    <SelectItem value="create">{actionLabels.create}</SelectItem>
                    <SelectItem value="update">{actionLabels.update}</SelectItem>
                    <SelectItem value="delete">{actionLabels.delete}</SelectItem>
                    <SelectItem value="approve">{actionLabels.approve}</SelectItem>
                    <SelectItem value="reject">{actionLabels.reject}</SelectItem>
                    <SelectItem value="restock">{actionLabels.restock}</SelectItem>
                    <SelectItem value="status_change">{actionLabels.status_change}</SelectItem>
                    <SelectItem value="export">{actionLabels.export}</SelectItem>
                  </SelectContent>
                </Select>

                {/* User Filter */}
                <Select
                  value={userFilter}
                  onValueChange={(v) => handleFilterChange(setUserFilter, v)}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs border-gold/30 bg-noir">
                    <User className="h-3 w-3 mr-1" />
                    <SelectValue placeholder={t("adminAuditExtra.th.user")} />
                  </SelectTrigger>
                  <SelectContent className="bg-noir border-gold/30">
                    <SelectItem value="all">{t("adminAuditExtra.allUsers")}</SelectItem>
                    {uniqueUsers.map((email) => (
                      <SelectItem key={email} value={email}>
                        <span className="truncate max-w-[150px]">{email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filters Row 2 - Dates */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cream/50" />
                  <span className="text-sm text-cream/60">{t("adminAuditExtra.period")}</span>
                </div>

                {/* Date From */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-gold/30 bg-noir text-cream hover:bg-gold/10 w-[130px] justify-start"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : t("adminAuditExtra.from")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-noir border-gold/30" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => handleFilterChange(setDateFrom, date)}
                      initialFocus
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>

                {/* Date To */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-gold/30 bg-noir text-cream hover:bg-gold/10 w-[130px] justify-start"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : t("adminAuditExtra.to")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-noir border-gold/30" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => handleFilterChange(setDateTo, date)}
                      initialFocus
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>

                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDateFilters}
                    className="h-8 text-xs text-cream/60 hover:text-cream"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t("adminAuditExtra.clearDates")}
                  </Button>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    className="h-8 text-xs text-cream/60 hover:text-cream"
                  >
                    <RefreshCcw className="h-3 w-3 mr-1" />
                    {t("adminAuditExtra.refresh")}
                  </Button>

                  {/* Export dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isExporting || logs.length === 0}
                        className="h-8 text-xs border-gold/30 text-cream hover:bg-gold/10"
                      >
                        {isExporting ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3 mr-1" />
                        )}
                        {t("adminAuditExtra.export")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-noir border-gold/30">
                      <DropdownMenuItem
                        onClick={handleExportCSV}
                        className="text-cream hover:bg-gold/10 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-success" />
                        {t("adminAuditExtra.exportCSV")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleExportPDF}
                        className="text-cream hover:bg-gold/10 cursor-pointer"
                      >
                        <FileText className="h-4 w-4 mr-2 text-destructive" />
                        {t("adminAuditExtra.exportPDF")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Table */}
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-cream/50">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{t("adminAuditExtra.noEntry")}</p>
                    <p className="text-xs mt-1">{t("adminAuditExtra.noEntryDesc")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gold/20 hover:bg-transparent">
                        <TableHead className="text-cream/70 w-[180px]">{t("adminAuditExtra.th.date")}</TableHead>
                        <TableHead className="text-cream/70">{t("adminAuditExtra.th.action")}</TableHead>
                        <TableHead className="text-cream/70">{t("adminAuditExtra.th.type")}</TableHead>
                        <TableHead className="text-cream/70">{t("adminAuditExtra.th.item")}</TableHead>
                        <TableHead className="text-cream/70">{t("adminAuditExtra.th.user")}</TableHead>
                        <TableHead className="text-cream/70 w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const ActionIconComponent = ActionIcon(log.action);
                        const EntityIconComponent = EntityIcon(log.entity_type);

                        return (
                          <TableRow
                            key={log.id}
                            className="border-gold/10 hover:bg-gold/5 cursor-pointer"
                            onClick={() => setSelectedLog(log)}
                          >
                            <TableCell className="text-cream/80 text-sm">
                              <div className="flex flex-col">
                                <span>
                                  {format(new Date(log.created_at), "dd MMM yyyy", { locale: dateLocale })}
                                </span>
                                <span className="text-xs text-cream/50">
                                  {format(new Date(log.created_at), "HH:mm:ss")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${actionColors[log.action] || "text-cream/70"}`}
                              >
                                <ActionIconComponent className="h-3 w-3 mr-1" />
                                {actionLabels[log.action] || log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-cream/70">
                                <EntityIconComponent className="h-4 w-4" />
                                <span className="text-sm">
                                  {entityLabels[log.entity_type] || log.entity_type}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-cream/80 text-sm max-w-[200px] truncate">
                              {log.entity_name || "-"}
                            </TableCell>
                            <TableCell className="text-cream/60 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">
                                  {log.user_email || t("adminAuditExtra.unknown")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-cream/40 hover:text-cream"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gold/10">
                  <div className="text-xs text-cream/50">
                    {t("adminAuditExtra.pageInfo", { current: currentPage, total: totalPages, count: totalCount })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 text-xs border-gold/30 text-cream hover:bg-gold/10 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-3 w-3 mr-1" />
                      {t("adminAuditExtra.prev")}
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`h-8 w-8 text-xs ${
                              currentPage === pageNum
                                ? "bg-gold text-noir"
                                : "text-cream/60 hover:text-cream hover:bg-gold/10"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 text-xs border-gold/30 text-cream hover:bg-gold/10 disabled:opacity-50"
                    >
                      {t("adminAuditExtra.next")}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-noir border-gold/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-cream flex items-center gap-2">
              <History className="h-5 w-5 text-gold" />
              {t("adminAuditExtra.detailTitle")}
            </DialogTitle>
            <DialogDescription className="text-cream/60">
              {t("adminAuditExtra.detailDesc")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-cream/50">{t("adminAuditExtra.dateTime")}</p>
                  <p className="text-sm text-cream">
                    {format(new Date(selectedLog.created_at), "EEEE d MMMM yyyy à HH:mm:ss", {
                      locale: dateLocale,
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-cream/50">{t("adminAuditExtra.user")}</p>
                  <p className="text-sm text-cream">{selectedLog.user_email || t("adminAuditExtra.unknown")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-cream/50">{t("adminAuditExtra.action")}</p>
                  <Badge
                    variant="outline"
                    className={`text-xs ${actionColors[selectedLog.action] || "text-cream/70"}`}
                  >
                    {actionLabels[selectedLog.action] || selectedLog.action}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-cream/50">{t("adminAuditExtra.entityType")}</p>
                  <p className="text-sm text-cream">
                    {entityLabels[selectedLog.entity_type] || selectedLog.entity_type}
                  </p>
                </div>
                {selectedLog.entity_name && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-xs text-cream/50">{t("adminAuditExtra.entityName")}</p>
                    <p className="text-sm text-cream">{selectedLog.entity_name}</p>
                  </div>
                )}
              </div>

              {/* Changes with Diff View */}
              {(selectedLog.old_values || selectedLog.new_values) && (
                <div className="space-y-2">
                  <p className="text-xs text-cream/50 font-medium">{t("adminAuditExtra.changes")}</p>
                  <AuditLogDiffView 
                    oldValues={selectedLog.old_values} 
                    newValues={selectedLog.new_values} 
                  />
                </div>
              )}

              {/* Technical info */}
              <div className="pt-2 border-t border-gold/20">
                <p className="text-xs text-cream/40">
                  ID: {selectedLog.id}
                </p>
                {selectedLog.user_agent && (
                  <p className="text-xs text-cream/40 truncate mt-1">
                    User-Agent: {selectedLog.user_agent}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
