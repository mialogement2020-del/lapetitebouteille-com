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
    // Parse request body for optional test email
    let testEmail: string | null = null;
    let isTestMode = false;
    
    try {
      const body = await req.json();
      testEmail = body.testEmail || null;
      isTestMode = !!testEmail;
    } catch {
      // No body or invalid JSON, proceed with normal flow
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Determine recipient emails
    let recipientEmails: string[];
    
    if (isTestMode && testEmail) {
      // Test mode: only send to the specified test email
      recipientEmails = [testEmail];
      console.log("Test mode: Sending report to:", testEmail);
    } else {
      // Normal mode: get recipient emails from config
      const { data: configData } = await supabase
        .from("report_schedule_config")
        .select("recipient_emails")
        .limit(1)
        .single();

      const configuredEmails: string[] = configData?.recipient_emails || [];
      const ownerEmail = Deno.env.get("OWNER_EMAIL");
      
      // Use configured emails if available, otherwise fall back to OWNER_EMAIL
      recipientEmails = configuredEmails.length > 0 
        ? configuredEmails 
        : (ownerEmail ? [ownerEmail] : []);

      if (recipientEmails.length === 0) {
        throw new Error("No recipient emails configured and OWNER_EMAIL not set");
      }

      console.log("Sending report to:", recipientEmails);
    }

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
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Rapport Hebdomadaire des Stocks</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .mobile-hide { display: table-cell !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Mobile styles */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-column-center { text-align: center !important; }
      .stat-card { width: 48% !important; display: inline-block !important; margin-bottom: 8px !important; }
      .stat-number { font-size: 24px !important; }
      .mobile-padding { padding-left: 15px !important; padding-right: 15px !important; }
      .mobile-full-width { width: 100% !important; }
      .product-table-mobile td { display: block !important; width: 100% !important; text-align: left !important; padding: 8px 15px !important; }
      .product-table-mobile tr { display: block !important; border-bottom: 1px solid #333 !important; padding: 10px 0 !important; }
      .hide-mobile { display: none !important; }
      .product-name-mobile { font-size: 15px !important; font-weight: 600 !important; }
      .mobile-header { padding: 25px 15px !important; }
      .mobile-title { font-size: 22px !important; }
      .mobile-subtitle { font-size: 15px !important; }
      .cta-button { padding: 14px 30px !important; font-size: 13px !important; }
      .recommendations-list { padding-left: 15px !important; }
      .recommendations-list li { margin-bottom: 10px !important; }
    }
    
    @media only screen and (max-width: 400px) {
      .stat-card { width: 100% !important; display: block !important; }
      .mobile-title { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Preheader (hidden text for email preview) -->
  <div style="display: none; font-size: 1px; color: #0a0a0a; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    📊 ${stats.outOfStock} rupture(s), ${stats.lowStock} stock(s) faible(s) - ${stats.trendPercentage > 0 ? "Tendance +" : "Tendance "}${stats.trendPercentage}%
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        
        <!-- Main container -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.3); max-width: 600px;">
          
          <!-- Header with gradient -->
          <tr>
            <td class="mobile-header" style="background: linear-gradient(180deg, #1a1a1a 0%, #252525 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="font-size: 40px; margin: 0 0 10px 0;">🍷</p>
                    <h1 class="mobile-title" style="color: #D4AF37; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                      La Petite Bouteille
                    </h1>
                    <p class="mobile-subtitle" style="color: #ffffff; margin: 12px 0 0 0; font-size: 17px; font-weight: 500;">
                      Rapport Hebdomadaire des Stocks
                    </p>
                    <p style="color: #999; margin: 10px 0 0 0; font-size: 13px;">
                      ${formatDate(sevenDaysAgo)} → ${formatDate(now)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Summary Stats - 2x2 grid on mobile -->
          <tr>
            <td class="mobile-padding" style="padding: 25px 30px;">
              <h2 style="color: #D4AF37; margin: 0 0 20px 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                📊 Résumé de la Semaine
              </h2>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Out of Stock -->
                        <td class="stat-card" width="25%" valign="top" style="padding: 0 4px 8px 0;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #2a1a1a 0%, #1f1515 100%); border-radius: 12px; border: 1px solid rgba(220, 38, 38, 0.3);">
                            <tr>
                              <td style="padding: 18px 12px; text-align: center;">
                                <p class="stat-number" style="color: #DC2626; font-size: 28px; font-weight: 800; margin: 0; line-height: 1;">${stats.outOfStock}</p>
                                <p style="color: #DC2626; font-size: 10px; text-transform: uppercase; margin: 8px 0 0 0; font-weight: 600; letter-spacing: 0.5px;">Ruptures</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <!-- Low Stock -->
                        <td class="stat-card" width="25%" valign="top" style="padding: 0 4px 8px 4px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #2a2010 0%, #1f1a10 100%); border-radius: 12px; border: 1px solid rgba(249, 115, 22, 0.3);">
                            <tr>
                              <td style="padding: 18px 12px; text-align: center;">
                                <p class="stat-number" style="color: #F97316; font-size: 28px; font-weight: 800; margin: 0; line-height: 1;">${stats.lowStock}</p>
                                <p style="color: #F97316; font-size: 10px; text-transform: uppercase; margin: 8px 0 0 0; font-weight: 600; letter-spacing: 0.5px;">Stock faible</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <!-- Critical -->
                        <td class="stat-card" width="25%" valign="top" style="padding: 0 4px 8px 4px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #2a2a10 0%, #1f1f10 100%); border-radius: 12px; border: 1px solid rgba(234, 179, 8, 0.3);">
                            <tr>
                              <td style="padding: 18px 12px; text-align: center;">
                                <p class="stat-number" style="color: #EAB308; font-size: 28px; font-weight: 800; margin: 0; line-height: 1;">${stats.criticalStock}</p>
                                <p style="color: #EAB308; font-size: 10px; text-transform: uppercase; margin: 8px 0 0 0; font-weight: 600; letter-spacing: 0.5px;">Critique</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <!-- Trend -->
                        <td class="stat-card" width="25%" valign="top" style="padding: 0 0 8px 4px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${stats.trendPercentage > 0 ? '#2a1a1a' : '#1a2a1a'} 0%, ${stats.trendPercentage > 0 ? '#1f1515' : '#152015'} 100%); border-radius: 12px; border: 1px solid ${stats.trendPercentage > 0 ? 'rgba(220, 38, 38, 0.3)' : 'rgba(34, 197, 94, 0.3)'};">
                            <tr>
                              <td style="padding: 18px 12px; text-align: center;">
                                <p class="stat-number" style="color: ${trendColor}; font-size: 24px; font-weight: 800; margin: 0; line-height: 1;">${stats.trendPercentage > 0 ? "+" : ""}${stats.trendPercentage}%</p>
                                <p style="color: ${trendColor}; font-size: 10px; text-transform: uppercase; margin: 8px 0 0 0; font-weight: 600; letter-spacing: 0.5px;">${trendIcon} Tendance</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #888; font-size: 12px; margin: 15px 0 0 0; text-align: center;">
                ${stats.totalAlertsThisWeek} alertes cette semaine vs ${stats.previousWeekAlerts} la semaine précédente
              </p>
            </td>
          </tr>

          ${productsList.length > 0 ? `
          <!-- Products Section -->
          <tr>
            <td class="mobile-padding" style="padding: 0 30px 25px 30px;">
              <h2 style="color: #D4AF37; margin: 0 0 15px 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                📦 Produits Nécessitant Attention
              </h2>
              
              <!-- Desktop table -->
              <table role="presentation" class="hide-mobile" width="100%" cellpadding="0" cellspacing="0" style="background-color: #252525; border-radius: 12px; overflow: hidden;">
                <tr style="background-color: #333;">
                  <td style="padding: 14px 15px; color: #999; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Produit</td>
                  <td style="padding: 14px 10px; color: #999; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: center; letter-spacing: 0.5px;">Stock</td>
                  <td style="padding: 14px 10px; color: #999; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: center; letter-spacing: 0.5px;">Ventes/j</td>
                  <td style="padding: 14px 10px; color: #999; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: center; letter-spacing: 0.5px;">Jours</td>
                  <td style="padding: 14px 15px; color: #999; font-size: 11px; text-transform: uppercase; font-weight: 600; text-align: right; letter-spacing: 0.5px;">Statut</td>
                </tr>
                ${productsList.map((product, index) => {
                  const badge = getStatusBadge(product.status);
                  const bgColor = index % 2 === 0 ? "#252525" : "#2a2a2a";
                  return `
                <tr style="background-color: ${bgColor};">
                  <td style="padding: 14px 15px; border-top: 1px solid #333;">
                    <p style="color: #fff; font-size: 14px; margin: 0; font-weight: 500;">${product.name.length > 28 ? product.name.substring(0, 28) + "..." : product.name}</p>
                    ${product.sku ? `<p style="color: #666; font-size: 11px; margin: 4px 0 0 0;">SKU: ${product.sku}</p>` : ""}
                  </td>
                  <td style="padding: 14px 10px; text-align: center; border-top: 1px solid #333;">
                    <span style="color: ${product.stock_quantity === 0 ? "#DC2626" : product.stock_quantity <= 5 ? "#F97316" : "#EAB308"}; font-weight: 700; font-size: 18px;">${product.stock_quantity}</span>
                  </td>
                  <td style="padding: 14px 10px; text-align: center; color: #888; font-size: 13px; border-top: 1px solid #333;">
                    ${product.dailySalesRate > 0 ? product.dailySalesRate.toFixed(1) : "-"}
                  </td>
                  <td style="padding: 14px 10px; text-align: center; border-top: 1px solid #333;">
                    <span style="color: ${product.daysUntilStockout !== null && product.daysUntilStockout <= 7 ? "#DC2626" : "#888"}; font-size: 13px; font-weight: ${product.daysUntilStockout !== null && product.daysUntilStockout <= 7 ? "700" : "400"};">
                      ${product.daysUntilStockout !== null ? (product.daysUntilStockout === 0 ? "0j" : `≈${product.daysUntilStockout}j`) : "-"}
                    </span>
                  </td>
                  <td style="padding: 14px 15px; text-align: right; border-top: 1px solid #333;">
                    <span style="background-color: ${badge.bg}; color: ${badge.text}; padding: 5px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${badge.label}</span>
                  </td>
                </tr>
                  `;
                }).join("")}
              </table>
              
              <!-- Mobile cards -->
              <div style="display: none;">
                <!--[if !mso]><!-->
                <style>.show-mobile { display: none; } @media only screen and (max-width: 600px) { .show-mobile { display: block !important; } }</style>
                <!--<![endif]-->
              </div>
              <table role="presentation" class="show-mobile" width="100%" cellpadding="0" cellspacing="0" style="display: none;">
                ${productsList.map((product, index) => {
                  const badge = getStatusBadge(product.status);
                  return `
                <tr>
                  <td style="padding: 0 0 12px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #252525; border-radius: 12px; border-left: 4px solid ${badge.bg};">
                      <tr>
                        <td style="padding: 15px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <p style="color: #fff; font-size: 15px; margin: 0; font-weight: 600;">${product.name.length > 35 ? product.name.substring(0, 35) + "..." : product.name}</p>
                                ${product.sku ? `<p style="color: #666; font-size: 11px; margin: 4px 0 0 0;">SKU: ${product.sku}</p>` : ""}
                              </td>
                              <td width="80" align="right">
                                <span style="background-color: ${badge.bg}; color: ${badge.text}; padding: 4px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; text-transform: uppercase;">${badge.label}</span>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding-top: 12px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td width="33%" style="text-align: center; padding: 8px 0; background-color: #1f1f1f; border-radius: 6px 0 0 6px;">
                                      <p style="color: ${product.stock_quantity === 0 ? "#DC2626" : product.stock_quantity <= 5 ? "#F97316" : "#EAB308"}; font-size: 18px; font-weight: 700; margin: 0;">${product.stock_quantity}</p>
                                      <p style="color: #888; font-size: 9px; margin: 4px 0 0 0; text-transform: uppercase;">Stock</p>
                                    </td>
                                    <td width="34%" style="text-align: center; padding: 8px 0; background-color: #1a1a1a;">
                                      <p style="color: #888; font-size: 14px; font-weight: 500; margin: 0;">${product.dailySalesRate > 0 ? product.dailySalesRate.toFixed(1) : "-"}</p>
                                      <p style="color: #666; font-size: 9px; margin: 4px 0 0 0; text-transform: uppercase;">Ventes/j</p>
                                    </td>
                                    <td width="33%" style="text-align: center; padding: 8px 0; background-color: #1f1f1f; border-radius: 0 6px 6px 0;">
                                      <p style="color: ${product.daysUntilStockout !== null && product.daysUntilStockout <= 7 ? "#DC2626" : "#888"}; font-size: 14px; font-weight: ${product.daysUntilStockout !== null && product.daysUntilStockout <= 7 ? "700" : "500"}; margin: 0;">
                                        ${product.daysUntilStockout !== null ? (product.daysUntilStockout === 0 ? "0j" : `≈${product.daysUntilStockout}j`) : "-"}
                                      </p>
                                      <p style="color: #666; font-size: 9px; margin: 4px 0 0 0; text-transform: uppercase;">Restant</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                  `;
                }).join("")}
              </table>
            </td>
          </tr>
          ` : `
          <!-- All stocks OK -->
          <tr>
            <td class="mobile-padding" style="padding: 0 30px 25px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a2a1a 0%, #152015 100%); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.3);">
                <tr>
                  <td style="padding: 35px; text-align: center;">
                    <p style="font-size: 50px; margin: 0;">✓</p>
                    <p style="color: #22C55E; font-size: 18px; font-weight: 600; margin: 15px 0 0 0;">Tous les stocks sont suffisants !</p>
                    <p style="color: #888; font-size: 13px; margin: 8px 0 0 0;">Aucune action requise cette semaine</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `}

          <!-- Recommendations -->
          <tr>
            <td class="mobile-padding" style="padding: 0 30px 25px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a2535 0%, #152030 100%); border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.3);">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="color: #60A5FA; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">💡 Recommandations</h3>
                    <ul class="recommendations-list" style="color: #CBD5E1; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.9;">
                      ${stats.outOfStock > 0 ? `<li><strong style="color: #DC2626;">${stats.outOfStock} produit(s) en rupture</strong> nécessitent un réapprovisionnement urgent</li>` : ""}
                      ${stats.lowStock > 0 ? `<li>Planifiez le réapprovisionnement des <strong style="color: #F97316;">${stats.lowStock} produit(s) à stock faible</strong></li>` : ""}
                      ${stats.trendPercentage > 30 ? `<li>⚠️ <strong>Tendance à la hausse de ${stats.trendPercentage}%</strong> - Revoir la gestion des stocks</li>` : ""}
                      ${productsList.filter(p => p.daysUntilStockout !== null && p.daysUntilStockout <= 7 && p.daysUntilStockout > 0).length > 0 ? 
                        `<li><strong>${productsList.filter(p => p.daysUntilStockout !== null && p.daysUntilStockout <= 7 && p.daysUntilStockout > 0).length} produit(s)</strong> seront épuisés d'ici 7 jours</li>` : ""}
                      ${stats.outOfStock === 0 && stats.lowStock === 0 ? `<li style="color: #22C55E;">✓ Excellente gestion des stocks cette semaine !</li>` : ""}
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td class="mobile-padding" style="padding: 0 30px 30px 30px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://cameroon-spirits-ai.lovable.app/admin" 
                       class="cta-button"
                       style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8963A 100%); color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                      Accéder au Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #111; padding: 25px 30px; text-align: center; border-top: 1px solid #333;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                📅 Rapport envoyé automatiquement chaque lundi à 8h00
              </p>
              <p style="color: #666; font-size: 11px; margin: 12px 0 0 0;">
                Pour modifier vos préférences, connectez-vous au dashboard admin.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                <tr>
                  <td align="center">
                    <p style="color: #D4AF37; font-size: 12px; margin: 0; font-weight: 500;">
                      La Petite Bouteille
                    </p>
                    <p style="color: #555; font-size: 10px; margin: 6px 0 0 0;">
                      © ${new Date().getFullYear()} Tous droits réservés
                    </p>
                  </td>
                </tr>
              </table>
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
    let emailResponse: any = null;
    let sendStatus = "pending";
    let errorMessage: string | null = null;
    let emailId: string | null = null;

    try {
      const subjectPrefix = isTestMode ? "[TEST] " : "";
      emailResponse = await resend.emails.send({
        from: "La Petite Bouteille <rapports@lapetitebouteille.com>",
        to: recipientEmails,
        subject: `${subjectPrefix}📊 Rapport Hebdomadaire des Stocks - ${stats.outOfStock} rupture(s), ${stats.lowStock} stock(s) faible(s)`,
        html: emailHtml,
      });

      sendStatus = "success";
      emailId = emailResponse?.id || null;
      console.log(`Weekly stock report ${isTestMode ? "(TEST) " : ""}sent successfully to ${recipientEmails.length} recipient(s):`, emailResponse);
    } catch (emailError: any) {
      sendStatus = "failed";
      errorMessage = emailError.message || "Unknown email error";
      console.error("Error sending email:", emailError);
    }

    // Log to report history (skip for test mode to keep history clean)
    if (!isTestMode) {
      await supabase.from("report_history").insert({
        report_type: "weekly_stock",
        recipients: recipientEmails,
        out_of_stock_count: stats.outOfStock,
        low_stock_count: stats.lowStock,
        critical_stock_count: stats.criticalStock,
        total_alerts_count: stats.outOfStock + stats.lowStock + stats.criticalStock,
        trend_percentage: stats.trendPercentage,
        send_status: sendStatus,
        error_message: errorMessage,
        email_id: emailId,
      });
    }

    // Create in-app notification for admins (skip for test mode)
    if (!isTestMode) {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map((role) => ({
          user_id: role.user_id,
          title: sendStatus === "success" ? "📊 Rapport hebdomadaire envoyé" : "❌ Échec de l'envoi du rapport",
          message: sendStatus === "success" 
            ? `Le rapport de stock a été envoyé par email. ${stats.outOfStock} rupture(s), ${stats.lowStock} stock(s) faible(s).`
            : `L'envoi du rapport a échoué: ${errorMessage}`,
          type: "weekly_report",
          reference_type: "stock_report",
          is_read: false,
        }));

        await supabase.from("user_notifications").insert(notifications);
      }
    }

    // If email failed, still return success for the function but indicate email failure
    return new Response(
      JSON.stringify({
        success: true,
        emailSent: sendStatus === "success",
        sendStatus,
        errorMessage,
        stats,
        productsCount: productsList.length,
        isTestMode,
        testEmail: isTestMode ? testEmail : undefined
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
