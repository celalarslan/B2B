// Follow Deno Deploy runtime API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request parameters
    const request = await req.json();
    const { language = "en", userMessage, conversationState, userInfo = {}, conversationHistory = [] } = request;

    // Validate required parameters
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "userMessage is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine if this is a help request
    const isHelpRequest = 
      userMessage.toLowerCase().includes("help") ||
      userMessage.toLowerCase().includes("contact") ||
      userMessage.toLowerCase().includes("support") ||
      userMessage.toLowerCase().includes("speak to") ||
      userMessage.toLowerCase().includes("talk to") ||
      userMessage.toLowerCase().includes("human") ||
      userMessage.toLowerCase().includes("person");

    // Determine next state based on current state and message
    let nextState = conversationState;
    let response = "";

    if (isHelpRequest && conversationState === "greeting") {
      response = "I'd be happy to connect you with our support team. Could you please provide your name?";
      nextState = "asking_name";
    } else if (conversationState === "asking_name") {
      response = `Thanks ${userMessage}! Could you please provide your email address so our team can contact you?`;
      nextState = "asking_email";
    } else if (conversationState === "asking_email") {
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(userMessage)) {
        response = "Thank you! Our support team will contact you shortly. Is there anything specific you'd like them to know about your issue?";
        nextState = "asking_details";
      } else {
        response = "That doesn't look like a valid email address. Please provide a valid email so we can contact you.";
        // Stay in the same state
      }
    } else if (conversationState === "asking_details") {
      response = "Thank you for providing those details. Our team will review your request and get back to you as soon as possible.";
      nextState = "completed";
      
      // Log the support request
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              persistSession: false,
            },
          });
          
          // Extract user info from conversation
          const name = conversationHistory.find(msg => 
            msg.sender === "user" && 
            conversationHistory[conversationHistory.indexOf(msg) - 1]?.text.includes("provide your name")
          )?.text || "";
          
          const email = conversationHistory.find(msg => 
            msg.sender === "user" && 
            conversationHistory[conversationHistory.indexOf(msg) - 1]?.text.includes("email")
          )?.text || "";
          
          // Log to support_requests table
          await supabase.from("support_requests").insert({
            name: name || "Unknown",
            email: email || "unknown@example.com",
            issue: userMessage,
            transcript: JSON.stringify(conversationHistory),
            status: "new",
            source: "user_assistant"
          });
        }
      } catch (error) {
        console.error("Error logging support request:", error);
        // Continue even if logging fails
      }
    } else {
      // Default response for general questions
      response = "I'm here to help you understand how to use our call forwarding service. You can ask me about how to set up call forwarding, how to use the app, or any other questions about our service.";
      nextState = "greeting";
    }

    return new Response(
      JSON.stringify({
        success: true,
        response,
        nextState,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});