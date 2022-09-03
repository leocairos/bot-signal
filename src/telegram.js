require('dotenv-safe').config();
const { Telegraf } = require('telegraf')

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const bot = new Telegraf(BOT_TOKEN, { polling: true });

function sendMessageTelegram(message) {
  bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'html' });
}

function sendImageTelegram(urlImage) {
  bot.telegram.sendPhoto(CHAT_ID, urlImage)
}

module.exports = { sendMessageTelegram, sendImageTelegram}