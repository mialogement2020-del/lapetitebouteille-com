import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProductStock {
  name: string;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  status: "out_of_stock" | "low_stock" | "critical" | "normal";
  price: number;
  dailySalesRate: number;
  daysUntilStockout: number | null;
}

interface ReportStats {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  criticalStock: number;
  totalAlertsThisWeek: number;
  previousWeekAlerts: number;
  trendPercentage: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get recipient emails from config
    const { data: configData } = await supabase
      .from("report_schedule_config")
      .select("recipient_emails")
      .limit(1)
      .single();

    const configuredEmails: string[] = configData?.recipient_emails || [];
    const ownerEmail = Deno.env.get("OWNER_EMAIL");
    
    // Use configured emails if available, otherwise fall back to OWNER_EMAIL
    const recipientEmails = configuredEmails.length > 0 
      ? configuredEmails 
      : (ownerEmail ? [ownerEmail] : []);

    if (recipientEmails.length === 0) {
      throw new Error("No recipient emails configured and OWNER_EMAIL not set");
    }

    console.log("Sending report to:", recipientEmails);

    // Fetch all active products with stock info
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, sku, stock_quantity, low_stock_threshold, price, is_active")
      .eq("is_active", true)
      .order("stock_quantity", { ascending: true });

    if (productsError) throw productsError;

    // Fetch sales data for predictions
    const { data: salesData, error: salesError } = await supabase
      .from("order_items")
      .select(`
        product_id,
        quantity,
        created_at,
        order:orders!inner(status)
      `)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .not("order.status", "eq", "cancelled");

    if (salesError) throw salesError;

    // Calculate sales by product
    const salesByProduct: Record<string, { last30Days: number; last7Days: number }> = {};
    (salesData || []).forEach((item: any) => {
      const productId = item.product_id;
      if (!productId) return;

      const itemDate = new Date(item.created_at);
      if (!salesByProduct[productId]) {
        salesByProduct[productId] = { last30Days: 0, last7Days: 0 };
      }
      salesByProduct[productId].last30Days += item.quantity;
      if (itemDate >= sevenDaysAgo) {
        salesByProduct[productId].last7Days += item.quantity;
      }
    });

    // Fetch alert history
    const { data: currentWeekAlerts } = await supabase
      .from("stock_alerts_history")
      .select("id")
      .gte("sent_at", sevenDaysAgo.toISOString());

    const { data: previousWeekAlerts } = await supabase
      .from("stock_alerts_history")
      .select("id")
      .gte("sent_at", fourteenDaysAgo.toISOString())
      .lt("sent_at", sevenDaysAgo.toISOString());

    // Calculate stats
    const outOfStock = products?.filter(p => (p.stock_quantity ?? 0) === 0) || [];
    const lowStock = products?.filter(p => {
      const stock = p.stock_quantity ?? 0;
      const threshold = p.low_stock_threshold ?? 5;
      return stock > 0 && stock <= threshold;
    }) || [];
    const criticalStock = products?.filter(p => {
      const stock = p.stock_quantity ?? 0;
      const threshold = p.low_stock_threshold ?? 5;
      return stock > threshold && stock <= threshold * 2;
    }) || [];

    const currentAlerts = currentWeekAlerts?.length || 0;
    const previousAlerts = previousWeekAlerts?.length || 0;
    const trendPercentage = previousAlerts > 0 
      ? Math.round(((currentAlerts - previousAlerts) / previousAlerts) * 100)
      : (currentAlerts > 0 ? 100 : 0);

    const stats: ReportStats = {
      totalProducts: products?.length || 0,
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      criticalStock: criticalStock.length,
      totalAlertsThisWeek: currentAlerts,
      previousWeekAlerts: previousAlerts,
      trendPercentage
    };

    // Build product list with predictions
    const productsList: ProductStock[] = (products || [])
      .filter(p => (p.stock_quantity ?? 0) <= 10)
      .slice(0, 15)
      .map(p => {
        const stock = p.stock_quantity ?? 0;
        const threshold = p.low_stock_threshold ?? 5;
        const sales = salesByProduct[p.id] || { last30Days: 0, last7Days: 0 };
        
        const avgDaily30 = sales.last30Days / 30;
        const avgDaily7 = sales.last7Days / 7;
        const dailySalesRate = sales.last7Days > 0 
          ? (avgDaily7 * 2 + avgDaily30) / 3 
          : avgDaily30;

        const daysUntilStockout = dailySalesRate > 0 
          ? Math.floor(stock / dailySalesRate) 
          : null;

        let status: ProductStock["status"] = "normal";
        if (stock === 0) {
          status = "out_of_stock";
        } else if (stock <= threshold) {
          status = "low_stock";
        } else if (stock <= threshold * 2) {
          status = "critical";
        }

        return {
          name: p.name,
          sku: p.sku,
          stock_quantity: stock,
          low_stock_threshold: threshold,
          status,
          price: p.price,
          dailySalesRate: Math.round(dailySalesRate * 100) / 100,
          daysUntilStockout
        };
      });

