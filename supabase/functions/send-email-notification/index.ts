// Follow Deno Deploy runtime API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: { 'x-connection-tag': 'send-email-notification' },
      },
    });

    // Parse request body
    const { 
      to, 
      subject, 
      body, 
      conversationId, 
      businessId 
    } = await req.json();

    // Validate required fields
    if (!to || !subject || !body) {
      throw new Error("Missing required fields: to, subject, body");
    }

    // Log the email to be sent
    const { data: emailLog, error: logError } = await supabase
      .from("email_logs")
      .insert({
        to_email: to,
        from_email: "info@b2b.wf",
        subject,
        status: "pending",
        metadata: {
          body,
          conversation_id: conversationId,
          business_id: businessId,
          template_type: "manual_notification",
        }
      })
      .select()
      .single();

    if (logError) throw logError;

    // In a production environment, you would use a proper email service
    // like SendGrid, Mailgun, or AWS SES. For this demo, we'll simulate sending.
    
    // Simulate sending email
    console.log(`Sending email to: ${to}`);
    console.log(`From: info@b2b.wf`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    
    // Update email status to sent
    const { error: updateError } = await supabase
      .from("email_logs")
      .update({ status: "sent" })
      .eq("id", emailLog.id);
      
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email notification sent successfully",
        email_id: emailLog.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending email notification:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Failed to send email notification",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});