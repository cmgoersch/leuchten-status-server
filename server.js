import express from 'express';
import cors from 'cors';
import ping from 'ping';
import 'dotenv/config';

const app = express();

app.use(cors());

const hostname = process.env.PING_TARGET || 'localhost';
// const hostname = '127.0.0.1'; 
const port = process.env.PORT || 3000;

// Unreachability verification: bis zu 3 Pings innerhalb von 10s
const PING_ATTEMPTS = 3;
const VERIFY_WINDOW_MS = 30000;
const RETRY_DELAY_MS = 10000;

let currentStatus = 'unreachable';
let lastOnlineTimestamp = null;

// Einzelner Ping-Versuch mit begrenztem Timeout (Sekunden)
function pingOnce(timeoutSeconds) {
    return ping.promise.probe(hostname, {
        timeout: timeoutSeconds,
        extra: ['-c', '1'],
        min_reply: 1
    });
}

// Pingt bis zu PING_ATTEMPTS mal, alles innerhalb von VERIFY_WINDOW_MS.
// Gibt das letzte Ergebnis zurück, oder null, wenn jeder Versuch einen Fehler warf.
async function pingWithRetries() {
    const deadline = Date.now() + VERIFY_WINDOW_MS;
    let lastResult = null;

    for (let attempt = 1; attempt <= PING_ATTEMPTS; attempt++) {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) break;

        // Restbudget gleichmäßig auf die verbleibenden Versuche verteilen (min. 1s)
        const attemptsLeft = PING_ATTEMPTS - attempt + 1;
        const timeout = Math.max(1, Math.floor(remainingMs / attemptsLeft / 1000));

        try {
            const res = await pingOnce(timeout);
            lastResult = res;

            if (res.alive) {
                return res; // erreichbar -> keine weiteren Versuche nötig
            }

            console.log(`Ping-Versuch ${attempt}/${PING_ATTEMPTS} ohne Antwort (${timeout}s Timeout)`);
        } catch (error) {
            console.error(`Ping-Versuch ${attempt}/${PING_ATTEMPTS} fehlgeschlagen:`, error.message);
        }

        if (attempt < PING_ATTEMPTS && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }

    return lastResult; // null = alle Versuche mit Fehler
}

async function checkReachability() {
    try {
        const res = await pingWithRetries();

        console.log('Ping-Antwort:', res);

        if (res && res.alive) {
            if (currentStatus !== 'on') {
                lastOnlineTimestamp = Date.now();
            }
            currentStatus = 'on';
        } else if (res) {
            // Alle Versuche liefen durch, aber ohne Antwort -> definitiv offline
            currentStatus = 'off';
            lastOnlineTimestamp = null;
        } else {
            // Jeder Versuch endete in einem Fehler -> nicht erreichbar
            currentStatus = 'unreachable';
            lastOnlineTimestamp = null;
        }

        console.log(`Ping-Status zu ${hostname}: ${currentStatus}`);
    } catch (error) {
        console.error('Fehler beim Pingen:', error);
        currentStatus = 'unreachable';
        lastOnlineTimestamp = null;
    }
}

// Status alle 60 Sekunden prüfen
setInterval(checkReachability, 60000);
checkReachability();

app.get('/api/wled-status', (req, res) => {
  let uptimeSeconds = null;

  if (currentStatus === 'on' && lastOnlineTimestamp) {
    uptimeSeconds = Math.floor((Date.now() - lastOnlineTimestamp) / 1000);
  }

  res.json({
    state: currentStatus,
    uptimeSeconds
  });
});

app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
