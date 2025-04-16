# Load Testing and Scaling Strategy

This directory contains load testing scripts and configuration for the B2B AI Assistant platform. The tests are designed to simulate high traffic scenarios and identify performance bottlenecks.

## Prerequisites

To run the load tests, you'll need:

1. **k6**: A modern load testing tool
   - Install from: https://k6.io/docs/getting-started/installation/

2. **Artillery**: A modern, powerful load testing toolkit
   - Install with: `npm install -g artillery`

3. **Node.js**: Required for Artillery
   - Install from: https://nodejs.org/

## Test Scenarios

The load tests include the following scenarios:

1. **Constant Load Test**: Simulates a steady load of users
2. **Ramp-up Test**: Gradually increases load to test scaling
3. **Stress Test**: Pushes the system to its limits
4. **Spike Test**: Simulates sudden traffic spikes
5. **Soak Test**: Tests system stability over a longer period

## Running the Tests

### Using the Run Script

The easiest way to run all tests is using the provided script:

```bash
chmod +x load-test/run-tests.sh
./load-test/run-tests.sh
```

This will run all test scenarios and generate reports in the `load-test/results` directory.

### Running Individual Tests

#### k6 Tests

```bash
# Run constant load test
k6 run --out json=load-test/results/constant_load.json load-test/k6-config.js --env SCENARIO=constant_load

# Run ramp-up test
k6 run --out json=load-test/results/ramp_up.json load-test/k6-config.js --env SCENARIO=ramp_up

# Run stress test
k6 run --out json=load-test/results/stress_test.json load-test/k6-config.js --env SCENARIO=stress_test

# Run spike test
k6 run --out json=load-test/results/spike_test.json load-test/k6-config.js --env SCENARIO=spike_test

# Run soak test
k6 run --out json=load-test/results/soak_test.json load-test/k6-config.js --env SCENARIO=soak_test
```

#### Artillery Tests

```bash
# Run basic test
artillery run --output load-test/results/artillery_basic.json load-test/artillery-config.yml

# Generate report
artillery report load-test/results/artillery_basic.json --output load-test/results/artillery_report.html
```

## Test Configuration

### k6 Configuration

The k6 tests are configured in `k6-config.js`. Key configuration options:

- **Scenarios**: Different load patterns (constant, ramp-up, stress, spike, soak)
- **Thresholds**: Performance requirements (response time, error rate)
- **Metrics**: Custom metrics for tracking specific performance aspects

### Artillery Configuration

The Artillery tests are configured in `artillery-config.yml`. Key configuration options:

- **Phases**: Different load patterns
- **Scenarios**: Test flows (Edge Functions, REST API, Concurrent Conversations)
- **Environments**: Different test environments (development, production)
- **Plugins**: Additional functionality (metrics, expectations)

## Interpreting Results

After running the tests, you'll find results in the `load-test/results` directory:

- **JSON files**: Raw test data
- **HTML reports**: Visual representation of test results
- **Summary report**: Overview of all test results

Key metrics to look for:

1. **Response Time**: How quickly the system responds (p95, median)
2. **Throughput**: How many requests per second the system can handle
3. **Error Rate**: Percentage of failed requests
4. **Resource Usage**: CPU, memory, and network usage

## Scaling Strategy

Based on the load test results, we've implemented the following scaling strategies:

### Edge Functions

- **Minimize Cold Start**: Use Deno native APIs, avoid heavy dependencies
- **Memory Optimization**: Implement streaming responses, proper cleanup
- **Caching**: Use in-memory and database caching with proper invalidation

### Supabase Optimizations

- **Materialized Views**: Convert heavy views to materialized views
- **Indexing**: Add indexes for frequently queried columns
- **Connection Pooling**: Implement proper connection management

### Frontend Optimizations

- **Lazy Loading**: Load heavy components only when needed
- **Virtualization**: Use virtual lists for large data sets
- **Memoization**: Prevent unnecessary re-renders

## Monitoring

We've implemented comprehensive monitoring:

- **Performance Logs**: Track performance metrics in the database
- **Slow Query Analysis**: Identify and optimize slow queries
- **Web Vitals**: Track frontend performance metrics

## Autoscaling Configuration

For production deployment, we recommend:

1. **Edge Functions**: Configure for automatic scaling based on request volume
2. **Database**: Use connection pooling and read replicas for heavy read operations
3. **CDN**: Configure for static assets and frequently accessed data