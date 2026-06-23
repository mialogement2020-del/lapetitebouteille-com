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
import type { WholesaleInvoice, InvoiceStatus } from "@/hooks/useWholesaleInvoices";
import { useAuthContext } from "@/contexts/AuthContext";
import { FileBarChart2, Receipt, TrendingUp, AlertCircle } from "lucide-react";

interface Props {
  invoices: WholesaleInvoice[];
  outstanding?: number;
  companyName?: string;
}

type TabId = "summary" | "invoices" | "by-status" | "outstanding";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

export default function WholesalerReports({ invoices, outstanding = 0, companyName }: Props) {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<TabId>("summary");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<string>("__all__");

  const statuses = useMemo(() => {
    const s = new Set<InvoiceStatus>();
    invoices.forEach((i) => s.add(i.status));
    return Array.from(s).sort();
  }, [invoices]);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 86400000 : Infinity;
    return invoices.filter((inv) => {
      const t = new Date(inv.issued_at).getTime();
      if (t < fromTs || t >= toTs) return false;
      if (status !== "__all__" && inv.status !== status) return false;
      return true;
    });
  }, [invoices, from, to, status]);

  const kpi = useMemo(() => {
    const ttc = filtered.reduce((s, i) => s + i.amount_ttc, 0);
    const paid = filtered.reduce((s, i) => s + i.amount_paid, 0);
    const balance = ttc - paid;
    const tva = filtered.reduce((s, i) => s + i.amount_tva, 0);
    return { count: filtered.length, ttc, paid, balance, tva };
  }, [filtered]);

  const summaryRows = [
    { metric: "Nombre de factures", value: kpi.count },
    { metric: "Montant TTC total", value: formatPrice(kpi.ttc) },
    { metric: "Montant payé", value: formatPrice(kpi.paid) },
    { metric: "Solde restant dû", value: formatPrice(kpi.balance) },
    { metric: "TVA totale", value: formatPrice(kpi.tva) },
    { metric: "Encours global (toutes factures)", value: formatPrice(outstanding) },
  ];
  const summaryColumns: ReportColumn<any>[] = [
    { key: "metric", label: "Indicateur" },
    { key: "value", label: "Valeur", numeric: true },
  ];

  const invoiceColumns: ReportColumn<any>[] = [
    { key: "invoice_number", label: "N° Facture" },
    {
      key: "issued_at",
      label: "Émise le",
      value: (r: any) => new Date(r.issued_at).toLocaleDateString("fr-FR"),
    },
    {
      key: "due_date",
      label: "Échéance",
      value: (r: any) => (r.due_date ? new Date(r.due_date).toLocaleDateString("fr-FR") : "—"),
    },
    { key: "status", label: "Statut" },
    { key: "amount_ht", label: "HT", numeric: true, value: (r: any) => formatPrice(r.amount_ht) },
    { key: "amount_tva", label: "TVA", numeric: true, value: (r: any) => formatPrice(r.amount_tva) },
    { key: "amount_ttc", label: "TTC", numeric: true, value: (r: any) => formatPrice(r.amount_ttc) },
    { key: "amount_paid", label: "Payé", numeric: true, value: (r: any) => formatPrice(r.amount_paid) },
    {
      key: "balance",
      label: "Solde",
      numeric: true,
      value: (r: any) => formatPrice(r.amount_ttc - r.amount_paid),
    },
  ];

  const byStatus = useMemo(() => {
    const m = new Map<string, { status: string; count: number; ttc: number; paid: number; balance: number }>();
    filtered.forEach((i) => {
      const cur = m.get(i.status) ?? { status: i.status, count: 0, ttc: 0, paid: 0, balance: 0 };
      cur.count += 1;
      cur.ttc += i.amount_ttc;
      cur.paid += i.amount_paid;
      cur.balance += i.amount_ttc - i.amount_paid;
      m.set(i.status, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.ttc - a.ttc);
  }, [filtered]);

  const statusColumns: ReportColumn<any>[] = [
    { key: "status", label: "Statut" },
    { key: "count", label: "Factures", numeric: true },
    { key: "ttc", label: "TTC", numeric: true, value: (r: any) => formatPrice(r.ttc) },
    { key: "paid", label: "Payé", numeric: true, value: (r: any) => formatPrice(r.paid) },
    { key: "balance", label: "Solde", numeric: true, value: (r: any) => formatPrice(r.balance) },
  ];

  const outstandingRows = useMemo(
    () =>
      filtered
        .filter((i) => i.amount_ttc - i.amount_paid > 0 && i.status !== "cancelled")
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")),
    [filtered],
  );

  const dataMap: Record<TabId, { rows: any[]; columns: ReportColumn<any>[]; label: string; icon: any }> = {
    summary: { rows: summaryRows, columns: summaryColumns, label: "Synthèse", icon: TrendingUp },
    invoices: { rows: filtered, columns: invoiceColumns, label: "Factures", icon: Receipt },
    "by-status": { rows: byStatus, columns: statusColumns, label: "Par statut", icon: FileBarChart2 },
    outstanding: { rows: outstandingRows, columns: invoiceColumns, label: "Impayés", icon: AlertCircle },
  };

  const { rows, columns } = dataMap[tab];

  const meta = {
    title: `Rapport Grossiste — ${dataMap[tab].label}`,
    subtitle: `${companyName ?? "Mon compte B2B"} — ${kpi.count} facture(s) · Solde ${formatPrice(kpi.balance)}`,
    generatedBy: user?.email ?? undefined,
    orientation: "landscape" as const,
    filters: {
      Du: from || undefined,
      Au: to || undefined,
      Statut: status !== "__all__" ? status : undefined,
    },
  };

  const filename = `grossiste-${tab}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream flex items-center gap-2">
          <FileBarChart2 className="h-5 w-5 text-primary" /> Rapports & comptabilité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Factures" value={String(kpi.count)} />
          <Kpi label="TTC" value={formatPrice(kpi.ttc)} />
          <Kpi label="Payé" value={formatPrice(kpi.paid)} />
          <Kpi label="Solde" value={formatPrice(kpi.balance)} />
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