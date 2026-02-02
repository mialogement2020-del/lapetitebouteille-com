import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Download,
  Calendar,
  X
} from "lucide-react";
import { convertToCSV, downloadCSV, formatDateForCSV, formatPriceForCSV } from "@/lib/csvExport";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AdminOrder } from "@/hooks/useAdmin";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrdersTableProps {
  orders: AdminOrder[];
  isLoading: boolean;
  onOrderClick: (order: AdminOrder) => void;
  onRefresh: () => void;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: Clock },
  confirmed: { label: "Confirmée", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: CheckCircle },
  processing: { label: "En préparation", color: "bg-purple-500/20 text-purple-500 border-purple-500/30", icon: Package },
  shipped: { label: "Expédiée", color: "bg-indigo-500/20 text-indigo-500 border-indigo-500/30", icon: Truck },
  delivered: { label: "Livrée", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: CheckCircle },
  cancelled: { label: "Annulée", color: "bg-red-500/20 text-red-500 border-red-500/30", icon: XCircle },
};

export function OrdersTable({ orders, isLoading, onOrderClick, onRefresh }: OrdersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setAmountMin("");
    setAmountMax("");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateFrom || dateTo || amountMin || amountMax;

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    // Date filter
    let matchesDate = true;
    if (order.created_at) {
      const orderDate = new Date(order.created_at);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && orderDate >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && orderDate <= toDate;
      }
    }

    // Amount filter
    const minAmount = amountMin ? parseFloat(amountMin) : 0;
    const maxAmount = amountMax ? parseFloat(amountMax) : Infinity;
    const matchesAmount = order.total >= minAmount && order.total <= maxAmount;
    
    return matchesSearch && matchesStatus && matchesDate && matchesAmount;
  });

  const exportToCSV = () => {
    const columns = [
      { key: "order_number" as const, header: "N° Commande" },
      { key: "shipping_full_name" as const, header: "Client" },
      { key: "shipping_phone" as const, header: "Téléphone" },
      { key: "shipping_city" as const, header: "Ville" },
      { key: "shipping_neighborhood" as const, header: "Quartier" },
      { key: "shipping_street" as const, header: "Adresse" },
      { key: "statusLabel" as const, header: "Statut" },
      { key: "payment_method" as const, header: "Mode de paiement" },
      { key: "payment_status" as const, header: "Statut paiement" },
      { key: "subtotal" as const, header: "Sous-total" },
      { key: "delivery_fee" as const, header: "Livraison" },
      { key: "discount_amount" as const, header: "Réduction" },
      { key: "total" as const, header: "Total" },
      { key: "itemsCount" as const, header: "Nb articles" },
      { key: "itemsList" as const, header: "Articles" },
      { key: "created_at" as const, header: "Date" },
      { key: "notes" as const, header: "Notes" },
    ];

    const exportData = filteredOrders.map((o) => ({
      ...o,
      statusLabel: o.status ? statusConfig[o.status].label : "En attente",
      subtotal: formatPriceForCSV(o.subtotal),
      delivery_fee: o.delivery_fee ? formatPriceForCSV(o.delivery_fee) : "0 FCFA",
      discount_amount: o.discount_amount ? formatPriceForCSV(o.discount_amount) : "0 FCFA",
      total: formatPriceForCSV(o.total),
      itemsCount: o.items.length,
      itemsList: o.items.map(i => `${i.product_name} (x${i.quantity})`).join("; "),
      created_at: formatDateForCSV(o.created_at),
    }));

    const csv = convertToCSV(exportData, columns);
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `commandes-${date}.csv`);
    toast.success(`${filteredOrders.length} commande(s) exportée(s)`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 bg-cream/10" />
          <Skeleton className="h-10 w-40 bg-cream/10" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full bg-cream/10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
          <Input
            placeholder="Rechercher par numéro, nom ou téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-cream/5 border-gold/30 text-cream placeholder:text-cream/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-cream/5 border-gold/30 text-cream">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent className="bg-noir border-gold/30">
            <SelectItem value="all" className="text-cream">Tous les statuts</SelectItem>
            {Object.entries(statusConfig).map(([status, config]) => (
              <SelectItem key={status} value={status} className="text-cream">
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`border-gold/30 text-cream hover:bg-cream/10 ${showAdvancedFilters ? 'bg-cream/10' : ''}`}
          title="Filtres avancés"
        >
          <Filter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="border-gold/30 text-cream hover:bg-cream/10"
          onClick={exportToCSV}
          title="Exporter en CSV"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="border-gold/30 text-cream hover:bg-cream/10"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-4 p-4 bg-cream/5 rounded-lg border border-gold/20"
        >
          {/* Date From */}
          <div className="flex items-center gap-2">
            <span className="text-cream/60 text-sm whitespace-nowrap">Du:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-40 justify-start text-left font-normal bg-cream/5 border-gold/20 text-cream hover:bg-cream/10"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : <span className="text-cream/40">Date début</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-noir border-gold/20" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  locale={fr}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {dateFrom && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-cream/40 hover:text-cream"
                onClick={() => setDateFrom(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <span className="text-cream/60 text-sm whitespace-nowrap">Au:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-40 justify-start text-left font-normal bg-cream/5 border-gold/20 text-cream hover:bg-cream/10"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : <span className="text-cream/40">Date fin</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-noir border-gold/20" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  locale={fr}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {dateTo && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-cream/40 hover:text-cream"
                onClick={() => setDateTo(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Amount Min */}
          <div className="flex items-center gap-2">
            <span className="text-cream/60 text-sm whitespace-nowrap">Montant min:</span>
            <Input
              type="number"
              placeholder="0"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              className="w-28 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
            />
            <span className="text-cream/40 text-xs">FCFA</span>
          </div>

          {/* Amount Max */}
          <div className="flex items-center gap-2">
            <span className="text-cream/60 text-sm whitespace-nowrap">Montant max:</span>
            <Input
              type="number"
              placeholder="∞"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              className="w-28 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
            />
            <span className="text-cream/40 text-xs">FCFA</span>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-cream/60 hover:text-cream hover:bg-cream/10 ml-auto"
            >
              <X className="h-4 w-4 mr-1" />
              Réinitialiser les filtres
            </Button>
          )}
        </motion.div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 text-xs">
          {searchQuery && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Recherche: "{searchQuery}"
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Statut: {statusConfig[statusFilter as OrderStatus]?.label}
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Du: {format(dateFrom, "dd/MM/yyyy")}
            </Badge>
          )}
          {dateTo && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Au: {format(dateTo, "dd/MM/yyyy")}
            </Badge>
          )}
          {amountMin && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Min: {new Intl.NumberFormat("fr-FR").format(parseFloat(amountMin))} FCFA
            </Badge>
          )}
          {amountMax && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Max: {new Intl.NumberFormat("fr-FR").format(parseFloat(amountMax))} FCFA
            </Badge>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-cream/60 text-sm">
        {filteredOrders.length} commande{filteredOrders.length > 1 ? "s" : ""} trouvée{filteredOrders.length > 1 ? "s" : ""}
      </p>

      {/* Table */}
      <div className="rounded-lg border border-gold/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gold/20 hover:bg-transparent">
              <TableHead className="text-cream/60">Commande</TableHead>
              <TableHead className="text-cream/60">Client</TableHead>
              <TableHead className="text-cream/60">Statut</TableHead>
              <TableHead className="text-cream/60 text-right">Total</TableHead>
              <TableHead className="text-cream/60">Date</TableHead>
              <TableHead className="text-cream/60 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-cream/20 mb-4" />
                  <p className="text-cream/60">Aucune commande trouvée</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order, index) => {
                const status = order.status || "pending";
                const StatusIcon = statusConfig[status].icon;

                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-gold/10 hover:bg-cream/5 cursor-pointer"
                    onClick={() => onOrderClick(order)}
                  >
                    <TableCell className="font-medium text-cream">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-cream">{order.shipping_full_name || "—"}</p>
                        <p className="text-cream/50 text-xs">{order.shipping_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig[status].color} border`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-primary font-semibold">
                      {formatPrice(order.total)}
                    </TableCell>
                    <TableCell className="text-cream/60 text-sm">
                      {order.created_at ? formatDate(order.created_at) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-cream/60 hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOrderClick(order);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
