import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BadgeCheck,
  RefreshCw,
} from "lucide-react";

type Row = {
  order_id: string | null;
  order_created_at: string | null;
  order_status: string | null;
  order_total: number | null;
  buyer_id: string | null;
  guest_email: string | null;
  payment_intent_id: string | null;
  payment_provider: string | null;
  payment_method: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  payment_processed_at: string | null;
  escrow_status: string | null;
  escrow_amount: number | null;
  escrow_captured: number | null;
  escrow_refunded: number | null;
  reconciliation_id: string | null;
  reconciliation_status: string | null;
  recon_expected: number | null;
  recon_received: number | null;
  recon_variance: number | null;
  reconciled_at: string | null;
  risk_level: string | null;
  risk_score: number | null;
};

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(Number(n ?? 0))) + " FCFA";

const statusColor: Record<string, string> = {
  matched: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  variance: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  missing_order: "bg-red-500/15 text-red-400 border-red-500/30",
  reconciled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const riskColor: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function FinanceReconciliationManager() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? undefined : fr;
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [onlyVariance, setOnlyVariance] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [note, setNote] = useState("");

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-finance-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_finance_overview")
        .select("*")
        .order("order_created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (onlyVariance && (r.recon_variance ?? 0) === 0) return false;
      if (statusFilter !== "all" && r.reconciliation_status !== statusFilter)
        return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = [
          r.order_id,
          r.payment_intent_id,
          r.guest_email,
          r.payment_provider,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, search, onlyVariance]);

  const totals = useMemo(() => {
    const matched = rows.filter((r) => r.reconciliation_status === "matched").length;
    const variance = rows.filter((r) => r.reconciliation_status === "variance").length;
    const missing = rows.filter((r) => r.reconciliation_status === "missing_order").length;
    const reconciled = rows.filter((r) => r.reconciliation_status === "reconciled").length;
    const totalVariance = rows.reduce(
      (s, r) => s + Number(r.recon_variance ?? 0),
      0
    );
    return { matched, variance, missing, reconciled, totalVariance };
  }, [rows]);

  const mut = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.rpc("reconcile_payment", {
        _recon_id: id,
        _note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("reconciliation.toastValidated") });
      qc.invalidateQueries({ queryKey: ["admin-finance-overview"] });
      setSelected(null);
      setNote("");
    },
    onError: (e: any) =>
      toast({ title: t("reconciliation.toastError"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream/70 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {t("reconciliation.kpiMatched")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display text-cream">{totals.matched}</p>
          </CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream/70 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" /> {t("reconciliation.kpiVariance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display text-cream">{totals.variance}</p>
            <p className="text-xs text-cream/50">{fmt(totals.totalVariance)}</p>
          </CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream/70 text-xs flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-red-400" /> {t("reconciliation.kpiMissing")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display text-cream">{totals.missing}</p>
          </CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream/70 text-xs flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-blue-400" /> {t("reconciliation.kpiReconciled")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display text-cream">{totals.reconciled}</p>
          </CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream/70 text-xs flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> {t("reconciliation.refresh")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="w-full" onClick={() => refetch()}>
              {t("reconciliation.reload")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream flex items-center gap-2">
            <Scale className="h-5 w-5" /> {t("reconciliation.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder={t("reconciliation.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs bg-noir/40 border-gold/20"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52 bg-noir/40 border-gold/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("reconciliation.allStatuses")}</SelectItem>
                <SelectItem value="matched">{t("reconciliation.statusMatched")}</SelectItem>
                <SelectItem value="variance">{t("reconciliation.statusVariance")}</SelectItem>
                <SelectItem value="missing_order">{t("reconciliation.statusMissing")}</SelectItem>
                <SelectItem value="reconciled">{t("reconciliation.statusReconciled")}</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-cream/80">
              <input
                type="checkbox"
                checked={onlyVariance}
                onChange={(e) => setOnlyVariance(e.target.checked)}
              />
              {t("reconciliation.onlyVariance")}
            </label>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reconciliation.colDate")}</TableHead>
                  <TableHead>{t("reconciliation.colOrder")}</TableHead>
                  <TableHead>{t("reconciliation.colProvider")}</TableHead>
                  <TableHead>{t("reconciliation.colExpected")}</TableHead>
                  <TableHead>{t("reconciliation.colReceived")}</TableHead>
                  <TableHead>{t("reconciliation.colVariance")}</TableHead>
                  <TableHead>{t("reconciliation.colRecon")}</TableHead>
                  <TableHead>{t("reconciliation.colEscrow")}</TableHead>
                  <TableHead>{t("reconciliation.colRisk")}</TableHead>
                  <TableHead className="text-right">{t("reconciliation.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-cream/50">
                      {t("reconciliation.loading")}
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-cream/50">
                      {t("reconciliation.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const variance = Number(r.recon_variance ?? 0);
                    return (
                      <TableRow key={`${r.order_id}-${r.payment_intent_id ?? "none"}`}>
                        <TableCell className="text-xs">
                          {r.order_created_at
                            ? format(new Date(r.order_created_at), "dd MMM yy", {
                                locale,
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.order_id ? r.order_id.slice(0, 8) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.payment_provider ?? "—"}
                          <div className="text-cream/50">{r.payment_method ?? ""}</div>
                        </TableCell>
                        <TableCell>{fmt(r.recon_expected)}</TableCell>
                        <TableCell>{fmt(r.recon_received)}</TableCell>
                        <TableCell
                          className={
                            variance === 0
                              ? ""
                              : variance > 0
                              ? "text-orange-400"
                              : "text-red-400"
                          }
                        >
                          {fmt(variance)}
                        </TableCell>
                        <TableCell>
                          {r.reconciliation_status ? (
                            <Badge
                              variant="outline"
                              className={statusColor[r.reconciliation_status] ?? ""}
                            >
                              {r.reconciliation_status}
                            </Badge>
                          ) : (
                            <span className="text-cream/40 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.escrow_status ? (
                            <>
                              <div>{r.escrow_status}</div>
                              <div className="text-cream/50">
                                {fmt(r.escrow_amount)}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {r.risk_level ? (
                            <Badge
                              variant="outline"
                              className={riskColor[r.risk_level] ?? ""}
                            >
                              {r.risk_level} · {r.risk_score ?? 0}
                            </Badge>
                          ) : (
                            <span className="text-cream/40 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.reconciliation_id &&
                            r.reconciliation_status !== "reconciled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelected(r)}
                              >
                                {t("reconciliation.validate")}
                              </Button>
                            )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-noir border-gold/20">
          <DialogHeader>
            <DialogTitle className="text-cream">{t("reconciliation.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {selected && (
                <>{t("reconciliation.summary", {
                  expected: fmt(selected.recon_expected),
                  received: fmt(selected.recon_received),
                  variance: fmt(selected.recon_variance),
                })}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("reconciliation.noteLabel")}</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("reconciliation.notePh")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              {t("reconciliation.cancel")}
            </Button>
            <Button
              onClick={() =>
                selected?.reconciliation_id &&
                mut.mutate({ id: selected.reconciliation_id, note })
              }
              disabled={mut.isPending}
            >
              {t("reconciliation.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}