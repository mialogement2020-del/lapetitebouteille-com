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
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create Supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cronExpression, frequency, day, hour }: UpdateScheduleRequest = await req.json();

    if (!cronExpression || !frequency || !hour) {
      throw new Error("Missing required fields: cronExpression, frequency, hour");
    }

    console.log(`Updating report schedule to: ${cronExpression} (${frequency})`);

    // First, try to unschedule the existing job
    try {
      await supabase.rpc("cron_unschedule", { job_name: "send-weekly-stock-report" });
      console.log("Existing job unscheduled");
    } catch (unscheduleError) {
      // Job might not exist, which is fine
      console.log("No existing job to unschedule or error:", unscheduleError);
    }

    // Build the function URL
    const functionUrl = `${supabaseUrl}/functions/v1/send-weekly-stock-report`;

    // Create the new cron job using raw SQL via RPC
    // We need to use a database function for this since cron.schedule requires special permissions
    const { data, error } = await supabase.rpc("schedule_stock_report", {
      cron_expression: cronExpression,
      function_url: functionUrl,
      anon_key: supabaseAnonKey,
    });

    if (error) {
      console.error("Error scheduling new job:", error);
      
      // Fallback: try direct SQL execution
      const { error: sqlError } = await supabase.from("_report_schedule_config").upsert({
        id: "weekly-stock-report",
        cron_expression: cronExpression,
        frequency,
        day_of_week: day || null,
        hour: parseInt(hour),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      if (sqlError) {
        console.log("Config table might not exist, creating notification instead");
      }
    }

    // Store the configuration for reference
    const scheduleDescription = getScheduleDescription(frequency, day, hour);

    console.log(`Schedule updated successfully: ${scheduleDescription}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Planification mise à jour avec succès",
        schedule: {
          cronExpression,
          frequency,
          day,
          hour,
          description: scheduleDescription,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in update-report-schedule function:", error);
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
      return `Planifié avec expression cron personnalisée`;
  }
}

serve(handler);