    // Get top selling products for recommendations
    const topSellers = Object.entries(salesByProduct)
      .sort(([, a], [, b]) => b.last7Days - a.last7Days)
      .slice(0, 5);

    const topSellerIds = topSellers.map(([id]) => id);
    const lowStockTopSellers = productsList.filter(p => 
      products?.find(prod => prod.id && topSellerIds.includes(prod.id) && prod.name === p.name)
    );

    // Format date for display
    const formatDate = (date: Date) => date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const formatPrice = (price: number) => new Intl.NumberFormat("fr-FR").format(price);

    const getStatusBadge = (status: ProductStock["status"]) => {
      switch (status) {
        case "out_of_stock":
          return { bg: "#DC2626", text: "#FFFFFF", label: "RUPTURE" };
        case "low_stock":
          return { bg: "#F97316", text: "#FFFFFF", label: "STOCK FAIBLE" };
        case "critical":
          return { bg: "#EAB308", text: "#000000", label: "CRITIQUE" };
        default:
          return { bg: "#22C55E", text: "#FFFFFF", label: "OK" };
      }
    };

    const trendColor = stats.trendPercentage > 0 ? "#DC2626" : "#22C55E";
    const trendIcon = stats.trendPercentage > 0 ? "📈" : "📉";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 35px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 2px;">
                🍷 LA PETITE BOUTEILLE
              </h1>
              <p style="color: #fff; margin: 15px 0 0 0; font-size: 18px; font-weight: 500;">
                Rapport Hebdomadaire des Stocks
              </p>
              <p style="color: #888; margin: 8px 0 0 0; font-size: 13px;">
                Semaine du ${formatDate(sevenDaysAgo)} au ${formatDate(now)}
              </p>
            </td>
          </tr>

          <!-- Summary Stats -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #D4AF37; margin: 0 0 20px 0; font-size: 18px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                📊 Résumé de la Semaine
              </h2>
              
              <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom: 20px;">
                <tr>
                  <!-- Out of Stock -->
                  <td width="25%" style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border-radius: 8px; border-left: 4px solid #DC2626;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <p style="color: #DC2626; font-size: 32px; font-weight: bold; margin: 0;">${stats.outOfStock}</p>
                          <p style="color: #888; font-size: 11px; text-transform: uppercase; margin: 5px 0 0 0;">Ruptures</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Low Stock -->
                  <td width="25%" style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border-radius: 8px; border-left: 4px solid #F97316;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <p style="color: #F97316; font-size: 32px; font-weight: bold; margin: 0;">${stats.lowStock}</p>
                          <p style="color: #888; font-size: 11px; text-transform: uppercase; margin: 5px 0 0 0;">Stock faible</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Critical -->
                  <td width="25%" style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border-radius: 8px; border-left: 4px solid #EAB308;">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <p style="color: #EAB308; font-size: 32px; font-weight: bold; margin: 0;">${stats.criticalStock}</p>
                          <p style="color: #888; font-size: 11px; text-transform: uppercase; margin: 5px 0 0 0;">Critique</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Trend -->
                  <td width="25%" style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border-radius: 8px; border-left: 4px solid ${trendColor};">
                      <tr>
                        <td style="padding: 15px; text-align: center;">
                          <p style="color: ${trendColor}; font-size: 28px; font-weight: bold; margin: 0;">${stats.trendPercentage > 0 ? "+" : ""}${stats.trendPercentage}%</p>
                          <p style="color: #888; font-size: 11px; text-transform: uppercase; margin: 5px 0 0 0;">${trendIcon} Tendance</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color: #888; font-size: 13px; margin: 0; text-align: center;">
                ${stats.totalAlertsThisWeek} alertes cette semaine vs ${stats.previousWeekAlerts} la semaine précédente
              </p>
            </td>
          </tr>

