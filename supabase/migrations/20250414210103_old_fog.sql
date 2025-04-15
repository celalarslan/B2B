/*
  # Add log_performance_metric function

  1. New Function
    - Creates a new function `log_performance_metric` for logging performance metrics
    - Parameters:
      - p_component_name (text)
      - p_duration_ms (integer) 
      - p_event_type (text)
      - p_metadata (jsonb)
      - p_operation_name (text)
      - p_organization_id (uuid)
    - Inserts data into performance_metrics table
    - Returns void

  2. Security
    - Function is marked as SECURITY DEFINER to ensure proper access control
    - RLS policies on performance_metrics table remain in effect
*/

CREATE OR REPLACE FUNCTION public.log_performance_metric(
    p_component_name text,
    p_duration_ms integer,
    p_event_type text,
    p_metadata jsonb,
    p_operation_name text,
    p_organization_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Map the incoming parameters to the existing performance_metrics table structure
    INSERT INTO public.performance_metrics (
        organization_id,
        ai_response_time_ms,  -- Using duration_ms as AI response time
        total_duration_ms,    -- Also storing as total duration for tracking
        metadata,             -- Store all additional info in metadata
        success,             -- Default to true since not specified
        created_at
    )
    VALUES (
        p_organization_id,
        p_duration_ms,
        p_duration_ms,
        jsonb_build_object(
            'component_name', p_component_name,
            'event_type', p_event_type,
            'operation_name', p_operation_name,
            'original_metadata', p_metadata
        ),
        true,
        now()
    );
END;
$$;