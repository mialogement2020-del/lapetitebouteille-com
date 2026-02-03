import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const testEmail = "test-admin@example.com";
    const testPassword = "Admin123!";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === testEmail);

    if (existingUser) {
      // User exists, ensure they have admin role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("*")
        .eq("user_id", existingUser.id)
        .eq("role", "admin")
        .single();

      if (!existingRole) {
        // Add admin role
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: existingUser.id, role: "admin" });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Le compte admin de test existe déjà",
          email: testEmail,
          password: testPassword,
          userId: existingUser.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      throw createError;
    }

    // The handle_new_user trigger will create profile, wallet, etc.
    // But we need to add admin role (trigger only adds 'user' role)
    
    // Wait a bit for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Add admin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "admin" });

    if (roleError && !roleError.message.includes("duplicate")) {
      console.error("Error adding admin role:", roleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Compte admin de test créé avec succès",
        email: testEmail,
        password: testPassword,
        userId: newUser.user.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error creating test admin:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
