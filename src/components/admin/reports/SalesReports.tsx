import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportButtonGroup } from "./ExportButtonGroup";
import type { ReportColumn } from "@/lib/reporting";
import type { AdminOrder } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart as LineIcon,
  CalendarDays,
  TrendingUp,
  Package,
  Users,
} from "lucide-react";

interface Props {
  orders: AdminOrder[];
  isLoading?: boolean;
}

type Period = "daily" | "weekly" | "monthly" | "quarterly" | "annual";
type TabId = "summary" | "by-period" | "by-status" | "top-products" | "top-customers";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

const PERIOD_LABEL: Record<Period, string> = {
  daily: "Journalier",
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  annual: "Annuel",
};

function periodKey(date: Date, p: Period): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (p) {
    case "daily":
      return `${y}-${pad(m)}-${pad(d)}`;
    case "weekly": {
      // ISO week
      const tmp = new Date(Date.UTC(y, date.getMonth(), d));
      const day = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const week = Math.ceil(
        ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
      );
      return `${tmp.getUTCFullYear()}-S${pad(week)}`;
    }
    case "monthly":
      return `${y}-${pad(m)}`;
    case "quarterly":
      return `${y}-T${Math.floor((m - 1) / 3) + 1}`;
    case "annual":
      return `${y}`;
  }
}

const TAB_CONFIG: Record<TabId, { label: string; icon: any; title: string }> = {
  summary: {
    label: "Synthèse",
    icon: TrendingUp,
    title: "Synthèse des ventes",
  },
  "by-period": {
    label: "Par période",
    icon: CalendarDays,
    title: "Ventes par période",
  },
  "by-status": {
    label: "Par statut",
    icon: LineIcon,
    title: "Ventes par statut",
  },
  "top-products": {
    label: "Top produits",
    icon: Package,
    title: "Produits les plus vendus",
  },
  "top-customers": {
    label: "Top clients",
    icon: Users,
    title: "Meilleurs clients",
  },
};

