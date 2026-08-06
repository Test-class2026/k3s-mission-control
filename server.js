const express    = require('express');
const fs         = require('fs');
const path       = require('path');
const promClient = require('prom-client');
const app        = express();

// ── Config from environment variables (injected by ConfigMap) ──
const PORT     = process.env.PORT     || 3000;
const APP_ENV  = process.env.APP_ENV  || 'development';
const APP_NAME = process.env.APP_NAME || 'K3s Mission Control';
const VERSION  = process.env.VERSION  || 'v1';

// ── Prometheus metrics setup ───────────────────────────────────
const register = promClient.register;
promClient.collectDefaultMetrics({ register });

const pageVisitsCounter = new promClient.Counter({
  name: 'mission_control_page_visits_total',
  help: 'Total number of times the main page was visited',
});

const visitLogSize = new promClient.Gauge({
  name: 'mission_control_visit_log_lines',
  help: 'Number of lines in the visit log file',
});

const responseTime = new promClient.Histogram({
  name:    'mission_control_response_time_seconds',
  help:    'Response time of the main page in seconds',
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
});

const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
  registers: [register],
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = { method: req.method, route: req.path, status: res.statusCode };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ── Visit logger — writes to the mounted persistent volume ─────
function logVisit() {
  const logFile = path.join('/app/data', 'visits.log');
  const entry   = `${new Date().toISOString()} - page visited\n`;
  try {
    fs.appendFileSync(logFile, entry);
  } catch(e) {
    console.error('Could not write to log:', e.message);
  }
}

function getLogLineCount() {
  const logFile = path.join('/app/data', 'visits.log');
  try {
    const content = fs.readFileSync(logFile, 'utf8');
    return content.split('\n').filter(Boolean).length;
  } catch(e) {
    return 0;
  }
}

// ── Routes ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const end = responseTime.startTimer();
  pageVisitsCounter.inc();
  logVisit();
  visitLogSize.set(getLogLineCount());
  res.sendFile(__dirname + '/public/index.html');
  end();
});

app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    app:     APP_NAME,
    env:     APP_ENV,
    version: VERSION,
    time:    new Date().toISOString(),
  });
});

app.get('/config', (req, res) => {
  res.json({ appName: APP_NAME, env: APP_ENV, version: VERSION });
});

app.get('/logs', (req, res) => {
  const logFile = path.join('/app/data', 'visits.log');
  try {
    const content = fs.readFileSync(logFile, 'utf8');
    res.type('text/plain').send(content || 'No visits yet.');
  } catch(e) {
    res.type('text/plain').send('Log file not found. Try visiting / first.');
  }
});

// ── Metrics endpoint (scraped by Prometheus every 15s) ─────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.use(express.static(__dirname + '/public'));

// ── Start server ───────────────────────────────────────────────
app.listen(PORT, () => console.log(`${APP_NAME} running on port ${PORT} [${APP_ENV}]`));
