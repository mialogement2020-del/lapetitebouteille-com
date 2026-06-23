import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExportButtonGroup } from "@/components/admin/reports/ExportButtonGroup";
import type { ReportColumn } from "@/lib/reporting";
import type { VendorOrderLine } from "@/hooks/useVendorOrders";
import { useAuthContext } from "@/contexts/AuthContext";
import { FileBarChart2, Package, TrendingUp, ListOrdered } from "lucide-react";

interface Props {
  lines: VendorOrderLine[];
  shopName?: string;
}

type TabId = "summary" | "lines" | "products" | "fulfillment";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

export default function VendorReports({ lines, shopName }: Props) {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<TabId>("summary");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("__all__");

  const statuses = useMemo(() => {
    const s = new Set<string>();
    lines.forEach((l) => s.add(l.vendor_status));
    return Array.from(s).sort();
  }, [lines]);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 86400000 : Infinity;
    return lines.filter((l) => {
      const t = new Date(l.order_created_at).getTime();
      if (t < fromTs || t >= toTs) return false;
      if (status !== "__all__" && l.vendor_status !== status) return false;
      return true;
    });
  }, [lines, from, to, status]);

  const kpi = useMemo(() => {
    const units = filtered.reduce((s, l) => s + l.quantity, 0);
    const revenue = filtered.reduce((s, l) => s + l.total_price, 0);
    const orders = new Set(filtered.map((l) => l.order_id)).size;
    return { units, revenue, orders, items: filtered.length };
  }, [filtered]);

  const byProduct = useMemo(() => {
    const m = new Map<string, { product: string; units: number; revenue: number; orders: number }>();
    const orderSeen = new Map<string, Set<string>>();
    filtered.forEach((l) => {
      const cur = m.get(l.product_name) ?? { product: l.product_name, units: 0, revenue: 0, orders: 0 };
      cur.units += l.quantity;
      cur.revenue += l.total_price;
      const seen = orderSeen.get(l.product_name) ?? new Set();
      if (!seen.has(l.order_id)) { cur.orders += 1; seen.add(l.order_id); }
      orderSeen.set(l.product_name, seen);
      m.set(l.product_name, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const byStatus = useMemo(() => {
    const m = new Map<string, { status: string; items: number; units: number; revenue: number }>();
    filtered.forEach((l) => {
      const cur = m.get(l.vendor_status) ?? { status: l.vendor_status, items: 0, units: 0, revenue: 0 };
      cur.items += 1;
      cur.units += l.quantity;
      cur.revenue += l.total_price;
      m.set(l.vendor_status, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const summaryRows = [
    { metric: "Commandes uniques", value: kpi.orders },
    { metric: "Lignes de commande", value: kpi.items },
    { metric: "Unités vendues", value: kpi.units },
    { metric: "Chiffre d'affaires", value: formatPrice(kpi.revenue) },
  ];
  const summaryColumns: ReportColumn<any>[] = [
    { key: "metric", label: "Indicateur" },
    { key: "value", label: "Valeur", numeric: true },
  ];

  const lineColumns: ReportColumn<any>[] = [
    { key: "order_number", label: "Commande" },
    {
      key: "order_created_at",
      label: "Date",
      value: (r: any) => new Date(r.order_created_at).toLocaleDateString("fr-FR"),
    },
    { key: "product_name", label: "Produit" },
    { key: "quantity", label: "Qté", numeric: true },
    { key: "unit_price", label: "PU", numeric: true, value: (r: any) => formatPrice(r.unit_price) },
    { key: "total_price", label: "Total", numeric: true, value: (r: any) => formatPrice(r.total_price) },
    { key: "vendor_status", label: "Statut" },
    { key: "shipping_city", label: "Ville" },
  ];

  const productColumns: ReportColumn<any>[] = [
    { key: "product", label: "Produit" },
    { key: "units", label: "Unités", numeric: true },
    { key: "orders", label: "Commandes", numeric: true },
    { key: "revenue", label: "CA", numeric: true, value: (r: any) => formatPrice(r.revenue) },
  ];

  const statusColumns: ReportColumn<any>[] = [
    { key: "status", label: "Statut" },
    { key: "items", label: "Lignes", numeric: true },
    { key: "units", label: "Unités", numeric: true },
    { key: "revenue", label: "CA", numeric: true, value: (r: any) => formatPrice(r.revenue) },
  ];

  const dataMap: Record<TabId, { rows: any[]; columns: ReportColumn<any>[]; label: string; icon: any }> = {
    summary: { rows: summaryRows, columns: summaryColumns, label: "Synthèse", icon: TrendingUp },
    lines: { rows: filtered, columns: lineColumns, label: "Lignes", icon: ListOrdered },
    products: { rows: byProduct, columns: productColumns, label: "Top produits", icon: Package },
    fulfillment: { rows: byStatus, columns: statusColumns, label: "Par statut", icon: FileBarChart2 },
  };

  const { rows, columns } = dataMap[tab];

  const meta = {
    title: `Rapport Vendeur — ${dataMap[tab].label}`,
    subtitle: `${shopName ?? "Ma boutique"} — ${kpi.orders} commande(s) · ${formatPrice(kpi.revenue)}`,
    generatedBy: user?.email ?? undefined,
    orientation: "landscape" as const,
    filters: {
      Du: from || undefined,
      Au: to || undefined,
      Statut: status !== "__all__" ? status : undefined,
    },
  };

  const filename = `vendeur-${tab}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream flex items-center gap-2">
          <FileBarChart2 className="h-5 w-5 text-primary" /> Rapports & exports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Commandes" value={String(kpi.orders)} />
          <Kpi label="Unités" value={String(kpi.units)} />
          <Kpi label="CA" value={formatPrice(kpi.revenue)} />
          <Kpi label="Lignes" value={String(kpi.items)} />
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
            <Label className="text-xs text-cream/60">Statut</Label>
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