          ${productsList.length > 0 ? `
          <!-- Products Table -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h2 style="color: #D4AF37; margin: 0 0 15px 0; font-size: 18px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                📦 Produits Nécessitant Attention
              </h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border-radius: 8px; overflow: hidden;">
                <!-- Table Header -->
                <tr style="background-color: #333;">
                  <td style="padding: 12px 15px; color: #888; font-size: 11px; text-transform: uppercase; font-weight: 600;">Produit</td>
                  <td style="padding: 12px 10px; color: #888; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: center;">Stock</td>
                  <td style="padding: 12px 10px; color: #888; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: center;">Ventes/jour</td>
                  <td style="padding: 12px 10px; color: #888; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: center;">Jours restants</td>
                  <td style="padding: 12px 15px; color: #888; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: right;">Statut</td>
                </tr>
                ${productsList.map((product, index) => {
                  const badge = getStatusBadge(product.status);
                  const bgColor = index % 2 === 0 ? "#2a2a2a" : "#252525";
                  return `
                <tr style="background-color: ${bgColor}; border-top: 1px solid #333;">
                  <td style="padding: 12px 15px;">
                    <p style="color: #fff; font-size: 14px; margin: 0; font-weight: 500;">${product.name.length > 30 ? product.name.substring(0, 30) + "..." : product.name}</p>
                    ${product.sku ? `<p style="color: #666; font-size: 11px; margin: 3px 0 0 0;">SKU: ${product.sku}</p>` : ""}
                  </td>
                  <td style="padding: 12px 10px; text-align: center;">
                    <span style="color: ${product.stock_quantity === 0 ? "#DC2626" : product.stock_quantity <= 5 ? "#F97316" : "#EAB308"}; font-weight: bold; font-size: 16px;">${product.stock_quantity}</span>
                  </td>
                  <td style="padding: 12px 10px; text-align: center; color: #888; font-size: 13px;">
                    ${product.dailySalesRate > 0 ? product.dailySalesRate.toFixed(1) : "-"}
                  </td>
                  <td style="padding: 12px 10px; text-align: center;">
                    <span style="color: ${product.daysUntilStockout !== null && product.daysUntilStockout <= 7 ? "#DC2626" : "#888"}; font-size: 13px; font-weight: ${product.daysUntilStockout !== null && product.daysUntilStockout <= 7 ? "bold" : "normal"};">
                      ${product.daysUntilStockout !== null ? (product.daysUntilStockout === 0 ? "Épuisé" : `≈ ${product.daysUntilStockout}j`) : "-"}
                    </span>
                  </td>
                  <td style="padding: 12px 15px; text-align: right;">
                    <span style="background-color: ${badge.bg}; color: ${badge.text}; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">${badge.label}</span>
                  </td>
                </tr>
                  `;
                }).join("")}
              </table>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <div style="background-color: #2a2a2a; border-radius: 8px; padding: 30px;">
                <p style="color: #22C55E; font-size: 48px; margin: 0;">✓</p>
                <p style="color: #fff; font-size: 16px; margin: 10px 0 0 0;">Tous les stocks sont suffisants !</p>
              </div>
            </td>
          </tr>
          `}

          <!-- Recommendations -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1E3A5F; border-radius: 8px; border-left: 4px solid #3B82F6;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="color: #60A5FA; margin: 0 0 10px 0; font-size: 14px;">💡 Recommandations</h3>
                    <ul style="color: #CBD5E1; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                      ${stats.outOfStock > 0 ? `<li><strong>${stats.outOfStock} produit(s) en rupture</strong> nécessitent un réapprovisionnement urgent</li>` : ""}
                      ${stats.lowStock > 0 ? `<li>Planifiez le réapprovisionnement des <strong>${stats.lowStock} produit(s) à stock faible</strong></li>` : ""}
                      ${stats.trendPercentage > 30 ? `<li>⚠️ Tendance à la hausse de ${stats.trendPercentage}% - Revoir la gestion des stocks</li>` : ""}
                      ${productsList.filter(p => p.daysUntilStockout !== null && p.daysUntilStockout <= 7 && p.daysUntilStockout > 0).length > 0 ? 
                        `<li>${productsList.filter(p => p.daysUntilStockout !== null && p.daysUntilStockout <= 7 && p.daysUntilStockout > 0).length} produit(s) épuisé(s) d'ici 7 jours selon les prévisions</li>` : ""}
                      ${stats.outOfStock === 0 && stats.lowStock === 0 ? `<li>✓ Excellente gestion des stocks cette semaine !</li>` : ""}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="https://cameroon-spirits-ai.lovable.app/admin" 
                 style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8963A 100%); color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Accéder au Dashboard Admin
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #111; padding: 25px; text-align: center; border-top: 1px solid #333;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                📅 Ce rapport est envoyé automatiquement chaque lundi à 8h00
              </p>
              <p style="color: #666; font-size: 11px; margin: 10px 0 0 0;">
                Pour modifier vos préférences de notification, connectez-vous au dashboard admin.
              </p>
              <p style="color: #888; font-size: 11px; margin: 15px 0 0 0;">
                © ${new Date().getFullYear()} La Petite Bouteille. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send the email to all recipients
    const emailResponse = await resend.emails.send({
      from: "La Petite Bouteille <rapports@lapetitebouteille.com>",
      to: recipientEmails,
      subject: `📊 Rapport Hebdomadaire des Stocks - ${stats.outOfStock} rupture(s), ${stats.lowStock} stock(s) faible(s)`,
      html: emailHtml,
    });

    console.log(`Weekly stock report sent successfully to ${recipientEmails.length} recipient(s):`, emailResponse);

    // Create in-app notification for admins
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles && adminRoles.length > 0) {
      const notifications = adminRoles.map((role) => ({
        user_id: role.user_id,
        title: "📊 Rapport hebdomadaire envoyé",
        message: `Le rapport de stock a été envoyé par email. ${stats.outOfStock} rupture(s), ${stats.lowStock} stock(s) faible(s).`,
        type: "weekly_report",
        reference_type: "stock_report",
        is_read: false,
      }));

      await supabase.from("user_notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: true,
        stats,
        productsCount: productsList.length
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-weekly-stock-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
