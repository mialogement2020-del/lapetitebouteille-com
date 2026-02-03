import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LowStockAlertRequest {
  productName: string;
  productId: string;
  currentStock: number;
  threshold: number;
  sku?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client with service role for inserting history
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { productName, productId, currentStock, threshold, sku }: LowStockAlertRequest = await req.json();

    const ownerEmail = Deno.env.get("OWNER_EMAIL");
    if (!ownerEmail) {
      throw new Error("OWNER_EMAIL not configured");
    }

    const urgencyLevel = currentStock === 0 ? "RUPTURE DE STOCK" : "STOCK FAIBLE";
    const urgencyColor = currentStock === 0 ? "#DC2626" : "#F59E0B";
    const alertType = currentStock === 0 ? "out_of_stock" : "low_stock";

    // Create in-app notifications for all admin users
    try {
      // Get all admin user IDs
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) {
        console.error("Error fetching admin roles:", rolesError);
      } else if (adminRoles && adminRoles.length > 0) {
        // Create notification for each admin
        const notificationTitle = currentStock === 0 
          ? `🚨 Rupture de stock: ${productName}`
          : `⚠️ Stock faible: ${productName}`;
        
        const notificationMessage = currentStock === 0
          ? `Le produit "${productName}" est en rupture de stock (0 unités).`
          : `Le produit "${productName}" n'a plus que ${currentStock} unités (seuil: ${threshold}).`;

        const notifications = adminRoles.map((role) => ({
          user_id: role.user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: "stock_alert",
          reference_type: "product",
          reference_id: productId,
          is_read: false,
        }));

        const { error: notifError } = await supabase
          .from("user_notifications")
          .insert(notifications);

        if (notifError) {
          console.error("Error creating admin notifications:", notifError);
        } else {
          console.log(`Created ${notifications.length} admin notification(s)`);
        }
      }
    } catch (notifErr) {
      console.error("Error in notification creation:", notifErr);
    }

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
                Alerte Stock
              </p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: ${urgencyColor}; padding: 15px; text-align: center;">
                    <span style="color: white; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                      ⚠️ ${urgencyLevel}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 20px;">
                Attention requise
              </h2>
              
              <p style="color: #cccccc; line-height: 1.6; margin: 0 0 30px 0;">
                Le stock du produit suivant nécessite votre attention :
              </p>

              <!-- Product Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #2a2a2a; border-radius: 8px; border-left: 4px solid ${urgencyColor};">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #D4AF37; margin: 0 0 15px 0; font-size: 18px;">
                      ${productName}
                    </h3>
                    
                    ${sku ? `
                    <p style="color: #888; margin: 0 0 10px 0; font-size: 13px;">
                      SKU: ${sku}
                    </p>
                    ` : ''}
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                      <tr>
                        <td width="50%" style="padding: 10px 0;">
                          <span style="color: #888; font-size: 12px; text-transform: uppercase;">Stock actuel</span>
                          <p style="color: ${urgencyColor}; font-size: 28px; font-weight: bold; margin: 5px 0 0 0;">
                            ${currentStock}
                          </p>
                        </td>
                        <td width="50%" style="padding: 10px 0;">
                          <span style="color: #888; font-size: 12px; text-transform: uppercase;">Seuil d'alerte</span>
                          <p style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 5px 0 0 0;">
                            ${threshold}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/admin?tab=products" 
                       style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8963A 100%); color: #000000; text-decoration: none; padding: 14px 35px; border-radius: 6px; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      Gérer le stock
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
                Cet email a été envoyé automatiquement par le système de gestion des stocks.
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

    let emailStatus = "sent";
    let emailError = null;

    try {
      const emailResponse = await resend.emails.send({
        from: "La Petite Bouteille <alertes@lapetitebouteille.com>",
        to: [ownerEmail],
        subject: `${urgencyLevel}: ${productName} (${currentStock} unités)`,
        html: emailHtml,
      });
      console.log("Low stock alert sent successfully:", emailResponse);
    } catch (error: any) {
      emailStatus = "failed";
      emailError = error.message;
      console.error("Failed to send email:", error);
    }

    // Log the alert to history
    const { error: historyError } = await supabase
      .from("stock_alerts_history")
      .insert({
        product_id: productId,
        product_name: productName,
        product_sku: sku || null,
        stock_quantity: currentStock,
        threshold: threshold,
        alert_type: alertType,
        email_sent_to: ownerEmail,
        email_status: emailStatus,
      });

    if (historyError) {
      console.error("Failed to log alert history:", historyError);
    }

    if (emailStatus === "failed") {
      throw new Error(emailError || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, logged: !historyError }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending low stock alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
