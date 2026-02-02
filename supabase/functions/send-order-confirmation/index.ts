import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderConfirmationRequest {
  email: string;
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  shippingAddress: {
    city: string;
    neighborhood: string;
    street: string;
    phone: string;
  };
  paymentMethod: string;
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
};

const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    'mtn_money': 'MTN Mobile Money',
    'orange_money': 'Orange Money',
    'cash_on_delivery': 'Paiement à la livraison',
    'credit_card': 'Carte bancaire',
  };
  return labels[method] || method;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      orderNumber,
      customerName,
      items,
      subtotal,
      deliveryFee,
      total,
      shippingAddress,
      paymentMethod,
    }: OrderConfirmationRequest = await req.json();

    if (!email || !orderNumber || !customerName) {
      throw new Error("Informations manquantes pour l'envoi de l'email");
    }

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 16px 20px; border-bottom: 1px solid rgba(212,175,55,0.15);">
            <span style="color: #1a1a1a; font-weight: 500;">${item.product_name}</span>
          </td>
          <td style="padding: 16px 12px; border-bottom: 1px solid rgba(212,175,55,0.15); text-align: center; color: #666;">×${item.quantity}</td>
          <td style="padding: 16px 20px; border-bottom: 1px solid rgba(212,175,55,0.15); text-align: right; color: #1a1a1a; font-weight: 600;">${formatPrice(item.total_price)}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          
          <!-- Decorative top border -->
          <div style="height: 4px; background: linear-gradient(90deg, #D4AF37 0%, #F4E4BC 50%, #D4AF37 100%); border-radius: 2px 2px 0 0;"></div>
          
          <div style="background-color: #1a1a1a; border-radius: 0 0 16px 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            
            <!-- Header -->
            <div style="background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); padding: 50px 40px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.2);">
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #D4AF37 0%, #F4E4BC 100%); border-radius: 50%; line-height: 60px; font-size: 28px;">🍷</span>
              </div>
              <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #D4AF37; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: 1px;">La Petite Bouteille</h1>
              <p style="color: rgba(255,255,255,0.5); margin: 12px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px;">Vins & Spiritueux d'Exception</p>
            </div>
            
            <!-- Success Banner -->
            <div style="background: linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%); padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.1);">
              <div style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C4A030 100%); color: #0a0a0a; padding: 8px 24px; border-radius: 50px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">
                ✓ Commande Confirmée
              </div>
              <p style="color: #D4AF37; margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">${orderNumber}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <p style="color: #ffffff; font-size: 18px; line-height: 1.6; margin: 0 0 8px;">
                Bonjour <strong style="color: #D4AF37;">${customerName}</strong>,
              </p>
              <p style="color: rgba(255,255,255,0.6); font-size: 15px; line-height: 1.7; margin: 0 0 35px;">
                Merci pour votre confiance. Votre commande a été enregistrée avec succès et sera bientôt préparée avec le plus grand soin.
              </p>
              
              <!-- Order Items -->
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,55,0.15); border-radius: 12px; overflow: hidden; margin-bottom: 30px;">
                <div style="background: rgba(212,175,55,0.1); padding: 16px 20px; border-bottom: 1px solid rgba(212,175,55,0.15);">
                  <h3 style="margin: 0; color: #D4AF37; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Détail de votre commande</h3>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>
              
              <!-- Totals -->
              <div style="background: linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.05) 100%); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Sous-total</td>
                    <td style="padding: 6px 0; color: #ffffff; font-size: 14px; text-align: right;">${formatPrice(subtotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: rgba(255,255,255,0.6); font-size: 14px;">Livraison</td>
                    <td style="padding: 6px 0; color: ${deliveryFee === 0 ? '#4ade80' : '#ffffff'}; font-size: 14px; text-align: right;">${deliveryFee === 0 ? '✓ Gratuite' : formatPrice(deliveryFee)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 16px;">
                      <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent);"></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 0 0; color: #ffffff; font-size: 18px; font-weight: 600;">Total</td>
                    <td style="padding: 16px 0 0; text-align: right;">
                      <span style="color: #D4AF37; font-size: 26px; font-weight: 700; font-family: 'Playfair Display', Georgia, serif;">${formatPrice(total)}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Shipping & Payment Cards -->
              <div style="display: flex; gap: 16px; margin-bottom: 35px;">
                <div style="flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <span style="font-size: 18px;">📍</span>
                    <h3 style="margin: 0; color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Livraison</h3>
                  </div>
                  <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6;">
                    ${shippingAddress.city}<br>
                    <span style="color: rgba(255,255,255,0.5);">${shippingAddress.neighborhood}</span><br>
                    <span style="color: rgba(255,255,255,0.5);">${shippingAddress.street}</span>
                  </p>
                  <p style="margin: 12px 0 0; color: rgba(255,255,255,0.6); font-size: 13px;">
                    📱 ${shippingAddress.phone}
                  </p>
                </div>
                <div style="flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <span style="font-size: 18px;">💳</span>
                    <h3 style="margin: 0; color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Paiement</h3>
                  </div>
                  <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500;">
                    ${getPaymentMethodLabel(paymentMethod)}
                  </p>
                </div>
              </div>
              
              <!-- Info Banner -->
              <div style="background: rgba(139,69,19,0.15); border: 1px solid rgba(139,69,19,0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                <p style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin: 0;">
                  🚚 Nous vous contacterons sous <strong style="color: #D4AF37;">24h</strong> pour confirmer la livraison
                </p>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);">
                <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 8px;">À très bientôt,</p>
                <p style="color: #D4AF37; font-size: 16px; margin: 0; font-family: 'Playfair Display', Georgia, serif; font-style: italic;">L'équipe La Petite Bouteille</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #0f0f0f; padding: 30px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
              <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">
                © 2025 La Petite Bouteille
              </p>
              <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 0;">
                Yaoundé & Douala, Cameroun
              </p>
            </div>
          </div>
          
          <!-- Bottom decorative element -->
          <div style="text-align: center; padding-top: 30px;">
            <span style="color: rgba(212,175,55,0.3); font-size: 20px;">✦</span>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "La Petite Bouteille <commandes@lapetitebouteille.com>",
      to: [email],
      subject: `Confirmation de commande ${orderNumber}`,
      html: emailHtml,
    });

    console.log("Order confirmation email sent successfully:", emailResponse);

    // Send notification to owner
    if (OWNER_EMAIL) {
      const ownerEmailHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 25px; text-align: center;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">🔔 Nouvelle Commande</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">${orderNumber}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 25px;">
              <div style="background-color: #fff8e1; border-left: 4px solid #D4AF37; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: #333; font-weight: 600;">
                  💰 Total: <span style="color: #D4AF37; font-size: 20px;">${formatPrice(total)}</span>
                </p>
              </div>
              
              <!-- Customer Info -->
              <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin: 0 0 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                  👤 Client
                </h3>
                <p style="margin: 5px 0; color: #555;">
                  <strong>${customerName}</strong><br>
                  📧 ${email}<br>
                  📱 ${shippingAddress.phone}
                </p>
              </div>
              
              <!-- Shipping -->
              <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin: 0 0 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                  📍 Livraison
                </h3>
                <p style="margin: 5px 0; color: #555;">
                  ${shippingAddress.city}, ${shippingAddress.neighborhood}<br>
                  ${shippingAddress.street}
                </p>
              </div>
              
              <!-- Payment -->
              <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin: 0 0 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                  💳 Paiement
                </h3>
                <p style="margin: 5px 0; color: #555;">
                  ${getPaymentMethodLabel(paymentMethod)}
                </p>
              </div>
              
              <!-- Items -->
              <div>
                <h3 style="color: #333; margin: 0 0 10px; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                  🛒 Articles (${items.length})
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${items.map(item => `
                    <tr>
                      <td style="padding: 8px 0; color: #555; border-bottom: 1px solid #f0f0f0;">
                        ${item.product_name} × ${item.quantity}
                      </td>
                      <td style="padding: 8px 0; color: #333; text-align: right; border-bottom: 1px solid #f0f0f0; font-weight: 500;">
                        ${formatPrice(item.total_price)}
                      </td>
                    </tr>
                  `).join('')}
                </table>
              </div>
              
              <!-- Summary -->
              <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #D4AF37;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="color: #666;">Sous-total:</span>
                  <span style="color: #333;">${formatPrice(subtotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666;">Livraison:</span>
                  <span style="color: #333;">${deliveryFee === 0 ? 'Gratuite' : formatPrice(deliveryFee)}</span>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center;">
              <p style="color: #999; font-size: 11px; margin: 0;">
                Email automatique - La Petite Bouteille
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const ownerEmailResponse = await resend.emails.send({
          from: "La Petite Bouteille <commandes@lapetitebouteille.com>",
          to: [OWNER_EMAIL],
          subject: `🔔 Nouvelle commande ${orderNumber} - ${formatPrice(total)}`,
          html: ownerEmailHtml,
        });
        console.log("Owner notification email sent successfully:", ownerEmailResponse);
      } catch (ownerError) {
        console.error("Failed to send owner notification:", ownerError);
        // Don't fail the whole request if owner notification fails
      }
    }

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error sending order confirmation email:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
