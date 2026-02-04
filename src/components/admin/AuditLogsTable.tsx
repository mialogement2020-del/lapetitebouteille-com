import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import { useAuditLogs, AuditLog, AuditAction, AuditEntityType } from "@/hooks/useAuditLogs";

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

const actionLabels: Record<string, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  approve: "Approbation",
  reject: "Rejet",
  restock: "Réapprovisionnement",
  status_change: "Changement de statut",
  export: "Export",
  login: "Connexion",
};

const entityLabels: Record<string, string> = {
  product: "Produit",
  category: "Catégorie",
  order: "Commande",
  review: "Avis",
  promo_code: "Code promo",
  user: "Utilisateur",
  stock: "Stock",
  report: "Rapport",
  settings: "Paramètres",
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
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | "all">("all");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const { logs, isLoading, totalCount, refetch } = useAuditLogs({
    entityType: entityFilter === "all" ? undefined : entityFilter,
    action: actionFilter === "all" ? undefined : actionFilter,
    limit: 100,
  });

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
                    <CardTitle className="text-lg text-cream">Journal d'audit</CardTitle>
                    <CardDescription className="text-cream/60">
                      Historique des actions administratives
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs border-gold/30 text-cream/70">
                    {totalCount} entrée{totalCount > 1 ? "s" : ""}
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
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-cream/50" />
                  <span className="text-sm text-cream/60">Filtres:</span>
                </div>
                <Select
                  value={entityFilter}
                  onValueChange={(v) => setEntityFilter(v as AuditEntityType | "all")}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs border-gold/30 bg-noir">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-noir border-gold/30">
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="product">Produits</SelectItem>
                    <SelectItem value="order">Commandes</SelectItem>
                    <SelectItem value="review">Avis</SelectItem>
                    <SelectItem value="category">Catégories</SelectItem>
                    <SelectItem value="promo_code">Codes promo</SelectItem>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="report">Rapports</SelectItem>
                    <SelectItem value="settings">Paramètres</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={actionFilter}
                  onValueChange={(v) => setActionFilter(v as AuditAction | "all")}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs border-gold/30 bg-noir">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent className="bg-noir border-gold/30">
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="create">Création</SelectItem>
                    <SelectItem value="update">Modification</SelectItem>
                    <SelectItem value="delete">Suppression</SelectItem>
                    <SelectItem value="approve">Approbation</SelectItem>
                    <SelectItem value="reject">Rejet</SelectItem>
                    <SelectItem value="restock">Réapprovisionnement</SelectItem>
                    <SelectItem value="status_change">Changement statut</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  className="h-8 text-xs text-cream/60 hover:text-cream"
                >
                  <RefreshCcw className="h-3 w-3 mr-1" />
                  Actualiser
                </Button>
              </div>

              {/* Table */}
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-cream/50">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune entrée dans le journal</p>
                    <p className="text-xs mt-1">Les actions administratives apparaîtront ici</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gold/20 hover:bg-transparent">
                        <TableHead className="text-cream/70 w-[180px]">Date</TableHead>
                        <TableHead className="text-cream/70">Action</TableHead>
                        <TableHead className="text-cream/70">Type</TableHead>
                        <TableHead className="text-cream/70">Élément</TableHead>
                        <TableHead className="text-cream/70">Utilisateur</TableHead>
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
                                  {format(new Date(log.created_at), "dd MMM yyyy", { locale: fr })}
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
                                  {log.user_email || "Inconnu"}
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
              Détails de l'action
            </DialogTitle>
            <DialogDescription className="text-cream/60">
              Informations complètes sur cette entrée du journal d'audit
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-cream/50">Date et heure</p>
                  <p className="text-sm text-cream">
                    {format(new Date(selectedLog.created_at), "EEEE d MMMM yyyy à HH:mm:ss", {
                      locale: fr,
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-cream/50">Utilisateur</p>
                  <p className="text-sm text-cream">{selectedLog.user_email || "Inconnu"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-cream/50">Action</p>
                  <Badge
                    variant="outline"
                    className={`text-xs ${actionColors[selectedLog.action] || "text-cream/70"}`}
                  >
                    {actionLabels[selectedLog.action] || selectedLog.action}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-cream/50">Type d'élément</p>
                  <p className="text-sm text-cream">
                    {entityLabels[selectedLog.entity_type] || selectedLog.entity_type}
                  </p>
                </div>
                {selectedLog.entity_name && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-xs text-cream/50">Élément concerné</p>
                    <p className="text-sm text-cream">{selectedLog.entity_name}</p>
                  </div>
                )}
              </div>

              {/* Changes */}
              {(selectedLog.old_values || selectedLog.new_values) && (
                <div className="space-y-2">
                  <p className="text-xs text-cream/50 font-medium">Modifications</p>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.old_values && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                        <p className="text-xs text-destructive mb-2 font-medium">Avant</p>
                        <pre className="text-xs text-cream/70 overflow-auto max-h-[150px]">
                          {JSON.stringify(selectedLog.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.new_values && (
                      <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                        <p className="text-xs text-success mb-2 font-medium">Après</p>
                        <pre className="text-xs text-cream/70 overflow-auto max-h-[150px]">
                          {JSON.stringify(selectedLog.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
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
