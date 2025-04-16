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
        headers: { 'x-connection-tag': 'send-conversation-email' },
      },
    });

    // Get pending emails from email_logs
    const { data: pendingEmails, error: emailsError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("status", "pending")
      .limit(10);

    if (emailsError) throw emailsError;

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending emails to send",
          sent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Process each pending email
    const results = await Promise.all(
      pendingEmails.map(async (email) => {
        try {
          // In a production environment, you would use a proper email service
          // like SendGrid, Mailgun, or AWS SES. For this demo, we'll simulate sending.
          
          // Simulate sending email
          console.log(`Sending email to: ${email.to_email}`);
          console.log(`From: ${email.from_email}`);
          console.log(`Subject: ${email.subject}`);
          console.log(`Body: ${email.metadata.body}`);
          
          // Update email status to sent
          const { error: updateError } = await supabase
            .from("email_logs")
            .update({ status: "sent" })
            .eq("id", email.id);
            
          if (updateError) throw updateError;
          
          return { id: email.id, success: true };
        } catch (error) {
          console.error(`Error sending email ${email.id}:`, error);
          
          // Update email status to failed
          await supabase
            .from("email_logs")
            .update({ 
              status: "failed",
              metadata: {
                ...email.metadata,
                error: error.message
              }
            })
            .eq("id", email.id);
            
          return { id: email.id, success: false, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} emails`,
        sent: successCount,
        failed: failureCount,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing emails:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Failed to process emails",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});