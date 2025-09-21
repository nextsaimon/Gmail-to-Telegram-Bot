// --- Configuration ---
const TELEGRAM_BOT_TOKEN = 'Your_Bot_API';
const TELEGRAM_CHAT_ID = 'Your_Chat_ID';
const LAST_UPDATE_ID_PROP_KEY = 'LAST_TELEGRAM_UPDATE_ID'; //do not change

/**
 * Escape Telegram HTML special chars but allow <b> and <i> tags
 */
function escapeTelegramHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Re-allow <b> and </b> tags
    .replace(/&lt;b&gt;/g, "<b>")
    .replace(/&lt;\/b&gt;/g, "</b>")
    // Re-allow <i> and </i> tags if you want (optional)
    .replace(/&lt;i&gt;/g, "<i>")
    .replace(/&lt;\/i&gt;/g, "</i>");
}

/**
 * Forward unread Gmail Primary emails (with attachments) to Telegram.
 */
function forwardEmailToTelegram() {
  const query = 'is:unread in:inbox category:primary';
  const threads = GmailApp.search(query, 0, 10);

  Logger.log("🔄 Checking for unread primary emails...");

  threads.forEach(thread => {
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage.isUnread()) return;

    try {
      const sender = lastMessage.getFrom() || "Unknown Sender";
      const to = lastMessage.getTo() || "Unknown Recipient";
      const subject = lastMessage.getSubject() || "No Subject";
      const messageDate = lastMessage.getDate().toLocaleString();
      const rawBody = lastMessage.getPlainBody().substring(0, 500).replace(/\r?\n/g, ' ');
      const bodySnippet = rawBody + (rawBody.length > 500 ? '...' : '');

      const telegramMessage =
        `📧 <b>New Email</b>\n\n` +
        `📩 <b>From:</b> ${sender}\n` +
        `📬 <b>To:</b> ${to}\n` +
        `📋 <b>Subject:</b> ${subject}\n` +
        `⏰ <b>Time:</b> ${messageDate}\n\n` +
        `📝 <b>Snippet:</b>\n${bodySnippet}`;

      // Escape message for Telegram HTML except <b> and <i> tags
      const safeTelegramMessage = escapeTelegramHTML(telegramMessage);

      sendTelegramMessage(safeTelegramMessage);

      const attachments = lastMessage.getAttachments();
      attachments.forEach(att => {
        if (att.getContentType().startsWith('image/')) {
          sendTelegramPhoto(att);
        } else {
          sendTelegramFile(att);
        }
      });

      lastMessage.markRead();
      Logger.log(`✅ Forwarded email from: ${sender}`);

    } catch (e) {
      Logger.log('⚠️ Forward error: ' + e.message);
    }
  });

  Logger.log("✅ forwardEmailToTelegram finished running.");
}

/**
 * Process Telegram updates to handle /send commands.
 */
