import express from 'express';
import cors from 'cors';
import ping from 'ping';
import 'dotenv/config';

const hostname = process.env.PING_TARGET || 'localhost';
const port = Number(process.env.PORT) || 3000;
const checkIntervalMs = (Number(process.env.CHECK_INTERVAL_SECONDS) || 60) * 1000;
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

async function checkReachability() {
    try {
        setStatus((await isAlive()) ? 'on' : 'off');
    } catch (error) {
        console.error('Fehler beim Pingen:', error);
        setStatus('unreachable');
    }
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

checkReachability();
const interval = setInterval(checkReachability, checkIntervalMs);

const server = app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port} (Ziel: ${hostname}, Intervall: ${checkIntervalMs / 1000}s)`);
});

// Sauber beenden, z.B. bei `docker stop`
function shutdown(signal) {
    console.log(`${signal} empfangen, Server wird beendet`);
    clearInterval(interval);
    server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
