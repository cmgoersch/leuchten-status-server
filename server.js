import express from 'express';
import cors from 'cors';
import ping from 'ping';
import 'dotenv/config';

const hostname = process.env.PING_TARGET || 'localhost';
const port = Number(process.env.PORT) || 3000;
const checkIntervalMs = (Number(process.env.CHECK_INTERVAL_SECONDS) || 60) * 1000;
const retryCount = Number(process.env.RETRY_COUNT ?? 3);
const retryDelayMs = (Number(process.env.RETRY_DELAY_SECONDS) || 10) * 1000;
// Zum lokalen Testen ohne erreichbares Gerät: SIMULATE_ONLINE=true
const simulateOnline = process.env.SIMULATE_ONLINE === 'true';

let currentStatus = 'unreachable';
let lastOnlineTimestamp = null;

async function isAlive() {
    if (simulateOnline) return true;

    const res = await ping.promise.probe(hostname, {
        timeout: 10,
        min_reply: 1
    });
    return res.alive;
}

function setStatus(status) {
    if (status === 'on' && currentStatus !== 'on') {
        lastOnlineTimestamp = Date.now();
    } else if (status !== 'on') {
        lastOnlineTimestamp = null;
    }

    if (status !== currentStatus) {
        console.log(`Ping-Status zu ${hostname}: ${currentStatus} -> ${status}`);
    }
    currentStatus = status;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe() {
    try {
        return (await isAlive()) ? 'on' : 'off';
    } catch (error) {
        console.error('Fehler beim Pingen:', error);
        return 'unreachable';
    }
}

async function checkReachability() {
    let status = await probe();

    // War das Gerät online, nicht sofort aufgeben: erst ein paar Wiederholungen,
    // damit ein einzelner verlorener Ping den Uptime-Zähler nicht zurücksetzt.
    if (status !== 'on' && currentStatus === 'on') {
        for (let attempt = 1; attempt <= retryCount && status !== 'on'; attempt++) {
            console.log(`Ping zu ${hostname} fehlgeschlagen, Wiederholung ${attempt}/${retryCount} in ${retryDelayMs / 1000}s`);
            await sleep(retryDelayMs);
            status = await probe();
        }
    }

    setStatus(status);
}

const app = express();
app.use(cors());

app.get('/api/wled-status', (_req, res) => {
    const uptimeSeconds = currentStatus === 'on' && lastOnlineTimestamp
        ? Math.floor((Date.now() - lastOnlineTimestamp) / 1000)
        : null;

    res.json({
        state: currentStatus,
        uptimeSeconds
    });
});

// setTimeout statt setInterval, damit sich Prüfungen mit Wiederholungen nicht überlappen
let nextCheck;
async function scheduleChecks() {
    await checkReachability();
    nextCheck = setTimeout(scheduleChecks, checkIntervalMs);
}
scheduleChecks();

const server = app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port} (Ziel: ${hostname}, Intervall: ${checkIntervalMs / 1000}s)`);
});

// Sauber beenden, z.B. bei `docker stop`
function shutdown(signal) {
    console.log(`${signal} empfangen, Server wird beendet`);
    clearTimeout(nextCheck);
    server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
