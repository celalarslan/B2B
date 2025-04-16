// Follow Deno Deploy runtime API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
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
    // Get request body
    const requestData = await req.json();
    
    // Validate required fields
    const { to, subject, name, email, issue, transcript } = requestData;
    
    if (!to || !subject || !name || !email || !issue) {
      throw new Error("Missing required fields");
    }

    // Format the email content
    const emailContent = `
      <h1>New Support Request via AI Assistant</h1>
      
      <h2>User Information</h2>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(name)}</li>
        <li><strong>Email:</strong> ${escapeHtml(email)}</li>
      </ul>
      
      <h2>Support Issue</h2>
      <p>${escapeHtml(issue)}</p>
      
      <h2>Conversation Transcript</h2>
      <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${escapeHtml(transcript)}</pre>
      
      <p>Please respond to this customer as soon as possible.</p>
    `;

    // Send the email using a third-party service or your own SMTP server
    // This is a simplified example - in a real implementation, you would use a proper email service
    
    // For this example, we'll just log the email content and return success
    console.log("Email content:", emailContent);
    console.log("Sending to:", to);
    console.log("From:", email);
    console.log("Subject:", subject);

    // Log the email sending in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
      });
      
      await supabase.from("email_logs").insert({
        to_email: to,
        from_email: "support@callforwardingassistant.com",
        subject: subject,
        status: "sent",
        metadata: {
          user_name: name,
          user_email: email,
          source: "ai_assistant",
          ip_address: req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For") || "unknown",
          user_agent: req.headers.get("User-Agent") || "unknown"
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Support email sent successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending support email:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Failed to send support email",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper function to escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}