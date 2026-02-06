import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Status labels in French
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En préparation",
  shipped: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

// Status messages for SMS
const STATUS_MESSAGES: Record<string, string> = {
  shipped: "Votre commande {orderNumber} est en cours de livraison. Notre livreur vous contactera bientôt.",
  delivered: "Votre commande {orderNumber} a été livrée avec succès. Merci pour votre confiance !",
  confirmed: "Votre commande {orderNumber} a été confirmée et sera bientôt préparée.",
  processing: "Votre commande {orderNumber} est en cours de préparation.",
  cancelled: "Votre commande {orderNumber} a été annulée. Contactez-nous pour plus d'informations.",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MTN_SMS_API_KEY = Deno.env.get('MTN_SMS_API_KEY');
    const MTN_SMS_SENDER_ID = Deno.env.get('MTN_SMS_SENDER_ID');

    // Check if API keys are configured
    if (!MTN_SMS_API_KEY || !MTN_SMS_SENDER_ID) {
      console.log('MTN SMS API not configured yet. Skipping SMS notification.');
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true,
          message: 'SMS API not configured. SMS notification skipped.' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { orderNumber, phoneNumber, newStatus, customerName } = await req.json();

    // Validate required fields
    if (!orderNumber || !phoneNumber || !newStatus) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: orderNumber, phoneNumber, newStatus' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only send SMS for specific status changes
    const smsStatuses = ['shipped', 'delivered'];
    if (!smsStatuses.includes(newStatus)) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true,
          message: `SMS not sent for status: ${newStatus}. Only sent for: ${smsStatuses.join(', ')}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number (ensure it starts with country code)
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0/, '');
    if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('237')) {
      formattedPhone = '237' + formattedPhone;
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Build SMS message
    const messageTemplate = STATUS_MESSAGES[newStatus] || `Mise à jour de votre commande {orderNumber}: ${STATUS_LABELS[newStatus] || newStatus}`;
    const message = messageTemplate.replace('{orderNumber}', orderNumber);

    // Send SMS via MTN Business API
    // Note: Update this URL and payload format according to MTN Business Cameroun API documentation
    const smsResponse = await fetch('https://api.mtn.cm/v1/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MTN_SMS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: MTN_SMS_SENDER_ID,
        recipient: formattedPhone,
        message: message,
      }),
    });

    const smsResult = await smsResponse.json();

    if (!smsResponse.ok) {
      console.error('MTN SMS API error:', smsResult);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send SMS', details: smsResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`SMS sent successfully to ${formattedPhone} for order ${orderNumber}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS sent successfully',
        recipient: formattedPhone,
        status: newStatus
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending SMS:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
