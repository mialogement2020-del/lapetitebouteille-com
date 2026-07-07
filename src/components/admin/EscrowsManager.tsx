import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Banknote, RotateCcw, CheckCircle2, PlayCircle, Wallet } from "lucide-react";

type EscrowRow = {
  id: string;
  order_id: string;
  amount: number;
  captured_amount: number;
  refunded_amount: number;
  currency: string;
  status: string;
  hold_reason: string | null;
  release_reason: string | null;
  held_at: string;
  captured_at: string | null;
  refunded_at: string | null;
  created_at: string;
};

const statusColor: Record<string, string> = {
  held: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  captured: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  refunded: "bg-red-500/15 text-red-400 border-red-500/30",
  partial_refund: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  released: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

export function EscrowsManager() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EscrowRow | null>(null);
  const [action, setAction] = useState<"capture" | "refund" | null>(null);
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState<string>("");

  const { data: escrows = [], isLoading } = useQuery({
    queryKey: ["admin-escrows", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("order_escrows")
        .select(
          "id, order_id, amount, captured_amount, refunded_amount, currency, status, hold_reason, release_reason, held_at, captured_at, refunded_at, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EscrowRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return escrows;
    const s = search.toLowerCase();
    return escrows.filter(
      (e) =>
        e.order_id.toLowerCase().includes(s) ||
        e.id.toLowerCase().includes(s) ||
        (e.hold_reason ?? "").toLowerCase().includes(s)
    );
  }, [escrows, search]);

  const totals = useMemo(() => {
    const held = escrows.filter((e) => e.status === "held");
    return {
      heldCount: held.length,
      heldAmount: held.reduce((s, e) => s + Number(e.amount), 0),
      capturedAmount: escrows.reduce(
        (s, e) => s + Number(e.captured_amount ?? 0),
        0
      ),
      refundedAmount: escrows.reduce(
        (s, e) => s + Number(e.refunded_amount ?? 0),
        0
      ),
    };
  }, [escrows]);

  const captureMut = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc("capture_escrow", {
        _escrow_id: id,
        _reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Escrow capturé" });
      qc.invalidateQueries({ queryKey: ["admin-escrows"] });
      close();
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const refundMut = useMutation({
    mutationFn: async ({
      id,
      amount,
      reason,
    }: {
      id: string;
      amount: number | null;
      reason: string;
    }) => {
      const { error } = await supabase.rpc("refund_escrow", {
        _escrow_id: id,
        _amount: amount,
        _reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Remboursement effectué" });
      qc.invalidateQueries({ queryKey: ["admin-escrows"] });
      close();
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const autoReleaseMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("auto_release_delivered_escrows");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast({
        title: "Libération automatique",
        description: `${n ?? 0} escrow(s) libéré(s)`,
      });
      qc.invalidateQueries({ queryKey: ["admin-escrows"] });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const close = () => {
    setSelected(null);
    setAction(null);
    setReason("");
    setRefundAmount("");
  };

  const submitAction = () => {
    if (!selected || !action) return;
    if (action === "capture") {
      captureMut.mutate({ id: selected.id, reason });
    } else {
      const amt = refundAmount ? Number(refundAmount) : null;
      refundMut.mutate({ id: selected.id, amount: amt, reason });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream/70 text-xs flex items-center gap-2">
              <Wallet className="h-4 w-4" /> En dépôt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display text-cream">{totals.heldCount}</p>
            <p className="text-xs text-cream/50">{fmt(totals.heldAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream/70 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Capturé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display text-cream">
              {fmt(totals.capturedAmount)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream/70 text-xs flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Remboursé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display text-cream">
              {fmt(totals.refundedAmount)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-cream/70 text-xs flex items-center gap-2">
              <PlayCircle className="h-4 w-4" /> Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              onClick={() => autoReleaseMut.mutate()}
              disabled={autoReleaseMut.isPending}
              className="w-full"
            >
              Libérer livrées
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream flex items-center gap-2">
            <Banknote className="h-5 w-5" /> Escrows paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Rechercher (order, id, motif)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs bg-noir/40 border-gold/20"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-noir/40 border-gold/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="held">En dépôt</SelectItem>
                <SelectItem value="captured">Capturé</SelectItem>
                <SelectItem value="refunded">Remboursé</SelectItem>
                <SelectItem value="partial_refund">Remb. partiel</SelectItem>
                <SelectItem value="released">Libéré</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Créé</TableHead>
                  <TableHead>Commande</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Capturé</TableHead>
                  <TableHead>Remboursé</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-cream/50">
                      Chargement…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-cream/50">
                      Aucun escrow
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">
                        {format(new Date(e.created_at), "dd MMM yy", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.order_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{fmt(Number(e.amount))}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColor[e.status] ?? ""}
                        >
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-cream/70 max-w-[160px] truncate">
                        {e.hold_reason ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {fmt(Number(e.captured_amount ?? 0))}
                      </TableCell>
                      <TableCell className="text-xs">
                        {fmt(Number(e.refunded_amount ?? 0))}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {e.status === "held" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(e);
                                setAction("capture");
                              }}
                            >
                              Capturer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(e);
                                setAction("refund");
                              }}
                            >
                              Rembourser
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected && !!action} onOpenChange={(o) => !o && close()}>
        <DialogContent className="bg-noir border-gold/20">
          <DialogHeader>
            <DialogTitle className="text-cream">
              {action === "capture" ? "Capturer l'escrow" : "Rembourser l'escrow"}
            </DialogTitle>
            <DialogDescription>
              {selected && (
                <>Montant en dépôt : {fmt(Number(selected.amount))}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {action === "refund" && (
              <div className="space-y-2">
                <Label>Montant (vide = total)</Label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Ex : 5000"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Motif</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motif (facultatif)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Annuler
            </Button>
            <Button
              onClick={submitAction}
              disabled={captureMut.isPending || refundMut.isPending}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}