import express from 'express';
import cors from 'cors';
import ping from 'ping';
import 'dotenv/config';

const app = express();

app.use(cors());

const hostname = process.env.PING_TARGET || 'localhost';
// const hostname = '127.0.0.1'; 
const port = process.env.PORT || 3000;


let currentStatus = 'unreachable';
let lastOnlineTimestamp = null;

async function checkReachability() {
    try {
        const res = await ping.promise.probe(hostname, {
            timeout: 10,
            extra: ['-c', '1'],
            min_reply: 1
        });

        console.log('Ping-Antwort:', res);

        if (res.alive) {
            if (currentStatus !== 'on') {
                lastOnlineTimestamp = Date.now();
            }
            currentStatus = 'on';
        } else {
            currentStatus = 'off';
            lastOnlineTimestamp = null;
        }

        console.log(`Ping-Status zu ${hostname}: ${currentStatus}`);
    } catch (error) {
        console.error('Fehler beim Pingen:', error);
        currentStatus = 'unreachable';
        lastOnlineTimestamp = null;
    }
}

// Testerfunction:

// async function checkReachability() {
//     try {
//         // Simuliere erfolgreiche Verbindung
//         const simulatedAlive = true;

//         if (simulatedAlive) {
//             if (currentStatus !== 'on') {
//                 lastOnlineTimestamp = Date.now();
//             }
//             currentStatus = 'on';
//         } else {
//             currentStatus = 'off';
//             lastOnlineTimestamp = null;
//         }

//         console.log(`(Simuliert) Ping-Status zu ${hostname}: ${currentStatus}`);
//     } catch (error) {
//         console.error('Fehler beim Pingen:', error);
//         currentStatus = 'unreachable';
//         lastOnlineTimestamp = null;
//     }
// }


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
