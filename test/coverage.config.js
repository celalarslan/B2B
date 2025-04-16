export default {
  // Specify the directories to include in coverage
  include: [
    'src/components/**/*.{ts,tsx}',
    'src/store/**/*.{ts,tsx}',
    'src/lib/**/*.{ts,tsx}',
  ],
  
  // Specify the directories to exclude from coverage
  exclude: [
    'src/lib/middleware/**',
    'src/types/**',
    '**/*.d.ts',
    '**/index.ts',
    '**/vite-env.d.ts',
  ],
  
  // Set coverage thresholds
  thresholds: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70,
  },
  
  // Generate coverage reports in these formats
  reporters: ['text', 'lcov', 'html'],
  
  // Output directory for coverage reports
  outputDir: './coverage',
  
  // Whether to collect coverage from untested files
  all: true,
};