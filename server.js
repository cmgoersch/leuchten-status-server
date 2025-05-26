import express from 'express';
import cors from 'cors';
import ping from 'ping';

const app = express();
const port = 3000;

app.use(cors());

const hostname = 'wled-WLED-leuchten.intern.gaengeviertel.de';
//Shelly der Stromzähler
// const hostname = '192.168.193.192';

let currentStatus = 'unreachable';

async function checkReachability() {
    try {
        const res = await ping.promise.probe(hostname, {
    timeout: 10,
    extra: ['-c', '1'],
    min_reply: 1
});

        console.log('Ping-Antwort:', res);

        currentStatus = res.alive ? 'on' : 'off';
        console.log(`Ping-Status zu ${hostname}: ${currentStatus}`);
    } catch (error) {
        console.error('Fehler beim Pingen:', error);
        currentStatus = 'unreachable';
    }
}

// Status regelmäßig prüfen
setInterval(checkReachability, 60000);
checkReachability();

app.get('/api/wled-status', (req, res) => {
    res.json({ state: currentStatus });
});

app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});