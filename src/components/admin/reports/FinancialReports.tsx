import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExportButtonGroup } from "./ExportButtonGroup";
import type { ReportColumn } from "@/lib/reporting";
import type { AdminOrder } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Calculator, FileBarChart2, Percent, Truck, Wallet, Banknote } from "lucide-react";

interface Props {
  orders: AdminOrder[];
}

type TabId = "pnl" | "vat" | "discounts" | "shipping" | "commissions" | "payouts";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

export default function FinancialReports({ orders }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("pnl");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [vatRate, setVatRate] = useState<number>(19.25); // Cameroon TVA standard

  // Fetch commissions + withdrawals (admin)
  const { data: commissions = [] } = useQuery({
    queryKey: ["admin-commissions-financial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("id, beneficiary_id, order_id, order_amount, commission_amount, commission_rate, level, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["admin-withdrawals-financial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("id, user_id, amount, status, payment_method, created_at, processed_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const inRange = (iso?: string | null) => {
    if (!iso) return false;
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 86400000 : Infinity;
    const t = new Date(iso).getTime();
    return t >= fromTs && t < toTs;
  };

  const filteredOrders = useMemo(
    () => orders.filter((o) => inRange(o.created_at)),
    [orders, from, to]
  );
  const filteredCommissions = useMemo(
    () => commissions.filter((c) => inRange(c.created_at)),
    [commissions, from, to]
  );
  const filteredWithdrawals = useMemo(
    () => withdrawals.filter((w) => inRange(w.created_at)),
    [withdrawals, from, to]
  );

  // ---------- KPI / P&L ----------
  const fin = useMemo(() => {
    const revenue = filteredOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const subtotal = filteredOrders.reduce((s, o) => s + (o.subtotal ?? 0), 0);
    const delivery = filteredOrders.reduce((s, o) => s + (o.delivery_fee ?? 0), 0);
    const discount = filteredOrders.reduce((s, o) => s + (o.discount_amount ?? 0), 0);
    // TVA included formula: HT = TTC / (1 + rate/100)
    const ratio = 1 + vatRate / 100;
    const ht = revenue / ratio;
    const tva = revenue - ht;
    const commissionTotal = filteredCommissions.reduce(
      (s, c) => s + Number(c.commission_amount),
      0
    );
    const commissionPaid = filteredCommissions
      .filter((c) => c.status === "completed")
      .reduce((s, c) => s + Number(c.commission_amount), 0);
    const withdrawalsPaid = filteredWithdrawals
      .filter((w) => w.status === "completed" || w.status === "approved")
      .reduce((s, w) => s + Number(w.amount), 0);
    const withdrawalsPending = filteredWithdrawals
      .filter((w) => w.status === "pending")
      .reduce((s, w) => s + Number(w.amount), 0);
    const netMargin = ht - commissionPaid;
    return {
      revenue,
      subtotal,
      delivery,
      discount,
      ht,
      tva,
      commissionTotal,
      commissionPaid,
      withdrawalsPaid,
      withdrawalsPending,
      netMargin,
      orderCount: filteredOrders.length,
    };
  }, [filteredOrders, filteredCommissions, filteredWithdrawals, vatRate]);

  // ---------- Aggregations per tab ----------
  const pnlRows = [
    { libelle: "Chiffre d'affaires TTC", montant: formatPrice(fin.revenue) },
    { libelle: `TVA collectée (${vatRate}%)`, montant: formatPrice(fin.tva) },
    { libelle: "Chiffre d'affaires HT", montant: formatPrice(fin.ht) },
    { libelle: "Sous-total produits", montant: formatPrice(fin.subtotal) },
    { libelle: "Frais de livraison facturés", montant: formatPrice(fin.delivery) },
    { libelle: "Remises accordées", montant: `- ${formatPrice(fin.discount)}` },
    { libelle: "Commissions ambassadeurs versées", montant: `- ${formatPrice(fin.commissionPaid)}` },
    { libelle: "Marge nette estimée (HT − commissions)", montant: formatPrice(fin.netMargin) },
    { libelle: "Retraits Mobile Money payés", montant: formatPrice(fin.withdrawalsPaid) },
    { libelle: "Retraits en attente", montant: formatPrice(fin.withdrawalsPending) },
    { libelle: "Nombre de commandes", montant: String(fin.orderCount) },
  ];

  const vatRows = useMemo(() => {
    const ratio = 1 + vatRate / 100;
    const map = new Map<string, { mois: string; ttc: number; ht: number; tva: number; orders: number }>();
    filteredOrders.forEach((o) => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = map.get(key) ?? { mois: key, ttc: 0, ht: 0, tva: 0, orders: 0 };
      cur.ttc += o.total ?? 0;
      cur.orders += 1;
      map.set(key, cur);
    });
    return Array.from(map.values())
      .map((r) => ({ ...r, ht: r.ttc / ratio, tva: r.ttc - r.ttc / ratio }))
      .sort((a, b) => a.mois.localeCompare(b.mois));
  }, [filteredOrders, vatRate]);

  const discountRows = useMemo(() => {
    return filteredOrders
      .filter((o) => (o.discount_amount ?? 0) > 0)
      .map((o) => ({
        order: o.order_number ?? String(o.id).slice(0, 8),
        date: o.created_at,
        total: o.total ?? 0,
        discount: o.discount_amount ?? 0,
        promo_code: (o as any).promo_code ?? "—",
      }));
  }, [filteredOrders]);

  const shippingRows = useMemo(() => {
    const map = new Map<string, { ville: string; orders: number; fees: number }>();
    filteredOrders.forEach((o) => {
      const city = (o as any).shipping_city ?? (o as any).city ?? "—";
      const cur = map.get(city) ?? { ville: city, orders: 0, fees: 0 };
      cur.orders += 1;
      cur.fees += o.delivery_fee ?? 0;
      map.set(city, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.fees - a.fees);
  }, [filteredOrders]);

  const commissionRows = useMemo(() => {
    const map = new Map<string, { mois: string; level1: number; level2: number; level3: number; total: number; count: number }>();
    filteredCommissions.forEach((c) => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = map.get(key) ?? { mois: key, level1: 0, level2: 0, level3: 0, total: 0, count: 0 };
      const amt = Number(c.commission_amount);
      if (c.level === 1) cur.level1 += amt;
      else if (c.level === 2) cur.level2 += amt;
      else if (c.level === 3) cur.level3 += amt;
      cur.total += amt;
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.mois.localeCompare(b.mois));
  }, [filteredCommissions]);

  const payoutRows = useMemo(
    () =>
      filteredWithdrawals.map((w) => ({
        date: w.created_at,
        user: String(w.user_id).slice(0, 8),
        amount: Number(w.amount),
        method: w.payment_method ?? "—",
        status: w.status,
        processed_at: w.processed_at,
      })),
    [filteredWithdrawals]
  );

  // ---------- Columns ----------
  const pnlCols: ReportColumn<any>[] = [
    { key: "libelle", label: "Libellé" },
    { key: "montant", label: "Montant", numeric: true },
  ];
  const vatCols: ReportColumn<any>[] = [
    { key: "mois", label: "Mois" },
    { key: "orders", label: "Commandes", numeric: true },
    { key: "ttc", label: "CA TTC", numeric: true, value: (r: any) => formatPrice(r.ttc) },
    { key: "ht", label: "CA HT", numeric: true, value: (r: any) => formatPrice(r.ht) },
    { key: "tva", label: "TVA", numeric: true, value: (r: any) => formatPrice(r.tva) },
  ];
  const discountCols: ReportColumn<any>[] = [
    { key: "order", label: "Commande" },
    { key: "date", label: "Date", value: (r: any) => new Date(r.date).toLocaleDateString("fr-FR") },
    { key: "promo_code", label: "Code promo" },
    { key: "discount", label: "Remise", numeric: true, value: (r: any) => formatPrice(r.discount) },
    { key: "total", label: "Total payé", numeric: true, value: (r: any) => formatPrice(r.total) },
  ];
  const shippingCols: ReportColumn<any>[] = [
    { key: "ville", label: "Ville" },
    { key: "orders", label: "Commandes", numeric: true },
    { key: "fees", label: "Frais collectés", numeric: true, value: (r: any) => formatPrice(r.fees) },
  ];
  const commissionCols: ReportColumn<any>[] = [
    { key: "mois", label: "Mois" },
    { key: "count", label: "N°", numeric: true },
    { key: "level1", label: "Niv. 1 (8%)", numeric: true, value: (r: any) => formatPrice(r.level1) },
    { key: "level2", label: "Niv. 2 (4%)", numeric: true, value: (r: any) => formatPrice(r.level2) },
    { key: "level3", label: "Niv. 3 (2%)", numeric: true, value: (r: any) => formatPrice(r.level3) },
    { key: "total", label: "Total", numeric: true, value: (r: any) => formatPrice(r.total) },
  ];
  const payoutCols: ReportColumn<any>[] = [
    { key: "date", label: "Demande", value: (r: any) => new Date(r.date).toLocaleDateString("fr-FR") },
    { key: "user", label: "Utilisateur" },
    { key: "method", label: "Méthode" },
    { key: "amount", label: "Montant", numeric: true, value: (r: any) => formatPrice(r.amount) },
    { key: "status", label: "Statut" },
    {
      key: "processed_at",
      label: "Traité",
      value: (r: any) => (r.processed_at ? new Date(r.processed_at).toLocaleDateString("fr-FR") : "—"),
    },
  ];

  const dataMap: Record<TabId, { rows: any[]; columns: ReportColumn<any>[]; label: string; icon: any }> = {
    pnl: { rows: pnlRows, columns: pnlCols, label: "P&L", icon: Calculator },
    vat: { rows: vatRows, columns: vatCols, label: "TVA", icon: Percent },
    discounts: { rows: discountRows, columns: discountCols, label: "Remises", icon: FileBarChart2 },
    shipping: { rows: shippingRows, columns: shippingCols, label: "Livraison", icon: Truck },
    commissions: { rows: commissionRows, columns: commissionCols, label: "Commissions MLM", icon: Wallet },
    payouts: { rows: payoutRows, columns: payoutCols, label: "Retraits", icon: Banknote },
  };

  const { rows, columns } = dataMap[tab];

  const meta = {
    title: `Rapport Financier — ${dataMap[tab].label}`,
    subtitle: `CA TTC ${formatPrice(fin.revenue)} · TVA ${formatPrice(fin.tva)} · ${fin.orderCount} commande(s)`,
    generatedBy: user?.email ?? undefined,
    orientation: "landscape" as const,
    filters: { Du: from || undefined, Au: to || undefined, "Taux TVA": `${vatRate}%` },
  };
  const filename = `financier-${tab}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" /> Rapports financiers consolidés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="CA TTC" value={formatPrice(fin.revenue)} />
          <Kpi label="CA HT" value={formatPrice(fin.ht)} />
          <Kpi label="TVA collectée" value={formatPrice(fin.tva)} />
          <Kpi label="Marge nette" value={formatPrice(fin.netMargin)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-cream/60">Du</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-cream/60">Au</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-cream/60">Taux TVA (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
          <TabsList className="flex-wrap h-auto">
            {(Object.keys(dataMap) as TabId[]).map((id) => {
              const Icon = dataMap[id].icon;
              return (
                <TabsTrigger key={id} value={id}>
                  <Icon className="h-4 w-4 mr-1.5" />
                  {dataMap[id].label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(dataMap) as TabId[]).map((id) => (
            <TabsContent key={id} value={id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-cream/60">{rows.length} ligne(s)</div>
                <ExportButtonGroup meta={meta} columns={columns} rows={rows} filename={filename} />
              </div>
              <ReportTable columns={columns} rows={rows} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-noir/70 border border-gold/15 rounded-lg p-3">
      <div className="text-xs text-cream/60">{label}</div>
      <div className="text-lg font-semibold text-primary mt-1">{value}</div>
    </div>
  );
}

function ReportTable({ columns, rows }: { columns: ReportColumn<any>[]; rows: any[] }) {
  return (
    <div className="overflow-x-auto border border-gold/10 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gold/10 text-primary">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 text-left ${c.numeric ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((r: any, i: number) => (
            <tr key={i} className="border-t border-gold/5">
              {columns.map((c) => {
                const raw = c.value ? c.value(r) : r[c.key];
                return (
                  <td key={c.key} className={`px-3 py-2 ${c.numeric ? "text-right" : ""}`}>
                    {raw === null || raw === undefined ? "—" : String(raw)}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-cream/50">
                Aucune donnée
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.length > 100 && (
        <div className="px-3 py-2 text-xs text-cream/50 border-t border-gold/5">
          Aperçu limité aux 100 premières lignes. L'export contient tout.
        </div>
      )}
    </div>
  );
}