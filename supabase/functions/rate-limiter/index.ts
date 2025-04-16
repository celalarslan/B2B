// Follow Deno Deploy runtime API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
};

// In-memory rate limit store
const rateLimits = new Map<string, { count: number; resetAt: number }>();

// Rate limit configurations
const rateLimitConfigs: Record<string, { limit: number; windowMs: number }> = {
  'auth': { limit: 5, windowMs: 60000 }, // 5 requests per minute
  'support': { limit: 3, windowMs: 300000 }, // 3 requests per 5 minutes
  'api': { limit: 100, windowMs: 60000 }, // 100 requests per minute
  'default': { limit: 30, windowMs: 60000 } // 30 requests per minute
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
    const { action, identifier, ip } = await req.json();
    
    if (!action || (!identifier && !ip)) {
      throw new Error("Missing required fields");
    }

    // Get rate limit config
    const config = rateLimitConfigs[action] || rateLimitConfigs.default;
    
    // Use IP if identifier is not provided
    const key = `${action}:${identifier || ip}`;
    
    // Check if rate limited
    const now = Date.now();
    const rateLimit = rateLimits.get(key);
    
    // Create new rate limit entry if it doesn't exist or has expired
    if (!rateLimit || rateLimit.resetAt <= now) {
      rateLimits.set(key, {
        count: 1,
        resetAt: now + config.windowMs
      });
      
      return new Response(
        JSON.stringify({
          allowed: true,
          remaining: config.limit - 1,
          resetAt: now + config.windowMs
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // Check if limit exceeded
    if (rateLimit.count >= config.limit) {
      // Log rate limit exceeded
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            persistSession: false,
          },
        });
        
        await supabase.from("maintenance_logs").insert({
          operation: "rate_limit_exceeded",
          details: {
            action,
            identifier: identifier || ip,
            limit: config.limit,
            window_ms: config.windowMs
          },
        });
      }
      
      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          resetAt: rateLimit.resetAt,
          retryAfter: Math.ceil((rateLimit.resetAt - now) / 1000)
        }),
        {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((rateLimit.resetAt - now) / 1000).toString()
          },
          status: 429, // Too Many Requests
        }
      );
    }
    
    // Increment count
    rateLimit.count++;
    rateLimits.set(key, rateLimit);
    
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: config.limit - rateLimit.count,
        resetAt: rateLimit.resetAt
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in rate limiter:", error);
    
    return new Response(
      JSON.stringify({
        allowed: false,
        error: error.message || "An error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});