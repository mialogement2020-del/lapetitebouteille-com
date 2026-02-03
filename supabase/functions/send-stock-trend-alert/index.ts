import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TrendAnalysis {
  currentPeriodAlerts: number;
  previousPeriodAlerts: number;
  currentOutOfStock: number;
  previousOutOfStock: number;
  trendPercentage: number;
  outOfStockTrendPercentage: number;
  isSignificant: boolean;
  topAffectedProducts: Array<{
    name: string;
    alertCount: number;
    currentStock: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Configuration: period in days and threshold percentage
    const periodDays = 7; // Compare last 7 days vs previous 7 days
    const significantThreshold = 30; // 30% increase is considered significant

    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Fetch current period alerts
    const { data: currentAlerts, error: currentError } = await supabase
      .from("stock_alerts_history")
      .select("id, alert_type, product_name, product_id, stock_quantity")
      .gte("sent_at", currentPeriodStart.toISOString())
      .lte("sent_at", now.toISOString());

    if (currentError) throw currentError;

    // Fetch previous period alerts
    const { data: previousAlerts, error: previousError } = await supabase
      .from("stock_alerts_history")
      .select("id, alert_type")
      .gte("sent_at", previousPeriodStart.toISOString())
      .lt("sent_at", currentPeriodStart.toISOString());

    if (previousError) throw previousError;

    // Calculate statistics
    const currentTotal = currentAlerts?.length || 0;
    const previousTotal = previousAlerts?.length || 0;

    const currentOutOfStock = currentAlerts?.filter(a => a.alert_type === "out_of_stock").length || 0;
    const previousOutOfStock = previousAlerts?.filter(a => a.alert_type === "out_of_stock").length || 0;

    // Calculate trend percentages
    let trendPercentage = 0;
    if (previousTotal > 0) {
      trendPercentage = Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
    } else if (currentTotal > 0) {
      trendPercentage = 100; // If no previous alerts but current ones exist
    }

    let outOfStockTrendPercentage = 0;
    if (previousOutOfStock > 0) {
      outOfStockTrendPercentage = Math.round(((currentOutOfStock - previousOutOfStock) / previousOutOfStock) * 100);
    } else if (currentOutOfStock > 0) {
      outOfStockTrendPercentage = 100;
    }

    // Determine if trend is significant
    const isSignificant = trendPercentage >= significantThreshold || 
                          outOfStockTrendPercentage >= significantThreshold ||
                          currentOutOfStock >= 3; // Also alert if 3+ out of stock

    // Get top affected products
    const productAlertCounts = new Map<string, { name: string; count: number; stock: number }>();
    currentAlerts?.forEach(alert => {
      const existing = productAlertCounts.get(alert.product_id);
      if (existing) {
        existing.count++;
      } else {
        productAlertCounts.set(alert.product_id, {
          name: alert.product_name,
          count: 1,
          stock: alert.stock_quantity
        });
      }
    });

    const topAffectedProducts = Array.from(productAlertCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(p => ({ name: p.name, alertCount: p.count, currentStock: p.stock }));

    const analysis: TrendAnalysis = {
      currentPeriodAlerts: currentTotal,
      previousPeriodAlerts: previousTotal,
      currentOutOfStock,
      previousOutOfStock,
      trendPercentage,
      outOfStockTrendPercentage,
      isSignificant,
      topAffectedProducts
    };

    // Only send email if trend is significant
    if (!isSignificant) {
      console.log("Trend not significant, no email sent:", analysis);
      return new Response(
        JSON.stringify({ 
          success: true, 
          emailSent: false, 
          reason: "Trend not significant",
          analysis 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const ownerEmail = Deno.env.get("OWNER_EMAIL");
    if (!ownerEmail) {
      throw new Error("OWNER_EMAIL not configured");
    }

    // Format dates for display
    const formatDate = (date: Date) => date.toLocaleDateString("fr-FR", { 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    });

    const trendColor = trendPercentage > 0 ? "#DC2626" : "#16A34A";
    const outOfStockColor = outOfStockTrendPercentage > 0 ? "#DC2626" : "#16A34A";

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
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 30px; text-align: center; border-bottom: 2px solid #D4AF37;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 2px;">
                🍷 LA PETITE BOUTEILLE
              </h1>
              <p style="color: #888; margin: 10px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                Rapport de Tendance des Stocks
              </p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #F59E0B; padding: 15px; text-align: center;">
                    <span style="color: white; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                      📊 ALERTE TENDANCE CRITIQUE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 20px;">
                Augmentation significative des alertes de stock
              </h2>
              
              <p style="color: #cccccc; line-height: 1.6; margin: 0 0 30px 0;">
                Période analysée : <strong>${formatDate(currentPeriodStart)}</strong> au <strong>${formatDate(now)}</strong>
              </p>

              <!-- Stats Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td width="50%" style="padding: 10px 5px 10px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border-radius: 8px; border-left: 4px solid ${trendColor};">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #888; font-size: 12px; text-transform: uppercase; margin: 0 0 5px 0;">Tendance Alertes</p>
                          <p style="color: ${trendColor}; font-size: 28px; font-weight: bold; margin: 0;">
                            ${trendPercentage > 0 ? "+" : ""}${trendPercentage}%
                          </p>
                          <p style="color: #666; font-size: 11px; margin: 5px 0 0 0;">
                            ${currentTotal} alertes (vs ${previousTotal})
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding: 10px 0 10px 5px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border-radius: 8px; border-left: 4px solid ${outOfStockColor};">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="color: #888; font-size: 12px; text-transform: uppercase; margin: 0 0 5px 0;">Tendance Ruptures</p>
                          <p style="color: ${outOfStockColor}; font-size: 28px; font-weight: bold; margin: 0;">
                            ${outOfStockTrendPercentage > 0 ? "+" : ""}${outOfStockTrendPercentage}%
                          </p>
                          <p style="color: #666; font-size: 11px; margin: 5px 0 0 0;">
                            ${currentOutOfStock} ruptures (vs ${previousOutOfStock})
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${topAffectedProducts.length > 0 ? `
              <!-- Top Affected Products -->
              <h3 style="color: #D4AF37; margin: 0 0 15px 0; font-size: 16px;">
                Produits les plus affectés
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
                <tr style="background-color: #333;">
                  <td style="padding: 12px 15px; color: #888; font-size: 11px; text-transform: uppercase;">Produit</td>
                  <td style="padding: 12px 15px; color: #888; font-size: 11px; text-transform: uppercase; text-align: center;">Alertes</td>
                  <td style="padding: 12px 15px; color: #888; font-size: 11px; text-transform: uppercase; text-align: right;">Stock actuel</td>
                </tr>
                ${topAffectedProducts.map((product, index) => `
                <tr style="border-top: 1px solid #333;">
                  <td style="padding: 12px 15px; color: #fff; font-size: 14px;">${product.name}</td>
                  <td style="padding: 12px 15px; color: #F59E0B; font-size: 14px; text-align: center; font-weight: bold;">${product.alertCount}</td>
                  <td style="padding: 12px 15px; color: ${product.currentStock === 0 ? '#DC2626' : '#F59E0B'}; font-size: 14px; text-align: right; font-weight: bold;">${product.currentStock}</td>
                </tr>
                `).join('')}
              </table>
              ` : ''}

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/admin?tab=stock-alerts" 
                       style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8963A 100%); color: #000000; text-decoration: none; padding: 14px 35px; border-radius: 6px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      Voir le Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #111; padding: 25px; text-align: center; border-top: 1px solid #333;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                Ce rapport est généré automatiquement chaque jour pour surveiller vos tendances de stock.
              </p>
              <p style="color: #888; font-size: 11px; margin: 10px 0 0 0;">
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

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "La Petite Bouteille <alertes@lapetitebouteille.com>",
      to: [ownerEmail],
      subject: `📊 Alerte Tendance: ${trendPercentage > 0 ? "+" : ""}${trendPercentage}% d'alertes de stock`,
      html: emailHtml,
    });

    console.log("Trend alert email sent successfully:", emailResponse);

    // Create in-app notifications for admins
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles && adminRoles.length > 0) {
      const notifications = adminRoles.map((role) => ({
        user_id: role.user_id,
        title: `📊 Tendance critique: ${trendPercentage > 0 ? "+" : ""}${trendPercentage}% d'alertes`,
        message: `Les alertes de stock ont augmenté de ${trendPercentage}% sur les 7 derniers jours. ${currentOutOfStock} produit(s) en rupture.`,
        type: "stock_trend_alert",
        reference_type: "trend_report",
        is_read: false,
      }));

      await supabase.from("user_notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent: true, 
        analysis 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-stock-trend-alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
