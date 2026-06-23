import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, Loader2, Save, ExternalLink, Plus, Package, Shield, BadgeCheck, ShoppingBag, TrendingUp } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useMyVendorShop, useVendorShopProducts } from "@/hooks/useVendorShop";
import { useVendorOrders, type VendorFulfillmentStatus, type VendorOrderLine } from "@/hooks/useVendorOrders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import VendorReports from "@/components/reports/VendorReports";

const VendeurPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const { isVendor, isLoading: rolesLoading } = useUserRoles();
  const { data: shop, isLoading: shopLoading, createShop, updateShop } = useMyVendorShop();
  const { data: products = [], isLoading: productsLoading } = useVendorShopProducts(shop?.id);
  const { data: orderLines = [], isLoading: ordersLoading, updateStatus } = useVendorOrders(shop?.id);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/connexion");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || rolesLoading || shopLoading) {
    return (
      <div className="min-h-screen bg-noir">
        <Header />
        <main className="pt-32 pb-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isVendor) {
    return (
      <div className="min-h-screen bg-noir">
        <Header />
        <main className="pt-32 pb-16 container mx-auto px-4 max-w-xl text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl text-cream mb-3">Accès Vendeur requis</h1>
          <p className="text-cream/60 mb-6">
            Vous devez disposer du rôle <strong>Vendeur</strong> pour accéder à cet espace.
            Contactez un administrateur LPB pour activer votre compte vendeur.
          </p>
          <Button asChild className="bg-gradient-gold text-noir">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noir">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center">
              <Store className="h-7 w-7 text-noir" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-cream">Espace Vendeur</h1>
              <p className="text-cream/60">Gérez votre boutique et vos produits</p>
            </div>
          </motion.div>

          {!shop ? <CreateShopCard onCreate={(d) => createShop.mutateAsync(d)} loading={createShop.isPending} /> : (
            <>
              <ShopSettingsCard shop={shop} onSave={(d) => updateShop.mutateAsync(d)} loading={updateShop.isPending} />
              <OrdersCard lines={orderLines} loading={ordersLoading} onUpdate={(itemId, status) => updateStatus.mutateAsync({ itemId, status })} updating={updateStatus.isPending} />
              <ProductsCard shopId={shop.id} products={products} loading={productsLoading} />
              <VendorReports lines={orderLines} shopName={shop.name} />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const CreateShopCard = ({ onCreate, loading }: { onCreate: (d: any) => Promise<any>; loading: boolean }) => {
  const [form, setForm] = useState({ name: "", description: "", city: "", contact_email: "", contact_phone: "" });

  const submit = async () => {
    if (!form.name.trim()) return toast({ title: "Nom requis", variant: "destructive" });
    try {
      await onCreate(form);
      toast({ title: "Boutique créée 🎉" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream">Créez votre boutique</CardTitle>
        <CardDescription className="text-cream/60">
          Renseignez les informations principales — vous pourrez tout modifier plus tard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Nom de la boutique *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Description" textarea value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Téléphone de contact" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
        </div>
        <Field label="Email de contact" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} />
        <Button onClick={submit} disabled={loading} className="bg-gradient-gold text-noir w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Créer ma boutique
        </Button>
      </CardContent>
    </Card>
  );
};

const ShopSettingsCard = ({ shop, onSave, loading }: { shop: any; onSave: (d: any) => Promise<any>; loading: boolean }) => {
  const [form, setForm] = useState({
    name: shop.name,
    description: shop.description ?? "",
    city: shop.city ?? "",
    contact_email: shop.contact_email ?? "",
    contact_phone: shop.contact_phone ?? "",
    logo_url: shop.logo_url ?? "",
    banner_url: shop.banner_url ?? "",
    is_active: shop.is_active,
  });

  const submit = async () => {
    try {
      await onSave(form);
      toast({ title: "Boutique mise à jour" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-cream flex items-center gap-2">
              {shop.name}
              {shop.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
            </CardTitle>
            <CardDescription className="text-cream/60">
              /boutique/{shop.slug} · Score confiance {Number(shop.trust_score).toFixed(0)}/100
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="border-gold/30 text-cream">
            <Link to={`/boutique/${shop.slug}`}>
              <ExternalLink className="h-4 w-4 mr-2" /> Voir la boutique
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Description" textarea value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Téléphone" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
        </div>
        <Field label="Email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="URL du logo" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
          <Field label="URL de la bannière" value={form.banner_url} onChange={(v) => setForm({ ...form, banner_url: v })} />
        </div>
        <Button onClick={submit} disabled={loading} className="bg-gradient-gold text-noir">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};

const ProductsCard = ({ shopId, products, loading }: { shopId: string; products: any[]; loading: boolean }) => (
  <Card className="bg-noir/50 border-gold/20">
    <CardHeader>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-cream flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> Mes produits
          </CardTitle>
          <CardDescription className="text-cream/60">
            {products.length} produit{products.length > 1 ? "s" : ""} dans votre boutique
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
      ) : products.length === 0 ? (
        <p className="text-cream/60 text-sm py-8 text-center">
          Aucun produit pour l'instant. L'ajout depuis l'espace vendeur arrive prochainement —
          en attendant, un admin peut publier vos produits pour vous.
        </p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-noir/30 border border-gold/10">
              <img
                src={p.image_url ?? "/placeholder.svg"}
                alt={p.name}
                className="w-12 h-12 object-cover rounded"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-cream truncate font-medium">{p.name}</p>
                <p className="text-xs text-cream/50">
                  {formatPrice(p.price)} FCFA · stock {p.stock_quantity}
                </p>
              </div>
              <Badge variant="outline" className={p.is_active ? "border-green-500/40 text-green-400" : "border-cream/20 text-cream/40"}>
                {p.is_active ? "Actif" : "Inactif"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const STATUS_LABELS: Record<VendorFulfillmentStatus, string> = {
  pending: "En attente",
  preparing: "En préparation",
  shipped: "Expédié",
  delivered: "Livré",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<VendorFulfillmentStatus, string> = {
  pending: "border-yellow-500/40 text-yellow-400",
  preparing: "border-blue-500/40 text-blue-400",
  shipped: "border-purple-500/40 text-purple-400",
  delivered: "border-green-500/40 text-green-400",
  cancelled: "border-red-500/40 text-red-400",
};

const OrdersCard = ({
  lines,
  loading,
  onUpdate,
  updating,
}: {
  lines: VendorOrderLine[];
  loading: boolean;
  onUpdate: (itemId: string, status: VendorFulfillmentStatus) => Promise<any>;
  updating: boolean;
}) => {
  const pendingCount = lines.filter((l) => l.vendor_status === "pending" || l.vendor_status === "preparing").length;
  const revenue = lines
    .filter((l) => l.vendor_status === "delivered")
    .reduce((sum, l) => sum + Number(l.total_price), 0);

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-cream flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" /> Mes commandes
            </CardTitle>
            <CardDescription className="text-cream/60">
              {lines.length} ligne{lines.length > 1 ? "s" : ""} · {pendingCount} à traiter
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-cream/70">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>{formatPrice(revenue)} FCFA livrés</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        ) : lines.length === 0 ? (
          <p className="text-cream/60 text-sm py-8 text-center">
            Aucune commande pour le moment. Dès qu'un client achètera un de vos produits, elle apparaîtra ici.
          </p>
        ) : (
          <div className="space-y-2">
            {lines.map((line) => (
              <motion.div
                key={line.item_id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-noir/30 border border-gold/10"
              >
                <img
                  src={line.product_image ?? "/placeholder.svg"}
                  alt={line.product_name}
                  className="w-12 h-12 object-cover rounded shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-cream truncate font-medium">{line.product_name}</p>
                  <p className="text-xs text-cream/50 truncate">
                    #{line.order_number} · {line.shipping_full_name ?? "Client"} · {line.shipping_city ?? "—"}
                  </p>
                  <p className="text-xs text-cream/40">
                    {line.quantity} × {formatPrice(line.unit_price)} = {formatPrice(line.total_price)} FCFA
                  </p>
                </div>
                <Badge variant="outline" className={`${STATUS_COLORS[line.vendor_status]} hidden sm:inline-flex`}>
                  {STATUS_LABELS[line.vendor_status]}
                </Badge>
                <Select
                  value={line.vendor_status}
                  onValueChange={(v) => onUpdate(line.item_id, v as VendorFulfillmentStatus)}
                  disabled={updating}
                >
                  <SelectTrigger className="w-32 bg-noir/50 border-gold/20 text-cream text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABELS) as VendorFulfillmentStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Field = ({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) => (
  <div className="space-y-1.5">
    <Label className="text-cream/80 text-sm">{label}</Label>
    {textarea ? (
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="bg-noir/50 border-gold/20 text-cream min-h-24" />
    ) : (
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-noir/50 border-gold/20 text-cream" />
    )}
  </div>
);

export default VendeurPage;