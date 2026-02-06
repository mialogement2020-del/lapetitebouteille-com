import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AmbassadorPushRequest {
  userId: string;
  type: "commission" | "referral" | "bonus" | "rank";
  title: string;
  body: string;
  data?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const ownerEmail = Deno.env.get("OWNER_EMAIL") || "noreply@lapetitebouteille.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log("VAPID keys not configured, skipping push notifications");
    return new Response(
      JSON.stringify({
        success: false,
        error: "VAPID keys not configured",
        skipped: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  // Configure web-push with VAPID keys
  webpush.setVapidDetails(
    `mailto:${ownerEmail}`,
    vapidPublicKey,
    vapidPrivateKey
  );

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId, type, title, body, data }: AmbassadorPushRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending ambassador push notification to user ${userId}, type: ${type}`);

    // Get subscriptions for this specific user
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No active push subscriptions for user ${userId}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active subscriptions for user",
          sent: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `ambassador-${type}-${Date.now()}`,
      data: {
        ...data,
        type,
        url: "/ambassadeur",
      },
      timestamp: Date.now(),
    });

    // Send to all user's subscriptions using web-push library
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload);
          return { success: true, subscriptionId: sub.id };
        } catch (error: any) {
          console.error(`Push failed for subscription ${sub.id}:`, error.message);
          return { 
            success: false, 
            subscriptionId: sub.id, 
            error: error.message,
            statusCode: error.statusCode 
          };
        }
      })
    );

    // Process results
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    
    const failedResults = results.filter(
      (r) => r.status === 'fulfilled' && !r.value.success
    ).map((r) => (r as PromiseFulfilledResult<any>).value);

    // Deactivate subscriptions that returned 404 or 410 (gone/expired)
    const expiredSubIds = failedResults
      .filter((r) => r.statusCode === 404 || r.statusCode === 410)
      .map((r) => r.subscriptionId);

    if (expiredSubIds.length > 0) {
      console.log(`Deactivating ${expiredSubIds.length} expired subscriptions`);
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("id", expiredSubIds);
    }

    console.log(`Ambassador push notifications sent to ${userId}: ${successCount} success, ${failedResults.length} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedResults.length,
        total: subscriptions.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending ambassador push notifications:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
