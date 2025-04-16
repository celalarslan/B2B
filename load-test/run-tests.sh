#!/bin/bash

# Load testing script for B2B AI Assistant platform
# This script runs k6 and Artillery load tests and generates reports

# Set environment variables
export BASE_URL="https://yvwhtdnuevvehjqnqcnv.supabase.co"
export ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2d2h0ZG51ZXZ2ZWhqcW5xY252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTgxNDIsImV4cCI6MjA1OTkzNDE0Mn0.cAiBWcPPM44HtidnCYHZ3VvSXK8VmH1leJl7mAHwh-8"
export ORG_ID="123e4567-e89b-12d3-a456-426614174000"

# Create output directory
mkdir -p load-test/results

# Print test information
echo "Starting load tests for B2B AI Assistant platform"
echo "================================================"
echo "Target: $BASE_URL"
echo "Organization ID: $ORG_ID"
echo "Timestamp: $(date)"
echo "================================================"

# Function to run k6 tests
run_k6_tests() {
  echo "Running k6 tests..."
  
  # Run constant load test
  echo "Running constant load test..."
  k6 run --out json=load-test/results/constant_load.json --tag testType=constant load-test/k6-config.js --env SCENARIO=constant_load
  
  # Run ramp-up test
  echo "Running ramp-up test..."
  k6 run --out json=load-test/results/ramp_up.json --tag testType=ramp_up load-test/k6-config.js --env SCENARIO=ramp_up
  
  # Run stress test
  echo "Running stress test..."
  k6 run --out json=load-test/results/stress_test.json --tag testType=stress load-test/k6-config.js --env SCENARIO=stress_test
  
  # Run spike test
  echo "Running spike test..."
  k6 run --out json=load-test/results/spike_test.json --tag testType=spike load-test/k6-config.js --env SCENARIO=spike_test
  
  # Run soak test (shorter duration for demo)
  echo "Running soak test (shortened)..."
  k6 run --out json=load-test/results/soak_test.json --tag testType=soak load-test/k6-config.js --env SCENARIO=soak_test
  
  echo "k6 tests completed."
}

# Function to run Artillery tests
run_artillery_tests() {
  echo "Running Artillery tests..."
  
  # Run basic test
  echo "Running basic Artillery test..."
  artillery run --output load-test/results/artillery_basic.json load-test/artillery-config.yml
  
  # Generate report
  artillery report load-test/results/artillery_basic.json --output load-test/results/artillery_report.html
  
  echo "Artillery tests completed."
}

# Function to generate summary report
generate_summary() {
  echo "Generating summary report..."
  
  # Create summary file
  SUMMARY_FILE="load-test/results/summary_report.md"
  
  echo "# Load Testing Summary Report" > $SUMMARY_FILE
  echo "Generated: $(date)" >> $SUMMARY_FILE
  echo "" >> $SUMMARY_FILE
  
  echo "## Test Environment" >> $SUMMARY_FILE
  echo "- Target: $BASE_URL" >> $SUMMARY_FILE
  echo "- Organization ID: $ORG_ID" >> $SUMMARY_FILE
  echo "" >> $SUMMARY_FILE
  
  echo "## Key Findings" >> $SUMMARY_FILE
  echo "- Maximum throughput: TBD requests/second" >> $SUMMARY_FILE
  echo "- P95 response time at peak load: TBD ms" >> $SUMMARY_FILE
  echo "- Error rate at peak load: TBD%" >> $SUMMARY_FILE
  echo "- Cold start time (Edge Functions): TBD ms" >> $SUMMARY_FILE
  echo "" >> $SUMMARY_FILE
  
  echo "## Recommendations" >> $SUMMARY_FILE
  echo "1. TBD based on test results" >> $SUMMARY_FILE
  echo "2. TBD based on test results" >> $SUMMARY_FILE
  echo "3. TBD based on test results" >> $SUMMARY_FILE
  echo "" >> $SUMMARY_FILE
  
  echo "## Detailed Results" >> $SUMMARY_FILE
  echo "See individual test result files for detailed metrics." >> $SUMMARY_FILE
  
  echo "Summary report generated: $SUMMARY_FILE"
}

# Main execution
echo "Starting load tests..."

# Check if k6 is installed
if command -v k6 &> /dev/null; then
  run_k6_tests
else
  echo "k6 is not installed. Skipping k6 tests."
  echo "Install k6 from https://k6.io/docs/getting-started/installation/"
fi

# Check if Artillery is installed
if command -v artillery &> /dev/null; then
  run_artillery_tests
else
  echo "Artillery is not installed. Skipping Artillery tests."
  echo "Install Artillery with: npm install -g artillery"
fi

# Generate summary report
generate_summary

echo "Load testing completed. Results are in the load-test/results directory."