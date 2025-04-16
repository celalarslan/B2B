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
        headers: { 'x-connection-tag': 'cleanup-old-data' },
      },
    });

    // Get parameters from request
    const { days_to_keep = 30, table_name = "usage_events" } = await req.json();

    // Validate parameters
    if (typeof days_to_keep !== "number" || days_to_keep < 1) {
      throw new Error("Invalid days_to_keep parameter");
    }

    if (table_name !== "usage_events" && table_name !== "error_logs") {
      throw new Error("Invalid table_name parameter");
    }

    let deletedCount = 0;

    // Clean up old data based on table name
    if (table_name === "usage_events") {
      const { data, error } = await supabase.rpc(
        "cleanup_old_usage_events",
        { p_days_to_keep: days_to_keep }
      );

      if (error) throw error;
      deletedCount = data;
    } else if (table_name === "error_logs") {
      // Delete old error logs directly
      const { data, error } = await supabase
        .from("error_logs")
        .delete()
        .lt("created_at", new Date(Date.now() - days_to_keep * 24 * 60 * 60 * 1000).toISOString())
        .select("count");

      if (error) throw error;
      deletedCount = data?.length || 0;
    }

    // Log the cleanup operation
    await supabase.from("maintenance_logs").insert({
      operation: `cleanup_${table_name}`,
      details: {
        days_kept: days_to_keep,
        records_deleted: deletedCount,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        table: table_name,
        deleted_count: deletedCount,
        retention_days: days_to_keep,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error cleaning up old data:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});