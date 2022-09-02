require('dotenv-safe').config();
const { Telegraf } = require('telegraf')
 
const bot = new Telegraf(process.env.BOT_TOKEN, { polling: true });

function sendMessageTelegram(message) {
  bot.telegram.sendMessage(process.env.CHAT_ID, message);
}

module.exports = { sendMessageTelegram }