export default function SalesReports({ orders, isLoading }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("summary");
  const [period, setPeriod] = useState<Period>("monthly");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<string>("__all__");
  const [payment, setPayment] = useState<string>("__all__");

  const statuses = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => o.status && s.add(o.status));
    return Array.from(s).sort();
  }, [orders]);

  const payments = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => o.payment_method && s.add(o.payment_method));
    return Array.from(s).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 86400000 : Infinity;
    return orders.filter((o) => {
      if (!o.created_at) return false;
      const t = new Date(o.created_at).getTime();
      if (t < fromTs || t >= toTs) return false;
      if (status !== "__all__" && o.status !== status) return false;
      if (payment !== "__all__" && o.payment_method !== payment) return false;
      return true;
    });
  }, [orders, from, to, status, payment]);

  // KPI synthesis
  const kpi = useMemo(() => {
    const orderCount = filtered.length;
    const revenue = filtered.reduce((s, o) => s + (o.total ?? 0), 0);
    const subtotal = filtered.reduce((s, o) => s + (o.subtotal ?? 0), 0);
    const delivery = filtered.reduce((s, o) => s + (o.delivery_fee ?? 0), 0);
    const discount = filtered.reduce((s, o) => s + (o.discount_amount ?? 0), 0);
    const units = filtered.reduce(
      (s, o) => s + o.items.reduce((a, it) => a + it.quantity, 0),
      0,
    );
    const aov = orderCount ? revenue / orderCount : 0;
    return { orderCount, revenue, subtotal, delivery, discount, units, aov };
  }, [filtered]);

  // Aggregations
  const byPeriod = useMemo(() => {
    const map = new Map<
      string,
      { period: string; orders: number; revenue: number; units: number; aov: number }
    >();
    filtered.forEach((o) => {
      if (!o.created_at) return;
      const key = periodKey(new Date(o.created_at), period);
      const cur = map.get(key) ?? {
        period: key,
        orders: 0,
        revenue: 0,
        units: 0,
        aov: 0,
      };
      cur.orders += 1;
      cur.revenue += o.total ?? 0;
      cur.units += o.items.reduce((a, it) => a + it.quantity, 0);
      map.set(key, cur);
    });
    return Array.from(map.values())
      .map((r) => ({ ...r, aov: r.orders ? r.revenue / r.orders : 0 }))
      .sort((a, b) => (a.period < b.period ? 1 : -1));
  }, [filtered, period]);

  const byStatus = useMemo(() => {
    const map = new Map<string, { status: string; orders: number; revenue: number }>();
    filtered.forEach((o) => {
      const k = o.status ?? "—";
      const cur = map.get(k) ?? { status: k, orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += o.total ?? 0;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { product: string; units: number; revenue: number; orders: number }
    >();
    filtered.forEach((o) => {
      const seen = new Set<string>();
      o.items.forEach((it) => {
        const cur = map.get(it.product_name) ?? {
          product: it.product_name,
          units: 0,
          revenue: 0,
          orders: 0,
        };
        cur.units += it.quantity;
        cur.revenue += it.total_price;
        if (!seen.has(it.product_name)) {
          cur.orders += 1;
          seen.add(it.product_name);
        }
        map.set(it.product_name, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const topCustomers = useMemo(() => {
    const map = new Map<
      string,
      { customer: string; contact: string; orders: number; revenue: number }
    >();
    filtered.forEach((o) => {
      const key = o.user_id || o.guest_email || o.shipping_phone || o.id;
      const cur = map.get(key) ?? {
        customer: o.shipping_full_name ?? "Invité",
        contact: o.guest_email ?? o.shipping_phone ?? "—",
        orders: 0,
        revenue: 0,
      };
      cur.orders += 1;
      cur.revenue += o.total ?? 0;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const periodColumns: ReportColumn<any>[] = [
    { key: "period", label: PERIOD_LABEL[period] },
    { key: "orders", label: "Commandes", numeric: true },
    { key: "units", label: "Unités", numeric: true },
    {
      key: "revenue",
      label: "CA",
      numeric: true,
      value: (r: any) => formatPrice(r.revenue),
    },
    {
      key: "aov",
      label: "Panier moyen",
      numeric: true,
      value: (r: any) => formatPrice(r.aov),
    },
  ];

  const statusColumns: ReportColumn<any>[] = [
    { key: "status", label: "Statut" },
    { key: "orders", label: "Commandes", numeric: true },
    {
      key: "revenue",
      label: "CA",
      numeric: true,
      value: (r: any) => formatPrice(r.revenue),
    },
  ];

  const productColumns: ReportColumn<any>[] = [
    { key: "product", label: "Produit" },
    { key: "units", label: "Unités vendues", numeric: true },
    { key: "orders", label: "Commandes", numeric: true },
    {
      key: "revenue",
      label: "CA généré",
      numeric: true,
      value: (r: any) => formatPrice(r.revenue),
    },
  ];

  const customerColumns: ReportColumn<any>[] = [
    { key: "customer", label: "Client" },
    { key: "contact", label: "Contact" },
    { key: "orders", label: "Commandes", numeric: true },
    {
      key: "revenue",
      label: "CA",
      numeric: true,
      value: (r: any) => formatPrice(r.revenue),
    },
  ];

  const summaryColumns: ReportColumn<any>[] = [
    { key: "metric", label: "Indicateur" },
    { key: "value", label: "Valeur", numeric: true },
  ];

  const summaryRows = [
    { metric: "Nombre de commandes", value: kpi.orderCount },
    { metric: "Unités vendues", value: kpi.units },
    { metric: "Chiffre d'affaires total", value: formatPrice(kpi.revenue) },
    { metric: "Sous-total produits", value: formatPrice(kpi.subtotal) },
    { metric: "Frais de livraison encaissés", value: formatPrice(kpi.delivery) },
    { metric: "Remises accordées", value: formatPrice(kpi.discount) },
    { metric: "Panier moyen", value: formatPrice(kpi.aov) },
  ];

  const dataMap: Record<TabId, { rows: any[]; columns: ReportColumn<any>[] }> = {
    summary: { rows: summaryRows, columns: summaryColumns },
    "by-period": { rows: byPeriod, columns: periodColumns },
    "by-status": { rows: byStatus, columns: statusColumns },
    "top-products": { rows: topProducts, columns: productColumns },
    "top-customers": { rows: topCustomers, columns: customerColumns },
  };

  const { rows, columns } = dataMap[tab];

  const totals: Record<string, any> | undefined =
    tab === "by-period"
      ? {
          period: "TOTAL",
          orders: kpi.orderCount,
          units: kpi.units,
          revenue: formatPrice(kpi.revenue),
          aov: formatPrice(kpi.aov),
        }
      : tab === "by-status"
        ? {
            status: "TOTAL",
            orders: kpi.orderCount,
            revenue: formatPrice(kpi.revenue),
          }
        : tab === "top-products"
          ? {
              product: "TOTAL",
              units: topProducts.reduce((s, r) => s + r.units, 0),
              orders: kpi.orderCount,
              revenue: formatPrice(
                topProducts.reduce((s, r) => s + r.revenue, 0),
              ),
            }
          : tab === "top-customers"
            ? {
                customer: "TOTAL",
                contact: "",
                orders: kpi.orderCount,
                revenue: formatPrice(kpi.revenue),
              }
            : undefined;

  const meta = {
    title: TAB_CONFIG[tab].title,
    subtitle: `Rapport de ventes — ${kpi.orderCount} commande(s) — ${formatPrice(kpi.revenue)}`,
    generatedBy: user?.email ?? undefined,
    orientation: "landscape" as const,
    filters: {
      Période: PERIOD_LABEL[period],
      Du: from || undefined,
      Au: to || undefined,
      Statut: status !== "__all__" ? status : undefined,
      Paiement: payment !== "__all__" ? payment : undefined,
    },
    totals,
  };

  const filename = `ventes-${tab}-${period}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> Rapports de ventes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Commandes" value={String(kpi.orderCount)} />
          <KpiCard label="Chiffre d'affaires" value={formatPrice(kpi.revenue)} />
          <KpiCard label="Panier moyen" value={formatPrice(kpi.aov)} />
          <KpiCard label="Unités" value={String(kpi.units)} />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Période</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                  <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Du</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Au</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Paiement</Label>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous</SelectItem>
                {payments.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
          <TabsList className="flex-wrap h-auto">
            {Object.entries(TAB_CONFIG).map(([id, cfg]) => {
              const Icon = cfg.icon;
              return (
                <TabsTrigger key={id} value={id}>
                  <Icon className="h-4 w-4 mr-1.5" />
                  {cfg.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(TAB_CONFIG).map((id) => (
            <TabsContent key={id} value={id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {rows.length} ligne(s) — CA: {formatPrice(kpi.revenue)}
                </div>
                <ExportButtonGroup
                  meta={meta}
                  columns={columns}
                  rows={rows}
                  filename={filename}
                  disabled={isLoading}
                />
              </div>
              <div className="overflow-x-auto border border-gold/10 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gold/10 text-gold">
                    <tr>
                      {columns.map((c) => (
                        <th
                          key={c.key}
                          className={`px-3 py-2 text-left ${c.numeric ? "text-right" : ""}`}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r: any, idx: number) => (
                      <tr key={idx} className="border-t border-gold/5">
                        {columns.map((c) => {
                          const raw = c.value ? c.value(r) : r[c.key];
                          return (
                            <td
                              key={c.key}
                              className={`px-3 py-2 ${c.numeric ? "text-right" : ""}`}
                            >
                              {raw === null || raw === undefined ? "—" : String(raw)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          Aucune donnée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {rows.length > 100 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-t border-gold/5">
                    Aperçu limité aux 100 premières lignes. L'export contient toutes les lignes.
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-noir/70 border border-gold/15 rounded-lg p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-gold mt-1">{value}</div>
    </div>
  );
}