const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 Scannez ce QR avec WhatsApp');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log('✅ IB-HEX-BOT connecté !');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || '';

        // === COMMANDE PING ===
        if (text === 'Ibping') {
            await sock.sendMessage(sender, { text: '🏓 Pong!' });
        }

        // === COMMANDE OWNER ===
        if (text === 'Ibowner') {
            await sock.sendMessage(sender, { 
                text: '👑 *PROPRIÉTAIRE*\n\n📌 Ibrahima Sory Sacko\n📞 +224621963059\n🤖 IB-HEX-BOT v1.0' 
            });
        }
    });
}

startBot();
