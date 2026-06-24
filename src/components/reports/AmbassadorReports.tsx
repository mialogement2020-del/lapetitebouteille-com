import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportButtonGroup } from "@/components/admin/reports/ExportButtonGroup";
import type { ReportColumn } from "@/lib/reporting";
import { useAuthContext } from "@/contexts/AuthContext";
import type { AmbassadorStats, Commission, Referral, WalletTransaction } from "@/hooks/useAmbassador";
import { FileBarChart2, TrendingUp, Users, Wallet, Layers } from "lucide-react";

interface Props {
  stats?: AmbassadorStats;
  commissions: Commission[];
  referrals: Referral[];
  transactions: WalletTransaction[];
}

type TabId = "summary" | "commissions" | "levels" | "network" | "wallet";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

export default function AmbassadorReports({ stats, commissions, referrals, transactions }: Props) {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<TabId>("summary");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("__all__");

  const statuses = useMemo(() => {
    const s = new Set<string>();
    commissions.forEach((c) => s.add(c.status));
    return Array.from(s).sort();
  }, [commissions]);

  const filteredCommissions = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 86400000 : Infinity;
    return commissions.filter((c) => {
      const t = new Date(c.created_at).getTime();
      if (t < fromTs || t >= toTs) return false;
      if (status !== "__all__" && c.status !== status) return false;
      return true;
    });
  }, [commissions, from, to, status]);

  const filteredTransactions = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 86400000 : Infinity;
    return transactions.filter((t) => {
      const ts = new Date(t.created_at).getTime();
      return ts >= fromTs && ts < toTs;
    });
  }, [transactions, from, to]);

  const kpi = useMemo(() => {
    const totalCommission = filteredCommissions.reduce((s, c) => s + Number(c.commission_amount), 0);
    const completed = filteredCommissions
      .filter((c) => c.status === "completed")
      .reduce((s, c) => s + Number(c.commission_amount), 0);
    const pending = filteredCommissions
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + Number(c.commission_amount), 0);
    return {
      totalCommission,
      completed,
      pending,
      count: filteredCommissions.length,
      network: referrals.length,
    };
  }, [filteredCommissions, referrals]);

  const byLevel = useMemo(() => {
    const m = new Map<number, { level: number; count: number; volume: number; commission: number }>();
    filteredCommissions.forEach((c) => {
      const cur = m.get(c.level) ?? { level: c.level, count: 0, volume: 0, commission: 0 };
      cur.count += 1;
      cur.volume += Number(c.order_amount);
      cur.commission += Number(c.commission_amount);
      m.set(c.level, cur);
    });
    return Array.from(m.values()).sort((a, b) => a.level - b.level);
  }, [filteredCommissions]);

  const networkRows = useMemo(
    () =>
      referrals.map((r) => ({
        name:
          [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(" ") ||
          r.referred_id.slice(0, 8),
        level: r.level,
        rank: r.rank ?? "—",
        created_at: r.created_at,
      })),
    [referrals]
  );

  const summaryRows = [
    { metric: "Rang actuel", value: stats?.currentRank ?? "—" },
    { metric: "Filleuls totaux", value: stats?.totalReferrals ?? 0 },
    { metric: "Filleuls actifs", value: stats?.activeReferrals ?? 0 },
    { metric: "Commandes générées", value: stats?.totalOrders ?? 0 },
    { metric: "Gains totaux", value: formatPrice(stats?.totalEarnings ?? 0) },
    { metric: "Gains du mois", value: formatPrice(stats?.monthlyEarnings ?? 0) },
    { metric: "Solde disponible", value: formatPrice(stats?.availableBalance ?? 0) },
    { metric: "Solde en attente", value: formatPrice(stats?.pendingBalance ?? 0) },
    { metric: "Commissions (période)", value: formatPrice(kpi.totalCommission) },
    { metric: "Dont validées", value: formatPrice(kpi.completed) },
    { metric: "Dont en attente", value: formatPrice(kpi.pending) },
  ];

  const summaryColumns: ReportColumn<any>[] = [
    { key: "metric", label: "Indicateur" },
    { key: "value", label: "Valeur", numeric: true },
  ];

  const commissionColumns: ReportColumn<any>[] = [
    {
      key: "created_at",
      label: "Date",
      value: (r: any) => new Date(r.created_at).toLocaleDateString("fr-FR"),
    },
    { key: "order_id", label: "Commande", value: (r: any) => String(r.order_id).slice(0, 8) },
    { key: "level", label: "Niv.", numeric: true },
    { key: "order_amount", label: "Volume", numeric: true, value: (r: any) => formatPrice(Number(r.order_amount)) },
    { key: "commission_rate", label: "Taux", numeric: true, value: (r: any) => `${Number(r.commission_rate)}%` },
    { key: "commission_amount", label: "Commission", numeric: true, value: (r: any) => formatPrice(Number(r.commission_amount)) },
    { key: "status", label: "Statut" },
  ];

  const levelColumns: ReportColumn<any>[] = [
    { key: "level", label: "Niveau", numeric: true },
    { key: "count", label: "Commissions", numeric: true },
    { key: "volume", label: "Volume", numeric: true, value: (r: any) => formatPrice(r.volume) },
    { key: "commission", label: "Gains", numeric: true, value: (r: any) => formatPrice(r.commission) },
  ];

  const networkColumns: ReportColumn<any>[] = [
    { key: "name", label: "Filleul" },
    { key: "level", label: "Niveau", numeric: true },
    { key: "rank", label: "Rang" },
    {
      key: "created_at",
      label: "Inscrit le",
      value: (r: any) => new Date(r.created_at).toLocaleDateString("fr-FR"),
    },
  ];

  const walletColumns: ReportColumn<any>[] = [
    {
      key: "created_at",
      label: "Date",
      value: (r: any) => new Date(r.created_at).toLocaleDateString("fr-FR"),
    },
    { key: "type", label: "Type" },
    { key: "amount", label: "Montant", numeric: true, value: (r: any) => formatPrice(Number(r.amount)) },
    { key: "balance_after", label: "Solde", numeric: true, value: (r: any) => formatPrice(Number(r.balance_after)) },
    { key: "description", label: "Description" },
  ];

  const dataMap: Record<TabId, { rows: any[]; columns: ReportColumn<any>[]; label: string; icon: any }> = {
    summary: { rows: summaryRows, columns: summaryColumns, label: "Synthèse", icon: TrendingUp },
    commissions: { rows: filteredCommissions, columns: commissionColumns, label: "Commissions", icon: FileBarChart2 },
    levels: { rows: byLevel, columns: levelColumns, label: "Par niveau", icon: Layers },
    network: { rows: networkRows, columns: networkColumns, label: "Réseau", icon: Users },
    wallet: { rows: filteredTransactions, columns: walletColumns, label: "Portefeuille", icon: Wallet },
  };

  const { rows, columns } = dataMap[tab];

  const meta = {
    title: `Rapport Ambassadeur — ${dataMap[tab].label}`,
    subtitle: `${stats?.currentRank ?? "—"} · ${stats?.totalReferrals ?? 0} filleul(s) · ${formatPrice(stats?.totalEarnings ?? 0)}`,
    generatedBy: user?.email ?? undefined,
    orientation: "landscape" as const,
    filters: {
      Du: from || undefined,
      Au: to || undefined,
      Statut: status !== "__all__" ? status : undefined,
    },
  };

  const filename = `ambassadeur-${tab}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream flex items-center gap-2">
          <FileBarChart2 className="h-5 w-5 text-primary" /> Rapports & exports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Réseau" value={String(kpi.network)} />
          <Kpi label="Commissions" value={String(kpi.count)} />
          <Kpi label="Gains validés" value={formatPrice(kpi.completed)} />
          <Kpi label="En attente" value={formatPrice(kpi.pending)} />
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
            <Label className="text-xs text-cream/60">Statut commission</Label>
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