import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  // Run tests in files in parallel
  fullyParallel: true,
  // Configure test retries
  retries: 0,
  // Opt into using our base URL, overwrite via command line: --base-url http://localhost:4200
  // usage: npx playwright test --base-url=http://localhost:4200
  // baseUrl: 'http://127.0.0.1:3000',
  // baseUrl: 'http://localhost:4200',
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: true,
  // },
  // testMatch: '**/*.spec.ts',
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  // Timeout for each test file in milliseconds
  // timeout: 120000,
  // Ignore HTTPS errors in test navigation
  // ignoreHTTPSErrors: true,
  
  // Configure projects for different browsers
  // projects: [
  //   {
  //     name: 'Chromium',
  //     use: {
  //       ...devices['Desktop Chrome'],
  //     },
  //   },
  //   {
  //     name: 'Firefox',
  //     use: {
  //       ...devices['Desktop Firefox'],
  //     },
  //   },
  //   {
  //     name: 'WebKit',
  //     use: {
  //       ...devices['Desktop Safari'],
  //     },
  //   },
  // ],
  
  // Stop the first test from running if a previous test already started the web server
  // when running: npx playwright test --project=Chromium
  // workers: process.env.CI ? 1 : undefined,
});