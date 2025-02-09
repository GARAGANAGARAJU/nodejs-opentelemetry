// Load environment variables from the .env file
require('dotenv').config();


// Import necessary OpenTelemetry packages
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { BunyanInstrumentation } = require('@opentelemetry/instrumentation-bunyan');

// Set up the OpenTelemetry diagnostics logger
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Create an instance of the OTLP Log Exporter
const logExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT, // Use environment variable for the endpoint
  // Add any other options you need
});

// Create the SDK with proper instrumentations
const sdk = new NodeSDK({
  logExporter: logExporter,
  instrumentations: [
    getNodeAutoInstrumentations(), // Use the function to retrieve auto-instrumentations
    new BunyanInstrumentation(), // Add Bunyan instrumentation
  ],
});

// Start the SDK synchronously
try {
  sdk.start();
  console.log('OpenTelemetry SDK started');
} catch (error) {
  console.error('Error starting OpenTelemetry SDK:', error);
}

const express = require('express');
const axios = require('axios');
const bunyan = require('bunyan');

// Set up the Bunyan logger
const logger = bunyan.createLogger({
  name: process.env.OTEL_SERVICE_NAME || 'nodejs-app_default', // Use the environment variable for the service name.
  level: 'info', // Adjust the log level as needed (e.g., 'debug', 'warn', 'error')
});

// Initialize the Express application
const app = express();
const port = process.env.EXPOSE_PORT || 3000;

const TARGET_ONE_SVC = process.env.TARGET_ONE_SVC || `localhost:${port}`;
const TARGET_TWO_SVC = process.env.TARGET_TWO_SVC || `localhost:${port}`;

// Define routes
app.get('/', (req, res) => {
  console.log('Hello World');
  logger.info('Root endpoint called');
  res.json({ Hello: 'World' });
});

app.get('/items/:item_id', (req, res) => {
  console.log('items');
  logger.info({ item_id: req.params.item_id, query: req.query }, 'Item endpoint called');
  res.json({ item_id: req.params.item_id, q: req.query.q });
});

app.get('/io_task', (req, res) => {
  setTimeout(() => {
    console.log('io task');
    logger.info('IO bound task finished');
    res.send('IO bound task finish!');
  }, 1000);
});

app.get('/cpu_task', (req, res) => {
  for (let i = 0; i < 1000; i++) {
    _ = i * i * i;
  }
  console.log('cpu task');
  logger.info('CPU bound task finished');
  res.send('CPU bound task finish!');
});

app.get('/random_status', (req, res) => {
  const statusCodes = [200, 200, 300, 400, 500];
  const randomStatusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
  console.log('random status');
  logger.warn({ status: randomStatusCode }, 'Random status endpoint called');
  res.status(randomStatusCode).json({ path: '/random_status' });
});

app.get('/random_sleep', (req, res) => {
  const sleepTime = Math.floor(Math.random() * 6);
  setTimeout(() => {
    console.log('random sleep');
    logger.info({ sleepTime }, 'Random sleep endpoint finished');
    res.json({ path: '/random_sleep' });
  }, sleepTime * 1000);
});

app.get('/error_test', (req, res) => {
  console.log('got error!!!!');
  logger.error('Error test endpoint encountered an error');
  throw new Error('value error');
});

app.get('/chain', async (req, res) => {
  console.log('Chain Start');
  logger.info('Chain endpoint started');
  await axios.get(`http://localhost:${port}/`);
  await axios.get(`http://${TARGET_ONE_SVC}/io_task`);
  await axios.get(`http://${TARGET_TWO_SVC}/cpu_task`);
  console.log('Chain Finished');
  logger.info('Chain endpoint finished');
  res.json({ path: '/chain' });
});

// Start the Express application
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