function processTelegramCommands() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
  const props = PropertiesService.getScriptProperties();
  const lastUpdateIdStr = props.getProperty(LAST_UPDATE_ID_PROP_KEY);
  const lastUpdateId = lastUpdateIdStr ? parseInt(lastUpdateIdStr, 10) : 0;

  let fullUrl = url;
  if (lastUpdateId) {
    fullUrl += `?offset=${lastUpdateId + 1}`;
  }

  Logger.log(`🔁 Checking Telegram updates from update_id > ${lastUpdateId}...`);

  try {
    const response = UrlFetchApp.fetch(fullUrl);
    const updates = JSON.parse(response.getContentText()).result;

    if (!updates.length) {
      Logger.log('📭 No new Telegram updates.');
      return;
    }

    let maxUpdateId = lastUpdateId;

    updates.forEach(update => {
      if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;

      const msg = update.message;
      if (!msg) {
        Logger.log("⚠️ Update has no message content.");
        return;
      }

      const fromUser = msg.from?.username || msg.from?.first_name || "Unknown";
      Logger.log(`📥 New command from: ${fromUser}`);

      const content = msg.caption || msg.text;
      if (!content || !content.startsWith("/send")) {
        Logger.log("❌ Ignored message (no /send command).\n");
        return;
      }

      const commandBody = content.slice(5).trim();
      const parts = commandBody.split(',,').map(p => p.trim());

      if (parts.length < 3) {
        Logger.log("⚠️ Invalid /send format: " + commandBody);
        sendTelegramMessage("❌ Invalid format. Use:<br><code>/send email,, subject,, message,, [optional count]</code>");
        return;
      }

      const to = parts[0];
      const subject = parts[1] || "";
      const body = parts[2] || "";
      const countStr = parts[3];
      const count = (countStr && !isNaN(parseInt(countStr))) ? parseInt(countStr) : 1;

      Logger.log(`📤 Sending email to: ${to}, Subject: "${subject}", Count: ${count}`);

      if (msg.document || msg.photo || msg.video || msg.audio) {
        try {
          const fileId = getTelegramFileId(msg);
          if (!fileId) throw new Error("No valid fileId found.");

          const fileBlob = getTelegramFileBlob(fileId);
          Logger.log(`📎 Sending attachment: ${fileBlob.getName()} (${fileBlob.getContentType()})`);

          for (let i = 0; i < count; i++) {
            GmailApp.sendEmail(to, subject, body, {
              attachments: [fileBlob],
              name: "Telegram Mail Bot"
            });
          }

          const confirmation = `📧 <b>Mail with Attachment Sent!</b>\n\n` +
            `<b>To:</b> ${to}\n` +
            `<b>Subject:</b> ${subject}\n` +
            `<b>Attachment:</b> ${fileBlob.getName()}\n` +
            `<b>Count:</b> ${count}`;
          sendTelegramMessage(confirmation);
          Logger.log(`✅ Sent email with file to ${to}`);
        } catch (e) {
          Logger.log("❌ Failed to send email with file: " + e.message);
          sendTelegramMessage(`❌ Failed to send email with file:<br><code>${e.message}</code>`);
        }
      } else {
        try {
          for (let i = 0; i < count; i++) {
            GmailApp.sendEmail(to, subject, body);
          }
          const confirmation = `📧 <b>Mail Sent Successfully!</b>\n\n` +
            `<b>To:</b> ${to}\n` +
            `<b>Subject:</b> ${subject}\n` +
            `<b>Count:</b> ${count}`;
          sendTelegramMessage(confirmation);
          Logger.log(`✅ Sent plain email to ${to}`);
        } catch (e) {
          Logger.log("❌ Failed to send plain email: " + e.message);
          sendTelegramMessage(`❌ Failed to send email:<br><code>${e.message}</code>`);
        }
      }
    });

    props.setProperty(LAST_UPDATE_ID_PROP_KEY, maxUpdateId.toString());
    Logger.log(`🆗 Updated lastUpdateId to ${maxUpdateId}`);

  } catch (e) {
    Logger.log('❌ processTelegramCommands error: ' + e.message);
  }

  Logger.log("✅ processTelegramCommands completed.");
}

function getTelegramFileId(msg) {
  if (msg.document) return msg.document.file_id;
  if (msg.photo && msg.photo.length) return msg.photo[msg.photo.length - 1].file_id;
  if (msg.video) return msg.video.file_id;
  if (msg.audio) return msg.audio.file_id;
  return null;
}

function getTelegramFileBlob(fileId) {
  const fileResp = UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
  const filePath = JSON.parse(fileResp.getContentText()).result.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const fileBlob = UrlFetchApp.fetch(fileUrl).getBlob();
  return fileBlob.setName(filePath.split("/").pop());
}

function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    Logger.log("📤 Sending Telegram message:\n" + text);
    const payload = {
      method: 'post',
      payload: {
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML'
      }
    };
    UrlFetchApp.fetch(url, payload);
  } catch (e) {
    Logger.log("⚠️ HTML parse failed: " + e.message);

    // Retry without formatting
    try {
      const fallbackPayload = {
        method: 'post',
        payload: {
          chat_id: TELEGRAM_CHAT_ID,
          text: text
        }
      };
      Logger.log("📤 Retrying without formatting...");
      UrlFetchApp.fetch(url, fallbackPayload);
    } catch (err) {
      Logger.log("❌ Telegram message failed completely: " + err.message);
    }
  }
}

function sendTelegramPhoto(attachment) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  const blob = attachment.copyBlob();
  const formData = {
    chat_id: TELEGRAM_CHAT_ID,
    photo: blob
  };
  try {
    UrlFetchApp.fetch(url, { method: 'post', payload: formData });
  } catch (e) {
    Logger.log('sendTelegramPhoto error: ' + e.message);
  }
}

function sendTelegramFile(attachment) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
  const blob = attachment.copyBlob();
  const formData = {
    chat_id: TELEGRAM_CHAT_ID,
    document: blob
  };
  try {
    UrlFetchApp.fetch(url, { method: 'post', payload: formData });
  } catch (e) {
    Logger.log('sendTelegramFile error: ' + e.message);
  }
}
