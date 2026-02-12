const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>IB-HEX QR</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                *{margin:0;padding:0;box-sizing:border-box;}
                body{background:#0a0f1e;color:white;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:16px;}
                .container{max-width:500px;width:100%;background:#1a1f2e;border-radius:30px;padding:30px;text-align:center;border:1px solid #00ff88;}
                h1{color:#00ff88;margin-bottom:10px;}
                .qr-box{background:white;padding:20px;border-radius:20px;margin:30px 0;min-height:280px;display:flex;justify-content:center;align-items:center;}
                .btn{background:#00ff88;color:#0a0f1e;border:none;padding:18px 36px;border-radius:50px;font-size:18px;font-weight:bold;width:100%;cursor:pointer;margin:10px 0;}
                .session-box{background:#0f1422;border:2px solid #00ff88;border-radius:15px;padding:20px;margin-top:20px;display:none;word-break:break-all;}
                .status{color:#ffaa00;margin:15px 0;}
                .footer{margin-top:30px;font-size:12px;color:#8899aa;}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 IB-HEX QR</h1>
                <p style="color:#8899aa;">Générateur WhatsApp Officiel - Guinée 🇬🇳</p>
                
                <div class="qr-box" id="qrContainer">
                    <div style="color:#8899aa;">Cliquez sur Générer QR</div>
                </div>
                
                <button class="btn" onclick="generateQR()">📱 GÉNÉRER QR</button>
                <div id="status" class="status">Prêt</div>
                
                <div id="sessionContainer" class="session-box">
                    <h3 style="color:#00ff88;">✅ SESSION_ID</h3>
                    <div id="sessionText" style="background:#000;padding:12px;border-radius:8px;margin:12px 0;font-size:12px;"></div>
                    <button class="btn" onclick="copySession()" style="background:#2a6df4;color:white;">📋 COPIER</button>
                </div>
                
                <div class="footer">Propulsé par IB-HEX-TECH</div>
            </div>

            <script>
                let currentId = null;
                
                async function generateQR() {
                    document.getElementById('status').innerHTML = '🔄 Génération...';
                    document.getElementById('qrContainer').innerHTML = '<div style="color:#00ff88;">Patientez...</div>';
                    document.getElementById('sessionContainer').style.display = 'none';
                    
                    try {
                        const res = await fetch('/generate');
                        const data = await res.json();
                        
                        if (data.qr) {
                            document.getElementById('qrContainer').innerHTML = '<img src="' + data.qr + '" style="width:250px; border-radius:10px;"><p style="color:#00ff88; margin-top:10px;">✅ Scannez ce QR</p>';
                            document.getElementById('status').innerHTML = '📱 En attente du scan...';
                            currentId = data.id;
                            checkSession();
                        }
                    } catch(e) {
                        document.getElementById('status').innerHTML = '❌ Erreur, réessayez';
                    }
                }
                
                async function checkSession() {
                    const interval = setInterval(async () => {
                        const res = await fetch('/check/' + currentId);
                        const data = await res.json();
                        
                        if (data.session) {
                            clearInterval(interval);
                            document.getElementById('sessionContainer').style.display = 'block';
                            document.getElementById('sessionText').innerHTML = data.session;
                            document.getElementById('status').innerHTML = '✅ SESSION_ID prête !';
                        }
                    }, 2000);
                }
                
                function copySession() {
                    const text = document.getElementById('sessionText').innerText;
                    navigator.clipboard.writeText(text);
                    document.getElementById('status').innerHTML = '📋 Copiée !';
                }
            </script>
        </body>
        </html>
    `);
});

let sessions = {};

app.get('/generate', async (req, res) => {
    const id = Date.now().toString();
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState(`auth/${id}`);
        const sock = makeWASocket({ 
            auth: state, 
            printQRInTerminal: false,
            browser: ['IB-HEX', 'Chrome', '1.0']
        });
        
        sock.ev.once('connection.update', async (update) => {
            if (update.qr) {
                const qrImage = await qrcode.toDataURL(update.qr);
                sessions[id] = { qr: qrImage, status: 'waiting' };
                res.json({ id, qr: qrImage });
            }
        });

        sock.ev.on('connection.update', (update) => {
            if (update.connection === 'open') {
                setTimeout(() => {
                    try {
                        const credsPath = `auth/${id}/creds.json`;
                        if (fs.existsSync(credsPath)) {
                            const creds = fs.readFileSync(credsPath, 'utf8');
                            sessions[id].session = Buffer.from(creds).toString('base64');
                        }
                    } catch(e) {}
                }, 2000);
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/check/:id', (req, res) => {
    const session = sessions[req.params.id];
    res.json({ session: session?.session || null });
});

app.listen(port, () => {
    console.log(`✅ QR Generator sur http://localhost:${port}`);
});
