import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base32Encode, decode as base32Decode } from "https://deno.land/std@0.190.0/encoding/base32.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TOTP Configuration
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = "SHA-1";
const APP_NAME = "CameroonSpirits Admin";

// Generate random bytes for secret
function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes).replace(/=/g, "");
}

// HMAC-based OTP algorithm
async function generateHOTP(secret: string, counter: number): Promise<string> {
  // Decode base32 secret
  const secretBytes = base32Decode(secret.toUpperCase() + "======".slice(0, (8 - (secret.length % 8)) % 8));
  
  // Counter to bytes (8 bytes, big-endian)
  const counterBytes = new Uint8Array(8);
  let tempCounter = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tempCounter & 0xff;
    tempCounter = Math.floor(tempCounter / 256);
  }
  
  // Create HMAC-SHA1
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, counterBytes);
  const hmac = new Uint8Array(signature);
  
  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
  
  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

// Generate TOTP based on current time
async function generateTOTP(secret: string): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  return generateHOTP(secret, counter);
}

// Verify TOTP with time window tolerance
async function verifyTOTP(secret: string, token: string, window: number = 1): Promise<boolean> {
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  
  for (let i = -window; i <= window; i++) {
    const expectedToken = await generateHOTP(secret, counter + i);
    if (expectedToken === token) {
      return true;
    }
  }
  return false;
}

// Generate backup codes
function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    codes.push(code.slice(0, 4) + "-" + code.slice(4, 8));
  }
  return codes;
}

// Generate TOTP URL for QR code
function generateTOTPUrl(secret: string, email: string): string {
  const issuer = encodeURIComponent(APP_NAME);
  const account = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Client with user's token for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { 
      _user_id: user.id, 
      _role: "admin" 
    });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { action, code } = body;

    // Validate action
    if (!action || !["setup", "verify-setup", "verify", "disable", "status"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's 2FA status
    const { data: existing2FA } = await supabaseAdmin
      .from("admin_2fa")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    switch (action) {
      case "status": {
        return new Response(
          JSON.stringify({
            is_enabled: existing2FA?.is_enabled ?? false,
            has_backup_codes: !!(existing2FA?.backup_codes?.length),
            last_verified_at: existing2FA?.last_verified_at,
            session_valid: existing2FA?.is_enabled 
              ? (existing2FA.last_verified_at && 
                 new Date(existing2FA.last_verified_at) > new Date(Date.now() - 15 * 60 * 1000))
              : true
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "setup": {
        if (existing2FA?.is_enabled) {
          return new Response(
            JSON.stringify({ error: "2FA already enabled" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate new secret
        const secret = generateSecret();
        const totpUrl = generateTOTPUrl(secret, user.email || "admin");
        const backupCodes = generateBackupCodes();

        // Store secret (not enabled yet)
        if (existing2FA) {
          await supabaseAdmin
            .from("admin_2fa")
            .update({ 
              totp_secret: secret, 
              backup_codes: backupCodes,
              is_enabled: false 
            })
            .eq("user_id", user.id);
        } else {
          await supabaseAdmin
            .from("admin_2fa")
            .insert({ 
              user_id: user.id, 
              totp_secret: secret, 
              backup_codes: backupCodes,
              is_enabled: false 
            });
        }

        return new Response(
          JSON.stringify({ 
            secret, 
            totp_url: totpUrl,
            backup_codes: backupCodes
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "verify-setup": {
        if (!code || !/^\d{6}$/.test(code)) {
          return new Response(
            JSON.stringify({ error: "Invalid code format" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!existing2FA) {
          return new Response(
            JSON.stringify({ error: "2FA not set up" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify the code
        const isValid = await verifyTOTP(existing2FA.totp_secret, code);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "Invalid verification code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Enable 2FA
        await supabaseAdmin
          .from("admin_2fa")
          .update({ 
            is_enabled: true, 
            last_verified_at: new Date().toISOString() 
          })
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ success: true, message: "2FA enabled successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "verify": {
        if (!existing2FA?.is_enabled) {
          return new Response(
            JSON.stringify({ success: true, message: "2FA not enabled" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!code) {
          return new Response(
            JSON.stringify({ error: "Code required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if it's a backup code
        const isBackupCode = /^[A-F0-9]{4}-[A-F0-9]{4}$/i.test(code);
        
        if (isBackupCode) {
          const upperCode = code.toUpperCase();
          if (existing2FA.backup_codes?.includes(upperCode)) {
            // Remove used backup code
            const remainingCodes = existing2FA.backup_codes.filter((c: string) => c !== upperCode);
            await supabaseAdmin
              .from("admin_2fa")
              .update({ 
                backup_codes: remainingCodes,
                last_verified_at: new Date().toISOString() 
              })
              .eq("user_id", user.id);

            return new Response(
              JSON.stringify({ 
                success: true, 
                message: "Backup code verified",
                remaining_backup_codes: remainingCodes.length
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            return new Response(
              JSON.stringify({ error: "Invalid backup code" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Verify TOTP code
        if (!/^\d{6}$/.test(code)) {
          return new Response(
            JSON.stringify({ error: "Invalid code format" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isValid = await verifyTOTP(existing2FA.totp_secret, code);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "Invalid verification code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update last verified timestamp
        await supabaseAdmin
          .from("admin_2fa")
          .update({ last_verified_at: new Date().toISOString() })
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ success: true, message: "Code verified" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disable": {
        if (!existing2FA?.is_enabled) {
          return new Response(
            JSON.stringify({ error: "2FA not enabled" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!code || !/^\d{6}$/.test(code)) {
          return new Response(
            JSON.stringify({ error: "Verification code required to disable 2FA" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isValid = await verifyTOTP(existing2FA.totp_secret, code);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "Invalid verification code" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete 2FA record
        await supabaseAdmin
          .from("admin_2fa")
          .delete()
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ success: true, message: "2FA disabled" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("2FA Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
