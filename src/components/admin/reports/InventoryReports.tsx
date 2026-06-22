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
import type { AdminProduct } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Boxes, AlertTriangle, PackageX, MapPin, Warehouse } from "lucide-react";

interface Props {
  products: AdminProduct[];
  isLoading?: boolean;
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

function buildBaseColumns(): ReportColumn<AdminProduct>[] {
  return [
    { key: "name", label: "Produit" },
    { key: "category", label: "Catégorie", value: (p) => p.category?.name ?? "—" },
    { key: "origin_country", label: "Pays" },
    { key: "region", label: "Région" },
    { key: "volume_ml", label: "Volume (ml)", numeric: true },
    {
      key: "stock_quantity",
      label: "Stock",
      numeric: true,
      value: (p) => p.stock_quantity ?? 0,
    },
    {
      key: "price",
      label: "Prix",
      numeric: true,
      value: (p) => formatPrice(p.price),
    },
    {
      key: "stock_value",
      label: "Valeur stock",
      numeric: true,
      value: (p) => formatPrice((p.stock_quantity ?? 0) * p.price),
    },
    {
      key: "is_active",
      label: "Actif",
      value: (p) => (p.is_active ? "Oui" : "Non"),
    },
  ];
}

type TabId =
  | "current"
  | "low"
  | "out"
  | "inactive"
  | "by-country"
  | "by-category";

const TAB_CONFIG: Record<TabId, { label: string; icon: any; title: string }> = {
  current: { label: "Inventaire actuel", icon: Boxes, title: "Inventaire actuel" },
  low: { label: "Stock faible", icon: AlertTriangle, title: "Produits en stock faible" },
  out: { label: "Rupture", icon: PackageX, title: "Produits en rupture de stock" },
  inactive: { label: "Inactifs", icon: PackageX, title: "Produits inactifs" },
  "by-country": { label: "Par pays", icon: MapPin, title: "Stock par pays d'origine" },
  "by-category": { label: "Par catégorie", icon: Warehouse, title: "Stock par catégorie" },
};

export default function InventoryReports({ products, isLoading }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("current");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>("__all__");
  const [categoryId, setCategoryId] = useState<string>("__all__");
  const [lowThreshold, setLowThreshold] = useState<number>(5);

  const countries = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.origin_country && set.add(p.origin_country));
    return Array.from(set).sort();
  }, [products]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      if (p.category) map.set(p.category.id, p.category.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (country !== "__all__" && p.origin_country !== country) return false;
      if (categoryId !== "__all__" && p.category_id !== categoryId) return false;
      return true;
    });
  }, [products, search, country, categoryId]);

  const rows = useMemo(() => {
    switch (tab) {
      case "current":
        return filtered;
      case "low":
        return filtered.filter((p) => {
          const s = p.stock_quantity ?? 0;
          return s > 0 && s <= lowThreshold && p.is_active;
        });
      case "out":
        return filtered.filter((p) => (p.stock_quantity ?? 0) === 0);
      case "inactive":
        return filtered.filter((p) => !p.is_active);
      case "by-country":
      case "by-category":
        return filtered;
    }
  }, [filtered, tab, lowThreshold]);

  const baseColumns = buildBaseColumns();

  const aggregateColumns: ReportColumn<any>[] = [
    { key: "group", label: tab === "by-country" ? "Pays" : "Catégorie" },
    { key: "products", label: "Produits", numeric: true },
    { key: "units", label: "Unités en stock", numeric: true },
    {
      key: "value",
      label: "Valeur stock",
      numeric: true,
      value: (r: any) => formatPrice(r.value),
    },
  ];

  const aggregated = useMemo(() => {
    if (tab !== "by-country" && tab !== "by-category") return [];
    const map = new Map<string, { products: number; units: number; value: number }>();
    filtered.forEach((p) => {
      const key =
        tab === "by-country"
          ? p.origin_country ?? "—"
          : p.category?.name ?? "—";
      const cur = map.get(key) ?? { products: 0, units: 0, value: 0 };
      cur.products += 1;
      cur.units += p.stock_quantity ?? 0;
      cur.value += (p.stock_quantity ?? 0) * p.price;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([group, v]) => ({ group, ...v }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, tab]);

  const isAggregate = tab === "by-country" || tab === "by-category";
  const exportRows: any[] = isAggregate ? aggregated : rows;
  const exportColumns: ReportColumn<any>[] = isAggregate ? aggregateColumns : baseColumns;

  const totalUnits = rows.reduce((s, p) => s + (p.stock_quantity ?? 0), 0);
  const totalValue = rows.reduce(
    (s, p) => s + (p.stock_quantity ?? 0) * p.price,
    0,
  );

  const meta = {
    title: TAB_CONFIG[tab].title,
    subtitle: `Rapport d'inventaire — ${rows.length} produit(s)`,
    generatedBy: user?.email ?? undefined,
    orientation: "landscape" as const,
    filters: {
      Recherche: search || undefined,
      Pays: country !== "__all__" ? country : undefined,
      Catégorie:
        categoryId !== "__all__"
          ? categories.find(([id]) => id === categoryId)?.[1]
          : undefined,
      Seuil: tab === "low" ? `≤ ${lowThreshold}` : undefined,
    },
    totals: isAggregate
      ? {
          group: "TOTAL",
          products: aggregated.reduce((s, r) => s + r.products, 0),
          units: aggregated.reduce((s, r) => s + r.units, 0),
          value: formatPrice(aggregated.reduce((s, r) => s + r.value, 0)),
        }
      : {
          name: "TOTAL",
          stock_quantity: totalUnits,
          stock_value: formatPrice(totalValue),
        },
  };

  const filename = `inventaire-${tab}-${new Date().toISOString().slice(0, 10)}`;

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-gold flex items-center gap-2">
          <Boxes className="h-5 w-5" /> Rapports d'inventaire
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Recherche</Label>
            <Input
              placeholder="Nom du produit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pays</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Catégorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes</SelectItem>
                {categories.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {tab === "low" && (
            <div>
              <Label className="text-xs text-muted-foreground">Seuil stock faible</Label>
              <Input
                type="number"
                min={1}
                value={lowThreshold}
                onChange={(e) => setLowThreshold(Number(e.target.value) || 1)}
              />
            </div>
          )}
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
                  {isAggregate
                    ? `${aggregated.length} groupe(s)`
                    : `${rows.length} produit(s) — ${totalUnits} unités — ${formatPrice(
                        totalValue,
                      )}`}
                </div>
                <ExportButtonGroup
                  meta={meta}
                  columns={exportColumns}
                  rows={exportRows}
                  filename={filename}
                  disabled={isLoading}
                />
              </div>
              <div className="overflow-x-auto border border-gold/10 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gold/10 text-gold">
                    <tr>
                      {exportColumns.map((c) => (
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
                    {exportRows.slice(0, 100).map((r: any, idx: number) => (
                      <tr key={idx} className="border-t border-gold/5">
                        {exportColumns.map((c) => {
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
                    {exportRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={exportColumns.length}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          Aucun résultat
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {exportRows.length > 100 && (
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