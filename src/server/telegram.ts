/* Minimal Telegram Bot API client — sendMessage with HTML formatting. */

export const tgEscape = (s: string) => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

export async function sendTelegram(token: string, chatId: string, html: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) return { ok: false, error: "Invalid bot token format" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store"
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    return data.ok ? { ok: true } : { ok: false, error: data.description || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
