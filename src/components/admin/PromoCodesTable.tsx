import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  RefreshCw,
  Search,
  Edit,
  Trash2,
  Loader2,
  Tag,
  Percent,
  Calendar,
  BarChart3,
  Copy,
  Check,
} from "lucide-react";
import type { AdminPromoCode } from "@/hooks/useAdmin";

interface PromoCodesTableProps {
  promoCodes: AdminPromoCode[];
  isLoading: boolean;
  onAddPromoCode: () => void;
  onEditPromoCode: (promoCode: AdminPromoCode) => void;
  onDeletePromoCode: (promoCode: AdminPromoCode) => void;
  onRefresh: () => void;
}

export function PromoCodesTable({
  promoCodes,
  isLoading,
  onAddPromoCode,
  onEditPromoCode,
  onDeletePromoCode,
  onRefresh,
}: PromoCodesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredPromoCodes = promoCodes.filter((promo) => {
    const matchesSearch =
      promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-CM", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA";
  };

  const getDiscountDisplay = (promo: AdminPromoCode) => {
    if (promo.discount_type === "percentage") {
      return `${promo.discount_value}%`;
    }
    return formatCurrency(promo.discount_value);
  };

  const getStatusBadge = (promo: AdminPromoCode) => {
    const now = new Date();
    const validFrom = promo.valid_from ? new Date(promo.valid_from) : null;
    const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;

    if (!promo.is_active) {
      return <Badge variant="secondary">Inactif</Badge>;
    }

    if (validUntil && now > validUntil) {
      return <Badge variant="destructive">Expiré</Badge>;
    }

    if (validFrom && now < validFrom) {
      return <Badge variant="outline" className="border-gold/50 text-gold">Programmé</Badge>;
    }

    if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
      return <Badge variant="destructive">Limite atteinte</Badge>;
    }

    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Actif</Badge>;
  };

  const getUsageDisplay = (promo: AdminPromoCode) => {
    if (promo.usage_limit) {
      const percentage = (promo.used_count / promo.usage_limit) * 100;
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-noir rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${percentage >= 90 ? 'bg-destructive' : percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500/80'}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className="text-sm">
            {promo.used_count}/{promo.usage_limit}
          </span>
        </div>
      );
    }
    return <span className="text-cream/60">{promo.used_count} utilisations</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
          <Input
            placeholder="Rechercher un code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-noir/50 border-gold/20"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="border-gold/20"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={onAddPromoCode}
            className="bg-gradient-gold text-noir font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau code
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gold/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gold/20 hover:bg-transparent">
              <TableHead className="text-cream/80">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Code
                </div>
              </TableHead>
              <TableHead className="text-cream/80">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Réduction
                </div>
              </TableHead>
              <TableHead className="text-cream/80">Conditions</TableHead>
              <TableHead className="text-cream/80">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Validité
                </div>
              </TableHead>
              <TableHead className="text-cream/80">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Utilisation
                </div>
              </TableHead>
              <TableHead className="text-cream/80">Statut</TableHead>
              <TableHead className="text-right text-cream/80">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredPromoCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-cream/60">
                  {searchQuery ? "Aucun code promo trouvé" : "Aucun code promo créé"}
                </TableCell>
              </TableRow>
            ) : (
              filteredPromoCodes.map((promo) => (
                <TableRow key={promo.id} className="border-gold/10 hover:bg-gold/5">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-primary/20 text-primary rounded font-mono font-bold text-sm">
                        {promo.code}
                      </code>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(promo.code)}
                            >
                              {copiedCode === promo.code ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3 text-cream/40" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {copiedCode === promo.code ? "Copié !" : "Copier le code"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {promo.description && (
                      <p className="text-xs text-cream/50 mt-1 max-w-[200px] truncate">
                        {promo.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {promo.discount_type === "percentage" ? (
                        <Percent className="h-3 w-3 text-primary" />
                      ) : (
                        <span className="text-xs text-primary">FCFA</span>
                      )}
                      <span className="font-semibold text-cream">
                        {getDiscountDisplay(promo)}
                      </span>
                    </div>
                    {promo.max_discount_amount && promo.discount_type === "percentage" && (
                      <p className="text-xs text-cream/50">
                        Max: {formatCurrency(promo.max_discount_amount)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {promo.min_order_amount && promo.min_order_amount > 0 ? (
                      <span className="text-sm text-cream/70">
                        Min. {formatCurrency(promo.min_order_amount)}
                      </span>
                    ) : (
                      <span className="text-sm text-cream/50">Aucune</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {promo.valid_from && (
                        <p className="text-cream/70">
                          Du {format(new Date(promo.valid_from), "dd/MM/yy", { locale: fr })}
                        </p>
                      )}
                      {promo.valid_until && (
                        <p className="text-cream/70">
                          Au {format(new Date(promo.valid_until), "dd/MM/yy", { locale: fr })}
                        </p>
                      )}
                      {!promo.valid_from && !promo.valid_until && (
                        <span className="text-cream/50">Illimité</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getUsageDisplay(promo)}</TableCell>
                  <TableCell>{getStatusBadge(promo)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditPromoCode(promo)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-noir border-gold/20">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer le code promo ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Le code <strong>{promo.code}</strong> sera définitivement supprimé.
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-gold/20">
                              Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeletePromoCode(promo)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {filteredPromoCodes.length > 0 && (
        <div className="flex items-center justify-between text-sm text-cream/60">
          <span>
            {filteredPromoCodes.length} code{filteredPromoCodes.length > 1 ? "s" : ""} promo
          </span>
          <span>
            {filteredPromoCodes.filter((p) => p.is_active).length} actif{filteredPromoCodes.filter((p) => p.is_active).length > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
