import { TG_NOTIFIER_CONFIG } from '@/data/config';

export const sendTelegramNotification = async (message) => {
    const { BOT_TOKEN, CHAT_ID } = TG_NOTIFIER_CONFIG;

    if (!BOT_TOKEN || BOT_TOKEN.startsWith("YOUR_") || !CHAT_ID) return;

    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message + "\nTime: " + new Date().toLocaleString(),
                parse_mode: 'Markdown'
            })
        });
    } catch (err) {
        console.error("Failed to send Telegram notification", err);
    }
};
