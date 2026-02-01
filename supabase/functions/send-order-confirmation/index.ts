import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${item.product_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatPrice(item.unit_price)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatPrice(item.total_price)}</td>
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
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">La Petite Bouteille</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Votre cave à vins & spiritueux</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 8px;">
                <h2 style="margin: 0; font-size: 20px;">✓ Commande confirmée !</h2>
              </div>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Bonjour <strong>${customerName}</strong>,
            </p>
            <p style="color: #666; font-size: 15px; line-height: 1.6;">
              Nous avons bien reçu votre commande <strong style="color: #8B4513;">${orderNumber}</strong>. 
              Voici le récapitulatif de votre achat :
            </p>
            
            <!-- Order Items -->
            <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #333;">Produit</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #333;">Qté</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600; color: #333;">Prix unit.</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600; color: #333;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <!-- Totals -->
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #666;">Sous-total:</span>
                <span style="color: #333;">${formatPrice(subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #666;">Livraison:</span>
                <span style="color: #333;">${deliveryFee === 0 ? 'Gratuite' : formatPrice(deliveryFee)}</span>
              </div>
              <div style="border-top: 2px solid #8B4513; padding-top: 12px; display: flex; justify-content: space-between;">
                <span style="font-weight: 700; font-size: 18px; color: #333;">Total:</span>
                <span style="font-weight: 700; font-size: 18px; color: #8B4513;">${formatPrice(total)}</span>
              </div>
            </div>
            
            <!-- Shipping & Payment Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0;">
              <div style="background-color: #fff8f0; padding: 15px; border-radius: 8px; border-left: 4px solid #D2691E;">
                <h3 style="margin: 0 0 10px; color: #8B4513; font-size: 14px; text-transform: uppercase;">Adresse de livraison</h3>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">
                  ${shippingAddress.city}<br>
                  ${shippingAddress.neighborhood}<br>
                  ${shippingAddress.street}<br>
                  Tél: ${shippingAddress.phone}
                </p>
              </div>
              <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; border-left: 4px solid #4a90d9;">
                <h3 style="margin: 0 0 10px; color: #2c5aa0; font-size: 14px; text-transform: uppercase;">Mode de paiement</h3>
                <p style="margin: 0; color: #666; font-size: 14px;">
                  ${getPaymentMethodLabel(paymentMethod)}
                </p>
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              Nous vous contacterons bientôt pour confirmer la livraison. 
              Pour toute question, n'hésitez pas à nous contacter.
            </p>
            
            <p style="color: #333; font-size: 14px; margin-top: 20px;">
              À bientôt,<br>
              <strong>L'équipe La Petite Bouteille</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #2d2d2d; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2025 La Petite Bouteille - Cameroun<br>
              Cet email a été envoyé automatiquement, merci de ne pas y répondre.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "PrestigeVins <onboarding@resend.dev>",
      to: [email],
      subject: `Confirmation de commande ${orderNumber}`,
      html: emailHtml,
    });

    console.log("Order confirmation email sent successfully:", emailResponse);

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
