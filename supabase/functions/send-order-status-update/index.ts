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

const generateStatusStepHtml = (
  stepEmoji: string,
  stepLabel: string,
  isActive: boolean,
  isLast: boolean = false
): string => {
  const bgColor = isActive ? '#22c55e' : 'rgba(255,255,255,0.1)';
  const textColor = isActive ? '#ffffff' : 'rgba(255,255,255,0.3)';
  const labelColor = isActive ? '#ffffff' : 'rgba(255,255,255,0.4)';
  
  return `
    <div class="status-step" style="display: flex; align-items: center; gap: 12px; ${!isLast ? 'margin-bottom: 12px;' : ''}">
      <div style="width: 36px; height: 36px; min-width: 36px; background: ${bgColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <span style="color: ${textColor}; font-size: 14px; line-height: 1;">${stepEmoji}</span>
      </div>
      <span style="color: ${labelColor}; font-size: 14px; font-weight: 500;">${stepLabel}</span>
    </div>
  `;
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
    
    const statusLabels: Record<string, string> = {
      'shipped': 'expédiée',
      'delivered': 'livrée',
      'confirmed': 'confirmée',
      'processing': 'en préparation',
      'cancelled': 'annulée',
    };
    
    const preheaderText = `${config.emoji} ${config.title} - Commande ${orderNumber}`;

    // Generate status timeline steps
    const statusSteps = [
      { emoji: '✓', label: 'Commande confirmée', activeFor: ['confirmed', 'processing', 'shipped', 'delivered'] },
      { emoji: '📦', label: 'En préparation', activeFor: ['processing', 'shipped', 'delivered'] },
      { emoji: '🚚', label: 'Expédiée', activeFor: ['shipped', 'delivered'] },
      { emoji: '✅', label: 'Livrée', activeFor: ['delivered'] },
    ];

    const statusTimelineHtml = statusSteps.map((step, index) => 
      generateStatusStepHtml(
        step.emoji,
        step.label,
        step.activeFor.includes(newStatus),
        index === statusSteps.length - 1
      )
    ).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${config.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
        <style type="text/css">
          /* Reset styles */
          body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
          body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          
          /* Mobile styles */
          @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; max-width: 100% !important; }
            .mobile-padding { padding: 24px 16px !important; }
            .mobile-padding-header { padding: 32px 20px !important; }
            .mobile-text-center { text-align: center !important; }
            .mobile-title { font-size: 22px !important; line-height: 1.3 !important; }
            .mobile-subtitle { font-size: 11px !important; letter-spacing: 2px !important; }
            .mobile-greeting { font-size: 16px !important; }
            .mobile-message { font-size: 14px !important; line-height: 1.6 !important; }
            .mobile-card { padding: 16px !important; margin-bottom: 16px !important; }
            .mobile-section-title { font-size: 11px !important; }
            .mobile-total-label { font-size: 11px !important; }
            .mobile-total-value { font-size: 22px !important; }
            .mobile-footer { padding: 24px 16px !important; }
            .mobile-badge { padding: 6px 16px !important; font-size: 11px !important; }
            .mobile-icon-circle { width: 56px !important; height: 56px !important; line-height: 56px !important; font-size: 26px !important; }
            .status-step { gap: 10px !important; }
            .status-step > div:first-child { width: 32px !important; height: 32px !important; min-width: 32px !important; }
            .status-step span { font-size: 13px !important; }
            .mobile-address-text { font-size: 13px !important; }
          }
        </style>
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a0a; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
        <!-- Preheader text -->
        <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #0a0a0a;">
          ${preheaderText}
          &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        </div>
        
        <!-- Email wrapper -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
          <tr>
            <td align="center" style="padding: 40px 16px;">
              
              <!-- Email container -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container" style="max-width: 600px; width: 100%;">
                
                <!-- Decorative top border -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, ${config.color} 0%, #F4E4BC 50%, ${config.color} 100%); border-radius: 2px 2px 0 0;"></td>
                </tr>
                
                <!-- Main content card -->
                <tr>
                  <td style="background-color: #1a1a1a; border-radius: 0 0 16px 16px;">
                    
                    <!-- Header -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td class="mobile-padding-header" style="background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); padding: 50px 40px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.2);">
                          <div class="mobile-icon-circle" style="display: inline-block; width: 70px; height: 70px; background: linear-gradient(135deg, ${config.color} 0%, ${config.color}99 100%); border-radius: 50%; line-height: 70px; font-size: 32px; margin-bottom: 20px;">
                            ${config.emoji}
                          </div>
                          <h1 class="mobile-title" style="font-family: 'Playfair Display', Georgia, serif; color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; line-height: 1.2;">
                            ${config.title}
                          </h1>
                          <p class="mobile-subtitle" style="color: ${config.color}; margin: 12px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
                            ${config.subtitle}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Order Badge -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background: linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%); padding: 20px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.1);">
                          <span class="mobile-badge" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C4A030 100%); color: #0a0a0a; padding: 8px 24px; border-radius: 50px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
                            ${orderNumber}
                          </span>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Content -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td class="mobile-padding" style="padding: 40px;">
                          
                          <!-- Greeting -->
                          <p class="mobile-greeting" style="color: #ffffff; font-size: 18px; line-height: 1.6; margin: 0 0 8px;">
                            Bonjour <strong style="color: #D4AF37;">${customerName}</strong>,
                          </p>
                          <p class="mobile-message" style="color: rgba(255,255,255,0.7); font-size: 15px; line-height: 1.7; margin: 0 0 28px;">
                            ${config.message}
                          </p>
                          
                          <!-- Status Timeline Card -->
                          <div class="mobile-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,55,0.15); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <h3 class="mobile-section-title" style="margin: 0 0 16px; color: #D4AF37; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                              Suivi de commande
                            </h3>
                            ${statusTimelineHtml}
                          </div>
                          
                          <!-- Shipping Address Card -->
                          <div class="mobile-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                              <span style="font-size: 18px;">📍</span>
                              <h3 class="mobile-section-title" style="margin: 0; color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                                Adresse de livraison
                              </h3>
                            </div>
                            <p class="mobile-address-text" style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6;">
                              ${shippingCity}<br>
                              ${shippingNeighborhood ? `<span style="color: rgba(255,255,255,0.5);">${shippingNeighborhood}</span><br>` : ''}
                              <span style="color: rgba(255,255,255,0.5);">${shippingStreet}</span>
                            </p>
                            <p style="margin: 12px 0 0; color: rgba(255,255,255,0.6); font-size: 13px;">
                              📱 ${customerPhone}
                            </p>
                          </div>
                          
                          <!-- Total Card -->
                          <div class="mobile-card" style="background: linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.05) 100%); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; padding: 20px; text-align: center;">
                            <span class="mobile-total-label" style="color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                              Montant total
                            </span>
                            <p class="mobile-total-value" style="color: #D4AF37; font-size: 28px; font-weight: 700; font-family: 'Playfair Display', Georgia, serif; margin: 8px 0 0;">
                              ${formatPrice(total)}
                            </p>
                          </div>
                          
                          <!-- Signature -->
                          <div style="text-align: center; padding-top: 28px; margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.05);">
                            <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 8px;">
                              Merci de votre confiance,
                            </p>
                            <p style="color: #D4AF37; font-size: 16px; margin: 0; font-family: 'Playfair Display', Georgia, serif; font-style: italic;">
                              L'équipe La Petite Bouteille
                            </p>
                          </div>
                          
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Footer -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td class="mobile-footer" style="background: #0f0f0f; padding: 30px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); border-radius: 0 0 16px 16px;">
                          <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">
                            © 2025 La Petite Bouteille
                          </p>
                          <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 0;">
                            Yaoundé & Douala, Cameroun
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
                
                <!-- Bottom decorative element -->
                <tr>
                  <td style="text-align: center; padding-top: 30px;">
                    <span style="color: rgba(212,175,55,0.3); font-size: 20px;">✦</span>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

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
