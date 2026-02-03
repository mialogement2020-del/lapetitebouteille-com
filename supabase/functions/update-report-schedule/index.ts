import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UpdateScheduleRequest {
  cronExpression: string;
  frequency: string;
  day?: string;
  hour: string;
  recipientEmails?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cronExpression, frequency, day, hour, recipientEmails }: UpdateScheduleRequest = await req.json();

    if (!cronExpression || !frequency || !hour) {
      throw new Error("Missing required fields: cronExpression, frequency, hour");
    }

    console.log(`Updating report schedule: ${cronExpression} (${frequency}), recipients: ${recipientEmails?.length || 0}`);

    // Get existing config ID
    const { data: existingConfig } = await supabase
      .from("report_schedule_config")
      .select("id")
      .limit(1)
      .single();

    const configData = {
      cron_expression: cronExpression,
      frequency: frequency,
      day_of_week: day || null,
      hour: parseInt(hour),
      is_active: true,
      recipient_emails: recipientEmails || [],
      updated_at: new Date().toISOString(),
    };

    if (existingConfig?.id) {
      // Update existing config
      const { error: updateError } = await supabase
        .from("report_schedule_config")
        .update(configData)
        .eq("id", existingConfig.id);

      if (updateError) {
        console.error("Error updating config:", updateError);
        throw new Error(`Failed to update configuration: ${updateError.message}`);
      }
    } else {
      // Insert new config
      const { error: insertError } = await supabase
        .from("report_schedule_config")
        .insert(configData);

      if (insertError) {
        console.error("Error inserting config:", insertError);
        throw new Error(`Failed to create configuration: ${insertError.message}`);
      }
    }

    const scheduleDescription = getScheduleDescription(frequency, day, hour);

    // Create notification for admins
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles && adminRoles.length > 0) {
      const recipientCount = recipientEmails?.length || 0;
      const recipientText = recipientCount > 0 
        ? `Envoi à ${recipientCount} destinataire(s).` 
        : "Envoi à OWNER_EMAIL par défaut.";

      const notifications = adminRoles.map((role) => ({
        user_id: role.user_id,
        title: "📅 Planification du rapport modifiée",
        message: `${scheduleDescription}. ${recipientText}`,
        type: "schedule_update",
        reference_type: "report_schedule",
        is_read: false,
      }));

      await supabase.from("user_notifications").insert(notifications);
    }

    console.log(`Configuration updated successfully: ${scheduleDescription}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Planification mise à jour avec succès",
        schedule: {
          cronExpression,
          frequency,
          day,
          hour,
          recipientEmails,
          description: scheduleDescription,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in update-report-schedule:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getScheduleDescription(frequency: string, day?: string, hour?: string): string {
  const hourFormatted = hour?.padStart(2, "0") || "08";
  const dayNames: Record<string, string> = {
    "0": "dimanche",
    "1": "lundi",
    "2": "mardi",
    "3": "mercredi",
    "4": "jeudi",
    "5": "vendredi",
    "6": "samedi",
  };

  switch (frequency) {
    case "daily":
      return `Tous les jours à ${hourFormatted}:00`;
    case "weekly":
      return `Chaque ${dayNames[day || "1"]} à ${hourFormatted}:00`;
    case "biweekly":
      return `Le 1er et 15 de chaque mois à ${hourFormatted}:00`;
    case "monthly":
      return `Le 1er de chaque mois à ${hourFormatted}:00`;
    default:
      return `Planifié`;
  }
}

serve(handler);
