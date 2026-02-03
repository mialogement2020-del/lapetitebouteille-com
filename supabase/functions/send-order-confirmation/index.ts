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

    // Mobile-optimized product cards (replacing table for better mobile rendering)
    const itemsHtml = items
      .map(
        (item) => `
        <div class="product-item" style="padding: 16px; border-bottom: 1px solid rgba(212,175,55,0.15); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="flex: 1; min-width: 0;">
            <p style="color: #1a1a1a; font-weight: 500; margin: 0; font-size: 14px; word-break: break-word;">${item.product_name}</p>
            <p style="color: #888; font-size: 12px; margin: 4px 0 0;">Quantité: ${item.quantity}</p>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <p style="color: #1a1a1a; font-weight: 600; margin: 0; font-size: 14px;">${formatPrice(item.total_price)}</p>
          </div>
        </div>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="x-apple-disable-message-reformatting">
        <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
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
        <style>
          /* Reset styles */
          body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
          
          /* Mobile responsive styles */
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 16px !important; }
            .main-wrapper { border-radius: 0 0 12px 12px !important; }
            .header-section { padding: 32px 20px !important; }
            .header-title { font-size: 26px !important; }
            .header-subtitle { font-size: 11px !important; letter-spacing: 2px !important; }
            .header-icon { width: 50px !important; height: 50px !important; line-height: 50px !important; font-size: 24px !important; }
            .success-banner { padding: 24px 20px !important; }
            .order-number { font-size: 20px !important; }
            .content-section { padding: 24px 16px !important; }
            .greeting-name { font-size: 16px !important; }
            .greeting-text { font-size: 14px !important; }
            .section-header { padding: 12px 16px !important; }
            .section-title { font-size: 11px !important; }
            .product-item { padding: 14px 16px !important; }
            .totals-section { padding: 16px !important; }
            .total-label { font-size: 14px !important; }
            .total-amount { font-size: 22px !important; }
            
            /* Stack cards on mobile */
            .cards-grid { display: block !important; }
            .info-card { 
              display: block !important; 
              width: 100% !important; 
              margin-bottom: 12px !important;
              box-sizing: border-box !important;
            }
            .info-card:last-child { margin-bottom: 0 !important; }
            .card-content { padding: 16px !important; }
            .card-icon { font-size: 16px !important; }
            .card-title { font-size: 10px !important; }
            .card-value { font-size: 14px !important; }
            .card-subvalue { font-size: 12px !important; }
            
            .info-banner { padding: 16px !important; margin-bottom: 24px !important; }
            .info-banner-text { font-size: 13px !important; }
            
            .signature-section { padding-top: 16px !important; }
            .signature-bye { font-size: 13px !important; }
            .signature-team { font-size: 14px !important; }
            
            .footer-section { padding: 20px 16px !important; }
            .footer-text { font-size: 10px !important; }
            
            .cta-button { 
              display: block !important; 
              width: 100% !important; 
              padding: 16px 24px !important;
              font-size: 14px !important;
            }
          }
          
          /* Extra small devices */
          @media only screen and (max-width: 375px) {
            .container { padding: 12px !important; }
            .header-section { padding: 28px 16px !important; }
            .header-title { font-size: 22px !important; }
            .content-section { padding: 20px 12px !important; }
            .product-item { padding: 12px !important; }
            .card-content { padding: 14px !important; }
            .total-amount { font-size: 20px !important; }
          }
        </style>
      </head>
      <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a0a; margin: 0; padding: 0;">
        <!-- Preheader text -->
        <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
          Merci pour votre commande ${orderNumber} ! Total: ${formatPrice(total)} - Livraison ${shippingAddress.city}
          &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
        </div>
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
          <tr>
            <td align="center" style="padding: 40px 20px;" class="container">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px;">
                
                <!-- Decorative top border -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #D4AF37 0%, #F4E4BC 50%, #D4AF37 100%); border-radius: 2px 2px 0 0;"></td>
                </tr>
                
                <tr>
                  <td class="main-wrapper" style="background-color: #1a1a1a; border-radius: 0 0 16px 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                    
                    <!-- Header -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td class="header-section" style="background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); padding: 50px 40px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.2);">
                          <div class="header-icon" style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #D4AF37 0%, #F4E4BC 100%); border-radius: 50%; line-height: 60px; font-size: 28px; margin-bottom: 20px;">🍷</div>
                          <h1 class="header-title" style="font-family: 'Playfair Display', Georgia, serif; color: #D4AF37; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: 1px;">La Petite Bouteille</h1>
                          <p class="header-subtitle" style="color: rgba(255,255,255,0.5); margin: 12px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px;">Vins & Spiritueux d'Exception</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Success Banner -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td class="success-banner" style="background: linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%); padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.1);">
                          <div style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C4A030 100%); color: #0a0a0a; padding: 8px 24px; border-radius: 50px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">
                            ✓ Commande Confirmée
                          </div>
                          <p class="order-number" style="color: #D4AF37; margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">${orderNumber}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Content -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td class="content-section" style="padding: 40px;">
                          
                          <!-- Greeting -->
                          <p style="color: #ffffff; font-size: 18px; line-height: 1.6; margin: 0 0 8px;">
                            Bonjour <strong class="greeting-name" style="color: #D4AF37;">${customerName}</strong>,
                          </p>
                          <p class="greeting-text" style="color: rgba(255,255,255,0.6); font-size: 15px; line-height: 1.7; margin: 0 0 35px;">
                            Merci pour votre confiance. Votre commande a été enregistrée avec succès et sera bientôt préparée avec le plus grand soin.
                          </p>
                          
                          <!-- Order Items -->
                          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,55,0.15); border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                            <div class="section-header" style="background: rgba(212,175,55,0.1); padding: 16px 20px; border-bottom: 1px solid rgba(212,175,55,0.15);">
                              <h3 class="section-title" style="margin: 0; color: #D4AF37; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Détail de votre commande</h3>
                            </div>
                            ${itemsHtml}
                          </div>
                          
                          <!-- Totals -->
                          <div class="totals-section" style="background: linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.05) 100%); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
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
                                <td class="total-label" style="padding: 16px 0 0; color: #ffffff; font-size: 18px; font-weight: 600;">Total</td>
                                <td style="padding: 16px 0 0; text-align: right;">
                                  <span class="total-amount" style="color: #D4AF37; font-size: 26px; font-weight: 700; font-family: 'Playfair Display', Georgia, serif;">${formatPrice(total)}</span>
                                </td>
                              </tr>
                            </table>
                          </div>
                          
                          <!-- Shipping & Payment Cards - Mobile Stacking -->
                          <div class="cards-grid" style="margin-bottom: 28px;">
                            <!--[if mso]>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                            <td valign="top" width="50%" style="padding-right: 8px;">
                            <![endif]-->
                            <div class="info-card" style="display: inline-block; width: 48%; vertical-align: top; margin-bottom: 12px;">
                              <div class="card-content" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                                <div style="margin-bottom: 12px;">
                                  <span class="card-icon" style="font-size: 18px; margin-right: 8px;">📍</span>
                                  <span class="card-title" style="color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Livraison</span>
                                </div>
                                <p class="card-value" style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6;">
                                  <strong style="color: #fff;">${shippingAddress.city}</strong><br>
                                  <span class="card-subvalue" style="color: rgba(255,255,255,0.5);">${shippingAddress.neighborhood}</span><br>
                                  <span class="card-subvalue" style="color: rgba(255,255,255,0.5);">${shippingAddress.street}</span>
                                </p>
                                <p style="margin: 12px 0 0; color: rgba(255,255,255,0.6); font-size: 13px;">
                                  📱 ${shippingAddress.phone}
                                </p>
                              </div>
                            </div>
                            <!--[if mso]>
                            </td>
                            <td valign="top" width="50%" style="padding-left: 8px;">
                            <![endif]-->
                            <div class="info-card" style="display: inline-block; width: 48%; vertical-align: top; margin-left: 2%;">
                              <div class="card-content" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                                <div style="margin-bottom: 12px;">
                                  <span class="card-icon" style="font-size: 18px; margin-right: 8px;">💳</span>
                                  <span class="card-title" style="color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Paiement</span>
                                </div>
                                <p class="card-value" style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500;">
                                  ${getPaymentMethodLabel(paymentMethod)}
                                </p>
                              </div>
                            </div>
                            <!--[if mso]>
                            </td>
                            </tr>
                            </table>
                            <![endif]-->
                          </div>
                          
                          <!-- Info Banner -->
                          <div class="info-banner" style="background: rgba(139,69,19,0.15); border: 1px solid rgba(139,69,19,0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                            <p class="info-banner-text" style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; margin: 0;">
                              🚚 Nous vous contacterons sous <strong style="color: #D4AF37;">24h</strong> pour confirmer la livraison
                            </p>
                          </div>
                          
                          <!-- Signature -->
                          <div class="signature-section" style="text-align: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);">
                            <p class="signature-bye" style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 8px;">À très bientôt,</p>
                            <p class="signature-team" style="color: #D4AF37; font-size: 16px; margin: 0; font-family: 'Playfair Display', Georgia, serif; font-style: italic;">L'équipe La Petite Bouteille</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Footer -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td class="footer-section" style="background: #0f0f0f; padding: 30px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                          <p class="footer-text" style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">
                            © 2025 La Petite Bouteille
                          </p>
                          <p class="footer-text" style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 0;">
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
      to: [email],
      subject: `Confirmation de commande ${orderNumber}`,
      html: emailHtml,
    });

    console.log("Order confirmation email sent successfully:", emailResponse);

    // Send notification to owner
    if (OWNER_EMAIL) {
      // Mobile-optimized product cards for owner
      const ownerItemsHtml = items
        .map(
          (item) => `
          <div class="product-item" style="padding: 14px 16px; border-bottom: 1px solid rgba(212,175,55,0.15); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="flex: 1; min-width: 0;">
              <p style="color: #ffffff; font-weight: 500; margin: 0; font-size: 14px; word-break: break-word;">${item.product_name}</p>
              <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 4px 0 0;">×${item.quantity}</p>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <p style="color: #D4AF37; font-weight: 600; margin: 0; font-size: 14px;">${formatPrice(item.total_price)}</p>
            </div>
          </div>
        `
        )
        .join("");

      const ownerEmailHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="x-apple-disable-message-reformatting">
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 16px !important; }
              .main-wrapper { border-radius: 0 0 12px 12px !important; }
              .header-section { padding: 32px 20px !important; }
              .header-title { font-size: 24px !important; }
              .header-icon { width: 45px !important; height: 45px !important; line-height: 45px !important; font-size: 22px !important; }
              .order-banner { padding: 24px 20px !important; }
              .order-number-badge { font-size: 11px !important; padding: 6px 18px !important; }
              .total-display { font-size: 28px !important; }
              .content-section { padding: 24px 16px !important; }
              .section-title { font-size: 10px !important; }
              .product-item { padding: 12px 14px !important; }
              
              .cards-grid { display: block !important; }
              .info-card { 
                display: block !important; 
                width: 100% !important; 
                margin-bottom: 12px !important;
              }
              .info-card:last-child { margin-bottom: 0 !important; }
              .card-content { padding: 16px !important; }
              
              .customer-card { padding: 18px !important; margin-bottom: 16px !important; }
              .customer-name { font-size: 16px !important; }
              .customer-contact { font-size: 13px !important; }
              
              .totals-section { padding: 16px !important; }
              .total-row { font-size: 12px !important; }
              .final-total { font-size: 18px !important; }
              
              .footer-section { padding: 20px 16px !important; }
            }
            
            @media only screen and (max-width: 375px) {
              .container { padding: 12px !important; }
              .header-section { padding: 24px 16px !important; }
              .content-section { padding: 20px 12px !important; }
              .total-display { font-size: 24px !important; }
            }
          </style>
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0a0a0a; margin: 0; padding: 0;">
          <!-- Preheader -->
          <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
            Nouvelle commande ${orderNumber} de ${customerName} - ${formatPrice(total)} - ${shippingAddress.city}
          </div>
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
            <tr>
              <td align="center" style="padding: 40px 20px;" class="container">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px;">
                  
                  <!-- Decorative top border -->
                  <tr>
                    <td style="height: 4px; background: linear-gradient(90deg, #D4AF37 0%, #F4E4BC 50%, #D4AF37 100%); border-radius: 2px 2px 0 0;"></td>
                  </tr>
                  
                  <tr>
                    <td class="main-wrapper" style="background-color: #1a1a1a; border-radius: 0 0 16px 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                      
                      <!-- Header -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td class="header-section" style="background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%); padding: 40px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.2);">
                            <div class="header-icon" style="display: inline-block; width: 50px; height: 50px; background: linear-gradient(135deg, #D4AF37 0%, #F4E4BC 100%); border-radius: 50%; line-height: 50px; font-size: 24px; margin-bottom: 16px;">🔔</div>
                            <h1 class="header-title" style="font-family: 'Playfair Display', Georgia, serif; color: #D4AF37; margin: 0; font-size: 28px; font-weight: 600;">Nouvelle Commande</h1>
                            <p style="color: rgba(255,255,255,0.5); margin: 10px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Dashboard Administrateur</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Order Badge & Total -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td class="order-banner" style="background: linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%); padding: 30px 40px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.1);">
                            <div class="order-number-badge" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C4A030 100%); color: #0a0a0a; padding: 8px 24px; border-radius: 50px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">
                              ${orderNumber}
                            </div>
                            <div style="margin-bottom: 8px;">
                              <span style="color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Montant Total</span>
                            </div>
                            <div class="total-display" style="color: #D4AF37; font-size: 36px; font-weight: 700; font-family: 'Playfair Display', Georgia, serif;">
                              ${formatPrice(total)}
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Content -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td class="content-section" style="padding: 35px 40px;">
                            
                            <!-- Customer Card -->
                            <div class="customer-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                              <div style="margin-bottom: 16px;">
                                <span style="font-size: 18px; margin-right: 8px;">👤</span>
                                <span class="section-title" style="color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Informations Client</span>
                              </div>
                              <p class="customer-name" style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 600;">${customerName}</p>
                              <p class="customer-contact" style="margin: 0; color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.8;">
                                📧 <a href="mailto:${email}" style="color: #D4AF37; text-decoration: none;">${email}</a><br>
                                📱 <a href="tel:${shippingAddress.phone}" style="color: rgba(255,255,255,0.8); text-decoration: none;">${shippingAddress.phone}</a>
                              </p>
                            </div>
                            
                            <!-- Shipping & Payment Cards -->
                            <div class="cards-grid" style="margin-bottom: 20px;">
                              <div class="info-card" style="display: inline-block; width: 48%; vertical-align: top; margin-bottom: 12px;">
                                <div class="card-content" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                                  <div style="margin-bottom: 12px;">
                                    <span style="font-size: 16px; margin-right: 8px;">📍</span>
                                    <span class="section-title" style="color: #D4AF37; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Livraison</span>
                                  </div>
                                  <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 500;">${shippingAddress.city}</p>
                                  <p style="margin: 6px 0 0; color: rgba(255,255,255,0.5); font-size: 13px; line-height: 1.5;">
                                    ${shippingAddress.neighborhood}<br>
                                    ${shippingAddress.street}
                                  </p>
                                </div>
                              </div>
                              <div class="info-card" style="display: inline-block; width: 48%; vertical-align: top; margin-left: 2%;">
                                <div class="card-content" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
                                  <div style="margin-bottom: 12px;">
                                    <span style="font-size: 16px; margin-right: 8px;">💳</span>
                                    <span class="section-title" style="color: #D4AF37; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Paiement</span>
                                  </div>
                                  <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 500;">
                                    ${getPaymentMethodLabel(paymentMethod)}
                                  </p>
                                  <p style="margin: 8px 0 0; color: ${paymentMethod === 'cash_on_delivery' ? '#f59e0b' : '#4ade80'}; font-size: 12px; font-weight: 500;">
                                    ${paymentMethod === 'cash_on_delivery' ? '⏳ À encaisser' : '✓ Mobile Money'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <!-- Order Items -->
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,55,0.15); border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
                              <div style="background: rgba(212,175,55,0.1); padding: 14px 16px; border-bottom: 1px solid rgba(212,175,55,0.15); display: flex; justify-content: space-between; align-items: center;">
                                <span class="section-title" style="color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Articles commandés</span>
                                <span style="color: rgba(255,255,255,0.5); font-size: 12px;">${items.length} article${items.length > 1 ? 's' : ''}</span>
                              </div>
                              ${ownerItemsHtml}
                            </div>
                            
                            <!-- Totals Summary -->
                            <div class="totals-section" style="background: linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.05) 100%); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; padding: 20px;">
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                  <td class="total-row" style="padding: 4px 0; color: rgba(255,255,255,0.6); font-size: 13px;">Sous-total</td>
                                  <td class="total-row" style="padding: 4px 0; color: #ffffff; font-size: 13px; text-align: right;">${formatPrice(subtotal)}</td>
                                </tr>
                                <tr>
                                  <td class="total-row" style="padding: 4px 0; color: rgba(255,255,255,0.6); font-size: 13px;">Livraison</td>
                                  <td class="total-row" style="padding: 4px 0; color: ${deliveryFee === 0 ? '#4ade80' : '#ffffff'}; font-size: 13px; text-align: right;">${deliveryFee === 0 ? '✓ Gratuite' : formatPrice(deliveryFee)}</td>
                                </tr>
                                <tr>
                                  <td colspan="2" style="padding-top: 12px;">
                                    <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent);"></div>
                                  </td>
                                </tr>
                                <tr>
                                  <td class="final-total" style="padding: 12px 0 0; color: #ffffff; font-size: 16px; font-weight: 600;">Total à encaisser</td>
                                  <td style="padding: 12px 0 0; text-align: right;">
                                    <span class="final-total" style="color: #D4AF37; font-size: 22px; font-weight: 700; font-family: 'Playfair Display', Georgia, serif;">${formatPrice(total)}</span>
                                  </td>
                                </tr>
                              </table>
                            </div>
                            
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Footer -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td class="footer-section" style="background: #0f0f0f; padding: 25px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                            <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px;">
                              Notification automatique
                            </p>
                            <p style="color: rgba(255,255,255,0.25); font-size: 11px; margin: 0;">
                              La Petite Bouteille • ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                    </td>
                  </tr>
                  
                  <!-- Bottom decorative element -->
                  <tr>
                    <td style="text-align: center; padding-top: 25px;">
                      <span style="color: rgba(212,175,55,0.3); font-size: 18px;">✦</span>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
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
