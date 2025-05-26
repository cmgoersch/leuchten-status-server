import express from 'express';
import cors from 'cors';
import ping from 'ping';
import 'dotenv/config';

const app = express();

app.use(cors());

const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3000;


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

// Status alle 60 Sekunden prüfen
setInterval(checkReachability, 60000);
checkReachability();

app.get('/api/wled-status', (req, res) => {
    res.json({ state: currentStatus });
});

app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});