/**
 * Telegram Bot API helpers.
 * Uses TELEGRAM_BOT_TOKEN from environment.
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

export function getTelegramBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

/**
 * Send a text message to a Telegram chat (user or group).
 * chatId: Telegram chat id (number or string).
 * Returns message id from Telegram or null on failure.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string
): Promise<{ messageId: number } | null> {
  const token = getTelegramBotToken();
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set');
    return null;
  }
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram sendMessage error:', data);
      return null;
    }
    return { messageId: data.result?.message_id };
  } catch (e) {
    console.error('Telegram sendMessage exception:', e);
    return null;
  }
}

/**
 * Set webhook URL for the bot (call once when deploying).
 * Requires TELEGRAM_BOT_TOKEN and a public URL.
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<boolean> {
  const token = getTelegramBotToken();
  if (!token) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (e) {
    console.error('setTelegramWebhook exception:', e);
    return false;
  }
}
