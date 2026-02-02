import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StatusUpdateRequest {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  newStatus: string;
  shippingCity: string;
  shippingNeighborhood: string;
  shippingStreet: string;
  total: number;
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { emoji: string; title: string; subtitle: string; message: string; color: string }> = {
    'shipped': {
      emoji: '🚚',
      title: 'Votre commande est en route !',
      subtitle: 'Expédition confirmée',
      message: 'Votre commande a été expédiée et est actuellement en cours de livraison. Notre livreur vous contactera très bientôt pour coordonner la remise.',
      color: '#3b82f6',
    },
    'delivered': {
      emoji: '✅',
      title: 'Commande livrée avec succès !',
      subtitle: 'Livraison confirmée',
      message: 'Votre commande a été livrée. Nous espérons que vous apprécierez vos produits. N\'hésitez pas à nous laisser un avis !',
      color: '#22c55e',
    },
    'confirmed': {
      emoji: '✓',
      title: 'Commande confirmée',
      subtitle: 'Préparation en cours',
      message: 'Votre commande a été confirmée et est en cours de préparation. Vous recevrez une notification dès qu\'elle sera expédiée.',
      color: '#D4AF37',
    },
    'processing': {
      emoji: '📦',
      title: 'Commande en préparation',
      subtitle: 'Nous préparons vos articles',
      message: 'Votre commande est en cours de préparation par notre équipe. Elle sera expédiée très prochainement.',
      color: '#f59e0b',
    },
    'cancelled': {
      emoji: '❌',
      title: 'Commande annulée',
      subtitle: 'Annulation confirmée',
      message: 'Votre commande a été annulée. Si vous avez des questions, n\'hésitez pas à nous contacter.',
      color: '#ef4444',
    },
  };
  return configs[status] || configs['confirmed'];
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      newStatus,
      shippingCity,
      shippingNeighborhood,
      shippingStreet,
      total,
    }: StatusUpdateRequest = await req.json();

    if (!customerEmail || !orderNumber || !newStatus) {
      console.log("Missing required fields, skipping email");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const config = getStatusConfig(newStatus);

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
          <div style="height: 4px; background: linear-gradient(90deg, ${config.color} 0%, #F4E4BC 50%, ${config.color} 100%); border-radius: 2px 2px 0 0;"></div>
          
          <div style="background-color: #1a1a1a; border-radius: 0 0 16px 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            
            <!-- Header -->
            <div style="background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); padding: 50px 40px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.2);">
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; width: 70px; height: 70px; background: linear-gradient(135deg, ${config.color} 0%, ${config.color}99 100%); border-radius: 50%; line-height: 70px; font-size: 32px;">${config.emoji}</span>
              </div>
              <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">${config.title}</h1>
              <p style="color: ${config.color}; margin: 12px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">${config.subtitle}</p>
            </div>
            
            <!-- Order Badge -->
            <div style="background: linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%); padding: 25px 40px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.1);">
              <div style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C4A030 100%); color: #0a0a0a; padding: 8px 24px; border-radius: 50px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
                ${orderNumber}
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <p style="color: #ffffff; font-size: 18px; line-height: 1.6; margin: 0 0 8px;">
                Bonjour <strong style="color: #D4AF37;">${customerName}</strong>,
              </p>
              <p style="color: rgba(255,255,255,0.7); font-size: 15px; line-height: 1.7; margin: 0 0 35px;">
                ${config.message}
              </p>
              
              <!-- Status Timeline -->
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,55,0.15); border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 20px; color: #D4AF37; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Suivi de commande</h3>
                
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                  <div style="width: 32px; height: 32px; background: ${newStatus === 'confirmed' || newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? '#22c55e' : 'rgba(255,255,255,0.1)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <span style="color: ${newStatus === 'confirmed' || newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? '#ffffff' : 'rgba(255,255,255,0.3)'}; font-size: 14px;">✓</span>
                  </div>
                  <span style="color: ${newStatus === 'confirmed' || newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? '#ffffff' : 'rgba(255,255,255,0.4)'}; font-size: 14px;">Commande confirmée</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                  <div style="width: 32px; height: 32px; background: ${newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? '#22c55e' : 'rgba(255,255,255,0.1)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <span style="color: ${newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? '#ffffff' : 'rgba(255,255,255,0.3)'}; font-size: 14px;">📦</span>
                  </div>
                  <span style="color: ${newStatus === 'processing' || newStatus === 'shipped' || newStatus === 'delivered' ? '#ffffff' : 'rgba(255,255,255,0.4)'}; font-size: 14px;">En préparation</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                  <div style="width: 32px; height: 32px; background: ${newStatus === 'shipped' || newStatus === 'delivered' ? '#22c55e' : 'rgba(255,255,255,0.1)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <span style="color: ${newStatus === 'shipped' || newStatus === 'delivered' ? '#ffffff' : 'rgba(255,255,255,0.3)'}; font-size: 14px;">🚚</span>
                  </div>
                  <span style="color: ${newStatus === 'shipped' || newStatus === 'delivered' ? '#ffffff' : 'rgba(255,255,255,0.4)'}; font-size: 14px;">Expédiée</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 32px; height: 32px; background: ${newStatus === 'delivered' ? '#22c55e' : 'rgba(255,255,255,0.1)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <span style="color: ${newStatus === 'delivered' ? '#ffffff' : 'rgba(255,255,255,0.3)'}; font-size: 14px;">✅</span>
                  </div>
                  <span style="color: ${newStatus === 'delivered' ? '#ffffff' : 'rgba(255,255,255,0.4)'}; font-size: 14px;">Livrée</span>
                </div>
              </div>
              
              <!-- Shipping Card -->
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                  <span style="font-size: 18px;">📍</span>
                  <h3 style="margin: 0; color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Adresse de livraison</h3>
                </div>
                <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6;">
                  ${shippingCity}<br>
                  <span style="color: rgba(255,255,255,0.5);">${shippingNeighborhood || ''}</span><br>
                  <span style="color: rgba(255,255,255,0.5);">${shippingStreet}</span>
                </p>
                <p style="margin: 12px 0 0; color: rgba(255,255,255,0.6); font-size: 13px;">
                  📱 ${customerPhone}
                </p>
              </div>
              
              <!-- Total -->
              <div style="background: linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.05) 100%); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; padding: 20px; text-align: center;">
                <span style="color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Montant total</span>
                <p style="color: #D4AF37; font-size: 28px; font-weight: 700; font-family: 'Playfair Display', Georgia, serif; margin: 8px 0 0;">
                  ${formatPrice(total)}
                </p>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; padding-top: 30px; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.05);">
                <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 8px;">Merci de votre confiance,</p>
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

    const statusLabels: Record<string, string> = {
      'shipped': 'expédiée',
      'delivered': 'livrée',
      'confirmed': 'confirmée',
      'processing': 'en préparation',
      'cancelled': 'annulée',
    };

    const emailResponse = await resend.emails.send({
      from: "La Petite Bouteille <commandes@lapetitebouteille.com>",
      to: [customerEmail],
      subject: `${config.emoji} Commande ${orderNumber} ${statusLabels[newStatus] || newStatus}`,
      html: emailHtml,
    });

    console.log("Order status update email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error sending order status update email:", error);
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
