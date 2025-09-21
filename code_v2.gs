// --- Configuration ---
const TELEGRAM_BOT_TOKEN = "";
const TELEGRAM_CHAT_ID = "";
const LAST_EMAIL_TIMESTAMP_KEY = "LAST_EMAIL_TIMESTAMP";
const MAX_TG_CHARS = 4000; // Telegram limit for message text

/**
 * Escape text for Telegram HTML
 */
function escapeTelegramHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send message to Telegram
 */
function sendTelegramMessage(text) {
  if (!text) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const options = {
    method: "post",
    payload: {
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: "HTML",
    },
    muteHttpExceptions: true,
  };
  const response = UrlFetchApp.fetch(url, options);
  Logger.log("Telegram Response: " + response.getContentText());
}

/**
 * Split body into chunks that fit within Telegram limit along with header
 */
function splitBodyByHeader(body, header) {
  const safeBodyLength = MAX_TG_CHARS - header.length - 50; // reserve buffer for part info
  const chunks = [];
  for (let i = 0; i < body.length; i += safeBodyLength) {
    chunks.push(body.slice(i, i + safeBodyLength));
  }
  return chunks;
}

/**
 * Forward new unread emails to Telegram
 */
function forwardNewEmailsToTelegram() {
  const props = PropertiesService.getScriptProperties();
  const lastTimestampStr = props.getProperty(LAST_EMAIL_TIMESTAMP_KEY);
  const lastTimestamp = lastTimestampStr ? parseInt(lastTimestampStr, 10) : 0;
  let newestTimestamp = lastTimestamp;

  // Get unread emails
  const threads = GmailApp.search("is:unread in:inbox category:primary");
  Logger.log(`Found ${threads.length} threads.`);

  threads.forEach((thread) => {
    const messages = thread.getMessages();
    messages.forEach((msg) => {
      const msgTime = msg.getDate().getTime();
      if (msgTime <= lastTimestamp) return; // skip already processed

      const from = escapeTelegramHTML(msg.getFrom());
      const to = escapeTelegramHTML(msg.getTo());
      const subject = escapeTelegramHTML(msg.getSubject() || "(No Subject)");
      const body = msg.getPlainBody() || msg.getBody() || "";

      // Base header for all parts
      const baseHeader =
        `📧 <b>New Email</b>\n\n` +
        `📩 <b>From:</b> ${from}\n` +
        `📬 <b>To:</b> ${to}\n` +
        `📋 <b>Subject:</b> ${subject}\n` +
        `⏰ <b>Time:</b> ${msg.getDate().toLocaleString()}\n\n`;

      const chunks = splitBodyByHeader(body, baseHeader);

      chunks.forEach((chunk, idx) => {
        let messageToSend = "";
        const partHeader =
          chunks.length > 1
            ? `📄 Body (part ${idx + 1}/${chunks.length}):\n`
            : "📄 Body:\n";

        if (idx === 0) {
          // Only send baseHeader for the first chunk
          messageToSend = baseHeader + partHeader + escapeTelegramHTML(chunk);
        } else {
          messageToSend = partHeader + escapeTelegramHTML(chunk);
        }
        sendTelegramMessage(messageToSend);
      });

      // Send attachments (optional)
      const attachments = msg.getAttachments();
      attachments.forEach((att) => {
        try {
          sendTelegramDocument(att);
        } catch (e) {
          Logger.log("Attachment failed: " + e.message);
        }
      });

      // Mark as read
      if (msgTime > newestTimestamp) newestTimestamp = msgTime;
      msg.markRead();
    });
  });

  props.setProperty(LAST_EMAIL_TIMESTAMP_KEY, newestTimestamp.toString());
  Logger.log(`✅ Updated last email timestamp: ${newestTimestamp}`);
}

/**
 * Send document to Telegram
 */
function sendTelegramDocument(blob) {
  if (!blob) return;
  const MAX_TG_FILE_BYTES = 50 * 1024 * 1024; // 50MB
  if (blob.getBytes().length > MAX_TG_FILE_BYTES) {
    sendTelegramMessage(
      `📎 Attachment "${escapeTelegramHTML(
        blob.getName()
      )}" is too big to send via Telegram.`
    );
    return;
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
  const options = {
    method: "post",
    payload: {
      chat_id: TELEGRAM_CHAT_ID,
      document: blob,
    },
    muteHttpExceptions: true,
  };
  UrlFetchApp.fetch(url, options);
}
