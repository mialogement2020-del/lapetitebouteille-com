import { useState } from "react";
import { useBusinessAnalytics } from "@/hooks/useBusinessAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Download, TrendingUp, Users, Crown, Layers } from "lucide-react";
import { convertToCSV, downloadCSV } from "@/lib/csvExport";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
const fmtFCFA = (n: number) => `${fmt(n)} FCFA`;

export function BusinessAnalyticsDashboard() {
  const [days, setDays] = useState(90);
  const {
    cohorts,
    cohortsLoading,
    ltv,
    ltvLoading,
    attribution,
    revenue,
    topAmbassadors,
  } = useBusinessAnalytics(days);

  const totalRevenue = revenue.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  const totalOrders = revenue.reduce((s, r) => s + Number(r.order_count || 0), 0);
  const totalReferralRev = revenue.reduce((s, r) => s + Number(r.referral_revenue || 0), 0);
  const totalMarketplaceRev = revenue.reduce(
    (s, r) => s + Number(r.marketplace_revenue || 0),
    0
  );
  const avgLTV =
    ltv.length === 0 ? 0 : ltv.reduce((s, c) => s + Number(c.total_spent || 0), 0) / ltv.length;

  const exportLTV = () => {
    const rows = ltv.map((c) => ({
      client: c.customer_label,
      commandes: c.order_count,
      total_depense_fcfa: c.total_spent,
      panier_moyen_fcfa: Math.round(c.avg_order_value),
      premiere_commande: c.first_order_at?.slice(0, 10),
      derniere_commande: c.last_order_at?.slice(0, 10),
      jours_actifs: c.days_active,
    }));
    downloadCSV(
      convertToCSV(rows, [
        { key: "client", header: "Client" },
        { key: "commandes", header: "Commandes" },
        { key: "total_depense_fcfa", header: "Total dépensé (FCFA)" },
        { key: "panier_moyen_fcfa", header: "Panier moyen (FCFA)" },
        { key: "premiere_commande", header: "Première commande" },
        { key: "derniere_commande", header: "Dernière commande" },
        { key: "jours_actifs", header: "Jours actifs" },
      ]),
      `ltv-clients-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const exportCohorts = () => {
    const rows = cohorts.map((c) => ({
      cohorte: c.cohort_month?.slice(0, 7),
      taille: c.cohort_size,
      retention_m1: c.retained_m1,
      retention_m3: c.retained_m3,
      retention_m6: c.retained_m6,
      revenu_total_fcfa: c.total_revenue,
    }));
    downloadCSV(
      convertToCSV(rows, [
        { key: "cohorte", header: "Cohorte" },
        { key: "taille", header: "Taille" },
        { key: "retention_m1", header: "Rétention M+1" },
        { key: "retention_m3", header: "Rétention M+3" },
        { key: "retention_m6", header: "Rétention M+6" },
        { key: "revenu_total_fcfa", header: "Revenu total (FCFA)" },
      ]),
      `cohortes-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display text-cream">Analytics business</h2>
          <p className="text-cream/60 text-sm">Cohortes, LTV et attribution MLM</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
            <SelectItem value="180">6 derniers mois</SelectItem>
            <SelectItem value="365">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-noir-light/40 border-gold/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-cream/60 text-xs uppercase">
              <TrendingUp className="h-3 w-3" /> CA période
            </div>
            <div className="text-2xl font-bold text-cream mt-1">{fmtFCFA(totalRevenue)}</div>
            <div className="text-xs text-cream/50">{fmt(totalOrders)} commandes</div>
          </CardContent>
        </Card>
        <Card className="bg-noir-light/40 border-gold/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-cream/60 text-xs uppercase">
              <Users className="h-3 w-3" /> LTV moyenne
            </div>
            <div className="text-2xl font-bold text-cream mt-1">{fmtFCFA(avgLTV)}</div>
            <div className="text-xs text-cream/50">Top {ltv.length} clients</div>
          </CardContent>
        </Card>
        <Card className="bg-noir-light/40 border-gold/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-cream/60 text-xs uppercase">
              <Crown className="h-3 w-3" /> CA parrainage
            </div>
            <div className="text-2xl font-bold text-cream mt-1">
              {fmtFCFA(totalReferralRev)}
            </div>
            <div className="text-xs text-cream/50">
              {totalRevenue > 0
                ? Math.round((totalReferralRev / totalRevenue) * 100)
                : 0}
              % du CA
            </div>
          </CardContent>
        </Card>
        <Card className="bg-noir-light/40 border-gold/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-cream/60 text-xs uppercase">
              <Layers className="h-3 w-3" /> CA marketplace
            </div>
            <div className="text-2xl font-bold text-cream mt-1">
              {fmtFCFA(totalMarketplaceRev)}
            </div>
            <div className="text-xs text-cream/50">Vendeurs tiers</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue breakdown chart */}
      <Card className="bg-noir-light/40 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream">Évolution du CA par source</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="cDirect" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cRef" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cMkt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                formatter={(v: number) => fmtFCFA(v)}
              />
              <Legend />
              <Area type="monotone" dataKey="direct_revenue" name="Direct" stackId="1" stroke="hsl(var(--primary))" fill="url(#cDirect)" />
              <Area type="monotone" dataKey="referral_revenue" name="Parrainage" stackId="1" stroke="#10b981" fill="url(#cRef)" />
              <Area type="monotone" dataKey="marketplace_revenue" name="Marketplace" stackId="1" stroke="#8b5cf6" fill="url(#cMkt)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* MLM attribution */}
      <Card className="bg-noir-light/40 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream">Attribution MLM par niveau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="level" tickFormatter={(v) => `N${v}`} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(v: number) => fmtFCFA(v)}
                  />
                  <Legend />
                  <Bar dataKey="total_commissions" name="Commissions versées" fill="hsl(var(--primary))" />
                  <Bar dataKey="total_attributed_revenue" name="CA attribué" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Ambassadeurs</TableHead>
                  <TableHead>Comm.</TableHead>
                  <TableHead>CA attribué</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attribution.map((a) => (
                  <TableRow key={a.level}>
                    <TableCell>
                      <Badge variant="outline">Niveau {a.level}</Badge>
                    </TableCell>
                    <TableCell>{fmt(a.ambassador_count)}</TableCell>
                    <TableCell>{fmtFCFA(a.total_commissions)}</TableCell>
                    <TableCell>{fmtFCFA(a.total_attributed_revenue)}</TableCell>
                  </TableRow>
                ))}
                {attribution.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-cream/50">
                      Aucune commission sur la période
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top ambassadors */}
      <Card className="bg-noir-light/40 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream">Top ambassadeurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ambassadeur</TableHead>
                  <TableHead>Filleuls/Ventes</TableHead>
                  <TableHead>CA généré</TableHead>
                  <TableHead>Commissions</TableHead>
                  <TableHead>Conv. %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAmbassadors.map((a) => (
                  <TableRow key={a.ambassador_id}>
                    <TableCell>
                      <div className="font-medium text-cream">{a.ambassador_name}</div>
                      <div className="text-xs text-cream/50">{a.ambassador_email}</div>
                    </TableCell>
                    <TableCell>{fmt(a.referral_count)}</TableCell>
                    <TableCell>{fmtFCFA(a.attributed_revenue)}</TableCell>
                    <TableCell>{fmtFCFA(a.total_commissions)}</TableCell>
                    <TableCell>{a.conversion_rate}%</TableCell>
                  </TableRow>
                ))}
                {topAmbassadors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-cream/50">
                      Aucun ambassadeur actif
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cohorts */}
      <Card className="bg-noir-light/40 border-gold/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cream">Cohortes & rétention</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCohorts} disabled={cohorts.length === 0}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          {cohortsLoading ? (
            <div className="text-cream/60">Chargement…</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohorte</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Rétention M+1</TableHead>
                    <TableHead>Rétention M+3</TableHead>
                    <TableHead>Rétention M+6</TableHead>
                    <TableHead>Revenu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohorts.map((c) => {
                    const pct = (n: number) =>
                      c.cohort_size === 0 ? 0 : Math.round((n / c.cohort_size) * 100);
                    return (
                      <TableRow key={c.cohort_month}>
                        <TableCell className="font-mono text-sm">
                          {c.cohort_month?.slice(0, 7)}
                        </TableCell>
                        <TableCell>{fmt(c.cohort_size)}</TableCell>
                        <TableCell>
                          {fmt(c.retained_m1)} <span className="text-xs text-cream/50">({pct(c.retained_m1)}%)</span>
                        </TableCell>
                        <TableCell>
                          {fmt(c.retained_m3)} <span className="text-xs text-cream/50">({pct(c.retained_m3)}%)</span>
                        </TableCell>
                        <TableCell>
                          {fmt(c.retained_m6)} <span className="text-xs text-cream/50">({pct(c.retained_m6)}%)</span>
                        </TableCell>
                        <TableCell>{fmtFCFA(Number(c.total_revenue))}</TableCell>
                      </TableRow>
                    );
                  })}
                  {cohorts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-cream/50">
                        Pas encore assez de données
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LTV table */}
      <Card className="bg-noir-light/40 border-gold/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cream">LTV clients (top 100)</CardTitle>
          <Button size="sm" variant="outline" onClick={exportLTV} disabled={ltv.length === 0}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </CardHeader>
        <CardContent>
          {ltvLoading ? (
            <div className="text-cream/60">Chargement…</div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Commandes</TableHead>
                    <TableHead>Total dépensé</TableHead>
                    <TableHead>Panier moyen</TableHead>
                    <TableHead>Jours actifs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ltv.map((c) => (
                    <TableRow key={c.customer_key}>
                      <TableCell className="font-medium text-cream max-w-xs truncate">
                        {c.customer_label}
                      </TableCell>
                      <TableCell>{fmt(c.order_count)}</TableCell>
                      <TableCell>{fmtFCFA(Number(c.total_spent))}</TableCell>
                      <TableCell>{fmtFCFA(Number(c.avg_order_value))}</TableCell>
                      <TableCell>{c.days_active}j</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}