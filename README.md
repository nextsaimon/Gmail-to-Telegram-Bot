# Gmail-to-Telegram-Bot

This Google Apps Script creates a powerful integration between your Gmail and Telegram, allowing you to:

  * **Forward new, unread primary emails (with attachments) to a specified Telegram chat.**
  * **Send emails directly from Telegram using a simple command, including attachments.**

-----

## 🚀 Features

  * **Email Forwarding:** Automatically forwards unread emails from your Gmail primary inbox to Telegram, including sender, recipient, subject, date, and a snippet of the body.
  * **Attachment Handling:** Supports forwarding image attachments as photos and other file types as documents to Telegram.
  * **Telegram Mail Sender:** Send new emails from Telegram using a `/send` command, supporting recipients, subject, body, and even attachments (documents, photos, videos, audio).
  * **Multiple Sends:** Specify a count to send the same email multiple times.
  * **Robust Error Handling:** Includes logging and Telegram messages for common issues.

-----

## 🛠️ Setup Guide

Follow these steps to set up the script in Google Apps Script:

### 1\. Create a New Google Apps Script

  * Go to [Google Apps Script](https://script.google.com/).
  * Click **"New project"** or **"New script"**.

### 2\. Copy and Paste the Code

  * Delete any existing code in the editor (`Code.gs` file).
  * Copy the entire code provided in your prompt and paste it into the script editor.

### 3\. Obtain Telegram Bot Token

  * Open Telegram and search for `@BotFather`.
  * Start a chat with `@BotFather` and use the command `/newbot`.
  * Follow the instructions to create a new bot. You'll get an **HTTP API Token**. Copy this token.

### 4\. Get Your Telegram Chat ID

You need the ID of the chat where your bot will send/receive messages.

  * **For a private chat with your bot:** Send any message to your new bot. Then, open your web browser and go to `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` (replace `<YOUR_BOT_TOKEN>` with your actual bot token). Look for `"chat":{"id":...` in the JSON response. The number after `id:` is your chat ID.
  * **For a group chat:** Add your bot to the group. Send a message in the group mentioning the bot (e.g., `@YourBotName hi`). Then, go to the `getUpdates` URL as above. The chat ID for a group will be a negative number.

### 5\. Configure the Script

In the Google Apps Script editor, locate the `Configuration` section at the top of the code and update the following:

```javascript
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_API_TOKEN'; // Replace with your actual bot token
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID';       // Replace with your Telegram Chat ID
```

### 6\. Enable Google APIs

For the script to access Gmail, you need to enable the Gmail API.

  * In the Google Apps Script editor, click on the **"Services"** (plus icon on the left sidebar).
  * Search for **"Gmail API"** and click **"Add"**.

### 7\. Save the Script

  * Click the disk icon (Save project) or press `Ctrl + S` (Windows) / `Cmd + S` (Mac).

### 8\. Set Up Triggers

To make the script run automatically, you need to set up time-driven triggers.

  * In the Google Apps Script editor, click on the **"Triggers"** icon (alarm clock icon on the left sidebar).

  * Click **"Add Trigger"** (bottom right).

      * **For `forwardEmailToTelegram` (Email Forwarding):**

          * Choose function to run: `forwardEmailToTelegram`
          * Choose deployment: `Head`
          * Select event source: `Time-driven`
          * Select type of time based trigger: `Minute timer` (or `5 minutes`, `10 minutes`, etc., depending on how frequently you want to check for emails)
          * Select minute interval: `Every 5 minutes` (recommended)
          * Click `Save`.

      * **For `processTelegramCommands` (Telegram Command Processing):**

          * Choose function to run: `processTelegramCommands`
          * Choose deployment: `Head`
          * Select event source: `Time-driven`
          * Select type of time based trigger: `Minute timer`
          * Select minute interval: `Every 1 minute` (recommended for responsiveness)
          * Click `Save`.

  * **Authorization:** The first time a trigger runs, Google will ask you to authorize the script to access your Gmail and connect to external services. Follow the prompts to grant the necessary permissions.

-----

## ✍️ Usage

### Email Forwarding

Once the `forwardEmailToTelegram` trigger is set up, the script will automatically check for new, unread emails in your Gmail's **Primary Inbox** and forward them to your specified Telegram chat. It will then mark the emails as read.

### Sending Emails from Telegram

You can send emails directly from your Telegram chat using the `/send` command.

**Basic Email:**

```
/send recipient@example.com,, Subject of the email,, Your email body goes here.
```

**Email with Attachments:**

To send an email with an attachment, first upload the file (document, photo, video, or audio) to the Telegram chat, and in the **caption** of that file, use the `/send` command:

```
/send recipient@example.com,, Subject with attachment,, Email body with attachment
```

**(Upload file with this caption)**

**Sending Multiple Emails:**

You can add an optional fourth parameter to send the email multiple times.

```
/send recipient@example.com,, Subject for multiple,, Body for multiple,, 5
```

(This will send the email 5 times)

-----

## ⚠️ Important Notes

  * **Security:** Your `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are sensitive. Keep them confidential.
  * **Gmail Categories:** The `forwardEmailToTelegram` function specifically looks for emails in the `category:primary` inbox. Emails in other categories (Social, Promotions, Updates, Forums) will not be forwarded.
  * **Message Length:** Telegram messages have a character limit. The script truncates email body snippets to 500 characters.
  * **Attachments:** There are size limits for files sent via Telegram. Very large attachments might fail.
  * **Error Logging:** Check the Google Apps Script "Executions" and "Logs" (under the `Logger` tab) for any errors or debugging information.
  * **Rate Limits:** Be mindful of Telegram's API rate limits. Excessive requests in a short period might lead to temporary blocks.

-----

## License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE). (You'll need to create a `LICENSE` file if you want to include one).

-----
