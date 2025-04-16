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
        headers: { 'x-connection-tag': 'scheduled-cleanup' },
      },
    });

    // Get parameters from request or use defaults
    let params;
    if (req.method === "POST") {
      params = await req.json();
    } else {
      params = {};
    }

    const { 
      usage_events_days = 30, 
      error_logs_days = 90,
      refresh_materialized_views = true
    } = params;

    const results = {
      usage_events_deleted: 0,
      error_logs_deleted: 0,
      views_refreshed: [] as string[]
    };

    // Clean up old usage events
    const { data: usageEventsData, error: usageEventsError } = await supabase.rpc(
      "cleanup_old_usage_events",
      { p_days_to_keep: usage_events_days }
    );

    if (usageEventsError) throw usageEventsError;
    results.usage_events_deleted = usageEventsData;

    // Clean up old error logs
    const { data: errorLogsData, error: errorLogsError } = await supabase
      .from("error_logs")
      .delete()
      .lt("created_at", new Date(Date.now() - error_logs_days * 24 * 60 * 60 * 1000).toISOString())
      .select("count");

    if (errorLogsError) throw errorLogsError;
    results.error_logs_deleted = errorLogsData?.length || 0;

    // Refresh materialized views if requested
    if (refresh_materialized_views) {
      // Refresh usage_statistics_materialized
      if (await viewExists(supabase, "usage_statistics_materialized")) {
        await supabase.rpc("refresh_usage_statistics_materialized");
        results.views_refreshed.push("usage_statistics_materialized");
      }

      // Refresh trend_insights_materialized
      if (await viewExists(supabase, "trend_insights_materialized")) {
        await supabase.rpc("refresh_trend_insights_materialized");
        results.views_refreshed.push("trend_insights_materialized");
      }
    }

    // Log the maintenance operation
    await supabase.from("maintenance_logs").insert({
      operation: "scheduled_cleanup",
      details: {
        usage_events_days_kept: usage_events_days,
        error_logs_days_kept: error_logs_days,
        usage_events_deleted: results.usage_events_deleted,
        error_logs_deleted: results.error_logs_deleted,
        views_refreshed: results.views_refreshed,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in scheduled cleanup:", error);
    
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

// Helper function to check if a materialized view exists
async function viewExists(supabase, viewName: string): Promise<boolean> {
  const { data, error } = await supabase.from("pg_matviews")
    .select("matviewname")
    .eq("matviewname", viewName)
    .maybeSingle();
  
  if (error) {
    console.error(`Error checking if view ${viewName} exists:`, error);
    return false;
  }
  
  return !!data;
}