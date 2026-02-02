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
  Eye
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
      {/* Filters */}
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
            <Filter className="h-4 w-4 mr-2 text-cream/50" />
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
          className="border-gold/30 text-cream hover:bg-cream/10"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

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
