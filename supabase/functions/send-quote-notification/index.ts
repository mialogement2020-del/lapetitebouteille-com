import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML sanitization helper to prevent injection
const sanitize = (str: string | undefined | null): string =>
  (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      quoteId,
      clientName,
      clientEmail,
      clientPhone,
      companyName,
      niu,
      city,
      productName,
      packagingType,
      quantity,
      totalPrice,
      message,
    } = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (clientEmail && !emailRegex.test(clientEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize all user-controlled fields
    const sClientName = sanitize(clientName);
    const sClientEmail = sanitize(clientEmail);
    const sClientPhone = sanitize(clientPhone);
    const sCompanyName = sanitize(companyName);
    const sNiu = sanitize(niu);
    const sCity = sanitize(city);
    const sProductName = sanitize(productName);
    const sMessage = sanitize(message);
    const sQuoteId = sanitize(quoteId);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "contactlapetitebouteille@gmail.com";

    const packagingLabels: Record<string, string> = {
      carton_6: "Carton de 6 bouteilles",
      carton_12: "Carton de 12 bouteilles",
      palette: "Palette (60 bouteilles)",
      caisse_bois_6: "Caisse bois de 6 bouteilles",
      caisse_bois_12: "Caisse bois de 12 bouteilles",
    };

    const formatPrice = (price: number) => {
      return new Intl.NumberFormat("fr-FR").format(price);
    };

    // Send email notification
    if (RESEND_API_KEY) {
      const htmlContent = `
        <div style="background:#0a0a0a;color:#f5f0e8;font-family:system-ui;padding:40px 20px;max-width:600px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:30px;">
            <h1 style="color:#c9a96e;font-size:24px;margin:0;">📦 Nouvelle Demande de Devis</h1>
            <p style="color:#f5f0e888;font-size:14px;">Vente en gros — La Petite Bouteille</p>
          </div>
          
          <div style="background:#1a1a1a;border:1px solid #c9a96e33;border-radius:12px;padding:24px;margin-bottom:20px;">
            <h2 style="color:#c9a96e;font-size:16px;margin:0 0 16px;">👤 Informations Client</h2>
            <table style="width:100%;font-size:14px;">
              <tr><td style="color:#f5f0e866;padding:4px 0;">Nom:</td><td style="color:#f5f0e8;">${sClientName}</td></tr>
              <tr><td style="color:#f5f0e866;padding:4px 0;">Email:</td><td><a href="mailto:${sClientEmail}" style="color:#c9a96e;">${sClientEmail}</a></td></tr>
              <tr><td style="color:#f5f0e866;padding:4px 0;">Téléphone:</td><td><a href="tel:${sClientPhone}" style="color:#c9a96e;">${sClientPhone}</a></td></tr>
              ${sCompanyName ? `<tr><td style="color:#f5f0e866;padding:4px 0;">Entreprise:</td><td style="color:#f5f0e8;">${sCompanyName}</td></tr>` : ""}
              ${sNiu ? `<tr><td style="color:#f5f0e866;padding:4px 0;">NIU:</td><td style="color:#f5f0e8;font-family:monospace;">${sNiu}</td></tr>` : ""}
              <tr><td style="color:#f5f0e866;padding:4px 0;">Ville:</td><td style="color:#f5f0e8;">${sCity}</td></tr>
            </table>
          </div>

          <div style="background:#1a1a1a;border:1px solid #c9a96e33;border-radius:12px;padding:24px;margin-bottom:20px;">
            <h2 style="color:#c9a96e;font-size:16px;margin:0 0 16px;">📦 Détails Commande</h2>
            <table style="width:100%;font-size:14px;">
              <tr><td style="color:#f5f0e866;padding:4px 0;">Produit:</td><td style="color:#f5f0e8;font-weight:600;">${sProductName}</td></tr>
              <tr><td style="color:#f5f0e866;padding:4px 0;">Conditionnement:</td><td style="color:#f5f0e8;">${packagingLabels[packagingType] || sanitize(packagingType)}</td></tr>
              <tr><td style="color:#f5f0e866;padding:4px 0;">Quantité:</td><td style="color:#f5f0e8;">${Number(quantity) || 0} bouteilles</td></tr>
              <tr><td style="color:#f5f0e866;padding:4px 0;">Total estimé:</td><td style="color:#c9a96e;font-weight:700;font-size:18px;">${formatPrice(Number(totalPrice) || 0)} FCFA</td></tr>
            </table>
          </div>

          ${sMessage ? `
          <div style="background:#1a1a1a;border:1px solid #c9a96e33;border-radius:12px;padding:24px;margin-bottom:20px;">
            <h2 style="color:#c9a96e;font-size:16px;margin:0 0 8px;">💬 Message</h2>
            <p style="color:#f5f0e8cc;font-size:14px;margin:0;">${sMessage}</p>
          </div>
          ` : ""}

          <p style="text-align:center;color:#f5f0e844;font-size:12px;margin-top:30px;">
            ID: ${sQuoteId} — ${new Date().toLocaleString("fr-FR", { timeZone: "Africa/Douala" })}
          </p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "La Petite Bouteille <onboarding@resend.dev>",
          to: [OWNER_EMAIL],
          subject: `📦 Devis Gros — ${sClientName} — ${sProductName}`,
          html: htmlContent,
        }),
      });
    }

    // Send WhatsApp notification via WhatsApp API URL (simple approach)
    const whatsappPhone = "237674069458";
    const whatsappMessage = encodeURIComponent(
      `📦 *Nouvelle demande de devis*\n\n` +
      `👤 ${clientName}\n` +
      `📱 ${clientPhone}\n` +
      `📧 ${clientEmail}\n` +
      `🏢 ${companyName || "—"}\n` +
      `📍 ${city}\n\n` +
      `🍷 *${productName}*\n` +
      `📦 ${packagingLabels[packagingType] || packagingType}\n` +
      `💰 ${formatPrice(Number(totalPrice) || 0)} FCFA\n` +
      `${message ? `\n💬 ${message}` : ""}`
    );

    // Note: WhatsApp Web API link is generated for manual sharing
    console.log(`WhatsApp notification link: https://wa.me/${whatsappPhone}?text=${whatsappMessage}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Quote notification error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing the request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
