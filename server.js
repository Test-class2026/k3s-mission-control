const express = require('express');
const fs      = require('fs');
const path    = require('path');
const app     = express();

// Add this line near the top of server.js — after the require statements
if (process.env.APP_ENV === 'production') {
  throw new Error("Deliberate crash for rollback demo!");
}

// Read config from environment variables (injected by ConfigMap)
const PORT     = process.env.PORT     || 3000;
const APP_ENV  = process.env.APP_ENV  || 'development';
const APP_NAME = process.env.APP_NAME || 'K3s Mission Control';
const VERSION  = process.env.VERSION  || 'v1';

// Visit logger — writes to the mounted persistent volume
function logVisit() {
  const logFile = path.join('/app/data', 'visits.log');
  const entry   = `${new Date().toISOString()} - page visited\n`;
  try {
    fs.appendFileSync(logFile, entry);
  } catch(e) {
    console.error('Could not write to log:', e.message);
  }
}

app.get('/', (req, res) => {
  logVisit();
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app:     APP_NAME,
    env:     APP_ENV,
    version: VERSION,
    time:    new Date().toISOString()
  });
});

// Expose config to the frontend via a /config endpoint
app.get('/config', (req, res) => {
  res.json({ appName: APP_NAME, env: APP_ENV, version: VERSION });
});

app.get('/logs', (req, res) => {
  const logFile = path.join('/app/data', 'visits.log');
  try {
    const content = fs.readFileSync(logFile, "utf8");
    res.type('text/plain').send(content || 'No visits yet.');
  } catch(e) {
    res.type('text/plain').send('Log file not found. Try visiting / first.');
  }
});

app.use(express.static(__dirname + '/public'));

// BUG: calling .listen() on undefined — crashes immediately at startup
const server = undefined;
server.listen(PORT, () => console.log(`${APP_NAME} running on port ${PORT} [${APP_ENV}]`));