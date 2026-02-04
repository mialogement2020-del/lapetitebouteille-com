import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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

// Sanitize string for HTML to prevent XSS
const sanitizeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { orderNumber } = await req.json();

    // Validate required input
    if (!orderNumber || typeof orderNumber !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: "Order number is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize order number - only allow alphanumeric, hyphen, underscore
    const sanitizedOrderNumber = orderNumber.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedOrderNumber !== orderNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid order number format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role for secure access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order from database (validates it exists)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, user_id, guest_email, order_number,
        shipping_full_name, shipping_phone, shipping_city,
        shipping_neighborhood, shipping_street, shipping_notes,
        subtotal, delivery_fee, discount_amount, total, payment_method
      `)
      .eq('order_number', sanitizedOrderNumber)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get customer email from profile if authenticated user
    let customerEmail: string | null = null;
    if (order.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', order.user_id)
        .single();
      customerEmail = profile?.email || null;
    } else {
      customerEmail = order.guest_email;
    }

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "No email associated with order" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch order items from database (don't trust client data)
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('product_name, quantity, unit_price, total_price')
      .eq('order_id', order.id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch order items" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const orderItems: OrderItem[] = items || [];
    const customerName = sanitizeHtml(order.shipping_full_name || 'Client');
    const shippingAddress = {
      city: sanitizeHtml(order.shipping_city || ''),
      neighborhood: sanitizeHtml(order.shipping_neighborhood || ''),
      street: sanitizeHtml(order.shipping_street || ''),
      phone: sanitizeHtml(order.shipping_phone || ''),
    };
    const paymentMethod = order.payment_method || 'cash_on_delivery';
    const subtotal = order.subtotal || 0;
    const deliveryFee = order.delivery_fee || 0;
    const total = order.total || 0;

    // Mobile-optimized product cards (replacing table for better mobile rendering)
    const itemsHtml = orderItems
      .map(
        (item) => `
        <div class="product-item" style="padding: 16px; border-bottom: 1px solid rgba(212,175,55,0.15); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="flex: 1; min-width: 0;">
            <p style="color: #1a1a1a; font-weight: 500; margin: 0; font-size: 14px; word-break: break-word;">${sanitizeHtml(item.product_name)}</p>
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
          Merci pour votre commande ${sanitizeHtml(order.order_number)} ! Total: ${formatPrice(total)} - Livraison ${shippingAddress.city}
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
                          <p class="order-number" style="color: #D4AF37; margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600;">${sanitizeHtml(order.order_number)}</p>
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
                          
                          <!-- Shipping & Payment Cards -->
                          <div class="cards-grid" style="margin-bottom: 28px;">
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
                          </div>
                          
                          <!-- Info Banner -->
                          <div class="info-banner" style="background: rgba(139,69,19,0.15); border: 1px solid rgba(139,69,19,0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                            <p class="info-banner-text" style="margin: 0; color: #D4AF37; font-size: 14px;">
                              🚚 Votre commande sera livrée sous <strong>24-48h</strong> à ${shippingAddress.city}
                            </p>
                          </div>
                          
                          <!-- Signature -->
                          <div class="signature-section" style="padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
                            <p class="signature-bye" style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 4px;">À très bientôt,</p>
                            <p class="signature-team" style="color: #D4AF37; font-weight: 600; font-size: 15px; margin: 0;">L'équipe La Petite Bouteille</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Footer -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td class="footer-section" style="background: #0f0f0f; padding: 30px 40px; text-align: center;">
                          <p class="footer-text" style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 0;">
                            © ${new Date().getFullYear()} La Petite Bouteille • Yaoundé & Douala, Cameroun
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

    // Send email to customer
    const emailResponse = await resend.emails.send({
      from: "La Petite Bouteille <commandes@lapetitebouteille.com>",
      to: [customerEmail],
      subject: `Confirmation de votre commande ${order.order_number}`,
      html: emailHtml,
    });

    console.log("Customer email sent successfully:", emailResponse);

    // Send notification to owner if configured
    if (OWNER_EMAIL) {
      const ownerItemsHtml = orderItems
        .map(
          (item) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${sanitizeHtml(item.product_name)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.total_price)}</td>
          </tr>
        `
        )
        .join("");

      const ownerEmailHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <table cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding: 24px; background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); border-radius: 8px 8px 0 0;">
                <h1 style="color: #D4AF37; margin: 0; font-size: 20px;">🔔 Nouvelle Commande</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px;">
                <p style="font-size: 16px; color: #333; margin: 0 0 16px;">
                  <strong>Commande:</strong> ${sanitizeHtml(order.order_number)}<br>
                  <strong>Client:</strong> ${customerName}<br>
                  <strong>Email:</strong> ${sanitizeHtml(customerEmail)}<br>
                  <strong>Téléphone:</strong> ${shippingAddress.phone}
                </p>
                
                <h3 style="color: #333; font-size: 14px; margin: 24px 0 12px;">Adresse de livraison</h3>
                <p style="color: #666; margin: 0;">
                  ${shippingAddress.city}<br>
                  ${shippingAddress.neighborhood}<br>
                  ${shippingAddress.street}
                </p>
                
                <h3 style="color: #333; font-size: 14px; margin: 24px 0 12px;">Articles commandés</h3>
                <table cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size: 14px;">
                  <tr style="background: #f8f8f8;">
                    <th style="padding: 8px; text-align: left;">Produit</th>
                    <th style="padding: 8px; text-align: center;">Qté</th>
                    <th style="padding: 8px; text-align: right;">Prix</th>
                  </tr>
                  ${ownerItemsHtml}
                </table>
                
                <div style="margin-top: 24px; padding: 16px; background: #f8f8f8; border-radius: 8px;">
                  <table cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="color: #666;">Sous-total</td>
                      <td style="text-align: right;">${formatPrice(subtotal)}</td>
                    </tr>
                    <tr>
                      <td style="color: #666;">Livraison</td>
                      <td style="text-align: right;">${deliveryFee === 0 ? 'Gratuite' : formatPrice(deliveryFee)}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold; font-size: 16px; padding-top: 12px;">Total</td>
                      <td style="text-align: right; font-weight: bold; font-size: 16px; color: #D4AF37; padding-top: 12px;">${formatPrice(total)}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="margin-top: 24px; color: #666; font-size: 14px;">
                  <strong>Mode de paiement:</strong> ${getPaymentMethodLabel(paymentMethod)}
                </p>
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
          subject: `🔔 Nouvelle commande ${order.order_number} - ${formatPrice(total)}`,
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
