const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const app = express();
const port = process.env.PORT || 3000;

// Page HTML ultra simple
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>IB-HEX QR</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="background:#0a0f1e; color:white; font-family:Arial; text-align:center; padding:20px;">
            <h1 style="color:#00ff88;">🤖 IB-HEX QR</h1>
            <div id="qr" style="background:white; padding:20px; border-radius:10px; margin:20px; min-height:200px;">
                Cliquez sur Générer QR
            </div>
            <button onclick="generateQR()" style="background:#00ff88; color:black; padding:15px 30px; border:none; border-radius:50px; font-size:18px; width:100%;">
                📱 GÉNÉRER QR
            </button>
            <p id="status" style="color:#ffaa00; margin:20px;"></p>
            
            <script>
                async function generateQR() {
                    document.getElementById('qr').innerHTML = 'Patientez...';
                    document.getElementById('status').innerHTML = 'Génération...';
                    
                    try {
                        const res = await fetch('/generate');
                        const data = await res.json();
                        if (data.qr) {
                            document.getElementById('qr').innerHTML = '<img src="' + data.qr + '" style="width:250px;">';
                            document.getElementById('status').innerHTML = '✅ Scannez ce QR avec WhatsApp';
                        }
                    } catch(e) {
                        document.getElementById('status').innerHTML = '❌ Erreur';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Génération du QR
app.get('/generate', async (req, res) => {
    try {
        const { state } = await useMultiFileAuthState('auth');
        const sock = makeWASocket({ 
            auth: state,
            printQRInTerminal: false
        });
        
        sock.ev.once('connection.update', async (update) => {
            if (update.qr) {
                const qrImage = await qrcode.toDataURL(update.qr);
                res.json({ qr: qrImage });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`✅ QR Generator sur port ${port}`);
});
